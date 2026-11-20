import test from "node:test";
import assert from "node:assert/strict";
import { createFactoryCandidateEvidenceRecord } from "../lib/agent-factory-evidence.mjs";

const valid = (overrides = {}) => ({
  repository: "X84657465/global-citizen-ai-network",
  issue_number: 42,
  pull_request_number: 134,
  branch: "ai-task/issue-42-abcdef123456",
  commit_sha: "A".repeat(40),
  ci_run_id: "44666919599",
  ci_run_attempt: 2,
  conclusion: "success",
  timestamp: "2026-11-20T03:00:00.000Z",
  ...overrides,
});

test("exports the exact EvidenceRecord v1.0.0 shape for a passing candidate run", () => {
  const record = createFactoryCandidateEvidenceRecord(valid());
  assert.deepEqual(Object.keys(record), ["repository", "branch", "commit_sha", "command", "result", "run_url", "timestamp"]);
  assert.equal(record.result, "pass");
  assert.equal(record.commit_sha, "a".repeat(40));
  assert.equal(record.run_url, "https://github.com/X84657465/global-citizen-ai-network/actions/runs/44666919599");
  assert.match(record.command, /Issue #42; PR #134; run #44666919599; attempt 2/);
});

test("maps a failed candidate to fail without conflating it with a system failure", () => {
  assert.equal(createFactoryCandidateEvidenceRecord(valid({ conclusion: "failure" })).result, "fail");
});

test("rejects malformed repository, task branch, SHA and run provenance", () => {
  for (const patch of [
    { repository: "owner" }, { branch: "main" }, { commit_sha: "not-a-sha" },
    { issue_number: 0 }, { pull_request_number: -1 }, { ci_run_id: "not-a-run" },
    { ci_run_attempt: 0 }, { conclusion: "cancelled" }, { timestamp: "yesterday" },
  ]) assert.throws(() => createFactoryCandidateEvidenceRecord(valid(patch)));
});
