import type { WorkstreamId } from "./integration-contract.ts";

export const FP_GOVERNANCE_POLICY_VERSION = "gcan-fp-governance/2" as const;

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
  /** Opaque reference to the accountable owner recorded by the trusted host. */
  readonly ownerRef: string;
  readonly evidence: readonly FPGovernanceEvidence[];
  /** L must remain deferred; this field is descriptive evidence, not a runtime switch. */
  readonly lifecycle: "active" | "deferred";
}

export type FPGovernanceReviewDecision = "approved" | "changes-requested" | "commented";

export interface FPGovernanceReviewEvidence {
  /** Exact candidate SHA that the host says this review evaluated. */
  readonly reviewedSha: string;
  readonly decision: FPGovernanceReviewDecision;
  /** Opaque source references; the evaluator does not fetch or authenticate them. */
  readonly reviewRef: string;
  readonly reviewerRef: string;
  readonly reviewerAuthorizationRef: string;
  /** Attested by the trusted host after checking repository review permissions. */
  readonly reviewerAuthorizationStatus: "verified" | "unverified";
  readonly submittedAt: string;
}

export interface FPGovernanceDossier {
  readonly candidateSha: string;
  readonly policyVersion: typeof FP_GOVERNANCE_POLICY_VERSION;
  readonly workstreams: readonly FPGovernanceWorkstreamRecord[];
  /** Reviews are descriptive host evidence; they never grant merge or release authority. */
  readonly reviews?: readonly FPGovernanceReviewEvidence[];
}

export type FPGovernanceWorkstreamResult =
  | { readonly workstream: WorkstreamId; readonly status: "missing-owner" }
  | { readonly workstream: WorkstreamId; readonly status: "missing-evidence"; readonly evidenceKind: string }
  | { readonly workstream: WorkstreamId; readonly status: "stale-evidence"; readonly evidenceKind: string; readonly testedSha: string }
  | { readonly workstream: WorkstreamId; readonly status: "not-run"; readonly evidenceKind: string }
  | { readonly workstream: WorkstreamId; readonly status: "failed"; readonly evidenceKind: string; readonly evidenceRef: string }
  | { readonly workstream: WorkstreamId; readonly status: "complete"; readonly evidenceKind: string; readonly evidenceRef: string };

export type FPGovernanceReviewStatus =
  | "not-recorded"
  | "stale"
  | "unverified-reviewer"
  | "conflicting-decisions"
  | "changes-requested"
  | "reviewed-approved"
  | "commented";

export interface FPGovernanceReviewResult {
  readonly reviewRef: string;
  readonly reviewerRef: string;
  readonly status: "stale" | "unverified-reviewer" | "conflicting-decisions" | FPGovernanceReviewDecision;
}

export interface FPGovernanceAssessment {
  readonly schemaVersion: "1";
  readonly candidateSha: string;
  readonly policyVersion: typeof FP_GOVERNANCE_POLICY_VERSION;
  readonly status: "blocked" | "stale" | "incomplete" | "ready-for-human-review";
  readonly results: readonly FPGovernanceWorkstreamResult[];
  readonly reviewStatus: FPGovernanceReviewStatus;
  readonly reviews: readonly FPGovernanceReviewResult[];
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
const ISO_UTC_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/;

function isSafeEvidenceRef(value: string): boolean {
  return EVIDENCE_REF_PATTERN.test(value) &&
    !value.startsWith("/") &&
    !value.includes("..") &&
    !value.includes("//");
}

/** Snapshot untrusted governance inputs using own data descriptors only. */
function snapshotSafeRecord(value: unknown, allowed: readonly string[], required: readonly string[]): Record<string, unknown> | null {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return null;
  try {
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) return null;
    const keys = Reflect.ownKeys(value);
    if (keys.some((key) => typeof key !== "string" || !allowed.includes(key))) return null;
    const keySet = new Set(keys as string[]);
    if (required.some((key) => !keySet.has(key))) return null;
    const snapshot = Object.create(null) as Record<string, unknown>;
    for (const key of keys as string[]) {
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (!descriptor || !descriptor.enumerable || !("value" in descriptor)) return null;
      snapshot[key] = descriptor.value;
    }
    return snapshot;
  } catch {
    return null;
  }
}

function isCanonicalArrayIndexKey(key: string): boolean {
  if (!/^(0|[1-9]\d*)$/.test(key)) return false;
  const index = Number(key);
  return Number.isInteger(index) && index >= 0 && index < 0xFFFFFFFF;
}

function snapshotSafeArray(value: unknown, maximumLength: number): unknown[] | null {
  try {
    if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype) return null;
    const lengthDescriptor = Object.getOwnPropertyDescriptor(value, "length");
    if (!lengthDescriptor || !("value" in lengthDescriptor) ||
        !Number.isSafeInteger(lengthDescriptor.value) || lengthDescriptor.value < 0 ||
        lengthDescriptor.value > maximumLength) return null;
    const length = lengthDescriptor.value as number;
    const keys = Reflect.ownKeys(value);
    if (keys.length !== length + 1 ||
        keys.some((key) => typeof key !== "string" ||
          (key !== "length" && !isCanonicalArrayIndexKey(key)))) return null;
    const snapshot: unknown[] = [];
    for (let index = 0; index < length; index += 1) {
      const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
      if (!descriptor || !descriptor.enumerable || !("value" in descriptor)) return null;
      snapshot.push(descriptor.value);
    }
    return snapshot;
  } catch {
    return null;
  }
}

function snapshotGovernanceDossier(value: unknown): FPGovernanceDossier | null {
  const root = snapshotSafeRecord(value,
    ["candidateSha", "policyVersion", "workstreams", "reviews"],
    ["candidateSha", "policyVersion", "workstreams"]);
  if (!root) return null;
  const workstreamItems = snapshotSafeArray(root.workstreams, 11);
  if (!workstreamItems) return null;
  const workstreams: FPGovernanceWorkstreamRecord[] = [];
  for (const rawRecord of workstreamItems) {
    const record = snapshotSafeRecord(rawRecord,
      ["workstream", "ownerRef", "evidence", "lifecycle"],
      ["workstream", "ownerRef", "evidence", "lifecycle"]);
    if (!record) return null;
    const evidenceItems = snapshotSafeArray(record.evidence, 1);
    if (!evidenceItems) return null;
    const evidence: FPGovernanceEvidence[] = [];
    for (const rawEvidence of evidenceItems) {
      const item = snapshotSafeRecord(rawEvidence,
        ["kind", "testedSha", "status", "evidenceRef"],
        ["kind", "testedSha", "status", "evidenceRef"]);
      if (!item) return null;
      evidence.push(item as unknown as FPGovernanceEvidence);
    }
    workstreams.push({
      workstream: record.workstream as WorkstreamId,
      ownerRef: record.ownerRef as string,
      lifecycle: record.lifecycle as "active" | "deferred",
      evidence,
    });
  }
  let reviews: FPGovernanceReviewEvidence[] = [];
  if (root.reviews !== undefined) {
    const reviewItems = snapshotSafeArray(root.reviews, 100);
    if (!reviewItems) return null;
    for (const rawReview of reviewItems) {
      const item = snapshotSafeRecord(rawReview,
        ["reviewedSha", "decision", "reviewRef", "reviewerRef", "reviewerAuthorizationRef", "reviewerAuthorizationStatus", "submittedAt"],
        ["reviewedSha", "decision", "reviewRef", "reviewerRef", "reviewerAuthorizationRef", "reviewerAuthorizationStatus", "submittedAt"]);
      if (!item) return null;
      reviews.push(item as unknown as FPGovernanceReviewEvidence);
    }
  }
  return {
    candidateSha: root.candidateSha as string,
    policyVersion: root.policyVersion as typeof FP_GOVERNANCE_POLICY_VERSION,
    workstreams,
    reviews,
  };
}

function assessReviews(
  reviews: readonly FPGovernanceReviewEvidence[],
  candidateSha: string,
): { status: FPGovernanceReviewStatus; results: FPGovernanceReviewResult[] } {
  if (!Array.isArray(reviews) || reviews.length > 100) {
    throw new TypeError("Governance reviews must be an array containing at most 100 records.");
  }

  const reviewRefs = new Set<string>();
  const byReviewer = new Map<string, FPGovernanceReviewEvidence[]>();
  for (const review of reviews) {
    if (
      !review ||
      !SHA_PATTERN.test(review.reviewedSha) ||
      !["approved", "changes-requested", "commented"].includes(review.decision) ||
      !isSafeEvidenceRef(review.reviewRef) ||
      !OWNER_REF_PATTERN.test(review.reviewerRef) ||
      !isSafeEvidenceRef(review.reviewerAuthorizationRef) ||
      !["verified", "unverified"].includes(review.reviewerAuthorizationStatus) ||
      !ISO_UTC_PATTERN.test(review.submittedAt) ||
      Number.isNaN(Date.parse(review.submittedAt)) ||
      reviewRefs.has(review.reviewRef)
    ) {
      throw new TypeError("Invalid or duplicate governance review evidence.");
    }
    reviewRefs.add(review.reviewRef);
    const records = byReviewer.get(review.reviewerRef) ?? [];
    records.push(review);
    byReviewer.set(review.reviewerRef, records);
  }

  const currentReviews: FPGovernanceReviewEvidence[] = [];
  const results: FPGovernanceReviewResult[] = [];
  let staleCount = 0;
  for (const review of reviews) {
    if (review.reviewedSha.toLowerCase() !== candidateSha.toLowerCase()) {
      staleCount += 1;
      results.push({ reviewRef: review.reviewRef, reviewerRef: review.reviewerRef, status: "stale" });
    }
  }

  for (const [reviewerRef, records] of byReviewer) {
    const current = records.filter((review) => review.reviewedSha.toLowerCase() === candidateSha.toLowerCase());
    if (current.length === 0) continue;
    const latestTime = current.reduce((latest, review) =>
      Date.parse(review.submittedAt) > latest ? Date.parse(review.submittedAt) : latest,
      Date.parse(current[0].submittedAt));
    const latest = current.filter((review) => Date.parse(review.submittedAt) === latestTime);
    const decisions = new Set(latest.map((review) => review.decision));
    if (decisions.size > 1) {
      for (const review of latest) {
        results.push({ reviewRef: review.reviewRef, reviewerRef, status: "conflicting-decisions" });
      }
      // The aggregate below detects the conflict independently of decision ordering.
      continue;
    }
    const selected = latest[0];
    currentReviews.push(selected);
    results.push({
      reviewRef: selected.reviewRef,
      reviewerRef,
      status: selected.reviewerAuthorizationStatus === "verified"
        ? selected.decision
        : "unverified-reviewer",
    });
  }

  const hasConflict = [...byReviewer.values()].some((records) => {
    const current = records.filter((review) => review.reviewedSha.toLowerCase() === candidateSha.toLowerCase());
    if (current.length === 0) return false;
    const latestTime = current.reduce((latest, review) =>
      Date.parse(review.submittedAt) > latest ? Date.parse(review.submittedAt) : latest,
      Date.parse(current[0].submittedAt));
    return new Set(current.filter((review) => Date.parse(review.submittedAt) === latestTime).map((review) => review.decision)).size > 1;
  });
  if (hasConflict) return { status: "conflicting-decisions", results };
  if (currentReviews.length === 0) {
    return {
      status: reviews.length > 0 && staleCount === reviews.length ? "stale"
        : reviews.length > 0 ? "unverified-reviewer" : "not-recorded",
      results,
    };
  }
  if (currentReviews.some((review) =>
    review.reviewerAuthorizationStatus === "verified" && review.decision === "changes-requested")) {
    return { status: "changes-requested", results };
  }
  if (currentReviews.some((review) => review.reviewerAuthorizationStatus !== "verified")) {
    return { status: "unverified-reviewer", results };
  }
  if (currentReviews.some((review) => review.decision === "approved")) {
    return { status: "reviewed-approved", results };
  }
  return { status: "commented", results };
}

/**
 * P's advisory dossier completeness and review-provenance check.
 * Owner/reviewer authorization is asserted by the trusted host, not
 * authenticated here. A review marked approved is descriptive only: this
 * evaluator cannot grant governance approval, merge, execution or deployment.
 */
export function assessFPGovernanceDossier(
  dossier: FPGovernanceDossier,
): FPGovernanceAssessment {
  const input = snapshotGovernanceDossier(dossier);
  if (!input || !SHA_PATTERN.test(input.candidateSha) ||
      input.policyVersion !== FP_GOVERNANCE_POLICY_VERSION) {
    throw new TypeError("Invalid F–P governance dossier header or unsafe input structure.");
  }

  const byWorkstream = new Map<WorkstreamId, FPGovernanceWorkstreamRecord>();
  for (const record of input.workstreams) {
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
    if (record.evidence.length > 1) {
      throw new TypeError("Each F–P workstream may provide only its one registered evidence record.");
    }
    const evidence = record.evidence[0];
    if (
      evidence &&
      (evidence.kind !== expected.evidenceKind ||
      !SHA_PATTERN.test(evidence.testedSha) ||
      !["passed", "failed", "not-run"].includes(evidence.status) ||
      !isSafeEvidenceRef(evidence.evidenceRef))
    ) {
      throw new TypeError("Invalid F–P governance evidence record.");
    }
    byWorkstream.set(record.workstream, record);
  }

  const results: FPGovernanceWorkstreamResult[] = FP_GOVERNANCE_REQUIREMENTS.map((requirement) => {
    const record = byWorkstream.get(requirement.workstream);
    if (!record) return { workstream: requirement.workstream, status: "missing-evidence", evidenceKind: requirement.evidenceKind };
    const evidence = record.evidence[0];
    if (!evidence) {
      return { workstream: requirement.workstream, status: "missing-evidence", evidenceKind: requirement.evidenceKind };
    }
    if (evidence.testedSha.toLowerCase() !== input.candidateSha.toLowerCase()) {
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

  const reviewAssessment = assessReviews(input.reviews ?? [], input.candidateSha);
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
    candidateSha: input.candidateSha,
    policyVersion: FP_GOVERNANCE_POLICY_VERSION,
    status,
    results: Object.freeze(results),
    reviewStatus: reviewAssessment.status,
    reviews: Object.freeze(reviewAssessment.results),
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
