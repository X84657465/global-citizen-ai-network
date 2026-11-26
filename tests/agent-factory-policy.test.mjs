import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { FAILURE_THRESHOLD, COOLDOWN_MS, cooldownActive, apiCooldownUntil, nextFailureState, nextPlannerTask, plannerIssueBody, successState, candidateContainerFailureScope } from "../lib/agent-factory-policy.mjs";
import { inferTaskIssueNumber } from "../lib/agent-failure-context.mjs";
import { createGitHubApiClient } from "../lib/github-api-client.mjs";

test("task-scoped failures quarantine only their issue and never increment the global breaker", () => {
  const now = Date.parse("2026-11-19T00:00:00.000Z");
  const previous = { consecutive_failures: 2, cooldown_until: null, task_failures: { "456": 1 }, skipped_issue_numbers: [] };
  const first = nextFailureState(previous, "invalid task spec", now, 123, "task");
  const second = nextFailureState(first, "invalid task spec", now + 1000, 123, "task");
  const third = nextFailureState(second, "invalid task spec", now + 2000, 123, "task");

  assert.equal(FAILURE_THRESHOLD, 3);
  assert.equal(third.consecutive_failures, 2);
  assert.equal(third.cooldown_until, null);
  assert.equal(third.task_failures["123"], 3);
  assert.equal(third.task_failures["456"], 1);
  assert.deepEqual(third.skipped_issue_numbers, [123]);
  assert.equal(cooldownActive(third, now + 3000), false);
});

test("system-scoped failures activate the global cooldown and preserve task quarantine state", () => {
  const now = Date.parse("2026-11-19T00:00:00.000Z");
  const previous = { task_failures: { "123": 2 }, skipped_issue_numbers: [123] };
  const first = nextFailureState(previous, "runner offline", now, 123, "system");
  const second = nextFailureState(first, "runner offline", now + 1000, 123, "system");
  const third = nextFailureState(second, "runner offline", now + 2000, 123, "system");

  assert.equal(third.consecutive_failures, 3);
  assert.equal(third.task_failures["123"], 2);
  assert.deepEqual(third.skipped_issue_numbers, [123]);
  assert.equal(Date.parse(third.cooldown_until), now + 2000 + COOLDOWN_MS);
  assert.equal(cooldownActive(third, now + 3000), true);
  assert.equal(cooldownActive(third, now + 2000 + COOLDOWN_MS + 1), false);
});

test("task-scoped success clears only that task and leaves the global breaker untouched", () => {
  const previous = {
    consecutive_failures: 2,
    cooldown_until: "2026-11-19T00:20:00.000Z",
    task_failures: { "12": 2, "13": 1 },
    skipped_issue_numbers: [12],
    last_error: "shared infrastructure failure",
    last_task_error: "previous task failure",
  };
  const reset = successState(1234, previous, 12, "task");

  assert.equal(reset.consecutive_failures, 2);
  assert.equal(reset.cooldown_until, previous.cooldown_until);
  assert.equal(reset.last_error, previous.last_error);
  assert.equal(reset.last_task_error, null);
  assert.deepEqual(reset.task_failures, { "13": 1 });
  assert.deepEqual(reset.skipped_issue_numbers, []);
});

test("system-scoped success resets only the global breaker and preserves task retry history", () => {
  const previous = {
    consecutive_failures: 4,
    cooldown_until: "2026-11-19T00:20:00.000Z",
    task_failures: { "12": 2 },
    skipped_issue_numbers: [12],
  };
  const reset = successState(1234, previous, null, "system");

  assert.equal(reset.consecutive_failures, 0);
  assert.equal(reset.cooldown_until, null);
  assert.deepEqual(reset.task_failures, { "12": 2 });
  assert.deepEqual(reset.skipped_issue_numbers, [12]);
});

test("task-scoped state transitions require an issue number and an explicit supported scope", () => {
  assert.throws(() => nextFailureState({}, "invalid", 1, null, "task"), /valid issue number/);
  assert.throws(() => successState(1, {}, null, "task"), /valid issue number/);
  assert.throws(() => nextFailureState({}, "invalid", 1, 1, "unknown"), /scope/);
});

test("API cooldown honors numeric Retry-After seconds", () => {
  const now = Date.parse("2026-11-19T00:00:00.000Z");
  assert.equal(apiCooldownUntil({ status: 429, retryAfter: "120" }, now), new Date(now + 120_000).toISOString());
});

test("API cooldown honors HTTP-date Retry-After", () => {
  const now = Date.parse("2026-11-19T00:00:00.000Z");
  const retryAt = new Date(now + 90_000).toUTCString();
  assert.equal(apiCooldownUntil({ status: 503, retryAfter: retryAt }, now), new Date(now + 90_000).toISOString());
});

test("API cooldown honors x-ratelimit-reset epoch seconds and falls back safely", () => {
  const now = Date.parse("2026-11-19T00:00:00.000Z");
  assert.equal(apiCooldownUntil({ status: 403, message: "API rate limit exceeded", rateLimitReset: String((now + 600_000) / 1000) }, now), new Date(now + 600_000).toISOString());
  assert.equal(apiCooldownUntil({ status: 429, message: "rate limit exceeded" }, now), new Date(now + COOLDOWN_MS).toISOString());
});

test("planner emits finite deduplicated four-section Runner tasks", () => {
  const task = nextPlannerTask([]);
  assert.ok(task);
  const body = plannerIssueBody(task);
  for (const heading of ["Goal", "Allowed paths", "Acceptance criteria", "Explicit exclusions"]) assert.equal(body.split("## " + heading).length - 1, 1);
  assert.match(body, /<!-- ai-task-generated-by-planner -->/);
  const titles = [task.title];
  let next = nextPlannerTask(titles);
  assert.ok(next);
  assert.notEqual(next.title, task.title);
  titles.push(next.title);
  next = nextPlannerTask(titles);
  assert.ok(next);
  titles.push(next.title);
  assert.equal(nextPlannerTask(titles), null);
});


test("infers task identity from both AI task and codex issue branches", () => {
  assert.equal(inferTaskIssueNumber({ branch: "ai-task/issue-3-abc", body: "<!-- ai-task:3 -->" }), 3);
  assert.equal(inferTaskIssueNumber({ branch: "codex/issue-121-dedupe-ci-triggers" }), 121);
  assert.equal(inferTaskIssueNumber({ body: "<!-- ai-task:94 -->" }), 94);
});

test("rejects mismatched task branch and pull-request issue markers", () => {
  assert.equal(inferTaskIssueNumber({ branch: "codex/issue-121-fix", body: "<!-- ai-task:120 -->" }), null);
  assert.equal(inferTaskIssueNumber({ branch: "review/no-issue", body: "Closes #121" }), null);
});


test("declares the cooldown output writer before the local cooldown fast path", () => {
  const controller = readFileSync(new URL("../scripts/agent-factory-controller.mjs", import.meta.url), "utf8");
  const writer = controller.indexOf("const writeOutput =");
  const fastPath = controller.indexOf('if (mode === "check" && cooldownActive(localState))');
  assert.ok(writer >= 0);
  assert.ok(fastPath > writer);
});


test("does not persist unrelated review-branch CI failures into the factory circuit breaker", () => {
  const workflow = readFileSync(new URL("../.github/workflows/ci.yml", import.meta.url), "utf8");
  const start = workflow.indexOf("  circuit-breaker:");
  assert.ok(start >= 0);
  const job = workflow.slice(start);
  assert.ok(job.includes("github.event_name == 'push'"));
  assert.ok(job.includes("github.ref == 'refs/heads/main'"));
  assert.ok(job.includes("github.event_name == 'pull_request'"));
  assert.ok(job.includes("github.event.pull_request.head.repo.full_name == github.repository"));
  assert.ok(job.includes("startsWith(github.event.pull_request.head.ref, 'ai-task/issue-')"));
  assert.ok(job.includes("startsWith(github.event.pull_request.head.ref, 'codex/issue-')"));
  assert.ok(job.includes("github.event_name == 'repository_dispatch'"));
  assert.ok(job.includes("github.event.action == 'ai-task-ci'"));
  assert.ok(job.includes("pull-requests: read"));
  assert.equal(job.includes("review/"), false);
});


test("persists candidate CI success only after exact-head quality and database gates", () => {
  const workflow = readFileSync(new URL("../.github/workflows/ci.yml", import.meta.url), "utf8");
  const start = workflow.indexOf("  circuit-breaker-success:");
  assert.ok(start >= 0);
  const job = workflow.slice(start);
  assert.ok(job.includes("needs.build.result == 'success'"));
  assert.ok(job.includes("needs.database.result == 'success'"));
  assert.ok(job.includes("needs.resolve-candidate.outputs.is_current_head == 'true'"));
  assert.ok(job.includes("AGENT_FACTORY_MODE: candidate"));
  assert.equal(job.includes("AGENT_FACTORY_MODE: success"), false);
  assert.ok(job.includes("CI_CONCLUSION: success"));
  assert.ok(job.includes("PULL_REQUEST_NUMBER: ${{ steps.revalidate.outputs.pull_request_number }}"));
  assert.ok(job.includes("HEAD_SHA: ${{ steps.revalidate.outputs.head_sha }}"));
  assert.ok(job.includes("CI_RUN_ID: ${{ github.run_id }}"));
  assert.ok(job.includes("CI_RUN_ATTEMPT: ${{ github.run_attempt }}"));
  assert.ok(job.includes("pull-requests: read"));
  assert.equal(job.includes("review/"), false);

  const healthWorkflow = readFileSync(new URL("../.github/workflows/agent-factory-system-health.yml", import.meta.url), "utf8");
  assert.ok(healthWorkflow.includes('process.env.WORKFLOW_CONCLUSION === "success"'));
  assert.ok(healthWorkflow.includes('process.env.WORKFLOW_EVENT === "pull_request"'));
  assert.ok(healthWorkflow.includes('process.env.WORKFLOW_PATH === ".github/workflows/ci.yml"'));
  assert.ok(healthWorkflow.includes('process.env.WORKFLOW_HEAD_REPOSITORY === process.env.GITHUB_REPOSITORY'));
  assert.ok(healthWorkflow.includes("AGENT_FACTORY_MODE: system-health-success"));
  assert.ok(healthWorkflow.includes("AGENT_FACTORY_MODE: system-health-success"));
  assert.ok(healthWorkflow.includes("SYSTEM_HEALTH_RUN_ID: ${{ github.event.workflow_run.id }}"));
  assert.ok(healthWorkflow.includes("SYSTEM_HEALTH_HEAD_SHA: ${{ github.event.workflow_run.head_sha }}"));
});


test("verified task CI success clears both that task's quarantine and the global breaker", () => {
  const previous = {
    consecutive_failures: 17,
    cooldown_until: "2026-11-19T04:22:47.792Z",
    task_failures: { "116": 3, "121": 1 },
    skipped_issue_numbers: [116],
    last_error: "old global failure",
  };
  const reset = successState(1234, previous, 116, "task_and_system");
  assert.equal(reset.consecutive_failures, 0);
  assert.equal(reset.cooldown_until, null);
  assert.deepEqual(reset.task_failures, { "121": 1 });
  assert.deepEqual(reset.skipped_issue_numbers, []);
  assert.equal(reset.last_error, null);
});


test("AI task publisher requires explicit human approval and never promises automatic merge", () => {
  const publisher = readFileSync(new URL("../scripts/publish-agent-patch.mjs", import.meta.url), "utf8");
  assert.ok(publisher.includes('merge_policy: "human_approval_required"'));
  assert.ok(publisher.includes("automatic_merge: false"));
  assert.ok(publisher.includes("a human must review and explicitly approve the PR before any merge"));
  assert.ok(publisher.includes("A human must review and explicitly merge the pull request."));
  assert.equal(publisher.includes("automatic_merge_policy"), false);
  assert.equal(publisher.includes("ci_gated_squash"), false);
  assert.equal(/will be squash-merged automatically/i.test(publisher), false);
});


test("preserves the reserved lease environment for the task-failure recorder", () => {
  const workflow = readFileSync(new URL("../.github/workflows/agent-task-preflight.yml", import.meta.url), "utf8");
  const start = workflow.indexOf("      - name: Record failed task and activate cooldown after three consecutive failures");
  assert.ok(start >= 0, "factory failure recorder step must exist");
  const next = workflow.indexOf("      - name:", start + 10);
  const section = workflow.slice(start, next < 0 ? workflow.length : next);

  assert.doesNotMatch(
    section,
    /AGENT_FACTORY_LEASE_ID\s*:/,
    "the failure step must inherit the lease ID from GITHUB_ENV instead of shadowing it"
  );
  assert.match(section, /FAILED_ISSUE_NUMBER:/);
  assert.match(section, /AGENT_FACTORY_MODE:\s*failure/);

  const controller = readFileSync(new URL("../scripts/agent-factory-v2-controller.mjs", import.meta.url), "utf8");
  assert.match(
    controller,
    /writeEnv\("AGENT_FACTORY_LEASE_ID",\s*result\.outputs\.lease_id\)/,
    "the reserve controller must publish the lease ID to GITHUB_ENV for subsequent steps"
  );
});


test("durable cooldown preserves Retry-After from a classified GitHub API error", async () => {
  const now = Date.parse("2026-11-22T00:00:00.000Z");
  const client = createGitHubApiClient({
    now: () => now,
    maxInlineRetryDelayMs: 30_000,
    fetchImpl: async () => ({
      ok: false,
      status: 429,
      statusText: "Too Many Requests",
      headers: { get: (name) => name.toLowerCase() === "retry-after" ? "300" : null },
      text: async () => JSON.stringify({ message: "API rate limit exceeded" }),
    }),
    sleep: async () => { throw new Error("long provider wait must not sleep inline"); },
  });

  await assert.rejects(client.request("/rate_limit"), (error) => {
    assert.equal(error.rateLimited, true);
    assert.equal(error.retryAfter, "300");
    assert.equal(error.retryAfterMs, 300_000);
    assert.equal(apiCooldownUntil(error, now), new Date(now + 300_000).toISOString());
    return true;
  });
});

test("durable cooldown preserves x-ratelimit-reset from a classified secondary rate-limit error", async () => {
  const now = Date.parse("2026-11-22T00:00:00.000Z");
  const resetSeconds = String((now + 15 * 60_000) / 1000);
  const client = createGitHubApiClient({
    now: () => now,
    maxInlineRetryDelayMs: 30_000,
    fetchImpl: async () => ({
      ok: false,
      status: 403,
      statusText: "Forbidden",
      headers: {
        get: (name) => ({
          "x-ratelimit-remaining": "0",
          "x-ratelimit-reset": resetSeconds,
        })[name.toLowerCase()] ?? null,
      },
      text: async () => JSON.stringify({ message: "You have exceeded a secondary rate limit." }),
    }),
    sleep: async () => { throw new Error("long provider wait must not sleep inline"); },
  });

  await assert.rejects(client.request("/repos/example/repo/issues"), (error) => {
    assert.equal(error.rateLimited, true);
    assert.equal(error.rateLimitReset, resetSeconds);
    assert.equal(apiCooldownUntil(error, now), new Date(now + 15 * 60_000).toISOString());
    return true;
  });
});

test("candidate container command failures are task-scoped only after a normal container exit with explicit healthy runtime flags", () => {
  const healthyRuntime = { Status: "exited", Error: "", OOMKilled: false, Dead: false };
  assert.equal(candidateContainerFailureScope({ ...healthyRuntime, ExitCode: 1 }), "task");
  assert.equal(candidateContainerFailureScope({ ...healthyRuntime, ExitCode: 0 }), "none");
});

test("candidate container startup and runtime failures remain system-scoped", () => {
  assert.equal(candidateContainerFailureScope({ Status: "created", Error: "", ExitCode: 0 }), "system");
  assert.equal(candidateContainerFailureScope({ Status: "exited", Error: "OCI runtime create failed", ExitCode: 126 }), "system");
});

test("unclassified candidate container outcomes fail closed to system scope", () => {
  assert.equal(candidateContainerFailureScope(null), "system");
  assert.equal(candidateContainerFailureScope({ Status: "unknown", ExitCode: 1 }), "system");
  assert.equal(candidateContainerFailureScope({ Status: "exited", Error: "", ExitCode: "not-a-number" }), "system");
  assert.equal(candidateContainerFailureScope({ Status: "exited", Error: "", ExitCode: null }), "system");
  assert.equal(candidateContainerFailureScope({ Status: "exited", Error: "" }), "system");
  assert.equal(candidateContainerFailureScope({ Status: "exited", Error: "", ExitCode: "" }), "system");
  assert.equal(candidateContainerFailureScope({ Status: "exited", Error: "", ExitCode: false }), "system");
  assert.equal(candidateContainerFailureScope({ Status: "exited", Error: "", ExitCode: 1.5 }), "system");
  assert.equal(candidateContainerFailureScope({ Status: "exited", Error: "", ExitCode: Number.MAX_SAFE_INTEGER + 1 }), "system");
  assert.equal(candidateContainerFailureScope({ Status: "exited", Error: "", ExitCode: "9007199254740992" }), "system");
  assert.equal(candidateContainerFailureScope({ Status: "exited", Error: "", OOMKilled: false, Dead: false, ExitCode: "0" }), "none");
  assert.equal(candidateContainerFailureScope({ Status: "exited", Error: "", OOMKilled: false, Dead: false, ExitCode: "2" }), "task");
});


test("scratch failures require an explicit task-scope marker", () => {
  const workflow = readFileSync(new URL("../.github/workflows/agent-task-preflight.yml", import.meta.url), "utf8");
  const start = workflow.indexOf("      - name: Classify known task-scoped failures before updating factory state");
  assert.ok(start >= 0, "failure classifier step must exist");
  const next = workflow.indexOf("\n      - name:", start + 1);
  const section = workflow.slice(start, next < 0 ? workflow.length : next);

  assert.match(section, /AGENT_FACTORY_FAILURE_SCOPE -eq "task"/);
  assert.doesNotMatch(section, /APPLY_SCRATCH_OUTCOME|steps.*apply-scratch.*outcome/);
  assert.match(section, /defaulting to system-scoped/);
});

test("scratch cleanup completes before failure classification and recording", () => {
  const workflow = readFileSync(new URL("../.github/workflows/agent-task-preflight.yml", import.meta.url), "utf8");
  const cleanup = workflow.indexOf("      - name: Clean disposable scratch workspace");
  const classifier = workflow.indexOf("      - name: Classify known task-scoped failures before updating factory state");
  const recorder = workflow.indexOf("      - name: Record failed task and activate cooldown after three consecutive failures");
  assert.ok(cleanup >= 0);
  assert.ok(classifier > cleanup);
  assert.ok(recorder > classifier);

  const cleanupSection = workflow.slice(cleanup, classifier);
  assert.ok(cleanupSection.includes("id: cleanup-scratch"));
  assert.ok(cleanupSection.includes("if: always()"));
  assert.ok(cleanupSection.includes('$ErrorActionPreference = "Stop"'));

  const classifierNext = workflow.indexOf("\n      - name:", classifier);
  const classifierSection = workflow.slice(classifier, classifierNext < 0 ? workflow.length : classifierNext);
  assert.ok(classifierSection.includes("SCRATCH_CLEANUP_OUTCOME: ${{ steps.cleanup-scratch.outcome }}"));
  assert.ok(classifierSection.includes('Write-Host "Scratch cleanup failed; effective failure scope is system."'));

  const recorderNext = workflow.indexOf("\n      - name:", recorder);
  const recorderSection = workflow.slice(recorder, recorderNext < 0 ? workflow.length : recorderNext);
  assert.ok(recorderSection.includes("SCRATCH_CLEANUP_OUTCOME: ${{ steps.cleanup-scratch.outcome }}"));
  assert.ok(recorderSection.includes('if ($env:SCRATCH_CLEANUP_OUTCOME -eq "failure")'));
  assert.ok(recorderSection.includes('$env:AGENT_FACTORY_FAILURE_SCOPE = "system"'));
});

test("task preflight marks only typed validation errors after successful GitHub issue lookup", () => {
  const source = readFileSync(new URL("../scripts/prepare-agent-task.mjs", import.meta.url), "utf8");
  assert.match(source, /import \{ TaskValidationError, validateAndBuildTask \}/);
  const lookup = source.indexOf('issue = await githubApi.request("/repos/" + repository + "/issues/" + issueNumber)');
  const validation = source.indexOf("task = validateAndBuildTask(issue, repository)");
  const validationCatch = source.indexOf("catch (error)", validation);
  const typedGuard = source.indexOf("if (error instanceof TaskValidationError)", validationCatch);
  const markerCall = source.indexOf("markTaskScopedFailure()", typedGuard);
  assert.ok(lookup >= 0);
  assert.ok(validation > lookup);
  assert.ok(validationCatch > validation);
  assert.ok(typedGuard > validationCatch);
  assert.ok(markerCall > typedGuard);
  assert.equal(source.slice(lookup, validation).includes("markTaskScopedFailure()"), false);
  assert.match(source.slice(typedGuard, source.indexOf("fail(", typedGuard)), /try\s*\{\s*markTaskScopedFailure\(\);\s*\}\s*catch/);
});


test("candidate container classification requires Docker start exit to match inspected process exit", () => {
  const clean = { Status: "exited", Error: "", ExitCode: 0, OOMKilled: false, Dead: false };
  assert.equal(candidateContainerFailureScope(clean, 0), "none");
  assert.equal(candidateContainerFailureScope(clean, 1), "system");
  assert.equal(candidateContainerFailureScope({ ...clean, ExitCode: 1 }, 1), "task");
  assert.equal(candidateContainerFailureScope({ ...clean, ExitCode: 2 }, 1), "system");
  assert.equal(candidateContainerFailureScope({ ...clean, ExitCode: 137 }, 137), "system");
  assert.equal(candidateContainerFailureScope(clean, "0"), "system");
});



test("candidate container classification reads Docker start exit evidence from the state default parameter", () => {
  const clean = { Status: "exited", Error: "", ExitCode: 0, OOMKilled: false, Dead: false };
  assert.equal(candidateContainerFailureScope({ ...clean, DockerStartExitCode: 0 }), "none");
  assert.equal(candidateContainerFailureScope({ ...clean, DockerStartExitCode: 1 }), "system");
});
