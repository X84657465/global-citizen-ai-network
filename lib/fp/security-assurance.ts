/**
 * F — Security baseline evidence bound to the exact trusted CI run.
 *
 * Evidence is metadata obtained from the trusted GitHub Actions API. This
 * evaluator does not execute tests or independently authenticate API data.
 */
export const FP_SECURITY_CONTROLS = [
  {
    id: "member-isolation",
    title: "Cross-member data isolation",
    evidencePath: "tests/security/two-member-rls.test.mjs",
    requiredJob: "database",
  },
  {
    id: "database-privileges",
    title: "Database privilege and RLS regression",
    evidencePath: "supabase/tests/database_security.test.sql",
    requiredJob: "database",
  },
  {
    id: "api-role-inheritance",
    title: "API roles cannot inherit privileged database roles",
    evidencePath: "supabase/tests/public_table_grants.test.sql",
    requiredJob: "database",
  },
  {
    id: "security-headers",
    title: "Baseline browser security headers",
    evidencePath: "tests/security-headers.test.ts",
    requiredJob: "quality",
  },
  {
    id: "route-authorization",
    title: "Server route query and ownership boundaries",
    evidencePath: "tests/security/messages-route-query.test.mjs",
    requiredJob: "quality",
  },
] as const;

export type FPSecurityControlId = (typeof FP_SECURITY_CONTROLS)[number]["id"];
export type FPSecurityEvidenceStatus = "passed" | "failed" | "not-run";
export type FPSecurityCIJobKey = "quality" | "database";
export type FPSecurityCIConclusion =
  | "success" | "failure" | "cancelled" | "skipped"
  | "timed_out" | "action_required" | "neutral";

export interface FPSecurityCIEvidence {
  readonly repository: string;
  readonly pullRequestNumber: number;
  readonly headSha: string;
  readonly event: "pull_request";
  readonly baseRef: "main";
  readonly workflowPath: ".github/workflows/ci.yml";
  readonly runId: number;
  readonly runAttempt: number;
  readonly runUrl: string;
  readonly jobKey: FPSecurityCIJobKey;
  readonly jobConclusion: FPSecurityCIConclusion;
  readonly jobUrl: string;
}

export interface FPSecurityEvidence {
  readonly controlId: FPSecurityControlId;
  readonly testedSha: string;
  readonly status: FPSecurityEvidenceStatus;
  readonly evidenceRef: string;
  readonly executedAt: string;
  readonly ci: FPSecurityCIEvidence;
}

export interface FPSecurityEvidenceBundle {
  readonly candidateRepository: string;
  readonly pullRequestNumber: number;
  readonly candidateSha: string;
  readonly evidence: readonly FPSecurityEvidence[];
}

export type FPSecurityControlResult =
  | { readonly controlId: FPSecurityControlId; readonly status: "missing" }
  | { readonly controlId: FPSecurityControlId; readonly status: "stale"; readonly testedSha: string }
  | { readonly controlId: FPSecurityControlId; readonly status: "not-run"; readonly evidenceRef: string }
  | { readonly controlId: FPSecurityControlId; readonly status: "failed"; readonly evidenceRef: string; readonly reason: string }
  | { readonly controlId: FPSecurityControlId; readonly status: "passed"; readonly evidenceRef: string; readonly jobUrl: string };

export interface FPSecurityAssessment {
  readonly schemaVersion: "1";
  readonly candidateRepository: string;
  readonly pullRequestNumber: number;
  readonly candidateSha: string;
  readonly status: "blocked" | "stale" | "incomplete" | "ready-for-review";
  readonly controls: readonly FPSecurityControlResult[];
  readonly passed: number;
  readonly failed: number;
  readonly missing: number;
  readonly stale: number;
  readonly notRun: number;
  readonly acceptanceGranted: false;
}

const SHA_PATTERN = /^[a-f0-9]{40}$/i;
const REPOSITORY_PATTERN = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;
const ISO_UTC_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

function isCanonicalUtcTimestamp(value: string): boolean {
  return ISO_UTC_PATTERN.test(value) &&
    !Number.isNaN(Date.parse(value)) &&
    new Date(value).toISOString() === value;
}
const CI_CONCLUSIONS = ["success", "failure", "cancelled", "skipped", "timed_out", "action_required", "neutral"] as const;

function isSafeEvidencePath(value: string): boolean {
  return /^[A-Za-z0-9._/-]{1,240}$/.test(value) &&
    !value.startsWith("/") &&
    !value.includes("\\") &&
    !value.split("/").includes("..");
}

function isPositiveInteger(value: number): boolean {
  return Number.isSafeInteger(value) && value > 0;
}

function validateCIEvidence(ci: FPSecurityCIEvidence, repository: string, pullRequestNumber: number): void {
  if (
    !ci ||
    ci.repository !== repository ||
    ci.pullRequestNumber !== pullRequestNumber ||
    !SHA_PATTERN.test(ci.headSha) ||
    ci.event !== "pull_request" ||
    ci.baseRef !== "main" ||
    ci.workflowPath !== ".github/workflows/ci.yml" ||
    !isPositiveInteger(ci.runId) ||
    !isPositiveInteger(ci.runAttempt) ||
    !["quality", "database"].includes(ci.jobKey) ||
    !CI_CONCLUSIONS.includes(ci.jobConclusion)
  ) {
    throw new TypeError("Invalid F evidence CI identity or job metadata.");
  }

  const expectedRunUrl = `https://github.com/${repository}/actions/runs/${ci.runId}`;
  const expectedAttemptUrl = `${expectedRunUrl}/attempts/${ci.runAttempt}`;
  if (ci.runUrl !== expectedAttemptUrl) {
    throw new TypeError("F CI run URL must identify the exact repository, run ID, and attempt.");
  }
  const expectedJobPrefix = `${expectedRunUrl}/job/`;
  const jobId = ci.jobUrl.slice(expectedJobPrefix.length);
  if (!ci.jobUrl.startsWith(expectedJobPrefix) || !/^\d+$/.test(jobId)) {
    throw new TypeError("F CI job URL does not belong to the evidence run.");
  }
}

/**
 * Evaluates existing F security test evidence for one exact PR candidate.
 * Every control is bound to its designated CI job and all records must come
 * from the same repository/PR/run/attempt. A pass is reviewable evidence only.
 */
export function assessFPSecurityEvidence(
  bundle: FPSecurityEvidenceBundle,
): FPSecurityAssessment {
  if (
    !bundle ||
    !REPOSITORY_PATTERN.test(bundle.candidateRepository) ||
    !isPositiveInteger(bundle.pullRequestNumber) ||
    !SHA_PATTERN.test(bundle.candidateSha)
  ) {
    throw new TypeError("A candidate repository, PR number, and 40-character SHA are required.");
  }
  if (!Array.isArray(bundle.evidence)) {
    throw new TypeError("Security evidence must be an array.");
  }

  const byControl = new Map<FPSecurityControlId, FPSecurityEvidence>();
  let runIdentity: string | undefined;
  for (const item of bundle.evidence) {
    const expectedControl = item
      ? FP_SECURITY_CONTROLS.find((control) => control.id === item.controlId)
      : undefined;
    if (
      !item ||
      !expectedControl ||
      item.evidenceRef !== expectedControl.evidencePath ||
      byControl.has(item.controlId) ||
      !SHA_PATTERN.test(item.testedSha) ||
      !["passed", "failed", "not-run"].includes(item.status) ||
      !isSafeEvidencePath(item.evidenceRef) ||
      !isCanonicalUtcTimestamp(item.executedAt)
    ) {
      throw new TypeError("Invalid or duplicate F security evidence record.");
    }
    validateCIEvidence(item.ci, bundle.candidateRepository, bundle.pullRequestNumber);
    if (item.ci.jobKey !== expectedControl.requiredJob) {
      throw new TypeError("F security control is not bound to its required CI job.");
    }
    const identity = [
      item.ci.repository,
      item.ci.pullRequestNumber,
      item.ci.headSha.toLowerCase(),
      item.ci.event,
      item.ci.baseRef,
      item.ci.workflowPath,
      item.ci.runId,
      item.ci.runAttempt,
      item.ci.runUrl,
    ].join("|");
    if (runIdentity !== undefined && runIdentity !== identity) {
      throw new TypeError("F security controls must reference one exact CI run and attempt.");
    }
    runIdentity = identity;
    byControl.set(item.controlId, item);
  }

  const controls: FPSecurityControlResult[] = FP_SECURITY_CONTROLS.map((control) => {
    const item = byControl.get(control.id);
    if (!item) return { controlId: control.id, status: "missing" };
    if (
      item.testedSha.toLowerCase() !== bundle.candidateSha.toLowerCase() ||
      item.ci.headSha.toLowerCase() !== bundle.candidateSha.toLowerCase()
    ) {
      return { controlId: control.id, status: "stale", testedSha: item.testedSha };
    }
    if (item.status === "not-run") {
      return { controlId: control.id, status: "not-run", evidenceRef: item.evidenceRef };
    }
    if (item.status === "failed" || item.ci.jobConclusion !== "success") {
      return {
        controlId: control.id,
        status: "failed",
        evidenceRef: item.evidenceRef,
        reason: item.status === "failed" ? "security-control-failed" : `ci-job-${item.ci.jobConclusion}`,
      };
    }
    return {
      controlId: control.id,
      status: "passed",
      evidenceRef: item.evidenceRef,
      jobUrl: item.ci.jobUrl,
    };
  });

  const count = (status: FPSecurityControlResult["status"]) =>
    controls.filter((control) => control.status === status).length;
  const failed = count("failed");
  const stale = count("stale");
  const missing = count("missing");
  const notRun = count("not-run");
  const passed = count("passed");
  const status = failed > 0
    ? "blocked"
    : stale > 0
      ? "stale"
      : missing > 0 || notRun > 0
        ? "incomplete"
        : "ready-for-review";

  return Object.freeze({
    schemaVersion: "1",
    candidateRepository: bundle.candidateRepository,
    pullRequestNumber: bundle.pullRequestNumber,
    candidateSha: bundle.candidateSha,
    status,
    controls: Object.freeze(controls),
    passed,
    failed,
    missing,
    stale,
    notRun,
    acceptanceGranted: false,
  });
}
