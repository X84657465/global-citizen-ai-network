export const FAILURE_THRESHOLD = 3;
export const COOLDOWN_MS = 15 * 60 * 1000;

export function cooldownActive(state, now = Date.now()) {
  const until = Date.parse(state?.cooldown_until ?? "");
  return Number.isFinite(until) && until > now;
}

export function nextFailureState(previous, errorSummary, now = Date.now(), issueNumber = null) {
  const failures = Math.max(0, Number(previous?.consecutive_failures) || 0) + 1;
  const taskFailures = { ...(previous?.task_failures ?? {}) };
  const skipped = new Set(previous?.skipped_issue_numbers ?? []);
  if (Number.isInteger(issueNumber) && issueNumber > 0) {
    const key = String(issueNumber);
    taskFailures[key] = Math.max(0, Number(taskFailures[key]) || 0) + 1;
    if (taskFailures[key] >= FAILURE_THRESHOLD) skipped.add(issueNumber);
  }
  return {
    consecutive_failures: failures,
    cooldown_until: failures >= FAILURE_THRESHOLD ? new Date(now + COOLDOWN_MS).toISOString() : null,
    task_failures: taskFailures,
    skipped_issue_numbers: [...skipped].sort((a, b) => a - b),
    last_failure_at: new Date(now).toISOString(),
    last_error: String(errorSummary || "Unspecified task failure").slice(0, 1200),
    updated_at: new Date(now).toISOString(),
  };
}

export function successState(now = Date.now(), previous = {}, issueNumber = null) {
  const taskFailures = { ...(previous?.task_failures ?? {}) };
  const skipped = new Set(previous?.skipped_issue_numbers ?? []);
  if (Number.isInteger(issueNumber) && issueNumber > 0) {
    delete taskFailures[String(issueNumber)];
    skipped.delete(issueNumber);
  }
  return {
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
    title: "[AI Task] Planner: document MVP release-gate verification",
    goal: "Translate the product roadmap and security baseline into an evidence-based MVP release-gate checklist. Identify implemented controls, documented-only controls, and controls requiring disposable-environment or human verification. Never claim an unverified control has passed.",
    paths: ["docs/mvp-release-gates.md"],
    criteria: [
      "Map each MVP acceptance criterion to a verification method and evidence artifact.",
      "Distinguish implemented, documented-only, and not-yet-verified controls.",
      "Prohibit production data mutation during verification.",
    ],
    exclusions: [
      "Do not change production data, migrations, authentication, billing, or payout behavior.",
      "Do not mark a release gate passed without repository evidence or an executable test.",
    ],
  },
  {
    title: "[AI Task] Planner: write the unattended agent-factory operations runbook",
    goal: "Document the bounded unattended development-factory model, scheduler ownership, durable queue state, cooldown behavior, local resource limits, recovery procedures, and safe shutdown. Align the runbook with the actual GitHub Actions and Windows self-hosted Runner implementation.",
    paths: ["docs/agent-factory-operations.md"],
    criteria: [
      "Explain the five-minute queue poll and why a busy Runner does not start parallel task workers.",
      "Document the three-failure, fifteen-minute cooldown and durable state record.",
      "Include operator pause, resume, diagnostic, and emergency-stop procedures.",
    ],
    exclusions: [
      "Do not add hidden persistence, background mining, or unbounded compute workloads.",
      "Do not expose tokens, credentials, private user data, or local machine identifiers.",
    ],
  },
  {
    title: "[AI Task] Planner: create a security verification evidence matrix",
    goal: "Create a traceable evidence matrix from the repository security baseline for identity isolation, AI budget controls, contribution integrity, privacy lifecycle, backup recovery, and deferred distributed-compute safeguards.",
    paths: ["docs/security-evidence-matrix.md"],
    criteria: [
      "Map each security requirement to a test, review artifact, or explicit unresolved gap.",
      "Distinguish automated checks from human or independent security review.",
      "Keep payment, payout, and distributed-compute capabilities marked as not production-enabled.",
    ],
    exclusions: [
      "Do not enable payments, payouts, live AI provider calls, or distributed compute.",
      "Do not weaken authorization, RLS, audit, or budget safeguards to make checks pass.",
    ],
  },
];

export function nextPlannerTask(existingTitles = []) {
  const known = new Set(existingTitles.map((title) => String(title).toLowerCase()));
  return plannerTasks.find((task) => !known.has(task.title.toLowerCase())) ?? null;
}

export function plannerIssueBody(task) {
  const bullets = (items) => items.map((item) => "- " + item).join("\n");
  return [
    "<!-- ai-task-generated-by-planner -->",
    "## Goal", task.goal, "",
    "## Allowed paths", bullets(task.paths), "",
    "## Acceptance criteria", bullets(task.criteria), "",
    "## Explicit exclusions", bullets(task.exclusions), "",
  ].join("\n");
}
