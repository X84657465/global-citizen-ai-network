import test from "node:test";
import assert from "node:assert/strict";
import {
  parseAgentTaskIssueNumber,
  isAgentTaskBranchForIssue,
} from "../lib/agent-task-pr-metadata.mjs";

test("parses exactly one positive AI task marker", () => {
  assert.equal(parseAgentTaskIssueNumber("Description\\n<!-- ai-task:73 -->\\n"), 73);
  assert.equal(parseAgentTaskIssueNumber("<!-- ai-task:0 -->"), null);
  assert.equal(parseAgentTaskIssueNumber("<!-- ai-task:73 --><!-- ai-task:74 -->"), null);
  assert.equal(parseAgentTaskIssueNumber("no task marker"), null);
});

test("requires the task branch to identify the same issue", () => {
  assert.equal(isAgentTaskBranchForIssue("ai-task/issue-73-a1b2c3d4e5f6", 73), true);
  assert.equal(isAgentTaskBranchForIssue("ai-task/issue-730-a1b2c3d4e5f6", 73), false);
  assert.equal(isAgentTaskBranchForIssue("codex/issue-73-a1b2c3", 73), false);
  assert.equal(isAgentTaskBranchForIssue("ai-task/issue-73-", 73), false);
  assert.equal(isAgentTaskBranchForIssue("ai-task/issue-73-a1b2c3", 73), false);
  assert.equal(isAgentTaskBranchForIssue("ai-task/issue-73-A1B2C3D4E5F6", 73), false);
  assert.equal(isAgentTaskBranchForIssue("ai-task/issue-73-a1b2c3d4e5f6" + String.fromCharCode(10) + "malicious", 73), false);
});
