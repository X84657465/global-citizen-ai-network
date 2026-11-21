import assert from "node:assert/strict";
import test from "node:test";
import {
  assessFPSecurityEvidence,
  FP_SECURITY_CONTROLS,
  type FPSecurityEvidence,
} from "../../lib/fp/security-assurance.ts";

const sha = "a".repeat(40);
const evidence = (overrides: Partial<FPSecurityEvidence> = {}): FPSecurityEvidence => ({
  controlId: "member-isolation",
  testedSha: sha,
  status: "passed",
  evidenceRef: "tests/security/two-member-rls.test.mjs",
  executedAt: "2026-11-21T12:00:00.000Z",
  ...overrides,
});

test("requires all F baseline controls to be evidenced against the exact candidate SHA", () => {
  const records = FP_SECURITY_CONTROLS.map((control) => evidence({
    controlId: control.id,
    evidenceRef: control.evidencePath,
  }));
  const result = assessFPSecurityEvidence({ candidateSha: sha, evidence: records });
  assert.equal(result.status, "ready-for-review");
  assert.equal(result.passed, FP_SECURITY_CONTROLS.length);
  assert.equal(result.acceptanceGranted, false);
});

test("marks missing or unexecuted controls incomplete", () => {
  const result = assessFPSecurityEvidence({
    candidateSha: sha,
    evidence: [evidence({ status: "not-run" })],
  });
  assert.equal(result.status, "incomplete");
  assert.equal(result.missing, FP_SECURITY_CONTROLS.length - 1);
  assert.equal(result.notRun, 1);
});

test("blocks the assessment when any exact-SHA control fails", () => {
  const result = assessFPSecurityEvidence({
    candidateSha: sha,
    evidence: [evidence({ status: "failed" })],
  });
  assert.equal(result.status, "blocked");
  assert.equal(result.failed, 1);
  assert.equal(result.acceptanceGranted, false);
});

test("rejects evidence from a different commit as stale", () => {
  const result = assessFPSecurityEvidence({
    candidateSha: sha,
    evidence: [evidence({ testedSha: "b".repeat(40) })],
  });
  assert.equal(result.status, "stale");
  assert.equal(result.stale, 1);
});

test("rejects duplicate controls, invalid SHA, and unsafe evidence paths", () => {
  assert.throws(() => assessFPSecurityEvidence({ candidateSha: "not-a-sha", evidence: [] }), TypeError);
  assert.throws(() => assessFPSecurityEvidence({
    candidateSha: sha,
    evidence: [evidence(), evidence()],
  }), TypeError);
  assert.throws(() => assessFPSecurityEvidence({
    candidateSha: sha,
    evidence: [evidence({ evidenceRef: "../../private.txt" })],
  }), TypeError);
  assert.throws(() => assessFPSecurityEvidence({
    candidateSha: sha,
    evidence: [evidence({ evidenceRef: "tests/other-unrelated.test.ts" })],
  }), TypeError);
});
