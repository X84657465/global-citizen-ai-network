import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";

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

test("every V2 state-writer workflow is serialized by the shared Runner queue", () => {
  const workflowDirectory = new URL("../.github/workflows/", import.meta.url);
  const workflowFiles = readdirSync(workflowDirectory).filter((name) => /\.ya?ml$/i.test(name));
  let writerWorkflowCount = 0;

  for (const fileName of workflowFiles) {
    const source = readFileSync(new URL(fileName, workflowDirectory), "utf8").replace(/\r\n/g, "\n");
    if (!source.includes("scripts/agent-factory-v2-controller.mjs")) continue;
    writerWorkflowCount += 1;

    const jobsMarker = source.indexOf("\njobs:");
    assert.ok(jobsMarker >= 0, fileName + " must declare jobs");
    const workflowHeader = source.slice(0, jobsMarker);
    const workflowWideQueue =
      workflowHeader.includes("group: global-citizen-ai-network-self-hosted-runner") &&
      workflowHeader.includes("queue: max") &&
      workflowHeader.includes("cancel-in-progress: false");

    const jobsSource = source.slice(jobsMarker + "\njobs:".length);
    const jobHeaders = [...jobsSource.matchAll(/^  ([A-Za-z0-9_-]+):\s*$/gm)];
    const writerJobs = [];

    for (let index = 0; index < jobHeaders.length; index += 1) {
      const start = jobHeaders[index].index;
      const end = index + 1 < jobHeaders.length ? jobHeaders[index + 1].index : jobsSource.length;
      const section = jobsSource.slice(start, end);
      if (section.includes("scripts/agent-factory-v2-controller.mjs")) {
        writerJobs.push({ name: jobHeaders[index][1], section });
      }
    }

    assert.ok(writerJobs.length > 0, fileName + " references the V2 controller but no writer job was detected");
    if (!workflowWideQueue) {
      for (const job of writerJobs) {
        assert.ok(
          job.section.includes("group: global-citizen-ai-network-self-hosted-runner") &&
          job.section.includes("queue: max") &&
          job.section.includes("cancel-in-progress: false"),
          fileName + " job " + job.name + " must use the shared non-cancelling Runner queue",
        );
      }
    }
  }

  assert.ok(writerWorkflowCount > 0, "expected at least one V2 state-writer workflow");
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


test("candidate callbacks revalidate the current PR head and check out the exact tested SHA", () => {
  for (const stepName of [
    "Revalidate candidate PR head before recording failure",
    "Revalidate candidate PR head before recording success",
  ]) assert.ok(workflow.includes(stepName));
  const failureStart = workflow.indexOf("  circuit-breaker:");
  const successStart = workflow.indexOf("  circuit-breaker-success:");
  const failureJob = workflow.slice(failureStart, successStart);
  const successJob = workflow.slice(successStart);
  for (const job of [failureJob, successJob]) {
    assert.ok(job.includes("EXPECTED_HEAD_SHA: ${{ needs.resolve-candidate.outputs.head_sha }}"));
    assert.ok(job.includes("EXPECTED_HEAD_REF: ${{ needs.resolve-candidate.outputs.head_ref }}"));
    assert.ok(job.includes("steps.revalidate.outputs.is_current_head == 'true'"));
    assert.ok(job.includes("steps.revalidate.outputs.is_task_pr == 'true'"));
    assert.ok(job.includes("ref: ${{ github.event_name == 'repository_dispatch' && github.event.client_payload.head_sha || github.event.pull_request.head.sha || github.sha }}"));
  }
});

test("CI verifies Docker Engine and Ollama API/model availability on the Windows Runner", () => {
  const start = workflow.indexOf("- name: Verify local runner toolchain, Docker and Ollama");
  const end = workflow.indexOf("- name: Migration filename safety guard", start);
  assert.ok(start >= 0 && end > start, "runner capability verification step must exist");
  const section = workflow.slice(start, end);
  assert.ok(section.includes("docker info"), "Docker Engine health must be checked");
  assert.ok(section.includes("OLLAMA_BASE_URL"));
  assert.ok(section.includes("/api/tags"), "Ollama API must be queried");
  assert.ok(section.includes("$models.Count -eq 0"), "an installed model must be required");
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

test("roadmap planning uses V2 controller and does not invoke the legacy local-state writer", () => {
  assert.ok(preflight.includes("AGENT_FACTORY_MODE: plan"));
  assert.ok(preflight.includes("run: node scripts/agent-factory-v2-controller.mjs"));
  assert.equal(preflight.includes("run: node scripts/agent-factory-controller.mjs"), false);
});

test("preflight passes the durable V2 state Issue ID to the task selector", () => {
  assert.ok(preflight.includes("AGENT_FACTORY_STATE_ISSUE_NUMBER: ${{ steps.factory-gate.outputs.state_issue_number }}"));
});

test("preflight reserves and releases V2 leases and does not overproduce roadmap tasks", () => {
  assert.ok(preflight.includes("AGENT_FACTORY_MODE: reserve"));
  assert.ok(preflight.includes("AGENT_FACTORY_MODE: transition"));
  assert.ok(preflight.includes("scripts/agent-factory-v2-controller.mjs"));
  assert.ok(preflight.includes("steps.factory-gate.outputs.pending_tasks == '0'"));
  assert.ok(preflight.includes("steps.select-task.outputs.open_task_prs == '0'"));
  assert.ok(preflight.includes("NEXT_TASK_STATE = \"awaiting_ci\""));
});


test("Supabase CI allocates Docker-published ports below the Windows dynamic TCP range", () => {
  assert.ok(workflow.includes("$candidate = 20000 + (([int64]$env:GITHUB_RUN_ID + ($attempt * 7)) % 20000)"));
  assert.ok(workflow.includes("49152-65535 dynamic TCP range"));
  assert.equal(workflow.includes("$candidate = 55000 +"), false);
});
