import { createHash } from "node:crypto";
import { nextPlannerTask, plannerIssueBody } from "./agent-factory-policy.mjs";
import { createFactoryCandidateEvidenceRecord } from "./agent-factory-evidence.mjs";
import { isMergedTaskPullRequest } from "./agent-task-queue.mjs";
import { isAgentTaskBranchForIssue, parseAgentTaskIssueNumber } from "./agent-task-pr-metadata.mjs";
import { collectGitHubPages } from "./github-pagination.mjs";
import { isSafeGitHubRepositoryName } from "./github-repository-name.mjs";
import {
  isSystemCooldownActive,
  recordCandidateFailure,
  recordCandidateStarted,
  recordSystemFailure,
  recordSystemSuccess,
  recordTaskFailure,
  recordTaskSuccess,
  getTaskRetryAt,
  normalizeLegacyRetryTimestamps,
  recoverExpiredLease,
  recoverQuarantinedTask,
  requeueTask,
  reserveTask,
  transitionTask,
} from "./agent-factory-state-machine.mjs";

const RUNNING_WORKFLOW_STATES = new Set(["queued", "requested", "waiting", "pending", "in_progress"]);
const COMPLETED_WORKFLOW_CONCLUSIONS = new Set(["success", "failure", "cancelled", "skipped", "timed_out", "action_required", "neutral", "stale", "startup_failure"]);
const SYSTEM_HEALTH_REQUIRED_JOBS = [
  "Resolve exact candidate PR metadata",
  "Windows Runner quality gates — tests, types, lint, audit and production build",
  "Windows Ollama and local execution integration",
  "Windows Supabase migrations, PostgreSQL and RLS integration",
  "Persist candidate success or reset system breaker",
];

function positiveInteger(value, label) {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1) {
    throw new TypeError(label + " must be a positive integer.");
  }
  return parsed;
}

function requiredString(value, label) {
  if (typeof value !== "string" || !value.trim()) throw new TypeError(label + " is required.");
  return value.trim();
}

function validateOperatorRecoveryRequest(env, repository) {
  const owner = repository.split("/")[0].toLowerCase();
  if (env.GITHUB_EVENT_NAME !== "workflow_dispatch") {
    throw new Error("Operator recovery is restricted to an explicit workflow_dispatch event.");
  }
  if (env.GITHUB_REF !== "refs/heads/main") {
    throw new Error("Operator recovery must execute trusted main.");
  }
  if (String(env.GITHUB_REPOSITORY ?? "").toLowerCase() !== repository.toLowerCase()) {
    throw new Error("Operator recovery repository identity does not match the trusted controller.");
  }
  if (String(env.GITHUB_ACTOR ?? "").toLowerCase() !== owner) {
    throw new Error("Operator recovery is restricted to the repository owner.");
  }
  requiredString(env.FACTORY_OPERATOR_RECOVERY_ENV_GUARD, "Protected operator recovery environment secret");
  if (env.OPERATOR_RECOVERY_CONFIRMATION !== "RECOVER_QUARANTINED_TASK") {
    throw new Error("Operator recovery confirmation is missing or invalid.");
  }
  const issueNumber = positiveInteger(env.ISSUE_NUMBER, "Task Issue number");
  const expectedVersion = Number(env.EXPECTED_STATE_VERSION);
  if (!Number.isSafeInteger(expectedVersion) || expectedVersion < 0) {
    throw new TypeError("Expected durable state version must be a non-negative safe integer.");
  }
  if (env.EXPECTED_TASK_STATUS !== "quarantined") {
    throw new TypeError("Expected task status must be quarantined.");
  }
  const recoveryReason = requiredString(env.RECOVERY_REASON, "Recovery reason");
  const evidenceReference = requiredString(env.EVIDENCE_REFERENCE, "Reviewed remediation evidence reference");
  let evidenceUrl;
  try {
    evidenceUrl = new URL(evidenceReference);
  } catch {
    throw new TypeError("Recovery evidence must be an HTTPS GitHub URL.");
  }
  if (evidenceUrl.protocol !== "https:" || evidenceUrl.hostname !== "github.com" ||
      evidenceUrl.username || evidenceUrl.password || !evidenceUrl.pathname || evidenceUrl.pathname === "/") {
    throw new TypeError("Recovery evidence must be an HTTPS GitHub URL.");
  }
  // Hash the same canonical URL that the state machine stores. Equivalent URL
  // spellings must replay the same durable idempotency event.
  const canonicalEvidenceReference = evidenceUrl.toString();
  const evidenceIdentity = createHash("sha256").update(canonicalEvidenceReference, "utf8").digest("hex");
  return {
    issue_number: issueNumber,
    expected_state_version: expectedVersion,
    expected_status: "quarantined",
    recovery_reason: recoveryReason,
    evidence_reference: canonicalEvidenceReference,
    evidence_identity: evidenceIdentity,
    event_key: "quarantine-recovery-" + issueNumber + "-v" + expectedVersion + "-" + evidenceIdentity,
  };
}

function makeEventKey(env, suffix) {
  const runId = requiredString(env.GITHUB_RUN_ID ?? env.WORKFLOW_RUN_ID, "Workflow run ID");
  const attempt = positiveInteger(env.GITHUB_RUN_ATTEMPT ?? env.WORKFLOW_RUN_ATTEMPT, "Workflow run attempt");
  return "workflow-run-" + runId + "-attempt-" + attempt + "-" + suffix;
}

export function createAgentFactoryController({ store, api, repository, now = Date.now }) {
  if (!store || typeof store.read !== "function" || typeof store.write !== "function" || typeof store.migrate !== "function") {
    throw new TypeError("A durable factory state store is required.");
  }
  if (!isSafeGitHubRepositoryName(repository)) {
    throw new TypeError("A valid repository name is required.");
  }

  async function load() {
    return store.migrate();
  }

  async function persist(previous, next) {
    if (next === previous) return previous;
    try {
      const result = await store.write(previous.state_version, next);
      return result?.state ?? next;
    } catch (writeError) {
      // A network timeout can occur after GitHub committed the Issue update.
      // Reconcile only an exact payload match; never retry a newer/conflicting state.
      try {
        const observed = await store.read();
        if (observed?.state && observed.state.state_version === next.state_version &&
            JSON.stringify(observed.state) === JSON.stringify(next)) {
          return observed.state;
        }
      } catch {
        // Preserve the original write error when read-back is unavailable.
      }
      throw writeError;
    }
  }

  async function recoverLeaseIfStopped(state, timestamp) {
    const active = state.active_task;
    if (!active || Date.parse(active.lease_expires_at) > timestamp || !api || typeof api.request !== "function") {
      return { state, recovered: false };
    }
    let workflow;
    try {
      workflow = await api.request(
        "/repos/" + repository + "/actions/runs/" + encodeURIComponent(active.workflow_run_id),
      );
    } catch (error) {
      return { state, recovered: false, recovery_error: error instanceof Error ? error.message : "Workflow status lookup failed." };
    }
    if (!Number.isSafeInteger(workflow?.id) || String(workflow.id) !== active.workflow_run_id) {
      return {
        state,
        recovered: false,
        workflow_status: workflow?.status ?? "unknown",
        recovery_error: "Workflow run ID does not match the active lease; lease recovery is blocked.",
      };
    }
    if (!Number.isSafeInteger(workflow?.run_attempt)) {
      return {
        state,
        recovered: false,
        workflow_status: workflow?.status ?? "unknown",
        recovery_error: "Workflow run attempt is missing or invalid; lease recovery is blocked.",
      };
    }
    if (workflow.run_attempt < active.run_attempt) {
      return {
        state,
        recovered: false,
        workflow_status: workflow?.status ?? "unknown",
        recovery_error: "Workflow run attempt predates the active lease.",
      };
    }
    // A GitHub rerun increments run_attempt for the same run ID. A newer
    // attempt supersedes the lease's attempt: wait while it is running, then
    // recover the stale lease only after GitHub confirms the latest attempt
    // has completed. Older attempts can never authorize recovery.
    if (RUNNING_WORKFLOW_STATES.has(workflow?.status)) {
      return { state, recovered: false, workflow_status: workflow.status };
    }
    if (workflow?.status !== "completed") {
      return { state, recovered: false, workflow_status: workflow?.status ?? "unknown" };
    }
    if (typeof workflow.conclusion !== "string" || !COMPLETED_WORKFLOW_CONCLUSIONS.has(workflow.conclusion)) {
      return {
        state,
        recovered: false,
        workflow_status: workflow.status,
        recovery_error: "Workflow conclusion is missing or unsupported; lease recovery is blocked.",
      };
    }
    const eventKey = "lease-recovery-run-" + active.workflow_run_id + "-attempt-" + active.run_attempt;
    const result = recoverExpiredLease(state, { workflow_still_running: false, event_key: eventKey }, timestamp);
    if (!result.recovered) return { state: result.state, recovered: false, reason: result.reason };
    const saved = await persist(state, result.state);
    return { state: saved, recovered: true, issue_number: result.issue_number };
  }

  async function requeueReadyTasks(state, timestamp) {
    let current = state;
    let requeued = 0;
    // Keep the fallback clock stable while this pass persists multiple tasks;
    // otherwise each write would move updated_at and delay later legacy tasks.
    const retryFallbackTimestamp = Date.parse(state.updated_at);
    for (const [issueNumber, task] of Object.entries(current.tasks)) {
      const retryAt = getTaskRetryAt(task, retryFallbackTimestamp);
      const retryReady = task.status === "retry_wait" &&
        Number.isFinite(retryAt) && retryAt <= timestamp;
      const candidateReady = task.status === "candidate_rejected" && task.candidate_status === "failure" &&
        !task.quarantined && Number.isFinite(retryAt) && retryAt <= timestamp;
      if (!retryReady && !candidateReady) continue;
      const next = requeueTask(current, Number(issueNumber), timestamp, retryFallbackTimestamp);
      current = await persist(current, next);
      requeued += 1;
    }
    return { state: current, requeued };
  }

  async function run(env = {}) {
    const mode = requiredString(env.AGENT_FACTORY_MODE ?? "check", "Agent factory mode");
    const timestamp = Number(now());

    if (mode === "check") {
      const loaded = await load();
      let state = loaded.state;
      // Snapshot the migrated durable timestamp before initialization or any other write.
      const retryFallbackTimestamp = state.updated_at;
      if (!loaded.issue && typeof store.getStateIssueNumber === "function" && store.getStateIssueNumber() === null) {
        const initialized = {
          ...state,
          state_version: state.state_version + 1,
          updated_at: new Date(timestamp).toISOString(),
        };
        state = await persist(state, initialized);
      }
      // Persist legacy retry deadlines using the pre-write durable timestamp snapshot.
      const normalized = normalizeLegacyRetryTimestamps(state, retryFallbackTimestamp, timestamp);
      if (normalized !== state) state = await persist(state, normalized);

      const recovery = await recoverLeaseIfStopped(state, timestamp);
      state = recovery.state;
      const requeue = await requeueReadyTasks(state, timestamp);
      state = requeue.state;
      return {
        mode,
        state,
        outputs: {
          cooldown_active: isSystemCooldownActive(state, timestamp),
          cooldown_until: state.system.cooldown_until ?? "",
          active_task_issue_number: state.active_task?.issue_number ?? "",
          active_lease_id: state.active_task?.lease_id ?? "",
          queued_tasks: Object.values(state.tasks).filter((task) => task.status === "queued").length,
          pending_tasks: Object.values(state.tasks).filter((task) => !task.quarantined && !["completed", "superseded", "quarantined"].includes(task.status)).length,
          quarantined_tasks: Object.values(state.tasks).filter((task) => task.quarantined).length,
          requeued_tasks: requeue.requeued,
          lease_recovered: recovery.recovered,
          recovered_issue_number: recovery.issue_number ?? "",
          state_version: state.state_version,
          recovery_error: recovery.recovery_error ?? "",
        },
      };
    }

    const operatorRecoveryInput = mode === "operator-recovery"
      ? validateOperatorRecoveryRequest(env, repository)
      : null;
    const loaded = await load();
    let state = loaded.state;

    if (mode === "operator-recovery") {
      const result = recoverQuarantinedTask(state, operatorRecoveryInput, timestamp);
      if (!result.duplicate && result.recovered) state = await persist(state, result.state);
      return {
        mode,
        state,
        outputs: {
          issue_number: operatorRecoveryInput.issue_number,
          recovered: Boolean(result.recovered),
          duplicate: Boolean(result.duplicate),
          task_state: state.tasks[String(operatorRecoveryInput.issue_number)]?.status ?? "",
          retry_at: state.tasks[String(operatorRecoveryInput.issue_number)]?.next_attempt_at ?? "",
          state_version: state.state_version,
        },
      };
    }

    if (mode === "plan") {
      if (!api || typeof api.request !== "function") throw new Error("V2 roadmap planning requires the shared GitHub API client.");
      const allIssues = await collectGitHubPages((page) => api.request("/repos/" + repository + "/issues?state=all&per_page=100&page=" + page));
      const allPulls = await collectGitHubPages((page) => api.request("/repos/" + repository + "/pulls?state=all&per_page=100&page=" + page));
      const taskPulls = allPulls.map((pull) => ({ pull, issueNumber: Number(/<!-- ai-task:(\d+) -->/.exec(pull.body || "")?.[1]) || null })).filter((entry) => entry.issueNumber);
      const completedByMerge = new Set(taskPulls.filter((entry) => isMergedTaskPullRequest(entry.pull)).map((entry) => entry.issueNumber));
      const activeTaskPull = taskPulls.some((entry) => entry.pull.state === "open");
      const terminalTaskNumbers = new Set(Object.entries(state.tasks).filter(([, task]) => task.quarantined || ["completed", "superseded", "quarantined"].includes(task.status)).map(([number]) => Number(number)));
      const openTasks = allIssues.filter((issue) => !issue.pull_request && issue.state === "open" && issue.title?.startsWith("[AI Task]"));
      const pendingTasks = openTasks.filter((issue) => !terminalTaskNumbers.has(issue.number) && !completedByMerge.has(issue.number));
      if (pendingTasks.length || activeTaskPull) return { mode, state, outputs: { created_issue_number: "", planner_status: "blocked_by_existing_tasks", pending_tasks: pendingTasks.length, active_task_pr: activeTaskPull, state_version: state.state_version } };
      const task = nextPlannerTask(allIssues.map((issue) => issue.title));
      if (!task) return { mode, state, outputs: { created_issue_number: "", planner_status: "roadmap_exhausted", pending_tasks: 0, active_task_pr: false, state_version: state.state_version } };
      const created = await api.request("/repos/" + repository + "/issues", { method: "POST", body: { title: task.title, body: plannerIssueBody(task) } });
      if (!Number.isSafeInteger(Number(created?.number)) || Number(created.number) < 1) throw new Error("GitHub did not return a valid Issue number for the planned roadmap task.");
      return { mode, state, outputs: { created_issue_number: Number(created.number), planner_status: "created", pending_tasks: 0, active_task_pr: false, state_version: state.state_version } };
    }

    if (mode === "reserve") {
      const issueNumber = positiveInteger(env.ISSUE_NUMBER, "Issue number");
      const runId = requiredString(env.GITHUB_RUN_ID ?? env.WORKFLOW_RUN_ID, "Workflow run ID");
      const attempt = positiveInteger(env.GITHUB_RUN_ATTEMPT ?? env.WORKFLOW_RUN_ATTEMPT, "Workflow run attempt");
      const leaseId = env.AGENT_FACTORY_LEASE_ID || ("gcan-" + runId + "-" + attempt + "-" + issueNumber);
      const next = reserveTask(state, {
        issue_number: issueNumber,
        lease_id: leaseId,
        lease_owner: env.RUNNER_NAME || env.AGENT_FACTORY_LEASE_OWNER || "self-hosted-runner",
        workflow_run_id: runId,
        run_attempt: attempt,
        base_sha: requiredString(env.BASE_SHA ?? env.GITHUB_SHA, "Base commit SHA"),
        lease_ms: env.AGENT_FACTORY_LEASE_MS ? positiveInteger(env.AGENT_FACTORY_LEASE_MS, "Lease duration") : undefined,
        idempotency_key: env.AGENT_FACTORY_IDEMPOTENCY_KEY || leaseId,
      }, timestamp);
      state = await persist(state, next);
      return {
        mode,
        state,
        outputs: {
          issue_number: issueNumber,
          lease_id: leaseId,
          attempt: state.active_task?.attempt ?? "",
          lease_expires_at: state.active_task?.lease_expires_at ?? "",
          state_version: state.state_version,
        },
      };
    }

    if (mode === "transition") {
      const issueNumber = positiveInteger(env.ISSUE_NUMBER, "Issue number");
      const leaseId = requiredString(env.AGENT_FACTORY_LEASE_ID, "Active worker lease ID");
      const nextStatus = requiredString(env.NEXT_TASK_STATE, "Next task state");
      const details = {};
      if (env.HEAD_SHA) details.head_sha = env.HEAD_SHA;
      if (env.PULL_REQUEST_NUMBER) details.pull_request_number = positiveInteger(env.PULL_REQUEST_NUMBER, "Pull request number");
      // Publishing is permitted only after the task has durably entered sandbox_testing.
      // Keep the same issue/lease fence for both writes so a retry can resume safely.
      if (nextStatus === "publishing" && state.active_task?.state === "patching") {
        const sandboxTesting = transitionTask(state, issueNumber, leaseId, "sandbox_testing", {}, timestamp);
        state = await persist(state, sandboxTesting);
      }
      const next = transitionTask(state, issueNumber, leaseId, nextStatus, details, timestamp);
      state = await persist(state, next);
      return { mode, state, outputs: { issue_number: issueNumber, task_state: nextStatus, state_version: state.state_version } };
    }

    if (mode === "failure") {
      const scope = env.AGENT_FACTORY_FAILURE_SCOPE === "task" ? "task" : "system";
      const eventKey = env.AGENT_FACTORY_EVENT_KEY || makeEventKey(env, "failure-" + (env.FAILURE_STAGE || "workflow"));
      const errorCode = env.AGENT_FACTORY_ERROR_CODE || "WORKFLOW_FAILURE";
      const summary = env.FAILURE_SUMMARY || "Agent factory workflow failed.";
      let result;
      if (scope === "task") {
        const issueNumber = positiveInteger(env.FAILED_ISSUE_NUMBER ?? env.ISSUE_NUMBER, "Failed Issue number");
        const leaseId = requiredString(env.AGENT_FACTORY_LEASE_ID, "Active worker lease ID");
        result = recordTaskFailure(state, issueNumber, leaseId, eventKey, errorCode, summary, timestamp);
      } else {
        result = recordSystemFailure(
          state,
          eventKey,
          errorCode,
          summary,
          timestamp,
          env.AGENT_FACTORY_API_COOLDOWN_UNTIL || null,
        );
      }
      if (!result.duplicate) state = await persist(state, result.state);
      return {
        mode,
        state,
        outputs: {
          failure_scope: scope,
          duplicate: result.duplicate,
          quarantined: result.quarantined ?? false,
          cooldown_active: result.cooldown_active ?? isSystemCooldownActive(state, timestamp),
          state_version: state.state_version,
        },
      };
    }

    if (mode === "success") {
      // Legacy task-publication callback: publishing one task is not evidence
      // that shared infrastructure has recovered. Keep this mode deliberately
      // non-mutating; the workflow may continue calling it for compatibility.
      return {
        mode,
        state,
        outputs: {
          task_publication_success: true,
          breaker_reset: false,
          ignored: true,
          cooldown_active: isSystemCooldownActive(state, timestamp),
          state_version: state.state_version,
        },
      };
    }

    if (mode === "system-health-success") {
      const runId = positiveInteger(env.SYSTEM_HEALTH_RUN_ID, "System health workflow run ID");
      const runAttempt = positiveInteger(env.SYSTEM_HEALTH_RUN_ATTEMPT, "System health workflow run attempt");
      const pullRequestNumber = positiveInteger(env.SYSTEM_HEALTH_PULL_REQUEST_NUMBER, "System health pull request number");
      const headSha = requiredString(env.SYSTEM_HEALTH_HEAD_SHA, "System health head SHA");
      if (!/^[a-f0-9]{40}$/i.test(headSha)) {
        throw new TypeError("System health head SHA must be a 40-character hexadecimal commit SHA.");
      }
      if (!api || typeof api.request !== "function") {
        throw new Error("System health success requires GitHub workflow-run verification.");
      }
      const workflow = await api.request(
        "/repos/" + repository + "/actions/runs/" + runId,
      );
      const associatedPullRequests = Array.isArray(workflow?.pull_requests) ? workflow.pull_requests : [];
      const workflowHeadBranch = typeof workflow?.head_branch === "string" ? workflow.head_branch : "";
      const associatedPullRequest = associatedPullRequests.length === 1 ? associatedPullRequests[0] : null;
      const matchingPullRequest = associatedPullRequest &&
        !workflowHeadBranch.startsWith("ai-task/issue-") &&
        associatedPullRequest.number === pullRequestNumber &&
        associatedPullRequest.base?.ref === "main" &&
        associatedPullRequest.base?.repo?.full_name === repository &&
        associatedPullRequest.head?.ref === workflowHeadBranch &&
        associatedPullRequest.head?.sha?.toLowerCase() === headSha.toLowerCase() &&
        associatedPullRequest.head?.repo?.full_name === repository;
      if (!Number.isSafeInteger(workflow?.id) || workflow.id !== runId ||
          workflow.run_attempt !== runAttempt ||
          typeof workflow.head_sha !== "string" || workflow.head_sha.toLowerCase() !== headSha.toLowerCase() ||
          !workflowHeadBranch ||
          workflow.status !== "completed" || workflow.conclusion !== "success" ||
          workflow.path !== ".github/workflows/ci.yml" || workflow.event !== "pull_request" ||
          workflow.head_repository?.full_name !== repository ||
          !matchingPullRequest) {
        throw new Error("System health evidence must match a successful completed exact-head CI pull_request run and exactly one non-task same-repository PR targeting main with matching branch identity.");
      }
      // A workflow can conclude "success" when conditional downstream jobs
      // were skipped (for example, a stale/non-task PR event). The breaker
      // may reset only when every required job completed successfully on this
      // exact run attempt and candidate SHA.
      const jobsResponse = await api.request(
        "/repos/" + repository + "/actions/runs/" + runId +
          "/attempts/" + runAttempt + "/jobs?per_page=100",
      );
      const jobs = Array.isArray(jobsResponse?.jobs) ? jobsResponse.jobs : [];
      for (const requiredName of SYSTEM_HEALTH_REQUIRED_JOBS) {
        const matchingJobs = jobs.filter((job) => job?.name === requiredName);
        if (matchingJobs.length !== 1) {
          throw new Error("System health evidence is incomplete: required CI job is missing or duplicated: " + requiredName + ".");
        }
        const job = matchingJobs[0];
        if (job.run_id !== runId || job.run_attempt !== runAttempt ||
            typeof job.head_sha !== "string" || job.head_sha.toLowerCase() !== headSha.toLowerCase() ||
            job.status !== "completed" || job.conclusion !== "success") {
          throw new Error("System health evidence requires every resolver, quality, build, and database job to succeed on the exact run attempt and SHA: " + requiredName + ".");
        }
      }
      // A delayed successful run for an old PR revision must not clear a
      // breaker after a newer revision has already replaced that PR head.
      const currentPullRequest = await api.request(
        "/repos/" + repository + "/pulls/" + pullRequestNumber,
      );
      if (currentPullRequest?.number !== pullRequestNumber ||
          currentPullRequest?.state !== "open" ||
          currentPullRequest?.base?.ref !== "main" ||
          currentPullRequest?.base?.repo?.full_name !== repository ||
          currentPullRequest?.head?.repo?.full_name !== repository ||
          currentPullRequest?.head?.ref !== workflowHeadBranch ||
          currentPullRequest.head.ref.startsWith("ai-task/issue-") ||
          typeof currentPullRequest?.head?.sha !== "string" ||
          currentPullRequest.head.sha.toLowerCase() !== headSha.toLowerCase()) {
        throw new Error("System health evidence is stale: the current open same-repository non-task PR head and branch no longer match the successful CI run.");
      }
      const eventKey = "system-health-ci-" + runId + "-attempt-" + runAttempt + "-sha-" + headSha.toLowerCase();
      const result = recordSystemSuccess(state, eventKey, timestamp);
      if (!result.duplicate) state = await persist(state, result.state);
      return {
        mode,
        state,
        outputs: {
          duplicate: result.duplicate,
          breaker_reset: !result.duplicate,
          health_run_id: runId,
          health_run_attempt: runAttempt,
          health_head_sha: headSha.toLowerCase(),
          cooldown_active: isSystemCooldownActive(state, timestamp),
          state_version: state.state_version,
        },
      };
    }

    if (mode === "candidate-start") {
      const issueNumber = positiveInteger(env.ISSUE_NUMBER, "Issue number");
      const evidence = {
        pull_request_number: positiveInteger(env.PULL_REQUEST_NUMBER, "Pull request number"),
        head_sha: requiredString(env.HEAD_SHA, "Candidate head SHA"),
        head_ref: requiredString(env.HEAD_REF, "Candidate branch ref"),
        ci_run_id: requiredString(env.CI_RUN_ID, "CI run ID"),
        ci_run_attempt: positiveInteger(env.CI_RUN_ATTEMPT, "CI run attempt"),
      };
      const eventKey = env.AGENT_FACTORY_EVENT_KEY ||
        ("ci-start-" + evidence.ci_run_id + "-attempt-" + evidence.ci_run_attempt +
          "-issue-" + issueNumber + "-pr-" + evidence.pull_request_number +
          "-sha-" + evidence.head_sha.slice(0, 12));
      const existingTask = state.tasks[String(issueNumber)];
      if (existingTask?.quarantined || ["quarantined", "superseded"].includes(existingTask?.status)) {
        return {
          mode,
          state,
          outputs: {
            candidate_status: existingTask.status,
            ignored: true,
            duplicate: true,
            state_version: state.state_version,
          },
        };
      }
      if (api && typeof api.request === "function") {
        // Re-read the PR at the durable state boundary. The workflow's earlier
        // resolver check is not sufficient: the branch may move between that
        // check and candidate-start, otherwise persisting a stale SHA/run pair.
        const pull = await api.request(
          "/repos/" + repository + "/pulls/" + evidence.pull_request_number,
        );
        const owner = repository.split("/")[0].toLowerCase();
        const pullAuthor = String(pull?.user?.login ?? "").toLowerCase();
        const trustedPullAuthor = pullAuthor === owner || pullAuthor === "github-actions[bot]";
        if (pull?.number !== evidence.pull_request_number ||
            pull?.state !== "open" ||
            pull?.base?.ref !== "main" ||
            pull?.base?.repo?.full_name !== repository ||
            pull?.head?.repo?.full_name !== repository ||
            typeof pull?.head?.sha !== "string" ||
            pull.head.sha.toLowerCase() !== evidence.head_sha.toLowerCase() ||
            pull?.head?.ref !== evidence.head_ref ||
            !trustedPullAuthor ||
            parseAgentTaskIssueNumber(pull.body) !== issueNumber ||
            !isAgentTaskBranchForIssue(pull.head.ref, issueNumber)) {
          throw new Error("Candidate start rejected: PR must be the current open same-repository AI Task PR at the exact supplied head SHA and branch.");
        }
      } else {
        // Never accept persisted PR metadata as a substitute for a live
        // same-repository, exact-head GitHub verification.
        throw new Error("Candidate start requires current GitHub PR verification.");
      }
      const result = recordCandidateStarted(state, issueNumber, eventKey, evidence, timestamp);
      if (!result.duplicate) state = await persist(state, result.state);
      return {
        mode,
        state,
        outputs: {
          candidate_status: result.ignored ? "retry_backoff" : "pending",
          ignored: Boolean(result.ignored),
          duplicate: result.duplicate,
          state_version: state.state_version,
        },
      };
    }

    if (mode === "candidate") {
      const issueNumber = positiveInteger(env.ISSUE_NUMBER, "Issue number");
      const existingTask = state.tasks[String(issueNumber)];
      if (existingTask?.quarantined || ["quarantined", "superseded"].includes(existingTask?.status)) {
        return {
          mode,
          state,
          outputs: {
            candidate_status: existingTask.status,
            ignored: true,
            duplicate: true,
            state_version: state.state_version,
          },
        };
      }
      const candidateHeadRef = requiredString(env.HEAD_REF, "Candidate branch ref");
      const evidence = {
        pull_request_number: positiveInteger(env.PULL_REQUEST_NUMBER, "Pull request number"),
        head_sha: requiredString(env.HEAD_SHA, "Candidate head SHA"),
        ci_conclusion: requiredString(env.CI_CONCLUSION, "CI conclusion"),
        ci_run_id: requiredString(env.CI_RUN_ID, "CI run ID"),
        ci_run_attempt: positiveInteger(env.CI_RUN_ATTEMPT, "CI run attempt"),
      };
      // The workflow resolver checks the PR before invoking this callback, but
      // the branch can still move between that check and this durable write.
      // Re-read the PR at the state boundary so stale CI outcomes cannot
      // complete or reject a newer candidate revision.
      if (!api || typeof api.request !== "function") {
        throw new Error("Candidate outcome requires current GitHub PR verification.");
      }
      const pull = await api.request(
        "/repos/" + repository + "/pulls/" + evidence.pull_request_number,
      );
      const owner = repository.split("/")[0].toLowerCase();
      const pullAuthor = String(pull?.user?.login ?? "").toLowerCase();
      const trustedPullAuthor = pullAuthor === owner || pullAuthor === "github-actions[bot]";
      if (existingTask?.pull_request_number !== evidence.pull_request_number ||
          pull?.number !== evidence.pull_request_number ||
          pull?.state !== "open" ||
          pull?.base?.ref !== "main" ||
          pull?.base?.repo?.full_name !== repository ||
          pull?.head?.repo?.full_name !== repository ||
          typeof pull?.head?.sha !== "string" ||
          pull.head.sha.toLowerCase() !== evidence.head_sha.toLowerCase() ||
          pull?.head?.ref !== candidateHeadRef ||
          !trustedPullAuthor ||
          parseAgentTaskIssueNumber(pull.body) !== issueNumber ||
          !isAgentTaskBranchForIssue(pull.head.ref, issueNumber)) {
        throw new Error("Candidate outcome rejected: PR must remain the current open same-repository AI Task PR at the exact supplied head SHA and branch.");
      }
      const evidenceRecord = createFactoryCandidateEvidenceRecord({
        repository,
        issue_number: issueNumber,
        pull_request_number: evidence.pull_request_number,
        branch: candidateHeadRef,
        commit_sha: evidence.head_sha,
        ci_run_id: evidence.ci_run_id,
        ci_run_attempt: evidence.ci_run_attempt,
        conclusion: evidence.ci_conclusion,
        timestamp: new Date(timestamp).toISOString(),
      });
      const evidenceJson = JSON.stringify(evidenceRecord);
      const eventKey = env.AGENT_FACTORY_EVENT_KEY ||
        ("ci-run-" + evidence.ci_run_id + "-attempt-" + evidence.ci_run_attempt +
          "-issue-" + issueNumber + "-pr-" + evidence.pull_request_number +
          "-sha-" + evidence.head_sha.slice(0, 12) + "-" + evidence.ci_conclusion);
      if (evidence.ci_conclusion === "success") {
        const result = recordTaskSuccess(state, issueNumber, eventKey, evidence, timestamp);
        if (!result.duplicate) state = await persist(state, result.state);
        return { mode, state, outputs: { candidate_status: "success", duplicate: result.duplicate, candidate_evidence_json: result.duplicate ? "" : evidenceJson, state_version: state.state_version } };
      }
      if (evidence.ci_conclusion === "failure") {
        const result = recordCandidateFailure(state, issueNumber, eventKey, evidence, env.FAILURE_SUMMARY || "Candidate CI failed.", timestamp);
        if (!result.duplicate) state = await persist(state, result.state);
        const currentTask = state.tasks[String(issueNumber)];
        const retryAt = getTaskRetryAt(currentTask);
        if (currentTask?.status === "candidate_rejected" && !currentTask.quarantined &&
            Number.isFinite(retryAt) && retryAt <= timestamp) {
          const requeued = requeueTask(state, issueNumber, timestamp);
          if (requeued !== state) state = await persist(state, requeued);
        }
        return {
          mode,
          state,
          outputs: {
            candidate_status: state.tasks[String(issueNumber)]?.status ?? "",
            quarantined: Boolean(state.tasks[String(issueNumber)]?.quarantined),
            duplicate: result.duplicate,
            candidate_evidence_json: result.duplicate ? "" : evidenceJson,
            state_version: state.state_version,
          },
        };
      }
      throw new TypeError("CI_CONCLUSION must be success or failure.");
    }

    if (mode === "requeue") {
      const issueNumber = positiveInteger(env.ISSUE_NUMBER, "Issue number");
      const next = requeueTask(state, issueNumber, timestamp);
      state = await persist(state, next);
      return { mode, state, outputs: { issue_number: issueNumber, task_state: "queued", state_version: state.state_version } };
    }

    throw new TypeError("Unsupported agent factory mode: " + mode);
  }

  return Object.freeze({ run });
}
