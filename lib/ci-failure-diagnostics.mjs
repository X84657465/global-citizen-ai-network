const SHA = /^[a-f0-9]{40}$/i;

const RULES = [
  ["quota_rate_limit", /rate.?limit|api quota|429|too many requests|build.?rate.?limit/i],
  ["runner_dependency", /no runner|waiting for a runner|runner.*offline|docker daemon|ollama.*unavailable|ENOSPC|ECONNRESET|ETIMEDOUT|ECONNREFUSED/i],
  ["database_migration_rls", /supabase|migration|pgtap|rls|postgres|database.*(connect|permission|schema)/i],
  ["test_environment", /command not found|ENOENT|module not found|cannot find module|configuration.*(missing|invalid)/i],
  ["code_logic", /AssertionError|assert\.(?:equal|deepEqual|throws)|TypeError:|ReferenceError:|SyntaxError:/i],
];

const REQUIRED_JOBS = [
  "Resolve exact candidate PR metadata",
  "Windows Runner quality gates — tests, types, lint, audit and production build",
  "Windows Ollama and local execution integration",
  "Windows Supabase migrations, PostgreSQL and RLS integration",
];

export function redactCiLog(value, maxLength = 2400) {
  if (typeof value !== "string") throw new TypeError("CI log must be text.");
  let safe = value.replace(/\r\n?/g, "\n");
  for (const pattern of [
    /gh[pousr]_[A-Za-z0-9_]{20,}/g,
    /github_pat_[A-Za-z0-9_]{20,}/g,
    /(authorization\s*:\s*bearer\s+)[^\s]+/gi,
    /((?:password|token|secret|api[_-]?key)=)[^\s&]+/gi,
  ]) safe = safe.replace(pattern, "$1[REDACTED]");
  return safe.length > maxLength ? safe.slice(-maxLength) : safe;
}

export function classifyCiFailure(log, steps = []) {
  const input = [log, ...steps.map((step) => step.name || "")].join("\n");
  return RULES.find(([, pattern]) => pattern.test(input))?.[0] ?? "unknown";
}

export function createCiFailureReport({
  run,
  jobs,
  siblingRuns = [],
  logText = "",
  expectedHeadSha,
  capture = {},
}) {
  if (!run || !Array.isArray(jobs) || !Array.isArray(siblingRuns)) {
    throw new TypeError("Invalid CI evidence input.");
  }
  if (typeof expectedHeadSha !== "string" || !SHA.test(expectedHeadSha) ||
      !SHA.test(run.head_sha || "")) {
    throw new TypeError("Full expected and actual SHA values are required.");
  }
  if (run.head_sha.toLowerCase() !== expectedHeadSha.toLowerCase()) {
    throw new Error("Stale CI evidence rejected: run SHA differs from expected head SHA.");
  }

  const failed = jobs.filter((job) => ["failure", "timed_out"].includes(job.conclusion));
  const failedSteps = failed.flatMap((job) => (job.steps || [])
    .filter((step) => ["failure", "timed_out"].includes(step.conclusion))
    .map((step) => ({
      job: job.name,
      job_id: job.id,
      name: step.name,
      conclusion: step.conclusion,
      number: step.number ?? null,
    })));

  let blocker = null;
  if (capture.run_metadata?.status === "UNAVAILABLE") blocker = "run_metadata_unavailable";
  else if (capture.jobs?.status === "UNAVAILABLE" && run.status === "completed") blocker = "jobs_metadata_unavailable";
  if (!blocker && run.status !== "completed" && jobs.length === 0) {
    const olderRun = siblingRuns.some((item) =>
      item.id !== run.id &&
      item.workflow_id === run.workflow_id &&
      item.head_branch === run.head_branch &&
      ["queued", "pending", "in_progress", "waiting", "requested"].includes(item.status));
    blocker = olderRun ? "workflow_concurrency_wait" : "github_actions_job_creation_delay";
  } else if (!blocker && run.status !== "completed") {
    const unassigned = jobs.find((job) => job.status !== "completed" && !job.runner_name);
    if (unassigned) {
      blocker = (unassigned.labels || []).some((label) => /self-hosted/i.test(label))
        ? "self_hosted_runner_queue"
        : "runner_assignment_wait";
    }
  }

  const jobsByName = new Map(jobs.map((job) => [job.name, job]));
  const requiredJobs = REQUIRED_JOBS.map((name) => ({
    name,
    conclusion: jobsByName.get(name)?.conclusion ?? "missing_or_not_started",
  }));
  const complete = run.status === "completed" &&
    run.conclusion === "success" &&
    requiredJobs.every((job) => job.conclusion === "success");

  return {
    schema_version: 1,
    run_id: Number(run.id),
    run_attempt: Number(run.run_attempt),
    head_sha: run.head_sha.toLowerCase(),
    expected_head_sha: expectedHeadSha.toLowerCase(),
    exact_sha_match: true,
    capture_sources: {
      run_metadata: capture.run_metadata ?? { status: "UNKNOWN" },
      jobs: capture.jobs ?? { status: "UNKNOWN" },
      sibling_runs: capture.sibling_runs ?? { status: "UNKNOWN" },
      logs: capture.logs ?? { status: logText ? "SUCCESS" : "UNAVAILABLE" },
    },
    status: run.status,
    conclusion: run.conclusion ?? null,
    complete_ci_pass: complete,
    blocker,
    failure_category: failed.length ? classifyCiFailure(logText, failedSteps) : null,
    failed_jobs: failed.map((job) => ({
      id: job.id,
      name: job.name,
      conclusion: job.conclusion,
      runner_name: job.runner_name ?? null,
      labels: job.labels ?? [],
    })),
    failed_steps: failedSteps,
    required_jobs: requiredJobs,
    log_excerpt: failed.length ? redactCiLog(logText) : "",
    generated_at: new Date().toISOString(),
  };
}
