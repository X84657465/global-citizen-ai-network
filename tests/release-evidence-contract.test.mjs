import test from "node:test";
import assert from "node:assert/strict";
import { validateReleaseEvidence } from "../lib/release-evidence-contract.mjs";

const sha = "a".repeat(40);
const evidence = () => ({
  schemaVersion: 1,
  repository: "X84657465/global-citizen-ai-network",
  track: "G",
  pullRequestNumber: 148,
  baseSha: "b".repeat(40),
  headSha: sha,
  generatedAt: "2026-11-20T08:30:00Z",
  checks: [
    { name: "unit", conclusion: "success", headSha: sha, runId: 123, runAttempt: 1 },
    { name: "build", conclusion: "success", headSha: sha, runId: 124, runAttempt: 1 },
  ],
});

test("accepts complete exact-head release evidence", () => {
  assert.deepEqual(validateReleaseEvidence(evidence(), {
    expectedRepository: "X84657465/global-citizen-ai-network",
    expectedHeadSha: sha,
    requiredChecks: ["unit", "build"],
  }), { valid: true, errors: [] });
});

test("rejects missing or unsupported root fields", () => {
  const value = evidence();
  delete value.baseSha;
  value.secret = "must-not-be-accepted";
  const result = validateReleaseEvidence(value);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((error) => error.includes("baseSha")));
  assert.ok(result.errors.includes("evidence contains unsupported root fields"));
});

test("rejects a stale head SHA even when check records are internally consistent", () => {
  const result = validateReleaseEvidence(evidence(), { expectedHeadSha: "c".repeat(40) });
  assert.ok(result.errors.includes("headSha does not match the expected tested commit"));
});

test("rejects pending, failed, or wrong-head checks", () => {
  const value = evidence();
  value.checks[0].conclusion = "pending";
  value.checks[1].headSha = "c".repeat(40);
  const result = validateReleaseEvidence(value);
  assert.ok(result.errors.some((error) => error.includes("conclusion must be success")));
  assert.ok(result.errors.some((error) => error.includes("must equal the evidence headSha")));
});

test("rejects duplicate check names and missing required checks", () => {
  const value = evidence();
  value.checks[1].name = "unit";
  const result = validateReleaseEvidence(value, { requiredChecks: ["unit", "database"] });
  assert.ok(result.errors.some((error) => error.includes("must be unique")));
  assert.ok(result.errors.includes("required check is missing: database"));
});

test("rejects malformed identity, timestamps, SHAs and run metadata", () => {
  const value = evidence();
  value.track = "Z";
  value.pullRequestNumber = 0;
  value.generatedAt = "2026-02-30T25:61:00";
  value.checks[0].runId = -1;
  value.checks[0].runAttempt = 0;
  const result = validateReleaseEvidence(value);
  assert.ok(result.errors.some((error) => error.includes("track must")));
  assert.ok(result.errors.some((error) => error.includes("pullRequestNumber")));
  assert.ok(result.errors.some((error) => error.includes("generatedAt")));
  assert.ok(result.errors.some((error) => error.includes("runId")));
  assert.ok(result.errors.some((error) => error.includes("runAttempt")));
});

test("rejects arrays, nulls and non-plain evidence inputs", () => {
  assert.equal(validateReleaseEvidence(null).valid, false);
  assert.equal(validateReleaseEvidence([]).valid, false);
});

test("rejects duplicate required checks and empty expected identities", () => {
  const value = evidence();
  const duplicate = validateReleaseEvidence(value, { requiredChecks: ["unit", "unit"] });
  assert.ok(duplicate.errors.includes("requiredChecks must not contain duplicate names"));
  const emptyRepository = validateReleaseEvidence(value, { expectedRepository: "" });
  assert.ok(emptyRepository.errors.includes("repository does not match the expected repository"));
  const emptyHead = validateReleaseEvidence(value, { expectedHeadSha: "" });
  assert.ok(emptyHead.errors.includes("headSha does not match the expected tested commit"));
});

test("accepts valid timezone offsets and rejects impossible offset values", () => {
  const valid = evidence();
  valid.generatedAt = "2026-11-20T16:30:00+08:00";
  assert.equal(validateReleaseEvidence(valid).valid, true);
  const invalid = evidence();
  invalid.generatedAt = "2026-11-20T16:30:00+14:01";
  assert.equal(validateReleaseEvidence(invalid).valid, false);
});
