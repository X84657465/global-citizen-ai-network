const REQUIRED_CI_JOBS = [
  "Resolve exact candidate PR metadata",
  "Windows Runner quality gates — tests, types, lint, audit and production build",
  "Windows Ollama and local execution integration",
  "Windows Supabase migrations, PostgreSQL and RLS integration",
];

function evaluateAcceptance(input) {
  const failures = [];
  const ci = input.ci || {};
  if (!input.currentHeadSha || ci.headSha !== input.currentHeadSha) {
    failures.push({ code: "CI_SHA_MISMATCH", detail: "CI result is missing or does not match the current PR HEAD SHA." });
  }
  if (!Number.isSafeInteger(ci.runId) || ci.runId < 1 ||
      !Number.isSafeInteger(ci.runAttempt) || ci.runAttempt < 1 ||
      !Number.isSafeInteger(ci.workflowId) || ci.workflowId < 1 ||
      ci.workflowPath !== ".github/workflows/ci.yml" || ci.event !== "pull_request") {
    failures.push({ code: "CI_RUN_IDENTITY_INVALID", detail: "A unique CI workflow run identity (workflow, event, run ID, attempt and exact path) is required." });
  }
  if (ci.status !== "completed" || ci.conclusion !== "success") {
    failures.push({ code: "CI_NOT_SUCCESS", detail: `CI must be completed/success; observed ${ci.status || "UNKNOWN"}/${ci.conclusion || "UNKNOWN"}.` });
  }
  const jobs = Array.isArray(ci.jobs) ? ci.jobs : [];
  for (const name of REQUIRED_CI_JOBS) {
    const matches = jobs.filter(job => job.name === name);
    if (matches.length !== 1) {
      failures.push({ code: matches.length === 0 ? "REQUIRED_JOB_MISSING" : "REQUIRED_JOB_DUPLICATE",
        detail: `${name}: expected exactly one job in CI run ${ci.runId || "UNKNOWN"} attempt ${ci.runAttempt || "UNKNOWN"}; observed ${matches.length}.` });
      continue;
    }
    const job = matches[0];
    if (job.runId !== ci.runId || job.runAttempt !== ci.runAttempt ||
        job.status !== "completed" || job.conclusion !== "success") {
      failures.push({ code: job.conclusion === "skipped" ? "REQUIRED_JOB_SKIPPED" : "REQUIRED_JOB_NOT_SUCCESS",
        detail: `${name}: job must belong to run ${ci.runId} attempt ${ci.runAttempt} and be completed/success; observed run=${job.runId || "UNKNOWN"}, attempt=${job.runAttempt || "UNKNOWN"}, ${job.status || "UNKNOWN"}/${job.conclusion || "UNKNOWN"}.` });
    }
  }

  const preflight = input.preflight || { applicable: false, status: "not_applicable" };
  if (preflight.applicable) {
    if (preflight.headSha !== input.currentHeadSha ||
        !Number.isSafeInteger(preflight.workflowId) || preflight.workflowId < 1 ||
        preflight.workflowPath !== ".github/workflows/agent-task-preflight.yml" ||
        preflight.event !== "pull_request" ||
        !Number.isSafeInteger(preflight.runId) || preflight.runId < 1 ||
        !Number.isSafeInteger(preflight.runAttempt) || preflight.runAttempt < 1 ||
        preflight.status !== "completed" || preflight.conclusion !== "success") {
      failures.push({ code: "PREFLIGHT_RUN_IDENTITY_INVALID",
        detail: "Applicable Preflight requires the exact trusted workflow path, pull_request event, current HEAD SHA, run ID, attempt, and completed/success conclusion." });
    }
    const preflightJobs = Array.isArray(preflight.jobs) ? preflight.jobs : [];
    const requiredJobs = preflightJobs.filter(job => job.name === "Linux offline scratch fixture validation");
    if (requiredJobs.length !== 1) {
      failures.push({ code: requiredJobs.length === 0 ? "PREFLIGHT_JOB_MISSING" : "PREFLIGHT_JOB_DUPLICATE",
        detail: `Expected exactly one Linux offline scratch fixture validation job in Preflight run ${preflight.runId || "UNKNOWN"} attempt ${preflight.runAttempt || "UNKNOWN"}; observed ${requiredJobs.length}.` });
    } else {
      const job = requiredJobs[0];
      if (job.runId !== preflight.runId || job.runAttempt !== preflight.runAttempt ||
          job.status !== "completed" || job.conclusion !== "success") {
        failures.push({ code: "PREFLIGHT_NOT_SUCCESS",
          detail: `Required Preflight job must belong to run ${preflight.runId} attempt ${preflight.runAttempt} and be completed/success; observed run=${job.runId || "UNKNOWN"}, attempt=${job.runAttempt || "UNKNOWN"}, ${job.status || "UNKNOWN"}/${job.conclusion || "UNKNOWN"}.` });
      }
    }
  }
  if (input.hasCurrentHeadApproval !== true) failures.push({ code: "APPROVAL_MISSING", detail: "No APPROVED review by someone other than the PR author is recorded against the current HEAD SHA." });
  if (input.mergeable !== true) failures.push({ code: input.mergeable === false ? "NOT_MERGEABLE" : "MERGEABILITY_UNKNOWN", detail: "GitHub must explicitly report mergeable=true; false or unknown is rejected." });
  if (input.draft !== false) failures.push({ code: "DRAFT_NOT_READY", detail: "Pull request must be Ready for review, not Draft." });
  return { accepted: failures.length === 0, currentHeadSha: input.currentHeadSha || "UNKNOWN",
    ciRun: { runId: ci.runId || null, runAttempt: ci.runAttempt || null },
    preflight: preflight.applicable ? "REQUIRED" : "NOT_APPLICABLE", failures, requiredCiJobs: REQUIRED_CI_JOBS };
}
module.exports = { REQUIRED_CI_JOBS, evaluateAcceptance };
