import { nextPlannerTask, plannerIssueBody } from "./agent-factory-policy.mjs";
import { isMergedTaskPullRequest } from "./agent-task-queue.mjs";
import { collectGitHubPages } from "./github-pagination.mjs";
import {
  isSystemCooldownActive,
  recordCandidateFailure,
  recordCandidateStarted,
  recordSystemFailure,
  recordSystemSuccess,
  recordTaskFailure,
  recordTaskSuccess,
  getTaskRetryAt,
  recoverExpiredLease,
  requeueTask,
  reserveTask,
  transitionTask,
} from "./agent-factory-state-machine.mjs";

const RUNNING_WORKFLOW_STATES = new Set(["queued", "requested", "waiting", "pending", "in_progress"]);

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

function makeEventKey(env, suffix) {
  const runId = requiredString(env.GITHUB_RUN_ID ?? env.WORKFLOW_RUN_ID, "Workflow run ID");
  const attempt = positiveInteger(env.GITHUB_RUN_ATTEMPT ?? env.WORKFLOW_RUN_ATTEMPT, "Workflow run attempt");
  return "workflow-run-" + runId + "-attempt-" + attempt + "-" + suffix;
}

export function createAgentFactoryController({ store, api, repository, now = Date.now }) {
  if (!store || typeof store.read !== "function" || typeof store.write !== "function" || typeof store.migrate !== "function") {
    throw new TypeError("A durable factory state store is required.");
  }
  if (typeof repository !== "string" || !/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository)) {
    throw new TypeError("A valid repository name is required.");
  }

  async function load() {
    return store.migrate();
  }

  async function persist(previous, next) {
    if (next === previous) return previous;
    const result = await store.write(previous.state_version, next);
    return result?.state ?? next;
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
    const eventKey = "lease-recovery-run-" + active.workflow_run_id + "-attempt-" + active.run_attempt;
    const result = recoverExpiredLease(state, { workflow_still_running: false, event_key: eventKey }, timestamp);
    if (!result.recovered) return { state: result.state, recovered: false, reason: result.reason };
    const saved = await persist(state, result.state);
    return { state: saved, recovered: true, issue_number: result.issue_number };
  }

  async function requeueReadyTasks(state, timestamp) {
    let current = state;
    let requeued = 0;
    for (const [issueNumber, task] of Object.entries(current.tasks)) {
      const retryAt = getTaskRetryAt(task);
      const retryReady = task.status === "retry_wait" &&
        Number.isFinite(retryAt) && retryAt <= timestamp;
      const candidateReady = task.status === "candidate_rejected" && task.candidate_status === "failure" &&
        !task.quarantined && Number.isFinite(retryAt) && retryAt <= timestamp;
      if (!retryReady && !candidateReady) continue;
      const next = requeueTask(current, Number(issueNumber), timestamp);
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
      if (!loaded.issue && typeof store.getStateIssueNumber === "function" && store.getStateIssueNumber() === null) {
        const initialized = {
          ...state,
          state_version: state.state_version + 1,
          updated_at: new Date(timestamp).toISOString(),
        };
        state = await persist(state, initialized);
      }
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

    const loaded = await load();
    let state = loaded.state;

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
        result = recordSystemFailure(state, eventKey, errorCode, summary, timestamp);
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
      const eventKey = env.AGENT_FACTORY_EVENT_KEY || makeEventKey(env, "task-publication-success");
      const result = recordSystemSuccess(state, eventKey, timestamp);
      if (!result.duplicate) state = await persist(state, result.state);
      return { mode, state, outputs: { duplicate: result.duplicate, cooldown_active: isSystemCooldownActive(state, timestamp), state_version: state.state_version } };
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
      if (!existingTask?.pull_request_number) {
        if (!api || typeof api.request !== "function") {
          throw new Error("Legacy candidate PR requires GitHub Issue ownership verification.");
        }
        const issue = await api.request("/repos/" + repository + "/issues/" + issueNumber);
        const owner = repository.split("/")[0];
        if (issue?.state !== "open" || issue?.user?.login !== owner ||
            typeof issue?.title !== "string" || !issue.title.startsWith("[AI Task]")) {
          throw new Error("Candidate PR does not reference an open owner-authored AI Task Issue.");
        }
      }
      const result = recordCandidateStarted(state, issueNumber, eventKey, evidence, timestamp);
      if (!result.duplicate) state = await persist(state, result.state);
      return {
        mode,
        state,
        outputs: {
          candidate_status: "pending",
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
      const evidence = {
        pull_request_number: positiveInteger(env.PULL_REQUEST_NUMBER, "Pull request number"),
        head_sha: requiredString(env.HEAD_SHA, "Candidate head SHA"),
        ci_conclusion: requiredString(env.CI_CONCLUSION, "CI conclusion"),
        ci_run_id: requiredString(env.CI_RUN_ID, "CI run ID"),
        ci_run_attempt: positiveInteger(env.CI_RUN_ATTEMPT, "CI run attempt"),
      };
      const eventKey = env.AGENT_FACTORY_EVENT_KEY ||
        ("ci-run-" + evidence.ci_run_id + "-attempt-" + evidence.ci_run_attempt +
          "-issue-" + issueNumber + "-pr-" + evidence.pull_request_number +
          "-sha-" + evidence.head_sha.slice(0, 12) + "-" + evidence.ci_conclusion);
      if (evidence.ci_conclusion === "success") {
        const result = recordTaskSuccess(state, issueNumber, eventKey, evidence, timestamp);
        if (!result.duplicate) state = await persist(state, result.state);
        const systemResult = recordSystemSuccess(state, eventKey + "-system-success", timestamp);
        if (!systemResult.duplicate) state = await persist(state, systemResult.state);
        const duplicate = result.duplicate && systemResult.duplicate;
        return { mode, state, outputs: { candidate_status: "success", duplicate, state_version: state.state_version } };
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
