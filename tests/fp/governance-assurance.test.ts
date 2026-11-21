import assert from "node:assert/strict";
import test from "node:test";
import {
  assessFPGovernanceDossier,
  FP_GOVERNANCE_POLICY_VERSION,
  FP_GOVERNANCE_REQUIREMENTS,
  type FPGovernanceDossier,
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

test("requires accountable owner and exact-SHA evidence for every F–P workstream", () => {
  const result = assessFPGovernanceDossier(dossier());
  assert.equal(result.status, "ready-for-human-review");
  assert.equal(result.complete, 11);
  assert.equal(result.governanceApprovalGranted, false);
  assert.equal(result.executionAuthorized, false);
  assert.equal(result.mergeAuthorized, false);
  assert.equal(result.deploymentAuthorized, false);
});

test("marks absent workstream evidence incomplete", () => {
  const result = assessFPGovernanceDossier(dossier({
    workstreams: dossier().workstreams.filter((item) => item.workstream !== "M"),
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
