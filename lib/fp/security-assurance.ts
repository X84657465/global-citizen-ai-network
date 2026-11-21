export const FP_SECURITY_CONTROLS = [
  {
    id: "member-isolation",
    title: "Cross-member data isolation",
    evidencePath: "tests/security/two-member-rls.test.mjs",
  },
  {
    id: "database-privileges",
    title: "Database privilege and RLS regression",
    evidencePath: "supabase/tests/database_security.test.sql",
  },
  {
    id: "security-headers",
    title: "Baseline browser security headers",
    evidencePath: "tests/security-headers.test.ts",
  },
  {
    id: "route-authorization",
    title: "Server route query and ownership boundaries",
    evidencePath: "tests/security/messages-route-query.test.mjs",
  },
] as const;

export type FPSecurityControlId = (typeof FP_SECURITY_CONTROLS)[number]["id"];
export type FPSecurityEvidenceStatus = "passed" | "failed" | "not-run";

export interface FPSecurityEvidence {
  readonly controlId: FPSecurityControlId;
  readonly testedSha: string;
  readonly status: FPSecurityEvidenceStatus;
  readonly evidenceRef: string;
  readonly executedAt: string;
}

export interface FPSecurityEvidenceBundle {
  readonly candidateSha: string;
  readonly evidence: readonly FPSecurityEvidence[];
}

export type FPSecurityControlResult =
  | { readonly controlId: FPSecurityControlId; readonly status: "missing" }
  | { readonly controlId: FPSecurityControlId; readonly status: "stale"; readonly testedSha: string }
  | { readonly controlId: FPSecurityControlId; readonly status: "not-run"; readonly evidenceRef: string }
  | { readonly controlId: FPSecurityControlId; readonly status: "failed"; readonly evidenceRef: string }
  | { readonly controlId: FPSecurityControlId; readonly status: "passed"; readonly evidenceRef: string };

export interface FPSecurityAssessment {
  readonly schemaVersion: "1";
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
const EVIDENCE_PATH_PATTERN = /^[A-Za-z0-9._/-]{1,240}$/;

function isSafeEvidencePath(value: string): boolean {
  return EVIDENCE_PATH_PATTERN.test(value) &&
    !value.startsWith("/") &&
    !value.includes("\\") &&
    !value.split("/").includes("..");
}

/**
 * Evaluates already-produced F security evidence for one exact candidate SHA.
 * It does not run tests, inspect production systems, grant permissions, or
 * accept a release. A ready result means only that evidence is reviewable.
 */
export function assessFPSecurityEvidence(
  bundle: FPSecurityEvidenceBundle,
): FPSecurityAssessment {
  if (!bundle || !SHA_PATTERN.test(bundle.candidateSha)) {
    throw new TypeError("A 40-character candidate commit SHA is required.");
  }
  if (!Array.isArray(bundle.evidence)) {
    throw new TypeError("Security evidence must be an array.");
  }

  const byControl = new Map<FPSecurityControlId, FPSecurityEvidence>();
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
      Number.isNaN(Date.parse(item.executedAt))
    ) {
      throw new TypeError("Invalid or duplicate F security evidence record.");
    }
    byControl.set(item.controlId, item);
  }

  const controls: FPSecurityControlResult[] = FP_SECURITY_CONTROLS.map((control) => {
    const item = byControl.get(control.id);
    if (!item) return { controlId: control.id, status: "missing" };
    if (item.testedSha.toLowerCase() !== bundle.candidateSha.toLowerCase()) {
      return { controlId: control.id, status: "stale", testedSha: item.testedSha };
    }
    if (item.status === "not-run") {
      return { controlId: control.id, status: "not-run", evidenceRef: item.evidenceRef };
    }
    if (item.status === "failed") {
      return { controlId: control.id, status: "failed", evidenceRef: item.evidenceRef };
    }
    return { controlId: control.id, status: "passed", evidenceRef: item.evidenceRef };
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
