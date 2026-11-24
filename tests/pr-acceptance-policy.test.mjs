import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { evaluateAcceptance, REQUIRED_CI_JOBS } = require("../scripts/pr-acceptance-policy.cjs");

const sha = "a".repeat(40);
function valid(overrides = {}) {
  return {
    currentHeadSha: sha,
    ci: {
      headSha: sha,
      status: "completed",
      conclusion: "success",
      jobs: REQUIRED_CI_JOBS.map(name => ({ name, conclusion: "success" })),
    },
    preflight: { applicable: false, status: "not_applicable" },
    hasCurrentHeadApproval: true,
    mergeable: true,
    draft: false,
    ...overrides,
  };
}

test("accepts only a fully validated current-head PR", () => {
  assert.equal(evaluateAcceptance(valid()).accepted, true);
});

test("rejects a required job with SKIPPED", () => {
  const input = valid();
  input.ci.jobs[1].conclusion = "skipped";
  const result = evaluateAcceptance(input);
  assert.equal(result.accepted, false);
  assert.ok(result.failures.some(item => item.code === "REQUIRED_JOB_SKIPPED"));
});

test("rejects CI results from an old SHA", () => {
  const result = evaluateAcceptance(valid({ ci: { ...valid().ci, headSha: "b".repeat(40) } }));
  assert.ok(result.failures.some(item => item.code === "CI_SHA_MISMATCH"));
});

test("rejects pending CI", () => {
  const result = evaluateAcceptance(valid({ ci: { ...valid().ci, status: "in_progress", conclusion: null } }));
  assert.ok(result.failures.some(item => item.code === "CI_NOT_SUCCESS"));
});

test("rejects applicable Preflight failure", () => {
  const result = evaluateAcceptance(valid({
    preflight: { applicable: true, headSha: sha, status: "completed", conclusion: "failure", requiredJobConclusion: "failure" },
  }));
  assert.ok(result.failures.some(item => item.code === "PREFLIGHT_NOT_SUCCESS"));
});

test("rejects missing formal approval", () => {
  const result = evaluateAcceptance(valid({ hasCurrentHeadApproval: false }));
  assert.ok(result.failures.some(item => item.code === "APPROVAL_MISSING"));
});

test("rejects mergeable=false and unknown mergeability", () => {
  assert.ok(evaluateAcceptance(valid({ mergeable: false })).failures.some(item => item.code === "NOT_MERGEABLE"));
  assert.ok(evaluateAcceptance(valid({ mergeable: null })).failures.some(item => item.code === "MERGEABILITY_UNKNOWN"));
});

test("rejects Draft PRs", () => {
  assert.ok(evaluateAcceptance(valid({ draft: true })).failures.some(item => item.code === "DRAFT_NOT_READY"));
});
