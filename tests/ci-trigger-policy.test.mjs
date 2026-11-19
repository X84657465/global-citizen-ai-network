import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const workflow = readFileSync(new URL("../.github/workflows/ci.yml", import.meta.url), "utf8").replace(/\r\n/g, "\n");
const preflight = readFileSync(new URL("../.github/workflows/agent-task-preflight.yml", import.meta.url), "utf8").replace(/\r\n/g, "\n");
const runnerSmoke = readFileSync(new URL("../.github/workflows/self-hosted-runner-smoke.yml", import.meta.url), "utf8").replace(/\r\n/g, "\n");
const publisher = readFileSync(new URL("../scripts/publish-agent-patch.mjs", import.meta.url), "utf8").replace(/\r\n/g, "\n");
const workflowLevelConcurrency = workflow.split("\non:\n", 1)[0];

test("full CI runs on main pushes and pull-request lifecycle events, not codex branch pushes", () => {
  assert.ok(workflow.includes("  push:\n    branches: [main]\n"));
  assert.ok(workflow.includes("  pull_request:\n    branches: [main]\n    types: [opened, reopened, synchronize]\n"));
  assert.ok(workflow.includes("  repository_dispatch:\n    types: [ai-task-ci]\n"));
  assert.equal(workflow.includes('branches: [main, "codex/**"]'), false);
});

test("CI coalesces pending commits per PR while serializing self-hosted jobs globally", () => {
  assert.ok(workflowLevelConcurrency.includes("group: global-citizen-ai-network-ci-${{ github.event.pull_request.number || github.event.client_payload.pull_request_number || github.ref }}"));
  assert.ok(workflowLevelConcurrency.includes("cancel-in-progress: false"));
  assert.equal(workflowLevelConcurrency.includes("queue: max"), false);

  const jobs = ["resolve-candidate", "build", "database", "circuit-breaker", "circuit-breaker-success"];
  for (let index = 0; index < jobs.length; index += 1) {
    const job = jobs[index];
    const start = workflow.indexOf("  " + job + ":\n");
    assert.ok(start >= 0, "missing CI job: " + job);
    const next = index + 1 < jobs.length
      ? workflow.indexOf("  " + jobs[index + 1] + ":\n", start + 1)
      : workflow.length;
    const section = workflow.slice(start, next < 0 ? workflow.length : next);
    assert.ok(section.includes("group: global-citizen-ai-network-self-hosted-runner"), job + " must use the shared Runner group");
    assert.ok(section.includes("queue: max"), job + " must preserve pending Runner jobs");
  }
});

test("preflight and Runner smoke workflows share the bounded Runner queue", () => {
  for (const source of [preflight, runnerSmoke]) {
    assert.ok(source.includes("group: global-citizen-ai-network-self-hosted-runner"));
    assert.ok(source.includes("queue: max"));
    assert.ok(source.includes("cancel-in-progress: false"));
  }
});

test("CI never auto-approves or merges AI task pull requests; human approval is required", () => {
  assert.equal(workflow.includes("  auto-merge-ai-task:"), false);
  assert.equal(workflow.includes("markPullRequestReadyForReview"), false);
  assert.equal(workflow.includes("github.rest.pulls.merge"), false);
});


test("publisher binds scratch evidence, recovers deterministic branches, and avoids duplicate new-PR CI dispatch", () => {
  assert.ok(publisher.includes("scratchPatchEvidenceMatches"));
  assert.ok(publisher.includes("ensureDeterministicBranch"));
  assert.ok(publisher.includes("collectGitHubPages"));

  const existingStart = publisher.indexOf(
    "if (existingPull) {",
    publisher.indexOf("const commitSha = branchResult.commit_sha;"),
  );
  const createStart = publisher.indexOf('pull = await api("/repos/" + repository + "/pulls", "POST", {');
  assert.ok(existingStart >= 0);
  assert.ok(createStart > existingStart);

  const existingBlock = publisher.slice(existingStart, createStart);
  const newPullBlock = publisher.slice(createStart);
  assert.ok(existingBlock.includes("await dispatchAiTaskCi(existingPull);"));
  assert.equal(newPullBlock.includes("dispatchAiTaskCi("), false);
  assert.ok(newPullBlock.includes("item.head?.sha === commitSha"));
  assert.ok(newPullBlock.includes("pull.head?.sha !== commitSha"));
});


test("CI resolves the current task PR and binds candidate outcomes to exact run evidence", () => {
  assert.ok(workflow.includes("  resolve-candidate:"));
  assert.ok(workflow.includes("scripts/resolve-agent-task-pr.mjs"));
  assert.ok(workflow.includes("needs.resolve-candidate.outputs.is_current_head == 'true'"));
  assert.ok(workflow.includes("AGENT_FACTORY_MODE: candidate-start"));
  assert.ok(workflow.includes("CI_RUN_ID: ${{ github.run_id }}"));
  assert.ok(workflow.includes("CI_RUN_ATTEMPT: ${{ github.run_attempt }}"));
  assert.ok(workflow.includes("AGENT_FACTORY_MODE: candidate"));
  assert.ok(workflow.includes("CI_CONCLUSION: failure"));
  assert.ok(workflow.includes("CI_CONCLUSION: success"));
  assert.ok(workflow.includes("needs.resolve-candidate.outputs.is_task_pr == 'true'"));
});

test("preflight reserves and releases V2 leases and does not overproduce roadmap tasks", () => {
  assert.ok(preflight.includes("AGENT_FACTORY_MODE: reserve"));
  assert.ok(preflight.includes("AGENT_FACTORY_MODE: transition"));
  assert.ok(preflight.includes("scripts/agent-factory-v2-controller.mjs"));
  assert.ok(preflight.includes("steps.factory-gate.outputs.pending_tasks == '0'"));
  assert.ok(preflight.includes("steps.select-task.outputs.open_task_prs == '0'"));
  assert.ok(preflight.includes("NEXT_TASK_STATE = \"awaiting_ci\""));
});
