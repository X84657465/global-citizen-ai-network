import test from "node:test";
import assert from "node:assert/strict";
import { assessClaimEvidence, validateResearchSourceRecord } from "../lib/deep-research-source-quality.mjs";

const source = (overrides = {}) => ({
  source_id: "SRC-001",
  title: "Example source",
  url: "https://research.example.org/article",
  publisher: "Example Research",
  publisher_key: "example-research",
  source_type: "primary",
  published_at: "2026-11-01T00:00:00Z",
  retrieved_at: "2026-11-20T00:00:00Z",
  claim_ids: ["CLM-001"],
  stance: "supports",
  limitations: [],
  ...overrides,
});

test("normalizes a valid source and preserves publication and retrieval provenance", () => {
  const record = validateResearchSourceRecord(source({ url: "https://RESEARCH.example.org/article" }));
  assert.equal(record.url, "https://research.example.org/article");
  assert.equal(record.published_at, "2026-11-01T00:00:00.000Z");
  assert.equal(record.retrieved_at, "2026-11-20T00:00:00.000Z");
  assert.deepEqual(record.limitations, []);
});

test("rejects unsafe URLs, unsupported source types and malformed provenance", () => {
  for (const patch of [
    { url: "http://example.org/source" },
    { url: "https://user:secret@example.org/source" },
    { url: "https://localhost/source" },
    { url: "https://192.168.1.20/source" },
    { url: "https://0.0.0.0/source" },
    { url: "https://100.64.0.1/source" },
    { url: "https://[::1]/source" },
    { url: "https://[::ffff:7f00:1]/source" },
    { url: "https://example.org:8443/source" },
    { source_type: "unknown" },
    { stance: "maybe" },
    { published_at: "not-a-date" },
    { retrieved_at: "not-a-date" },
    { published_at: "2026-11-01" },
    { retrieved_at: "2026-11-20T00:00:00" },
    { publisher_key: "Publisher With Spaces" },
  ]) assert.throws(() => validateResearchSourceRecord(source(patch)));
});

test("requires bounded, unique claim IDs and rejects unrecognized fields", () => {
  assert.throws(() => validateResearchSourceRecord(source({ claim_ids: [] })), /between 1 and 30/);
  assert.throws(() => validateResearchSourceRecord(source({ claim_ids: ["CLM-001", "CLM-001"] })), /must not contain duplicates/);
  assert.throws(() => validateResearchSourceRecord(source({ claim_ids: ["not-a-claim"] })), /CLM-/);
  assert.throws(() => validateResearchSourceRecord(source({ confidence: 0.99 })), /Unsupported research source field/);
  assert.throws(() => validateResearchSourceRecord(source({ limitations: "none" })), /limitations must be an array/);
});

test("does not count multiple URLs from one publisher as independent corroboration", () => {
  const result = assessClaimEvidence("CLM-001", [
    source({ source_id: "SRC-001", url: "https://research.example.org/one" }),
    source({ source_id: "SRC-002", url: "https://research.example.org/two", title: "Second article" }),
  ]);
  assert.equal(result.status, "single-source");
  assert.equal(result.independent_supporting_publishers, 1);
  assert.equal(result.counter_evidence_required, true);
});

test("marks a claim corroborated only when multiple distinct publishers independently support it", () => {
  const result = assessClaimEvidence("CLM-001", [
    source({ source_id: "SRC-001", publisher_key: "publisher-a" }),
    source({ source_id: "SRC-002", publisher_key: "publisher-b" }),
  ]);
  assert.equal(result.status, "corroborated");
  assert.equal(result.independent_supporting_publishers, 2);
  assert.equal(result.counter_evidence_required, true);
});

test("marks independent support and counter-evidence as contested, not averaged into a trust score", () => {
  const result = assessClaimEvidence("CLM-001", [
    source({ source_id: "SRC-001", publisher_key: "publisher-a", stance: "supports" }),
    source({ source_id: "SRC-002", publisher_key: "publisher-b", stance: "supports" }),
    source({ source_id: "SRC-003", publisher_key: "publisher-c", stance: "contradicts" }),
    source({ source_id: "SRC-004", publisher_key: "publisher-d", stance: "contextualizes" }),
  ]);
  assert.equal(result.status, "contested");
  assert.equal(result.independent_supporting_publishers, 2);
  assert.equal(result.independent_contradicting_publishers, 1);
  assert.equal(result.contextualizing_source_ids.length, 1);
  assert.equal(result.counter_evidence_required, false);
});

test("does not count a publisher's self-conflicting articles as independent contradiction", () => {
  const result = assessClaimEvidence("CLM-001", [
    source({ source_id: "SRC-001", publisher_key: "publisher-a", stance: "supports" }),
    source({ source_id: "SRC-002", publisher_key: "publisher-a", stance: "contradicts" }),
  ]);
  assert.equal(result.status, "single-source");
  assert.deepEqual(result.self_conflicted_publishers, ["publisher-a"]);
  assert.equal(result.independent_contradicting_publishers, 0);
  assert.equal(result.counter_evidence_required, true);
});

test("rejects duplicate source IDs and identifies counter-evidence-only claims", () => {
  assert.throws(() => assessClaimEvidence("CLM-001", [source(), source()]), /source_id values must be unique/);
  const result = assessClaimEvidence("CLM-001", [source({ stance: "contradicts" })]);
  assert.equal(result.status, "counter-evidence-only");
  assert.equal(result.supporting_source_ids.length, 0);
});

test("rejects impossible calendar dates, clock times and timezone offsets", () => {
  for (const value of [
    "2026-02-30T00:00:00Z",
    "2026-13-01T00:00:00Z",
    "2026-11-20T24:00:00Z",
    "2026-11-20T00:60:00Z",
    "2026-11-20T00:00:60Z",
    "2026-11-20T00:00:00+00:60",
    "2026-11-20T00:00:00+24:00",
  ]) {
    assert.throws(
      () => validateResearchSourceRecord(source({ published_at: value })),
      /valid timezone-qualified ISO-8601/,
      value,
    );
  }
});
