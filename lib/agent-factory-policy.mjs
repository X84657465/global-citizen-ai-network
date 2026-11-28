
export function validatePlannerGenerationContract(plan, sourceTask) {
  if (!plan || !Array.isArray(plan.tasks) || plan.tasks.length === 0) {
    throw new Error("Generated planner contract requires a non-empty task list.");
  }

  if (plan.tasks.some((task) => task.max_output_bytes !== 16384)) {
    throw new Error("Every generated planner task must use numeric max_output_bytes 16384.");
  }

  const allowedPaths = Array.isArray(sourceTask?.allowed_paths) ? sourceTask.allowed_paths : [];
  if (allowedPaths.length === 0) return plan;

  const patchTasks = plan.tasks.filter((task) =>
    task.role === "implementer" && task.action === "propose_patch",
  );
  if (patchTasks.length !== 1) {
    throw new Error("Generated planner contract requires exactly one implementer propose_patch task.");
  }

  const patchTask = patchTasks[0];
  const hasPlannerInspection = patchTask.depends_on.some((dependency) =>
    plan.tasks.some((task) =>
      task.id === dependency && task.role === "planner" && task.action === "inspect",
    ),
  );
  if (!hasPlannerInspection) {
    throw new Error("Generated planner contract requires planner inspect before propose_patch.");
  }

  const hasTesterValidation = plan.tasks.some((task) =>
    task.role === "tester" &&
    task.action === "validate_patch" &&
    task.depends_on.includes(patchTask.id),
  );
  if (!hasTesterValidation) {
    throw new Error("Generated planner contract requires tester validate_patch after propose_patch.");
  }

  return plan;
}

export const FAILURE_THRESHOLD = 3;
export const COOLDOWN_MS = 15 * 60 * 1000;
export const MAX_API_COOLDOWN_MS = 24 * 60 * 60 * 1000;

export function cooldownActive(state, now = Date.now()) {
  const until = Date.parse(state?.cooldown_until ?? "");
  return Number.isFinite(until) && until > now;
}

export function apiCooldownUntil(error, now = Date.now()) {
  const message = String(error?.message ?? error ?? "");
  const status = Number(error?.status) || Number(/HTTP ([0-9]{3})/i.exec(message)?.[1]) || 0;
  const retryAfter = error?.retryAfter ?? /Retry-After=([^;]+)/i.exec(message)?.[1]?.trim();
  const resetHeader = error?.rateLimitReset ?? /rate-limit-reset=([^;]+)/i.exec(message)?.[1]?.trim();
  const candidates = [];

  if (retryAfter !== undefined && retryAfter !== null && String(retryAfter).trim() !== "") {
    const value = String(retryAfter).trim();
    const seconds = Number(value);
    const timestamp = Number.isFinite(seconds)
      ? now + Math.max(0, seconds) * 1000
      : Date.parse(value);
    if (Number.isFinite(timestamp) && timestamp > now) candidates.push(timestamp);
  }

  if (resetHeader !== undefined && resetHeader !== null && String(resetHeader).trim() !== "") {
    const value = Number(resetHeader);
    const timestamp = Number.isFinite(value) ? (value > 1e12 ? value : value * 1000) : Date.parse(String(resetHeader));
    if (Number.isFinite(timestamp) && timestamp > now) candidates.push(timestamp);
  }

  const rateLimited = status === 429 ||
    (status === 403 && /rate.?limit|secondary rate|abuse detection/i.test(message));
  const fallback = now + COOLDOWN_MS;
  const target = candidates.length ? Math.max(...candidates) : fallback;
  const bounded = Math.min(Math.max(target, now + 60_000), now + MAX_API_COOLDOWN_MS);
  if (rateLimited && !candidates.length) return new Date(fallback).toISOString();
  return new Date(bounded).toISOString();
}

export function nextFailureState(previous, errorSummary, now = Date.now(), issueNumber = null, scope = "system") {
  if (scope !== "task" && scope !== "system") {
    throw new TypeError("Failure scope must be explicitly task or system.");
  }

  const taskFailures = { ...(previous?.task_failures ?? {}) };
  const skipped = new Set(previous?.skipped_issue_numbers ?? []);
  const hasIssue = Number.isInteger(issueNumber) && issueNumber > 0;

  if (scope === "task") {
    if (!hasIssue) throw new TypeError("Task-scoped failures require a valid issue number.");
    const key = String(issueNumber);
    taskFailures[key] = Math.max(0, Number(taskFailures[key]) || 0) + 1;
    if (taskFailures[key] >= FAILURE_THRESHOLD) skipped.add(issueNumber);

    return {
      ...previous,
      consecutive_failures: Math.max(0, Number(previous?.consecutive_failures) || 0),
      cooldown_until: previous?.cooldown_until ?? null,
      task_failures: taskFailures,
      skipped_issue_numbers: [...skipped].sort((a, b) => a - b),
      last_task_failure_at: new Date(now).toISOString(),
      last_task_error: String(errorSummary || "Unspecified task failure").slice(0, 1200),
      updated_at: new Date(now).toISOString(),
    };
  }

  const failures = Math.max(0, Number(previous?.consecutive_failures) || 0) + 1;
  return {
    ...previous,
    consecutive_failures: failures,
    cooldown_until: failures >= FAILURE_THRESHOLD ? new Date(now + COOLDOWN_MS).toISOString() : null,
    task_failures: taskFailures,
    skipped_issue_numbers: [...skipped].sort((a, b) => a - b),
    last_failure_at: new Date(now).toISOString(),
    last_error: String(errorSummary || "Unspecified system failure").slice(0, 1200),
    updated_at: new Date(now).toISOString(),
  };
}

export function successState(now = Date.now(), previous = {}, issueNumber = null, scope = "system") {
  if (scope !== "task" && scope !== "system" && scope !== "task_and_system") {
    throw new TypeError("Success scope must be task, system, or task_and_system.");
  }

  if (scope === "task_and_system") {
    if (!Number.isInteger(issueNumber) || issueNumber < 1) {
      throw new TypeError("Combined task and system success requires a valid issue number.");
    }
    const taskReset = successState(now, previous, issueNumber, "task");
    return successState(now, taskReset, null, "system");
  }

  const taskFailures = { ...(previous?.task_failures ?? {}) };
  const skipped = new Set(previous?.skipped_issue_numbers ?? []);

  if (scope === "task") {
    if (!Number.isInteger(issueNumber) || issueNumber < 1) {
      throw new TypeError("Task-scoped success requires a valid issue number.");
    }
    delete taskFailures[String(issueNumber)];
    skipped.delete(issueNumber);
    return {
      ...previous,
      task_failures: taskFailures,
      skipped_issue_numbers: [...skipped].sort((a, b) => a - b),
      last_task_success_at: new Date(now).toISOString(),
      last_task_error: null,
      updated_at: new Date(now).toISOString(),
    };
  }

  return {
    ...previous,
    consecutive_failures: 0,
    cooldown_until: null,
    task_failures: taskFailures,
    skipped_issue_numbers: [...skipped].sort((a, b) => a - b),
    last_failure_at: null,
    last_error: null,
    updated_at: new Date(now).toISOString(),
  };
}


const plannerTasks = [
  {
    title: "[AI Task] Factory: verify durable cross-executor Issue reservation and lease fencing",
    goal: "Verify the Agent Factory V2 coordinator contract for atomic GitHub Issue reservation, lease ownership, fencing tokens, and duplicate-worker exclusion. Record executable evidence and unresolved deployment gaps without changing production control-plane code.",
    paths: ["tests/agent-factory-coordinator-contract.test.mjs"],
    criteria: [
      "Cover concurrent reservation attempts and prove only one executor owns a task lease.",
      "Verify stale lease holders cannot commit state or publish a candidate after fencing changes.",
      "Record exact test commands and distinguish local contract tests from deployed coordinator evidence."
    ],
    exclusions: [
      "Do not change production coordinator, scheduler, workflow, permissions, secrets, or deployment.",
      "Do not claim a deployed cross-executor coordinator exists without live, independently verifiable evidence."
    ]
  },
  {
    title: "[AI Task] Factory: test idempotent dispatch and crash-restart task recovery",
    goal: "Verify Agent Factory V2 durable dispatch across duplicate delivery, worker crash, process restart, stale lease recovery, and replay. Keep the work limited to isolated integration tests and report any missing shared-state or deployed-worker dependency.",
    paths: ["tests/agent-factory-dispatch-recovery.integration.test.mjs"],
    criteria: [
      "Prove duplicate dispatch does not create duplicate active work or duplicate publication.",
      "Exercise crash-after-reservation, crash-after-dispatch, restart, lease expiry, and replay scenarios.",
      "Assert recovered work preserves task identity and monotonic state transitions."
    ],
    exclusions: [
      "Do not modify the task selector, validator, publisher, control-plane implementation, or machine-managed Issue #100.",
      "Do not reset retry counters, quarantine, leases, cooldowns, or circuit-breaker state."
    ]
  },
  {
    title: "[AI Task] Factory: verify exact-SHA trusted acceptance and recovery evidence",
    goal: "Build a reproducible Agent Factory V2 acceptance test matrix for exact-head CI evidence, independent reviewer approval, publication identity, merge eligibility, and recovery after interrupted delivery.",
    paths: ["tests/agent-factory-acceptance-evidence.test.mjs", "docs/agent-factory-acceptance-evidence.md"],
    criteria: [
      "Reject stale-head CI, skipped or missing jobs, no-op acceptance runs, and self-review as independent approval.",
      "Require a formal independent APPROVED review tied to the exact candidate HEAD before acceptance.",
      "Distinguish SUCCESS, FAILURE, CANCELLED, SKIPPED, PENDING, and NOT RUN in the evidence record."
    ],
    exclusions: [
      "Do not alter branch protection, merge policy, review requirements, production deployment, or external provider credentials.",
      "Do not mark the Factory autonomous-delivery loop complete from a partial or simulated test."
    ]
  }
];

export function nextPlannerTask(existingTitles = []) {
  const known = new Set(existingTitles.map((title) => String(title).toLowerCase()));
  return plannerTasks.find((task) => !known.has(task.title.toLowerCase())) ?? null;
}

export function plannerIssueBody(task) {
  const bullets = (items) => items.map((item) => "- " + item).join("\n");
  const acceptance = [
    ...task.criteria,
    "The read-only planner JSON must contain exactly one implementer task with action `propose_patch` and numeric `max_output_bytes: 16384` (integer, not string). Preserve the inspect → propose_patch → validate_patch dependency chain."
  ];
  return [
    "<!-- ai-task-generated-by-planner -->",
    "## Goal", task.goal, "",
    "## Allowed paths", bullets(task.paths), "",
    "## Acceptance criteria", bullets(acceptance), "",
    "## Explicit exclusions", bullets(task.exclusions), "",
  ].join("\n");
}

export function candidateContainerFailureScope(state, dockerStartExitCode = state?.DockerStartExitCode) {
  if (!state || typeof state !== "object" || Array.isArray(state)) return "system";
  if (String(state.Error ?? "").trim() !== "") return "system";
  if (state.Status !== "exited") return "system";

  // Docker reports OOM kills and dead containers as exited processes too.
  // Missing or non-boolean runtime flags are incomplete evidence and fail closed.
  // Only an explicit false for both flags permits candidate-test classification.
  if (state.OOMKilled !== false || state.Dead !== false) return "system";

  // Docker inspect evidence must contain an actual, canonical exit code.
  // Number(null), Number(""), and Number(false) all become zero; accepting
  // those coercions could turn missing or malformed evidence into success.
  const rawExitCode = state.ExitCode;
  let exitCode;
  if (typeof rawExitCode === "number") {
    if (!Number.isSafeInteger(rawExitCode) || rawExitCode < 0) return "system";
    exitCode = rawExitCode;
  } else if (typeof rawExitCode === "string" && /^(0|[1-9][0-9]*)$/.test(rawExitCode)) {
    exitCode = Number(rawExitCode);
    if (!Number.isSafeInteger(exitCode)) return "system";
  } else {
    return "system";
  }

  // When the Docker CLI exit code is available, it must agree with the
  // inspected container process exit code. A disagreement can indicate an
  // attach/transport/daemon failure and must never be accepted as candidate success.
  // A matching non-zero process exit is explicit evidence for task-scoped failure.
  if (dockerStartExitCode !== undefined) {
    if (!Number.isSafeInteger(dockerStartExitCode) || dockerStartExitCode < 0) return "system";
    if (dockerStartExitCode !== exitCode) return "system";
  }

  // 130 and 143 conventionally represent SIGINT and SIGTERM. Like SIGKILL,
  // Docker inspect metadata cannot prove whether these signals came from the
  // candidate or an external cancellation/termination. Fail closed to system
  // scope so infrastructure cancellation cannot consume task retry/quarantine.
  if (exitCode === 130 || exitCode === 137 || exitCode === 143) return "system";

  return exitCode === 0 ? "none" : "task";
}
