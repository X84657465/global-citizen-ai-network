import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";

const workflow = readFileSync(new URL("../.github/workflows/ci.yml", import.meta.url), "utf8").replace(/\r\n/g, "\n");
const preflight = readFileSync(new URL("../.github/workflows/agent-task-preflight.yml", import.meta.url), "utf8").replace(/\r\n/g, "\n");
const runnerSmoke = readFileSync(new URL("../.github/workflows/self-hosted-runner-smoke.yml", import.meta.url), "utf8").replace(/\r\n/g, "\n");
const publisher = readFileSync(new URL("../scripts/publish-agent-patch.mjs", import.meta.url), "utf8").replace(/\r\n/g, "\n");
const nextConfig = readFileSync(new URL("../next.config.ts", import.meta.url), "utf8").replace(/\r\n/g, "\n");
const workflowLevelConcurrency = workflow.split("\non:\n", 1)[0];

test("full CI runs on main pushes and pull-request lifecycle events, not codex branch pushes", () => {
  assert.ok(workflow.includes("  push:\n    branches: [main]\n"));
  assert.ok(workflow.includes("  pull_request:\n    branches: [main, feat/github-project-showcase]\n    types: [opened, reopened, synchronize]\n"));
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

test("preflight coalesces redundant poller events while Runner smoke retains the bounded queue", () => {
  assert.ok(preflight.includes("      - feat/agent-factory-v2\n"), "preflight synthetic validation must remain available on the active development branch");
  assert.ok(runnerSmoke.includes("      - feat/agent-factory-v2\n"), "Runner smoke must remain runnable on the active development branch");
  assert.ok(preflight.includes("group: global-citizen-ai-network-self-hosted-runner"));
  assert.ok(preflight.includes("cancel-in-progress: false"));
  assert.equal(preflight.includes("queue: max"), false, "durable preflight polling must coalesce obsolete pending triggers");
  assert.ok(runnerSmoke.includes("group: global-citizen-ai-network-self-hosted-runner"));
  assert.ok(runnerSmoke.includes("queue: max"), "explicit Runner smoke jobs must retain their bounded queue");
  assert.ok(runnerSmoke.includes("cancel-in-progress: false"));
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

test("Next.js output tracing is scoped to the repository and ignores unrelated Runner workspace lockfiles", () => {
  assert.ok(nextConfig.includes("outputFileTracingRoot: process.cwd()"));
});

test("full dependency audit is a blocking CI security gate", () => {
  const start = workflow.indexOf("- name: Full dependency audit (including development tooling)");
  const end = workflow.indexOf("- name: Unit tests", start);
  assert.ok(start >= 0 && end > start, "full dependency audit step must exist");
  const section = workflow.slice(start, end);
  assert.ok(section.includes("npm audit --audit-level=high"));
  assert.equal(section.includes("continue-on-error: true"), false);
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

test("CI executes a bounded real Ollama inference smoke test after API/model health checks", () => {
  const smokeStep = workflow.indexOf("- name: Verify Ollama can perform a bounded structured inference");
  const migrationGuard = workflow.indexOf("- name: Migration filename safety guard", smokeStep);
  assert.ok(smokeStep >= 0 && migrationGuard > smokeStep);
  const section = workflow.slice(smokeStep, migrationGuard);
  assert.ok(section.includes('OLLAMA_SMOKE_TIMEOUT_MS: "180000"'));
  assert.ok(section.includes("node scripts/ollama-smoke-test.mjs"));
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

test("all workflow checkouts disable persisted Git credentials", () => {
  const workflowDirectory = new URL("../.github/workflows/", import.meta.url);
  const workflowFiles = readdirSync(workflowDirectory).filter((name) => /\.ya?ml$/i.test(name));
  for (const fileName of workflowFiles) {
    const source = readFileSync(new URL(fileName, workflowDirectory), "utf8").replace(/\r\n/g, "\n");
    const lines = source.split("\n");
    for (let index = 0; index < lines.length; index += 1) {
      if (!/^\s*uses:\s*actions\/checkout@/.test(lines[index])) continue;
      let end = index + 1;
      while (end < lines.length && !/^\s*-\s+(?:name|uses):/.test(lines[end])) end += 1;
      const step = lines.slice(index, end).join("\n");
      assert.ok(
        /persist-credentials:\s*false/.test(step),
        fileName + " checkout at line " + (index + 1) + " must not persist its token in .git/config",
      );
    }
  }
});

test("preflight task publisher does not request Actions API permissions", () => {
  const start = preflight.indexOf("  prepare-task:\n");
  assert.notEqual(start, -1, "expected the durable task publisher job");
  const permissionsStart = preflight.indexOf("    permissions:\n", start);
  const permissionsEnd = preflight.indexOf("    runs-on:", permissionsStart);
  const permissions = preflight.slice(permissionsStart, permissionsEnd);
  assert.match(permissions, /actions:\s+none/);
  assert.match(permissions, /contents:\s+write/);
  assert.match(permissions, /issues:\s+write/);
  assert.match(permissions, /pull-requests:\s+write/);
});


test("untrusted candidate install and test containers never receive GitHub write credentials", () => {
  const candidateStart = preflight.indexOf('      - name: Install candidate dependencies inside restricted container (attempt 1)');
  const candidateEnd = preflight.indexOf('      - name: Transition task to publishing', candidateStart);
  assert.notEqual(candidateStart, -1, "expected candidate install step");
  assert.notEqual(candidateEnd, -1, "expected publishing boundary after candidate tests");
  const candidateSection = preflight.slice(candidateStart, candidateEnd);
  assert.equal(/GITHUB_TOKEN:\s*\$\{\{\s*secrets\.GITHUB_TOKEN\s*\}\}/.test(candidateSection), false);
  assert.equal(/--env\s+GITHUB_TOKEN|--env\s+GH_TOKEN|--env\s+GITHUB_/.test(candidateSection), false);
  assert.match(candidateSection, /--network none/);
  assert.match(candidateSection, /--cap-drop ALL/);
  assert.match(candidateSection, /--read-only/);
});

test("preflight GitHub write credentials are scoped to trusted orchestration and publisher steps", () => {
  const lines = preflight.split("\n");
  const tokenSteps = [];
  for (let index = 0; index < lines.length; index += 1) {
    if (!/GITHUB_TOKEN:\s*\$\{\{\s*secrets\.GITHUB_TOKEN\s*\}\}/.test(lines[index])) continue;
    let start = index;
    while (start > 0 && !/^\s*- name:/.test(lines[start])) start -= 1;
    tokenSteps.push(lines[start]?.trim() || "unknown step");
  }
  assert.ok(tokenSteps.length > 0, "expected explicit step-scoped token injection");
  assert.ok(tokenSteps.every((name) => !/Install candidate dependencies|Retry candidate dependency|Test patched candidate/i.test(name)), "candidate install/test execution must not receive a token");
});

test("candidate install and offline test use separate least-network container profiles", () => {
  const installStart = preflight.indexOf('      - name: Install candidate dependencies inside restricted container (attempt 1)');
  const retryStart = preflight.indexOf('      - name: Retry candidate dependency installation once', installStart);
  const testStart = preflight.indexOf('      - name: Test patched candidate offline inside restricted container', retryStart);
  const publishStart = preflight.indexOf('      - name: Transition task to publishing', testStart);
  assert.ok(installStart >= 0 && retryStart > installStart && testStart > retryStart && publishStart > testStart,
    "candidate install, retry, offline test, and publisher boundaries must remain explicit");

  const install = preflight.slice(installStart, retryStart);
  const retry = preflight.slice(retryStart, testStart);
  const offlineTest = preflight.slice(testStart, publishStart);

  for (const section of [install, retry]) {
    assert.match(section, /--network bridge/, "dependency installation may use network only inside the disposable container");
    assert.doesNotMatch(section, /--network none/, "dependency installation must not claim to be offline");
    assert.match(section, /--read-only/);
    assert.match(section, /--cap-drop ALL/);
    assert.match(section, /--security-opt no-new-privileges/);
    assert.match(section, /--user 1000:1000/);
    assert.match(section, /--ignore-scripts/, "candidate dependency lifecycle scripts must stay disabled");
    assert.match(section, /--env npm_config_cache=\/npm-cache/);
    assert.doesNotMatch(section, /GITHUB_TOKEN|GH_TOKEN/);
  }

  assert.match(offlineTest, /--network none/, "candidate code tests must run without network access");
  assert.match(offlineTest, /--read-only/);
  assert.match(offlineTest, /--cap-drop ALL/);
  assert.match(offlineTest, /--security-opt no-new-privileges/);
  assert.match(offlineTest, /--user 1000:1000/);
  assert.match(offlineTest, /npm run test:unit && npx --no-install tsc --noEmit && npm run lint/);
  assert.doesNotMatch(offlineTest, /GITHUB_TOKEN|GH_TOKEN/);
});

test("database job runs the two-member application RLS integration suite and classifies its failures as task failures", () => {
  assert.ok(workflow.includes("- name: Run two-member application RLS integration tests"));
  assert.ok(workflow.includes("SUPABASE_DB_URL"));
  assert.ok(workflow.includes("SUPABASE_DB_CONTAINER"));
  assert.ok(workflow.includes('Get-Command docker.exe -ErrorAction Stop'));
  assert.ok(workflow.includes('$env:SUPABASE_DB_CONTAINER = $containerName'));
  assert.ok(workflow.includes('& $env:DOCKER_BIN ps --filter "name=supabase_db_$projectId"'), "RLS integration must invoke the resolved Docker executable");
  assert.ok(workflow.includes("APPLICATION_RLS_TESTS: ${{ steps.application-rls-tests.outcome }}"));
  assert.ok(workflow.includes('$env:APPLICATION_RLS_TESTS -eq "failure"'));
});


test("candidate CI callbacks export machine-readable exact-SHA evidence artifacts", () => {
  for (const callback of ["Record task candidate CI rejection", "Record exact candidate CI success"]) {
    const start = workflow.indexOf("- name: " + callback);
    assert.ok(start >= 0, "missing callback: " + callback);
    const next = workflow.indexOf("- name:", start + 1);
    const section = workflow.slice(start, next < 0 ? workflow.length : next);
    assert.ok(section.includes("id: record-candidate-result"));
    assert.ok(section.includes("HEAD_REF: ${{ steps.revalidate.outputs.head_ref }}"));
  }
  assert.equal((workflow.match(/uses: actions\/upload-artifact@v4/g) || []).length, 2);
  assert.ok(workflow.includes("candidate-evidence.json"));
  assert.ok(workflow.includes("retention-days: 90"));
});
