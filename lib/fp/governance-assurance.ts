import type { WorkstreamId } from "./integration-contract.ts";

export const FP_GOVERNANCE_POLICY_VERSION = "gcan-fp-governance/1" as const;

export const FP_GOVERNANCE_REQUIREMENTS = [
  { workstream: "F", evidenceKind: "security-assurance" },
  { workstream: "G", evidenceKind: "exact-head-ci" },
  { workstream: "H", evidenceKind: "observability-tests" },
  { workstream: "I", evidenceKind: "bounded-integration-approval" },
  { workstream: "J", evidenceKind: "advisory-only-review" },
  { workstream: "K", evidenceKind: "documentation-provenance" },
  { workstream: "L", evidenceKind: "federation-deferral-record" },
  { workstream: "M", evidenceKind: "compliance-risk-review" },
  { workstream: "N", evidenceKind: "privacy-analytics-review" },
  { workstream: "O", evidenceKind: "lifecycle-compatibility-review" },
  { workstream: "P", evidenceKind: "governance-review" },
] as const satisfies readonly {
  readonly workstream: WorkstreamId;
  readonly evidenceKind: string;
}[];

export type FPGovernanceEvidenceStatus = "passed" | "failed" | "not-run";

export interface FPGovernanceEvidence {
  readonly kind: (typeof FP_GOVERNANCE_REQUIREMENTS)[number]["evidenceKind"];
  readonly testedSha: string;
  readonly status: FPGovernanceEvidenceStatus;
  readonly evidenceRef: string;
}

export interface FPGovernanceWorkstreamRecord {
  readonly workstream: WorkstreamId;
  /** Opaque reference to the accountable owner recorded by the host. */
  readonly ownerRef: string;
  readonly evidence: readonly FPGovernanceEvidence[];
  /** L must remain deferred; this field is descriptive evidence, not a runtime switch. */
  readonly lifecycle: "active" | "deferred";
}

export interface FPGovernanceDossier {
  readonly candidateSha: string;
  readonly policyVersion: typeof FP_GOVERNANCE_POLICY_VERSION;
  readonly workstreams: readonly FPGovernanceWorkstreamRecord[];
}

export type FPGovernanceWorkstreamResult =
  | { readonly workstream: WorkstreamId; readonly status: "missing-owner" }
  | { readonly workstream: WorkstreamId; readonly status: "missing-evidence"; readonly evidenceKind: string }
  | { readonly workstream: WorkstreamId; readonly status: "stale-evidence"; readonly evidenceKind: string; readonly testedSha: string }
  | { readonly workstream: WorkstreamId; readonly status: "not-run"; readonly evidenceKind: string }
  | { readonly workstream: WorkstreamId; readonly status: "failed"; readonly evidenceKind: string; readonly evidenceRef: string }
  | { readonly workstream: WorkstreamId; readonly status: "complete"; readonly evidenceKind: string; readonly evidenceRef: string };

export interface FPGovernanceAssessment {
  readonly schemaVersion: "1";
  readonly candidateSha: string;
  readonly policyVersion: typeof FP_GOVERNANCE_POLICY_VERSION;
  readonly status: "blocked" | "stale" | "incomplete" | "ready-for-human-review";
  readonly results: readonly FPGovernanceWorkstreamResult[];
  readonly complete: number;
  readonly failed: number;
  readonly missing: number;
  readonly stale: number;
  readonly notRun: number;
  readonly governanceApprovalGranted: false;
  readonly executionAuthorized: false;
  readonly mergeAuthorized: false;
  readonly deploymentAuthorized: false;
}

const SHA_PATTERN = /^[a-f0-9]{40}$/i;
const OWNER_REF_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{1,127}$/;
const EVIDENCE_REF_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:/#-]{0,255}$/;

function isSafeEvidenceRef(value: string): boolean {
  return EVIDENCE_REF_PATTERN.test(value) &&
    !value.startsWith("/") &&
    !value.includes("..") &&
    !value.includes("//");
}

/**
 * P's advisory dossier completeness check. It records accountability and
 * evidence references but cannot approve a release, authorize execution,
 * change policy, or activate a deferred workstream.
 */
export function assessFPGovernanceDossier(
  dossier: FPGovernanceDossier,
): FPGovernanceAssessment {
  if (
    !dossier ||
    !SHA_PATTERN.test(dossier.candidateSha) ||
    dossier.policyVersion !== FP_GOVERNANCE_POLICY_VERSION ||
    !Array.isArray(dossier.workstreams)
  ) {
    throw new TypeError("Invalid F–P governance dossier header.");
  }

  const byWorkstream = new Map<WorkstreamId, FPGovernanceWorkstreamRecord>();
  for (const record of dossier.workstreams) {
    if (
      !record ||
      !FP_GOVERNANCE_REQUIREMENTS.some((requirement) => requirement.workstream === record.workstream) ||
      byWorkstream.has(record.workstream) ||
      typeof record.ownerRef !== "string" ||
      !OWNER_REF_PATTERN.test(record.ownerRef) ||
      !["active", "deferred"].includes(record.lifecycle) ||
      !Array.isArray(record.evidence)
    ) {
      throw new TypeError("Invalid or duplicate F–P governance workstream record.");
    }
    if (record.workstream === "L" && record.lifecycle !== "deferred") {
      throw new TypeError("L federation must remain deferred.");
    }
    const expected = FP_GOVERNANCE_REQUIREMENTS.find((item) => item.workstream === record.workstream)!;
    if (record.evidence.length !== 1) {
      throw new TypeError("Each F–P workstream must provide exactly one required evidence record.");
    }
    const evidence = record.evidence[0];
    if (
      !evidence ||
      evidence.kind !== expected.evidenceKind ||
      !SHA_PATTERN.test(evidence.testedSha) ||
      !["passed", "failed", "not-run"].includes(evidence.status) ||
      !isSafeEvidenceRef(evidence.evidenceRef)
    ) {
      throw new TypeError("Invalid F–P governance evidence record.");
    }
    byWorkstream.set(record.workstream, record);
  }

  const results: FPGovernanceWorkstreamResult[] = FP_GOVERNANCE_REQUIREMENTS.map((requirement) => {
    const record = byWorkstream.get(requirement.workstream);
    if (!record) return { workstream: requirement.workstream, status: "missing-evidence", evidenceKind: requirement.evidenceKind };
    const evidence = record.evidence[0];
    if (evidence.testedSha.toLowerCase() !== dossier.candidateSha.toLowerCase()) {
      return {
        workstream: requirement.workstream,
        status: "stale-evidence",
        evidenceKind: requirement.evidenceKind,
        testedSha: evidence.testedSha,
      };
    }
    if (evidence.status === "failed") {
      return {
        workstream: requirement.workstream,
        status: "failed",
        evidenceKind: requirement.evidenceKind,
        evidenceRef: evidence.evidenceRef,
      };
    }
    if (evidence.status === "not-run") {
      return { workstream: requirement.workstream, status: "not-run", evidenceKind: requirement.evidenceKind };
    }
    return {
      workstream: requirement.workstream,
      status: "complete",
      evidenceKind: requirement.evidenceKind,
      evidenceRef: evidence.evidenceRef,
    };
  });

  const count = (status: FPGovernanceWorkstreamResult["status"]) =>
    results.filter((result) => result.status === status).length;
  const failed = count("failed");
  const missing = count("missing-evidence");
  const stale = count("stale-evidence");
  const notRun = count("not-run");
  const complete = count("complete");

  const status = failed > 0
    ? "blocked"
    : stale > 0
      ? "stale"
      : missing > 0 || notRun > 0
        ? "incomplete"
        : "ready-for-human-review";

  return Object.freeze({
    schemaVersion: "1",
    candidateSha: dossier.candidateSha,
    policyVersion: FP_GOVERNANCE_POLICY_VERSION,
    status,
    results: Object.freeze(results),
    complete,
    failed,
    missing,
    stale,
    notRun,
    governanceApprovalGranted: false,
    executionAuthorized: false,
    mergeAuthorized: false,
    deploymentAuthorized: false,
  });
}
