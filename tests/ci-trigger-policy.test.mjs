import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";

const workflow = readFileSync(new URL("../.github/workflows/ci.yml", import.meta.url), "utf8").replace(/\r\n/g, "\n");
const preflight = readFileSync(new URL("../.github/workflows/agent-task-preflight.yml", import.meta.url), "utf8").replace(/\r\n/g, "\n");
const runnerSmoke = readFileSync(new URL("../.github/workflows/self-hosted-runner-smoke.yml", import.meta.url), "utf8").replace(/\r\n/g, "\n");
const publisher = readFileSync(new URL("../scripts/publish-agent-patch.mjs", import.meta.url), "utf8").replace(/\r\n/g, "\n");
const nextConfig = readFileSync(new URL("../next.config.ts", import.meta.url), "utf8").replace(/\r\n/g, "\n");
const resolver = readFileSync(new URL("../scripts/resolve-agent-task-pr.mjs", import.meta.url), "utf8").replace(/\r\n/g, "\n");
const patchGenerator = readFileSync(new URL("../scripts/generate-agent-patch.mjs", import.meta.url), "utf8").replace(/\r\n/g, "\n");
const workflowLevelConcurrency = workflow.split("\non:\n", 1)[0];

function findJobSection(source, name) {
  const start = source.indexOf("  " + name + ":\n");
  assert.ok(start >= 0, "missing CI job: " + name);
  const headers = [...source.slice(start + 1).matchAll(/^  [A-Za-z0-9_-]+:\s*$/gm)];
  return { start, end: headers[0] ? start + 1 + headers[0].index : source.length };
}

test("root and Agent Factory numeric release metadata stay synchronized", () => {
  const packageJson = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
  const packageLock = JSON.parse(readFileSync(new URL("../package-lock.json", import.meta.url), "utf8"));
  const manifest = JSON.parse(readFileSync(new URL("../versions/manifest.json", import.meta.url), "utf8"));
  const rootVersion = readFileSync(new URL("../VERSION", import.meta.url), "utf8").trim();
  const factoryVersion = readFileSync(new URL("../versions/agent-factory/VERSION", import.meta.url), "utf8").trim();
  const predictiveCodingVersion = readFileSync(new URL("../versions/predictive-coding/VERSION", import.meta.url), "utf8").trim();
  const readme = readFileSync(new URL("../README.md", import.meta.url), "utf8");
  const governance = readFileSync(new URL("../docs/engineering-governance.md", import.meta.url), "utf8");
  const readmeRelease = /\*\*Release:\*\* `([^`]+)` · A 線 Agent Factory V2 `([^`]+)`/.exec(readme);
  assert.ok(readmeRelease, "README must expose root and Agent Factory release versions");
  assert.equal(readmeRelease[1], rootVersion);
  assert.equal(readmeRelease[2], factoryVersion);
  const governanceBaseline = /\*\*Repository release baseline: ([0-9.]+)\*\*/.exec(governance);
  assert.ok(governanceBaseline, "engineering governance must expose its repository release baseline");
  assert.equal(governanceBaseline[1], rootVersion);
  assert.equal(packageJson.version, rootVersion);
  assert.equal(packageLock.version, rootVersion);
  assert.equal(packageLock.packages[""].version, rootVersion);
  assert.equal(manifest.overall, rootVersion);
  assert.equal(manifest.tracks.A.version, factoryVersion);
  assert.equal(manifest.tracks.C.version, predictiveCodingVersion);
});

test("full CI runs on main pushes and pull-request lifecycle events without duplicate development-branch push runs", () => {
  assert.ok(workflow.includes("  push:\n    branches: [main]\n"));
  assert.equal(workflow.includes("  push:\n    branches: [main, feat/agent-factory-v2]\n"), false);
  assert.ok(workflow.includes("run-name: CI — ${{ github.event.pull_request.head.sha || github.sha }}"));
  assert.ok(workflow.includes("  pull_request:\n    branches: [main, feat/github-project-showcase, fix/agent-factory-add-output-budget-20261121, fix/agent-factory-new-file-output-budget-20261121, chore/reconcile-ap-governance-on-a-2.0.70-20261121, fix/agent-factory-context-2-0-84-20261121]\n    types: [opened, reopened, synchronize]\n"));
  assert.ok(workflow.includes("  repository_dispatch:\n    types: [ai-task-ci]\n"));
  assert.equal(workflow.includes('branches: [main, "codex/**"]'), false);
});

test("CI keeps stateful quality and integration jobs serialized on the Windows Runner", () => {
  assert.ok(workflowLevelConcurrency.includes("group: global-citizen-ai-network-ci-${{ github.event.pull_request.number || github.event.client_payload.pull_request_number || github.ref }}"));
  assert.ok(workflowLevelConcurrency.includes("cancel-in-progress: false"));
  assert.equal(workflowLevelConcurrency.includes("queue: max"), false);
  const jobs = ["resolve-candidate", "quality", "build", "database", "circuit-breaker", "circuit-breaker-success", "ci-diagnostics"];
  for (const job of jobs) {
    const { start, end } = findJobSection(workflow, job);
    const section = workflow.slice(start, end);
    assert.ok(section.includes("runs-on: [self-hosted, Windows, X64]"), job + " must use the available Windows Runner");
    assert.ok(section.includes("group: global-citizen-ai-network-self-hosted-runner"), job + " must use the shared Runner queue");
    assert.ok(section.includes("queue: max"), job + " must preserve pending work");
    assert.ok(section.includes("cancel-in-progress: false"), job + " must not cancel active Runner work");
    assert.equal(section.includes("shell: bash"), false, job + " must use the native PowerShell Runner shell");
  }
  const { start: qualityStart, end: qualityEnd } = findJobSection(workflow, "quality");
  const quality = workflow.slice(qualityStart, qualityEnd);
  for (const command of ["npm ci --no-audit --no-fund", "npm run test:unit", "npx --no-install tsc --noEmit", "npm run lint", "npm run build", "npm audit --audit-level=high", "node --test tests/ci-trigger-policy.test.mjs"]) {
    assert.ok(quality.includes(command), "Windows quality job must execute " + command);
  }
  assert.ok(quality.includes("needs: [resolve-candidate]"));
  assert.ok(quality.includes("failure_scope: ${{ steps.classify-failure.outputs.scope }}"));
});

test("read-only PR metadata resolution uses the available shared Windows Runner", () => {
  const { start, end } = findJobSection(workflow, "resolve-candidate");
  const resolverJob = workflow.slice(start, end);
  assert.ok(resolverJob.includes("runs-on: [self-hosted, Windows, X64]"));
  assert.ok(resolverJob.includes("group: global-citizen-ai-network-self-hosted-runner"));
  assert.ok(resolverJob.includes("queue: max"));
  assert.ok(resolverJob.includes("cancel-in-progress: false"));
  assert.equal(resolverJob.includes("shell: bash"), false);
  assert.ok(resolverJob.includes("contents: read"));
  assert.ok(resolverJob.includes("issues: read"));
  assert.ok(resolverJob.includes("pull-requests: read"));
});
test("preflight coalesces only scheduled pollers while preserving actionable triggers in the shared Runner queue", () => {
  assert.ok(preflight.includes("      - feat/agent-factory-v2\n"), "A-line pushes must run the synthetic factory validation on the active development branch");
  assert.ok(preflight.includes('      - "lib/agent-failure-scope.mjs"\n'), "changes to the task-failure scope helper must trigger factory validation");
  assert.ok(preflight.includes('      - "tests/agent-failure-scope.test.mjs"\n'), "changes to the helper regression tests must trigger factory validation");
  assert.ok(runnerSmoke.includes("      - feat/agent-factory-v2\n"), "Runner smoke must remain runnable on the active development branch");

  const workflowHeader = preflight.slice(0, preflight.indexOf("\njobs:"));
  assert.ok(workflowHeader.includes("group: global-citizen-ai-network-preflight-${{ github.event_name == 'schedule' && 'poller' || github.run_id }}"));
  assert.ok(workflowHeader.includes("cancel-in-progress: false"));
  assert.equal(workflowHeader.includes("global-citizen-ai-network-self-hosted-runner"), false);

  const jobsSource = preflight.slice(preflight.indexOf("\njobs:") + "\njobs:".length);
  const validationStart = jobsSource.indexOf("  validation-tests:\n");
  const prepareStart = jobsSource.indexOf("  prepare-task:\n");
  const validationSection = jobsSource.slice(validationStart, prepareStart);
  const prepareBounds = findJobSection(jobsSource, "prepare-task");
  const prepareSection = jobsSource.slice(prepareBounds.start, prepareBounds.end);
  assert.ok(validationSection.includes("if: github.event_name == 'push' && github.actor == github.repository_owner"));
  const ciQualityBounds = findJobSection(workflow, "quality");
  const ciQualitySection = workflow.slice(ciQualityBounds.start, ciQualityBounds.end);
  assert.ok(ciQualitySection.includes("uses: actions/setup-node@v5"),
    "CI quality job must use actions/setup-node@v5");
  const ciNodeVersion = /node-version: "([^"]+)"/.exec(ciQualitySection);
  assert.ok(ciNodeVersion, "CI quality job must declare its supported Node.js runtime");
  for (const [name, section] of [["validation-tests", validationSection], ["prepare-task", prepareSection]]) {
    assert.ok(section.includes("uses: actions/setup-node@v5"),
      name + " must use actions/setup-node@v5");
    const nodeVersion = /node-version: "([^"]+)"/.exec(section);
    assert.ok(nodeVersion, name + " must install a pinned Node.js runtime");
    assert.equal(nodeVersion[1], ciNodeVersion[1],
      name + " must use the same Node.js runtime as the CI quality job");
  }
  assert.equal(prepareSection.includes("github.event_name == 'push'"), false,
    "A-line push validation must never activate live task reservation or PR publication");

  const jobHeaders = [...jobsSource.matchAll(/^  ([A-Za-z0-9_-]+): *$/gm)];
  const requiredRunnerJobs = new Set(["validation-tests", "prepare-task"]);
  const verifiedRunnerJobs = new Set();
  for (let index = 0; index < jobHeaders.length; index += 1) {
    const name = jobHeaders[index][1];
    if (!requiredRunnerJobs.has(name)) continue;
    const start = jobHeaders[index].index;
    const end = index + 1 < jobHeaders.length ? jobHeaders[index + 1].index : jobsSource.length;
    const section = jobsSource.slice(start, end);
    assert.ok(section.includes("group: global-citizen-ai-network-self-hosted-runner"), name + " must serialize on the shared Runner");
    assert.ok(section.includes("queue: max"), name + " must preserve pending actionable jobs");
    assert.ok(section.includes("cancel-in-progress: false"), name + " must not cancel active Runner work");
    verifiedRunnerJobs.add(name);
  }
  assert.deepEqual([...verifiedRunnerJobs].sort(), [...requiredRunnerJobs].sort());

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
  const start = workflow.indexOf("- name: Full dependency security audit");
  const end = workflow.indexOf("- name: Unit tests", start);
  assert.ok(start >= 0 && end > start, "full dependency audit step must exist");
  const section = workflow.slice(start, end);
  assert.ok(section.includes("npm audit --audit-level=high"));
  assert.equal(section.includes("continue-on-error: true"), false);
});

test("same-SHA candidate reruns are ignored without candidate success or system-breaker mutation", () => {
  const build = workflow.slice(findJobSection(workflow, "build").start, findJobSection(workflow, "build").end);
  const success = workflow.slice(findJobSection(workflow, "circuit-breaker-success").start);
  assert.ok(build.includes("candidate_start_ignored: ${{ steps.register-candidate.outputs.ignored || 'false' }}"));
  assert.ok(build.includes("id: register-candidate"));
  assert.ok(success.includes("needs.build.outputs.candidate_start_ignored != 'true'"));
});

test("task-scoped CI failures register exact run evidence before candidate rejection, while ignored retries stay no-op", () => {
  const { start, end } = findJobSection(workflow, "circuit-breaker");
  const failure = workflow.slice(start, end);
  const register = failure.indexOf("id: register-failed-candidate");
  const reject = failure.indexOf("id: record-candidate-result");
  assert.ok(register >= 0 && reject > register,
    "failure callbacks must establish the exact candidate run before persisting its outcome");
  const registration = failure.slice(register, reject);
  assert.ok(registration.includes("AGENT_FACTORY_MODE: candidate-start"));
  assert.ok(registration.includes("CI_RUN_ID: ${{ github.run_id }}"));
  assert.ok(registration.includes("CI_RUN_ATTEMPT: ${{ github.run_attempt }}"));
  assert.ok(registration.includes("HEAD_SHA: ${{ steps.revalidate.outputs.head_sha }}"));
  assert.ok(failure.slice(reject).startsWith("id: record-candidate-result"));
  assert.ok(failure.slice(reject, failure.indexOf("run: node scripts/agent-factory-v2-controller.mjs", reject))
    .includes("steps.register-failed-candidate.outputs.ignored != 'true'"),
    "same-SHA rejected retries must not be recorded as a new candidate failure");
});

test("candidate callback failures cannot suppress system-breaker persistence", () => {
  const { start, end } = findJobSection(workflow, "circuit-breaker");
  const failure = workflow.slice(start, end);
  const register = failure.indexOf("id: register-failed-candidate");
  const candidateFailure = failure.indexOf("id: record-candidate-result");
  const systemFailure = failure.indexOf("- name: Record system CI failure");
  assert.ok(register >= 0 && candidateFailure > register && systemFailure > candidateFailure);
  assert.ok(failure.slice(register, candidateFailure).includes("env.CI_FAILURE_SCOPE == 'task'"),
    "candidate-start must not bind system-scoped infrastructure failures to a task CI run");
  const systemStep = failure.slice(systemFailure);
  assert.ok(systemStep.startsWith("- name: Record system CI failure\n        if: >-\n          always() &&"),
    "system failure persistence must run even when an earlier callback step fails");
  assert.ok(systemStep.includes("steps.register-failed-candidate.outcome == 'failure'"));
  assert.ok(systemStep.includes("steps.record-candidate-result.outcome == 'failure'"));
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
  const start = workflow.indexOf("- name: Verify Windows Runner, Docker and Ollama");
  const end = workflow.indexOf("- name: Migration filename safety guard", start);
  assert.ok(start >= 0 && end > start, "runner capability verification step must exist");
  const section = workflow.slice(start, end);
  assert.ok(section.includes("docker info"), "Docker Engine health must be checked");
  assert.ok(section.includes("OLLAMA_BASE_URL"));
  assert.ok(section.includes("/api/tags"), "Ollama API must be queried");
  assert.ok(section.includes("$models.Count -eq 0"), "an installed model must be required");
});

test("CI executes a bounded real Ollama inference smoke test after API/model health checks", () => {
  const smokeStep = workflow.indexOf("- name: Verify bounded local Ollama inference");
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


test("Supabase database and RLS integration runs on the shared Windows Runner", () => {
  const { start, end } = findJobSection(workflow, "database");
  const database = workflow.slice(start, end);
  assert.ok(database.includes("runs-on: [self-hosted, Windows, X64]"));
  assert.ok(database.includes("group: global-citizen-ai-network-self-hosted-runner"));
  assert.ok(database.includes("queue: max"));
  assert.ok(database.includes("$env:ComSpec /d /s /c 'supabase start -x studio,imgproxy,edge-runtime,logflare,vector,supavisor,mailpit 2>&1'"), "native stderr must be redirected by cmd.exe before PowerShell captures output");
  assert.equal(database.includes("$startOutput = & supabase start -x studio,imgproxy,edge-runtime,logflare,vector,supavisor,mailpit 2>&1 | Out-String"), false, "PowerShell 5.1 must not reinterpret native stderr as NativeCommandError");
  assert.ok(database.includes("supabase test db"));
  assert.ok(database.includes("node --test tests/security/two-member-rls.test.mjs"));
  assert.ok(database.includes("$candidate = 20000 + (([int64]$env:GITHUB_RUN_ID + ($attempt * 7)) % 19998)"));
  assert.ok(database.includes("SUPABASE_DB_CONTAINER"));
  assert.ok(database.includes("DOCKER_BIN"));
  assert.ok(database.includes("supabase stop --no-backup"));
  assert.ok(database.includes('$env:APPLICATION_RLS_TESTS -eq "failure"'));
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

test("database job discovers isolated PostgreSQL by Supabase DB port and separates infrastructure from RLS assertion failures", () => {
  assert.ok(workflow.includes("- name: Run two-member application RLS integration tests"));
  assert.ok(workflow.includes("SUPABASE_DB_URL"));
  assert.ok(workflow.includes("SUPABASE_DB_CONTAINER"));
  assert.ok(workflow.includes('Get-Command docker.exe -ErrorAction Stop'));
  assert.ok(workflow.includes("$dbPort = ([uri]$dbUrl).Port"));
  assert.ok(workflow.includes('$containerRows = @(& $docker.Source ps --format "{{.ID}}|{{.Names}}|{{.Ports}}")'));
  assert.ok(workflow.includes('$portPattern = ":$dbPort->5432/tcp"'));
  assert.ok(workflow.includes("$matchingContainers.Count -ne 1"));
  assert.ok(workflow.includes("$env:SUPABASE_DB_CONTAINER = $containerId"));
  assert.ok(workflow.includes('& $env:DOCKER_BIN inspect --format "{{.State.Running}}" $containerId'));
  assert.ok(workflow.includes("failure_scope=task"));
  assert.ok(workflow.includes("APPLICATION_RLS_SCOPE: ${{ steps.application-rls-tests.outputs.failure_scope }}"));
  assert.ok(workflow.includes('$env:APPLICATION_RLS_TESTS -eq "failure" -and $env:APPLICATION_RLS_SCOPE -eq "task"'));
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
  assert.equal((workflow.match(/path: candidate-evidence\.json/g) || []).length, 2, "both candidate callbacks must upload exact-SHA evidence");
  assert.ok(workflow.includes("candidate-evidence.json"));
  assert.ok(workflow.includes("retention-days: 90"));
});

 
test("package lock metadata matches the resolved eslint-import-resolver-node tarball version", () => {
  const lock = JSON.parse(readFileSync(new URL("../package-lock.json", import.meta.url), "utf8"));
  const entry = lock.packages["node_modules/eslint-import-resolver-node"];
  assert.ok(entry, "eslint-import-resolver-node must be present in the lockfile");
  const resolvedTarball = entry.resolved.split("/").at(-1);
  assert.equal(resolvedTarball, "eslint-import-resolver-node-" + entry.version + ".tgz");
});

test("Agent Factory runbook separates default-branch polling from manual V2 dispatch", () => {
  const runbook = readFileSync(new URL("../docs/agent-factory-operations-runbook.md", import.meta.url), "utf8").replace(/\r\n/g, "\n");
  assert.ok(preflight.includes("  schedule:\n    - cron: \"*/5 * * * *\""));
  assert.ok(preflight.includes("  workflow_dispatch:\n    inputs:\n      issue_number:"));
  assert.ok(preflight.includes("github.event_name == 'workflow_dispatch' &&\n       github.actor == github.repository_owner"));
  assert.ok(preflight.includes("ISSUE_NUMBER: ${{ steps.select-task.outputs.issue_number || inputs.issue_number }}"));
  assert.ok(runbook.includes("GitHub evaluates scheduled workflows and issue events from the repository's default branch only."));
  assert.ok(runbook.includes("The old instruction to select `feat/agent-factory-v2` for normal operation is historical and must not be followed as the default operating path."));
  assert.ok(runbook.includes("For normal operation, use `main`."));
  assert.ok(runbook.includes("Enter the explicitly approved task Issue number."));
  assert.ok(runbook.includes("The durable state Issue is machine-managed."));
  assert.ok(runbook.includes("This runbook does not authorize merges, production deployments, production migrations, secret changes, or live paid AI activation."));
  assert.ok(runbook.includes("Pull-request CI can validate code without proving that the default-branch scheduler or state writer is operational."));
  assert.equal(runbook.includes("Issue #100 remains on its existing V1 payload."), false);
  assert.equal(runbook.includes("schema version 2"), false);
});

test("CI candidate execution is fenced to the exact event head SHA", () => {
  assert.ok(workflow.includes("EXPECTED_HEAD_SHA:"));
  assert.ok(resolver.includes("pull.head?.sha === expectedSha"));
  assert.ok(workflow.includes("github.event.client_payload.head_sha || github.event.pull_request.head.sha"));
});
test("CI diagnostics use the available shared Windows Runner with read-only access", () => {
  const x = findJobSection(workflow, "ci-diagnostics");
  const s = workflow.slice(x.start, x.end);
  assert.ok(s.includes("runs-on: [self-hosted, Windows, X64]"));
  assert.ok(s.includes("group: global-citizen-ai-network-self-hosted-runner"));
  assert.ok(s.includes("queue: max"));
  assert.ok(s.includes("cancel-in-progress: false"));
  assert.ok(s.includes("actions: read"));
  assert.ok(s.includes("contents: read"));
  assert.ok(s.includes("Invoke-RestMethod"));
  assert.ok(s.includes("CI_EXPECTED_HEAD_SHA"));
  assert.ok(s.includes("ci-failure-diagnostics.json"));
  assert.ok(s.includes("retention-days: 90"));
  assert.equal(s.includes("issues: write"), false);
});


test("ordinary PR metadata resolution does not depend on durable factory-state storage", () => {
  const taskClassification = resolver.indexOf("const isTaskPr =");
  const guardedStateRead = resolver.indexOf("if (isTaskPr)", taskClassification);
  const stateRead = resolver.indexOf("await stateStore.read()");
  assert.ok(taskClassification >= 0 && guardedStateRead > taskClassification);
  assert.ok(stateRead > guardedStateRead, "factory state lookup must happen only after task PR authorization");
  const guardedBlock = resolver.slice(guardedStateRead, stateRead);
  assert.ok(guardedBlock.includes("createFactoryStateStore"));
  assert.ok(resolver.includes('writeOutput("state_issue_number", stateIssueNumber);'));
});

test("preflight captures and uploads both synthetic and real candidate offline-test diagnostics", () => {
  const offlineSteps = [...preflight.matchAll(/^      - name: Test patched candidate offline inside restricted container$/gm)];
  assert.equal(offlineSteps.length, 2, "synthetic validation and task execution must each retain an offline test stage");

  for (const name of [
    "Preserve synthetic offline test diagnostics",
    "Preserve candidate offline test diagnostics",
  ]) {
    const start = preflight.indexOf("      - name: " + name);
    assert.ok(start >= 0, "missing diagnostic artifact step: " + name);
    const next = preflight.indexOf("\n      - name:", start + 1);
    const section = preflight.slice(start, next < 0 ? preflight.length : next);
    assert.ok(section.includes("if: always()"), name + " must run after a failed test");
    assert.ok(section.includes("uses: actions/upload-artifact@v4"));
    assert.ok(section.includes("agent-preflight-offline-test.log"));
    assert.ok(section.includes("retention-days: 7"));
  }

  for (const match of offlineSteps) {
    const next = preflight.indexOf("\n      - name:", match.index + match[0].length);
    const section = preflight.slice(match.index, next < 0 ? preflight.length : next);
    assert.ok(section.includes("$testExitCode = $LASTEXITCODE"), "preserve the native Docker exit code");
    assert.ok(section.includes("Out-File -LiteralPath $testLog"), "persist stdout and stderr before raising failure");
  }
});


test("Ollama output truncation is classified as task-scoped, not a system breaker failure", () => {
  assert.ok(patchGenerator.includes('const failTask = (message) => fail(message, "task");'));
  const guardStart = patchGenerator.indexOf('if (result.done_reason === "length")');
  const guardEnd = patchGenerator.indexOf("if (Buffer.byteLength", guardStart);
  assert.ok(guardStart >= 0 && guardEnd > guardStart, "token-limit guard must exist");
  assert.ok(patchGenerator.slice(guardStart, guardEnd).includes("failTask("),
    "token-limit output must use the task-scoped failure path");
  assert.ok(preflight.includes('$env:AGENT_FACTORY_FAILURE_SCOPE -eq "task"'),
    "the preflight classifier must preserve the task scope before writing durable state");
});


test("system breaker recovery waits for a completed successful exact-head CI workflow run", () => {
  const recovery = readFileSync(new URL("../.github/workflows/agent-factory-system-health.yml", import.meta.url), "utf8").replace(/\r\n/g, "\n");
  const ci = readFileSync(new URL("../.github/workflows/ci.yml", import.meta.url), "utf8").replace(/\r\n/g, "\n");
  assert.equal(ci.includes("AGENT_FACTORY_MODE: success"), false,
    "the in-progress CI workflow must not invoke the legacy non-mutating success callback");
  assert.ok(recovery.includes('  workflow_run:\n    workflows: ["CI"]\n    types: [completed]'));
  assert.ok(recovery.includes("github.event.workflow_run.conclusion == 'success'"));
  assert.ok(recovery.includes("github.event.workflow_run.event == 'pull_request'"));
  assert.ok(recovery.includes("startsWith(github.event.workflow_run.head_branch, 'ai-task/issue-')"),
    "ordinary same-repository PRs must not reserve the shared Runner queue for candidate recovery");
  assert.ok(recovery.includes("github.event.workflow_run.head_repository.full_name == github.repository"));
  assert.ok(recovery.includes("github.event.workflow_run.pull_requests[0].number != ''"));
  const recoveryWorkflowHeader = recovery.slice(0, recovery.indexOf("\njobs:"));
  assert.equal(recoveryWorkflowHeader.includes("global-citizen-ai-network-self-hosted-runner"), false,
    "cancelled/failed workflow_run events must not reserve the shared Runner queue at workflow scope");
  const recoveryJobStart = recovery.indexOf("  reset-system-breaker:\n");
  const recoveryJob = recovery.slice(recoveryJobStart);
  assert.ok(recoveryJob.includes("group: global-citizen-ai-network-self-hosted-runner"));
  assert.ok(recoveryJob.includes("queue: max"));
  assert.ok(recoveryJob.includes("cancel-in-progress: false"));
  assert.ok(recovery.includes("runs-on: [self-hosted, Windows, X64]"));
  assert.ok(recovery.includes("actions: read"));
  assert.ok(recovery.includes("contents: read"));
  assert.ok(recovery.includes("issues: write"));
  assert.ok(recovery.includes("pull-requests: read"));
  assert.ok(recovery.includes("ref: main"));
  assert.ok(recovery.includes("persist-credentials: false"));
  assert.ok(recovery.includes("AGENT_FACTORY_MODE: system-health-success"));
  assert.ok(recovery.includes("SYSTEM_HEALTH_RUN_ID: " + "$" + "{{ github.event.workflow_run.id }}"));
  assert.ok(recovery.includes("SYSTEM_HEALTH_RUN_ATTEMPT: " + "$" + "{{ github.event.workflow_run.run_attempt }}"));
  assert.ok(recovery.includes("SYSTEM_HEALTH_PULL_REQUEST_NUMBER: " + "$" + "{{ github.event.workflow_run.pull_requests[0].number }}"));
  assert.ok(recovery.includes("SYSTEM_HEALTH_HEAD_SHA: " + "$" + "{{ github.event.workflow_run.head_sha }}"));
  assert.ok(recovery.includes("run: node scripts/agent-factory-v2-controller.mjs"));
  assert.equal(recovery.includes("ref: " + "$" + "{{ github.event.workflow_run.head_sha }}"), false,
    "the privileged workflow must execute trusted mainline controller code, never PR code");
});


test("hosted PR resolver emits stage-scoped diagnostics without exposing credentials", () => {
  for (const marker of [
    "Resolver stage: requesting PR metadata",
    "Resolver stage: PR metadata received",
    "Resolver stage: verifying authorized task issue",
    "Resolver stage: reading durable Factory state",
    "Resolver PR metadata request failed: status=",
    "rate_limited=",
    "retry_after_ms=",
  ]) {
    assert.ok(resolver.includes(marker), "missing safe resolver diagnostic: " + marker);
  }
  assert.equal(resolver.includes("console.log(token"), false);
  assert.equal(resolver.includes("Authorization"), false,
    "resolver diagnostics must not emit authorization headers or token values");
});

test("hosted resolver persists redacted failure metadata even when the resolver exits nonzero", () => {
  for (const marker of [
    "RESOLVER_DIAGNOSTICS_OUTPUT",
    "writeResolverDiagnostic(error)",
    "schemaVersion: 1",
    "stage: resolverStage",
    "httpStatus:",
    "rateLimited:",
    "retryAfterMs:",
  ]) {
    assert.ok(resolver.includes(marker), "missing redacted resolver evidence field: " + marker);
  }
  assert.equal(resolver.includes("error.message"), false,
    "resolver evidence must not persist raw error messages");
  const x = findJobSection(workflow, "resolve-candidate");
  const section = workflow.slice(x.start, x.end);
  assert.ok(section.includes("RESOLVER_DIAGNOSTICS_OUTPUT:"));
  assert.ok(section.includes("Upload redacted resolver failure evidence"));
  assert.ok(section.includes("if: always()"));
  assert.ok(section.includes("path: ${{ runner.temp }}/resolver-diagnostics.json"));
  assert.ok(section.includes("if-no-files-found: ignore"));
  assert.ok(section.includes("retention-days: 90"));
});
