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
  if (ci.status !== "completed" || ci.conclusion !== "success") {
    failures.push({ code: "CI_NOT_SUCCESS", detail: `CI must be completed/success; observed ${ci.status || "UNKNOWN"}/${ci.conclusion || "UNKNOWN"}.` });
  }
  const jobs = new Map((ci.jobs || []).map(job => [job.name, job.conclusion || job.status || "UNKNOWN"]));
  for (const name of REQUIRED_CI_JOBS) {
    const result = jobs.get(name);
    if (result !== "success") {
      failures.push({
        code: result === "skipped" ? "REQUIRED_JOB_SKIPPED" : result ? "REQUIRED_JOB_NOT_SUCCESS" : "REQUIRED_JOB_MISSING",
        detail: `${name}: ${result || "MISSING"} (only SUCCESS is accepted).`,
      });
    }
  }

  const preflight = input.preflight || { applicable: false, status: "not_applicable" };
  if (preflight.applicable && (preflight.headSha !== input.currentHeadSha ||
      preflight.status !== "completed" || preflight.conclusion !== "success" ||
      preflight.requiredJobConclusion !== "success")) {
    failures.push({
      code: "PREFLIGHT_NOT_SUCCESS",
      detail: `Applicable Preflight must complete successfully on the current SHA; observed SHA=${preflight.headSha || "UNKNOWN"}, workflow=${preflight.status || "UNKNOWN"}/${preflight.conclusion || "UNKNOWN"}, required job=${preflight.requiredJobConclusion || "UNKNOWN"}.`,
    });
  }

  if (input.hasCurrentHeadApproval !== true) {
    failures.push({ code: "APPROVAL_MISSING", detail: "No APPROVED review by someone other than the PR author is recorded against the current HEAD SHA." });
  }
  if (input.mergeable !== true) {
    failures.push({ code: input.mergeable === false ? "NOT_MERGEABLE" : "MERGEABILITY_UNKNOWN", detail: "GitHub must explicitly report mergeable=true; false or unknown is rejected." });
  }
  if (input.draft !== false) {
    failures.push({ code: "DRAFT_NOT_READY", detail: "Pull request must be Ready for review, not Draft." });
  }

  return {
    accepted: failures.length === 0,
    currentHeadSha: input.currentHeadSha || "UNKNOWN",
    preflight: preflight.applicable ? "REQUIRED" : "NOT_APPLICABLE",
    failures,
    requiredCiJobs: REQUIRED_CI_JOBS,
  };
}

module.exports = { REQUIRED_CI_JOBS, evaluateAcceptance };
