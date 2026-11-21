import assert from "node:assert/strict";
import test from "node:test";
import {
  assessFPGovernanceDossier,
  FP_GOVERNANCE_POLICY_VERSION,
  FP_GOVERNANCE_REQUIREMENTS,
  type FPGovernanceDossier,
  type FPGovernanceReviewEvidence,
} from "../../lib/fp/governance-assurance.ts";

const sha = "a".repeat(40);
const dossier = (overrides: Partial<FPGovernanceDossier> = {}): FPGovernanceDossier => ({
  candidateSha: sha,
  policyVersion: FP_GOVERNANCE_POLICY_VERSION,
  workstreams: FP_GOVERNANCE_REQUIREMENTS.map((requirement) => ({
    workstream: requirement.workstream,
    ownerRef: `owner:${requirement.workstream.toLowerCase()}`,
    lifecycle: requirement.workstream === "L" ? "deferred" as const : "active" as const,
    evidence: [{
      kind: requirement.evidenceKind,
      testedSha: sha,
      status: "passed" as const,
      evidenceRef: `evidence/${requirement.workstream.toLowerCase()}.json`,
    }],
  })),
  ...overrides,
});

const review = (overrides: Partial<FPGovernanceReviewEvidence> = {}): FPGovernanceReviewEvidence => ({
  reviewedSha: sha,
  decision: "approved",
  reviewRef: "pull/42/review/100",
  reviewerRef: "reviewer:maintainer",
  reviewerAuthorizationRef: "permissions/repository-maintainer/100",
  reviewerAuthorizationStatus: "verified",
  submittedAt: "2026-11-22T12:00:00Z",
  ...overrides,
});

test("requires accountable owner and exact-SHA evidence for every F–P workstream", () => {
  const result = assessFPGovernanceDossier(dossier());
  assert.equal(result.status, "ready-for-human-review");
  assert.equal(result.complete, 11);
  assert.equal(result.reviewStatus, "not-recorded");
  assert.equal(result.governanceApprovalGranted, false);
  assert.equal(result.executionAuthorized, false);
  assert.equal(result.mergeAuthorized, false);
  assert.equal(result.deploymentAuthorized, false);
});

test("records a host-verified exact-SHA approval without granting governance or merge authority", () => {
  const result = assessFPGovernanceDossier(dossier({ reviews: [review()] }));
  assert.equal(result.reviewStatus, "reviewed-approved");
  assert.deepEqual(result.reviews, [{
    reviewRef: "pull/42/review/100",
    reviewerRef: "reviewer:maintainer",
    status: "approved",
  }]);
  assert.equal(result.governanceApprovalGranted, false);
  assert.equal(result.executionAuthorized, false);
  assert.equal(result.mergeAuthorized, false);
  assert.equal(result.deploymentAuthorized, false);
});

test("ignores stale approvals and requires the reviewed SHA to match the dossier candidate", () => {
  const result = assessFPGovernanceDossier(dossier({
    reviews: [review({ reviewedSha: "b".repeat(40) })],
  }));
  assert.equal(result.reviewStatus, "stale");
  assert.equal(result.reviews[0].status, "stale");
});

test("does not count an approval from a reviewer whose authority was not verified by the host", () => {
  const result = assessFPGovernanceDossier(dossier({
    reviews: [review({ reviewerAuthorizationStatus: "unverified" })],
  }));
  assert.equal(result.reviewStatus, "unverified-reviewer");
  assert.equal(result.reviews[0].status, "unverified-reviewer");
  assert.equal(result.governanceApprovalGranted, false);
});

test("changes-requested from any latest verified reviewer takes precedence over approvals", () => {
  const result = assessFPGovernanceDossier(dossier({
    reviews: [
      review({ reviewRef: "pull/42/review/100", reviewerRef: "reviewer:one", decision: "approved" }),
      review({ reviewRef: "pull/42/review/101", reviewerRef: "reviewer:two", decision: "changes-requested" }),
    ],
  }));
  assert.equal(result.reviewStatus, "changes-requested");
});

test("uses each reviewer's latest decision and rejects conflicting decisions at the same timestamp", () => {
  const superseded = assessFPGovernanceDossier(dossier({
    reviews: [
      review({ reviewRef: "pull/42/review/100", decision: "changes-requested", submittedAt: "2026-11-22T11:00:00Z" }),
      review({ reviewRef: "pull/42/review/101", decision: "approved", submittedAt: "2026-11-22T12:00:00Z" }),
    ],
  }));
  assert.equal(superseded.reviewStatus, "reviewed-approved");

  const conflict = assessFPGovernanceDossier(dossier({
    reviews: [
      review({ reviewRef: "pull/42/review/102", decision: "approved" }),
      review({ reviewRef: "pull/42/review/103", decision: "changes-requested" }),
    ],
  }));
  assert.equal(conflict.reviewStatus, "conflicting-decisions");
});

test("orders fractional UTC timestamps chronologically rather than lexicographically", () => {
  const result = assessFPGovernanceDossier(dossier({
    reviews: [
      review({ reviewRef: "pull/42/review/104", decision: "changes-requested", submittedAt: "2026-11-22T12:00:00Z" }),
      review({ reviewRef: "pull/42/review/105", decision: "approved", submittedAt: "2026-11-22T12:00:00.100Z" }),
    ],
  }));
  assert.equal(result.reviewStatus, "reviewed-approved");
});

test("a verified changes-requested decision cannot be masked by an unverified approval", () => {
  const result = assessFPGovernanceDossier(dossier({
    reviews: [
      review({ reviewRef: "pull/42/review/108", reviewerRef: "reviewer:verified", decision: "changes-requested" }),
      review({ reviewRef: "pull/42/review/109", reviewerRef: "reviewer:unverified", decision: "approved", reviewerAuthorizationStatus: "unverified" }),
    ],
  }));
  assert.equal(result.reviewStatus, "changes-requested");
});

test("marks absent workstream evidence incomplete", () => {
  const result = assessFPGovernanceDossier(dossier({
    workstreams: dossier().workstreams.filter((item) => item.workstream !== "M"),
  }));
  assert.equal(result.status, "incomplete");
  assert.equal(result.missing, 1);
});

test("classifies an owner record with an empty evidence list as incomplete", () => {
  const result = assessFPGovernanceDossier(dossier({
    workstreams: dossier().workstreams.map((item) => item.workstream === "M"
      ? { ...item, evidence: [] }
      : item),
  }));
  assert.equal(result.status, "incomplete");
  assert.equal(result.missing, 1);
});

test("blocks failed evidence and keeps not-run evidence incomplete", () => {
  const failed = assessFPGovernanceDossier(dossier({
    workstreams: dossier().workstreams.map((item) => item.workstream === "F"
      ? { ...item, evidence: [{ ...item.evidence[0], status: "failed" as const }] }
      : item),
  }));
  assert.equal(failed.status, "blocked");
  assert.equal(failed.failed, 1);

  const notRun = assessFPGovernanceDossier(dossier({
    workstreams: dossier().workstreams.map((item) => item.workstream === "H"
      ? { ...item, evidence: [{ ...item.evidence[0], status: "not-run" as const }] }
      : item),
  }));
  assert.equal(notRun.status, "incomplete");
  assert.equal(notRun.notRun, 1);
});

test("rejects stale evidence rather than accepting parent-commit proof", () => {
  const result = assessFPGovernanceDossier(dossier({
    workstreams: dossier().workstreams.map((item) => item.workstream === "G"
      ? { ...item, evidence: [{ ...item.evidence[0], testedSha: "b".repeat(40) }] }
      : item),
  }));
  assert.equal(result.status, "stale");
  assert.equal(result.stale, 1);
});

test("keeps L deferred and rejects invalid ownership, duplicate records, and evidence paths", () => {
  assert.throws(() => assessFPGovernanceDossier(dossier({
    workstreams: dossier().workstreams.map((item) => item.workstream === "L"
      ? { ...item, lifecycle: "active" as const }
      : item),
  })), TypeError);
  assert.throws(() => assessFPGovernanceDossier(dossier({
    workstreams: dossier().workstreams.map((item) => item.workstream === "F"
      ? { ...item, ownerRef: " " }
      : item),
  })), TypeError);
  assert.throws(() => assessFPGovernanceDossier(dossier({
    workstreams: [...dossier().workstreams, dossier().workstreams[0]],
  })), TypeError);
  assert.throws(() => assessFPGovernanceDossier(dossier({
    workstreams: dossier().workstreams.map((item) => item.workstream === "P"
      ? { ...item, evidence: [{ ...item.evidence[0], evidenceRef: "../../private" }] }
      : item),
  })), TypeError);
});

test("rejects malformed review identity, unsafe references, duplicate review refs, and excessive records", () => {
  assert.throws(() => assessFPGovernanceDossier(dossier({
    reviews: [review({ reviewedSha: "bad" })],
  })), TypeError);
  assert.throws(() => assessFPGovernanceDossier(dossier({
    reviews: [review({ reviewerAuthorizationRef: "../untrusted" })],
  })), TypeError);
  assert.throws(() => assessFPGovernanceDossier(dossier({
    reviews: [review(), review({ reviewerRef: "reviewer:other" })],
  })), TypeError);
  assert.throws(() => assessFPGovernanceDossier(dossier({
    reviews: Array.from({ length: 101 }, (_, index) => review({
      reviewRef: `pull/42/review/${index + 1}`,
      reviewerRef: `reviewer:${index + 1}`,
    })),
  })), TypeError);
});

test("rejects unsupported policy versions and non-F–P workstreams", () => {
  assert.throws(() => assessFPGovernanceDossier(dossier({
    policyVersion: "unknown" as typeof FP_GOVERNANCE_POLICY_VERSION,
  })), TypeError);
  assert.throws(() => assessFPGovernanceDossier(dossier({
    workstreams: dossier().workstreams.map((item) => item.workstream === "F"
      ? { ...item, workstream: "A" as "F" }
      : item),
  })), TypeError);
});
