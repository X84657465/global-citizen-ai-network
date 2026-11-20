import test from "node:test";
import assert from "node:assert/strict";
import {
  DeepNeuralContractError,
  validateKnowledgeArtifact,
  validateEvidenceRecord,
  validateCapabilityManifest,
  validateLearningProposal,
  validateEvaluationResult,
  validateResearchSourceRecord,
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


test("validates Track E research source records with publication and retrieval provenance", () => {
  const source = validateResearchSourceRecord({
    source_id: "SRC-RESEARCH-001",
    title: "A curated primary research source",
    url: "https://research.example.org/report",
    publisher: "Example Research Institute",
    publisher_key: "example-research-institute",
    source_type: "primary",
    published_at: "2026-11-01T00:00:00.000Z",
    retrieved_at: "2026-11-20T00:00:00.000Z",
    claim_ids: ["CLM-RESEARCH-001"],
    stance: "supports",
    limitations: ["Synthetic compatibility fixture"],
  });
  assert.equal(source.source_id, "SRC-RESEARCH-001");
  assert.equal(source.publisher_key, "example-research-institute");
  assert.equal(source.stance, "supports");
  assert.deepEqual(source.claim_ids, ["CLM-RESEARCH-001"]);
});

test("rejects unsafe Track E URLs, malformed source IDs and invalid provenance fields", () => {
  const base = {
    source_id: "SRC-RESEARCH-001", title: "Source", url: "https://example.org/source",
    publisher: "Publisher", publisher_key: "publisher", source_type: "secondary",
    published_at: null, retrieved_at: "2026-11-20T00:00:00.000Z",
    claim_ids: ["CLM-RESEARCH-001"], stance: "contradicts", limitations: [],
  };
  for (const patch of [
    { url: "http://example.org/source" },
    { url: "https://user:secret@example.org/source" },
    { url: "https://localhost/source" },
    { url: "https://10.0.0.10/source" },
    { url: "https://0.0.0.0/source" },
    { url: "https://100.64.0.1/source" },
    { url: "https://169.254.10.20/source" },
    { url: "https://172.20.0.1/source" },
    { url: "https://192.0.2.10/source" },
    { url: "https://198.18.0.1/source" },
    { url: "https://203.0.113.8/source" },
    { url: "https://[::1]/source" },
    { url: "https://[fc00::1]/source" },
    { url: "https://[fe80::1]/source" },
    { url: "https://[::ffff:7f00:1]/source" },
    { url: "https://example.org:8443/source" },
    { source_id: "not-a-source-id" },
    { publisher_key: "Publisher with spaces" },
    { source_type: "unknown" },
    { stance: "maybe" },
    { claim_ids: ["not-a-claim"] },
    { published_at: "yesterday" },
    { retrieved_at: "yesterday" },
    { unexpected: true },
  ]) assert.throws(() => validateResearchSourceRecord({ ...base, ...patch }));
});

test("normalizes Track E publisher keys and defaults omitted limitations", () => {
  const result = validateResearchSourceRecord({
    source_id: "SRC-RESEARCH-002", title: "Source", url: "https://example.org/source",
    publisher: "Publisher", publisher_key: "PUBLISHER", source_type: "tertiary",
    published_at: null, retrieved_at: "2026-11-20T00:00:00Z",
    claim_ids: ["CLM-RESEARCH-002"], stance: "contextualizes",
  });
  assert.equal(result.publisher_key, "publisher");
  assert.deepEqual(result.limitations, []);
});

test("rejects impossible ISO-8601 dates and timezone offsets beyond ±14:00", () => {
  const validBoundary = validateKnowledgeArtifact(knowledge({ created_at: "2026-11-20T00:00:00+14:00" }));
  assert.equal(validBoundary.created_at, "2026-11-19T10:00:00.000Z");

  for (const created_at of [
    "2026-02-30T00:00:00.000Z",
    "2026-13-01T00:00:00.000Z",
    "2026-11-20T24:00:00.000Z",
    "2026-11-20T00:60:00.000Z",
    "2026-11-20T00:00:00",
    "2026-11-20T00:00:00+00:60",
    "2026-11-20T00:00:00+14:01",
    "2026-11-20T00:00:00-15:00",
  ]) {
    assert.throws(() => validateKnowledgeArtifact(knowledge({ created_at })), /timezone-qualified ISO-8601/);
  }
});
