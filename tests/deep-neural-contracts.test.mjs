import test from "node:test";
import assert from "node:assert/strict";
import {
  DeepNeuralContractError,
  validateKnowledgeArtifact,
  validateEvidenceRecord,
  validateCapabilityManifest,
  validateLearningProposal,
  validateEvaluationResult,
} from "../lib/deep-neural-contracts.mjs";

const sha = "a".repeat(40);
const knowledge = (overrides = {}) => ({
  artifact_id: "factory.failure.patch-path",
  version: "0.1.0",
  track: "A",
  kind: "procedural",
  content_ref: "docs/runbooks/patch-path.md",
  provenance: { source_type: "test", source_ref: "tests/agent-patch-validation.test.mjs", commit_sha: sha, reviewed: true, reviewer: "maintainer" },
  confidence: 1,
  sensitivity: "internal",
  created_at: "2026-11-20T00:00:00.000Z",
  review_status: "approved",
  ...overrides,
});

test("validates and normalizes a reviewed knowledge artifact", () => {
  const result = validateKnowledgeArtifact(knowledge());
  assert.equal(result.artifact_id, "factory.failure.patch-path");
  assert.equal(result.track, "A");
  assert.equal(result.provenance.commit_sha, sha);
});

test("rejects unsupported keys, unsafe refs, and invalid versions", () => {
  assert.throws(() => validateKnowledgeArtifact(knowledge({ unexpected: true })), DeepNeuralContractError);
  assert.throws(() => validateKnowledgeArtifact(knowledge({ content_ref: "javascript:alert(1)" })), /must not use/);
  assert.throws(() => validateKnowledgeArtifact(knowledge({ version: "v0.1" })), /numeric MAJOR.MINOR.PATCH/);
});

test("requires reviewer provenance before an artifact can be approved", () => {
  assert.throws(() => validateKnowledgeArtifact(knowledge({ provenance: { source_type: "test", source_ref: "unit", reviewed: false } })), /approved artifact/);
  assert.throws(() => validateKnowledgeArtifact(knowledge({ provenance: { source_type: "test", source_ref: "unit", reviewed: true } })), /requires a reviewer/);
});

test("rejects invalid confidence, dates, and expiry ordering", () => {
  assert.throws(() => validateKnowledgeArtifact(knowledge({ confidence: 1.1 })), /confidence/);
  assert.throws(() => validateKnowledgeArtifact(knowledge({ created_at: "yesterday" })), /ISO-8601/);
  assert.throws(() => validateKnowledgeArtifact(knowledge({ expires_at: "2026-11-19T00:00:00.000Z" })), /later than created_at/);
});

test("validates evidence records and rejects non-GitHub run URLs", () => {
  const result = validateEvidenceRecord({ repository: "owner/repo", branch: "feat/test", commit_sha: sha, command: "npm test", result: "pass", run_url: "https://github.com/owner/repo/actions/runs/123", timestamp: "2026-11-20T00:00:00.000Z" });
  assert.equal(result.result, "pass");
  assert.throws(() => validateEvidenceRecord({ repository: "owner/repo", branch: "main", commit_sha: sha, command: "npm test", result: "pass", run_url: "http://evil.example/run", timestamp: "2026-11-20T00:00:00.000Z" }), /GitHub over HTTPS/);
});

test("rejects malformed evidence SHA and unknown outcomes", () => {
  const base = { repository: "owner/repo", branch: "main", commit_sha: "bad", command: "npm test", result: "pass", timestamp: "2026-11-20T00:00:00.000Z" };
  assert.throws(() => validateEvidenceRecord(base), /commit_sha/);
  assert.throws(() => validateEvidenceRecord({ ...base, commit_sha: sha, result: "maybe" }), /pass, fail or unknown/);
});

test("validates least-privilege capability manifests", () => {
  const result = validateCapabilityManifest({
    capability_id: "knowledge.lookup",
    version: "1.0.0",
    input_schema: { type: "object", properties: {} },
    output_schema: { type: "object", properties: {} },
    permissions: ["knowledge:read"],
    risk_class: "low",
    tests: ["tests/deep-neural-contracts.test.mjs"],
  });
  assert.deepEqual(result.permissions, ["knowledge:read"]);
});

test("rejects capability manifests without schemas, permissions shape or tests", () => {
  const base = { capability_id: "memory.write", version: "1.0.0", input_schema: {}, output_schema: { type: "object" }, permissions: ["memory:write"], risk_class: "high", tests: ["test"] };
  assert.throws(() => validateCapabilityManifest(base), /explicit type/);
  assert.throws(() => validateCapabilityManifest({ ...base, input_schema: { type: "object" }, permissions: ["*"] }), /invalid capability token/);
  assert.throws(() => validateCapabilityManifest({ ...base, input_schema: { type: "object" }, tests: [] }), /between 1 and 50/);
});

test("validates a cross-track learning proposal", () => {
  const result = validateLearningProposal({
    source_evidence: ["sha:" + sha],
    proposed_rule: "Bind test evidence to the exact candidate SHA.",
    affected_tracks: ["A", "D"],
    expected_benefit: "Prevent stale CI evidence from being reused.",
    risks: "Requires every consumer to pass a commit SHA.",
    validation_plan: ["Add stale-SHA regression tests."],
    decision: "pending",
  });
  assert.deepEqual(result.affected_tracks, ["A", "D"]);
});

test("rejects unknown tracks and duplicate proposal evidence", () => {
  const base = { source_evidence: ["same", "same"], proposed_rule: "rule", affected_tracks: ["A"], expected_benefit: "benefit", risks: "risk", validation_plan: ["test"], decision: "pending" };
  assert.throws(() => validateLearningProposal(base), /duplicates/);
  assert.throws(() => validateLearningProposal({ ...base, source_evidence: ["evidence"], affected_tracks: ["Z"] }), /unknown track/);
});

test("a passing evaluation must include evidence", () => {
  const base = { target_version: "0.2.0", criteria: ["all required tests pass"], evidence_refs: [], outcome: "pass" };
  assert.throws(() => validateEvaluationResult(base), /requires evidence/);
  assert.equal(validateEvaluationResult({ ...base, evidence_refs: ["sha:" + sha] }).outcome, "pass");
});

test("unknown evaluations remain explicit and are not coerced to pass", () => {
  const result = validateEvaluationResult({ target_version: "0.2.0", criteria: ["CI completed"], evidence_refs: [], outcome: "unknown" });
  assert.equal(result.outcome, "unknown");
});


test("accepts Track E knowledge artifacts and proposals spanning all five tracks", () => {
  const artifact = validateKnowledgeArtifact(knowledge({ track: "E" }));
  assert.equal(artifact.track, "E");

  const proposal = validateLearningProposal({
    source_evidence: ["sha:" + sha],
    proposed_rule: "Share a reviewed research finding across every governed workstream.",
    affected_tracks: ["A", "B", "C", "D", "E"],
    expected_benefit: "Make cross-track impact explicit without rejecting the five-track model.",
    risks: "Each receiving track must independently review and adopt the proposal.",
    validation_plan: ["Run the exact-head Deep Neural contract suite."],
    decision: "pending",
  });
  assert.deepEqual(proposal.affected_tracks, ["A", "B", "C", "D", "E"]);
});

test("continues to reject proposals with unknown tracks or more than five affected tracks", () => {
  const base = {
    source_evidence: ["evidence"],
    proposed_rule: "rule",
    affected_tracks: ["A", "B", "C", "D", "E", "F"],
    expected_benefit: "benefit",
    risks: "risk",
    validation_plan: ["test"],
    decision: "pending",
  };
  assert.throws(() => validateLearningProposal(base), /between 1 and 5 items/);
  assert.throws(() => validateLearningProposal({ ...base, affected_tracks: ["A", "B", "C", "D", "Z"] }), /unknown track/);
});
