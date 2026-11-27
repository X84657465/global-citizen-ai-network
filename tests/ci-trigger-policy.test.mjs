import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";

const workflow = readFileSync(new URL("../.github/workflows/ci.yml", import.meta.url), "utf8").replace(/\r\n/g, "\n");
const preflight = readFileSync(new URL("../.github/workflows/agent-task-preflight.yml", import.meta.url), "utf8").replace(/\r\n/g, "\n");
const acceptance = readFileSync(new URL("../.github/workflows/pr-acceptance.yml", import.meta.url), "utf8").replace(/\r\n/g, "\n");
const runnerSmoke = readFileSync(new URL("../.github/workflows/self-hosted-runner-smoke.yml", import.meta.url), "utf8").replace(/\r\n/g, "\n");
const publisher = readFileSync(new URL("../scripts/publish-agent-patch.mjs", import.meta.url), "utf8").replace(/\r\n/g, "\n");
const nextConfig = readFileSync(new URL("../next.config.ts", import.meta.url), "utf8").replace(/\r\n/g, "\n");
const resolver = readFileSync(new URL("../scripts/resolve-agent-task-pr.mjs", import.meta.url), "utf8").replace(/\r\n/g, "\n");
const patchGenerator = readFileSync(new URL("../scripts/generate-agent-patch.mjs", import.meta.url), "utf8").replace(/\r\n/g, "\n");
const workflowLevelConcurrency = workflow.split("\non:\n", 1)[0];

function findJobSection(source, name) {
  const start = source.indexOf("  " + name + ":\n");
  assert.ok(start >= 0, "missing CI job: " + name);
  const headers = [...source.slice(start + 1).matchAll(/^  [A-Za-z0-9_-]+:[ \t]*(?:#.*)?$/gm)];
  return { start, end: headers[0] ? start + 1 + headers[0].index : source.length };
}

function findNamedStepBlock(source, name, fromIndex = 0, endIndex = source.length) {
  const marker = "      - name: " + name;
  const start = source.indexOf(marker, fromIndex);
  assert.ok(start >= 0 && start < endIndex, "missing workflow step in requested job: " + name);
  const boundary = /\r?\n {6}- name:/g;
  boundary.lastIndex = start + marker.length;
  const next = boundary.exec(source);
  const end = next && next.index < endIndex ? next.index : endIndex;
  return source.slice(start, end);
}

test("named workflow step extraction never crosses into a later job", () => {
  const source = [
    "  prepare-task:\n",
    "    steps:\n",
    "      - name: Existing step\n",
    "        run: echo safe\n",
    "  publish-task:\n",
    "    steps:\n",
    "      - name: Target step\n",
    "        run: echo other-job\n",
  ].join("");
  const prepare = findJobSection(source, "prepare-task");
  assert.throws(
    () => findNamedStepBlock(source, "Target step", prepare.start, prepare.end),
    /missing workflow step in requested job/,
  );

  const continueOnErrorSource = [
    "  reset-system-breaker:\n",
    "    runs-on: ubuntu-latest\n",
    "    steps:\n",
    "      - run: echo current-job\n",
    "  next-job: # follow-up\n",
    "    env:\n",
    "      SAFE: yes\n",
    "    concurrency:\n",
    "      group: leaked-next-job-runner-group\n",
    "    steps:\n",
    "      - run: echo next-job\n",
  ].join("");
  const resetJob = findJobSection(continueOnErrorSource, "reset-system-breaker");
  const resetSection = continueOnErrorSource.slice(resetJob.start, resetJob.end);
  assert.match(resetSection, /echo current-job/);
  assert.doesNotMatch(resetSection, /echo next-job/);
  assert.doesNotMatch(resetSection, /leaked-next-job-runner-group/,
    "a following job with env first and a trailing YAML comment must not leak into the recovery section");

  const windowsSource = source.replace(/\n/g, "\r\n");
  const windowsPrepareStart = windowsSource.indexOf("  prepare-task:");
  const windowsPrepareEnd = windowsSource.indexOf("  publish-task:");
  const existing = findNamedStepBlock(windowsSource, "Existing step", windowsPrepareStart, windowsPrepareEnd);
  assert.match(existing, /echo safe/);
  assert.doesNotMatch(existing, /echo other-job/);
});

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
  for (const job of ["quality", "build", "database"]) {
    const { start, end } = findJobSection(workflow, job);
    const section = workflow.slice(start, end);
    assert.ok(section.includes("github.event_name == 'push' && (github.actor == github.repository_owner || github.actor == 'mergify[bot]')"),
      job + " must run for owner and trusted Mergify main pushes");
  }
  assert.equal(workflow.includes("github.event_name == 'push' && github.actor == github.repository_owner"), false,
    "Mergify-created main commits must not silently skip Factory validation");

  assert.equal(workflow.includes('branches: [main, "codex/**"]'), false);
});

test("CI keeps stateful quality and integration jobs serialized on the Windows Runner", () => {
  assert.ok(workflowLevelConcurrency.includes("group: global-citizen-ai-network-ci-${{ github.event.pull_request.number || github.event.client_payload.pull_request_number || github.ref }}"));
  assert.ok(workflowLevelConcurrency.includes("cancel-in-progress:") && workflowLevelConcurrency.includes("ai-task/issue-") && workflowLevelConcurrency.includes("codex/issue-"), "only superseded non-task runs may be cancelled");
  assert.equal(workflowLevelConcurrency.includes("queue: max"), false);
  const jobs = ["quality", "build", "database", "circuit-breaker", "circuit-breaker-success"];
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

test("PR metadata resolution uses the verified Windows Runner and shared queue", () => {
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
  assert.equal(preflight.includes('      - ".github/workflows/agent-task-preflight.yml"\n'), false, "workflow-only changes are validated by CI policy tests, not by the unrelated Linux scratch fixture");
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
  assert.ok(validationSection.includes("if: github.event_name == 'workflow_dispatch' && github.actor == github.repository_owner"));
  assert.ok(validationSection.includes("manual to avoid duplicate Runner work"));
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

function hasV2ControllerInvocation(source) {
  const lines = source.split(/\r?\n/);
  const commands = [];
  let runIndent = null;
  for (const line of lines) {
    const run = line.match(/^(\s*)run:\s*(.*)$/);
    if (run) {
      runIndent = run[1].length;
      if (run[2] && run[2].trim() !== "|") commands.push(run[2]);
      continue;
    }
    if (runIndent !== null) {
      const indent = line.match(/^\s*/)[0].length;
      if (line.trim() && indent <= runIndent) runIndent = null;
      else commands.push(line);
    }
  }
  const executableLines = commands.filter(line => !/^\s*#/.test(line));
  return /^\s*(?:env\s+(?:[A-Za-z_][A-Za-z0-9_]*=[^\s]+\s+)*)?node(?:\s+(?:--[^\s]+|-r\s+\S+))*\s+(?:\.\/)?scripts\/agent-factory-v2-controller\.mjs\b/m
    .test(executableLines.join("\n"));
}

test("every V2 state-writer workflow is serialized by the shared Runner queue", () => {
  const workflowDirectory = new URL("../.github/workflows/", import.meta.url);
  const workflowFiles = readdirSync(workflowDirectory).filter((name) => /\.ya?ml$/i.test(name));
  let writerWorkflowCount = 0;

  for (const fileName of workflowFiles) {
    const source = readFileSync(new URL(fileName, workflowDirectory), "utf8").replace(/\r\n/g, "\n");
    if (!hasV2ControllerInvocation(source)) continue;
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

test("controller invocation detection includes Node options and ./ prefixes but ignores comments", () => {
  assert.equal(hasV2ControllerInvocation("        run: node scripts/agent-factory-v2-controller.mjs"), true);
  assert.equal(hasV2ControllerInvocation("        run: node ./scripts/agent-factory-v2-controller.mjs"), true);
  assert.equal(hasV2ControllerInvocation("        run: node --no-warnings ./scripts/agent-factory-v2-controller.mjs"), true);
  assert.equal(hasV2ControllerInvocation("        run: |\\n          # node scripts/agent-factory-v2-controller.mjs"), false);
  assert.equal(hasV2ControllerInvocation("        run: echo '# node scripts/agent-factory-v2-controller.mjs'"), false);
});

test("Next.js output tracing is scoped to the repository and ignores unrelated Runner workspace lockfiles", () => {
  assert.ok(nextConfig.includes("outputFileTracingRoot: process.cwd()"));
});

test("source syntax and CI policy regressions are classified as task-scoped quality failures", () => {
  const qualityBounds = findJobSection(workflow, "quality");
  const quality = workflow.slice(qualityBounds.start, qualityBounds.end);
  assert.ok(quality.includes("- name: Validate Agent Factory script syntax\n        id: script-syntax\n"));
  assert.ok(quality.includes("- name: Verify CI trigger and Runner policy\n        id: ci-trigger-policy\n"));
  const classifierStart = quality.indexOf("- name: Classify quality-gate failure");
  assert.ok(classifierStart >= 0, "quality failure classifier must exist");
  const classifier = quality.slice(classifierStart);
  assert.ok(classifier.includes("SCRIPT_SYNTAX: ${{ steps.script-syntax.outcome }}"));
  assert.ok(classifier.includes("CI_TRIGGER_POLICY: ${{ steps.ci-trigger-policy.outcome }}"));
  assert.ok(classifier.includes("$env:SCRIPT_SYNTAX"));
  assert.ok(classifier.includes("$env:CI_TRIGGER_POLICY"));

  const taskOutcomes = classifier.match(/\$taskOutcomes = @\(([^)]*)\)/)?.[1] ?? "";
  assert.ok(taskOutcomes.includes("$env:SCRIPT_SYNTAX"), "script syntax outcome must affect failure scope");
  assert.ok(taskOutcomes.includes("$env:CI_TRIGGER_POLICY"), "CI policy outcome must affect failure scope");
  assert.ok(classifier.includes('if ($taskOutcomes -contains "failure")'));
  assert.ok(classifier.includes('"scope=task"'));
  assert.ok(classifier.includes('"scope=system"'));

  const qualityOutput = quality.match(/failure_scope: \$\{\{ steps\.classify-failure\.outputs\.scope \}\}/);
  assert.ok(qualityOutput, "quality job must publish the classified failure scope");
  const { start: breakerStart, end: breakerEnd } = findJobSection(workflow, "circuit-breaker");
  const breaker = workflow.slice(breakerStart, breakerEnd);
  const scopeExpression = breaker.match(/CI_FAILURE_SCOPE: \$\{\{ ([^\n]+) \}\}/)?.[1] ?? "";
  assert.ok(scopeExpression.includes("needs.quality.outputs.failure_scope == 'task'"),
    "circuit breaker must consume the quality job's classified scope");
  assert.ok(scopeExpression.includes("needs.quality.result != 'failure'"),
    "quality result must participate in the task/system failure decision");
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

test("preflight cooldown lookup is pinned to the canonical state Issue and supports an override", () => {
  const { start, end } = findJobSection(preflight, "prepare-task");
  const gate = findNamedStepBlock(preflight, "Check durable circuit-breaker cooldown", start, end);
  assert.match(gate, /AGENT_FACTORY_MODE: check/);
  assert.ok(gate.includes("AGENT_FACTORY_STATE_ISSUE_NUMBER: ${{ vars.AGENT_FACTORY_STATE_ISSUE_NUMBER || (github.repository == 'X84657465/global-citizen-ai-network' && '100' || '') }}"));
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

test("preflight separates least-privilege task planning from the isolated publisher permissions", () => {
  const { start: prepareStart, end: prepareEnd } = findJobSection(preflight, "prepare-task");
  const prepareTask = preflight.slice(prepareStart, prepareEnd);
  const preparePermissionsStart = prepareTask.indexOf("    permissions:\n");
  const preparePermissionsEnd = prepareTask.indexOf("    concurrency:", preparePermissionsStart);
  const preparePermissions = prepareTask.slice(preparePermissionsStart, preparePermissionsEnd);
  assert.equal(
    preparePermissions.trim(),
    ["permissions:", "      actions: none", "      contents: read", "      issues: write", "      pull-requests: read"].join("\n"),
    "prepare-task must retain its exact least-privilege permission set",
  );

  const { start: publisherStart, end: publisherEnd } = findJobSection(preflight, "publish-task");
  const publisherJob = preflight.slice(publisherStart, publisherEnd);
  const publisherPermissionsStart = publisherJob.indexOf("    permissions:\n");
  const publisherPermissionsEnd = publisherJob.indexOf("    concurrency:", publisherPermissionsStart);
  const publisherPermissions = publisherJob.slice(publisherPermissionsStart, publisherPermissionsEnd);
  assert.equal(
    publisherPermissions.trim(),
    ["permissions:", "      actions: read", "      contents: write", "      issues: none", "      pull-requests: write"].join("\n"),
    "publish-task must retain its exact isolated publisher permission set",
  );
});

test("untrusted candidate install and test steps never receive GitHub write credentials", () => {
  const { start: prepareStart, end: prepareEnd } = findJobSection(preflight, "prepare-task");
  const candidateSteps = [
    findNamedStepBlock(preflight, "Install candidate dependencies inside restricted container (attempt 1)", prepareStart, prepareEnd),
    findNamedStepBlock(preflight, "Retry candidate dependency installation once", prepareStart, prepareEnd),
    findNamedStepBlock(preflight, "Test patched candidate offline inside restricted container", prepareStart, prepareEnd),
  ];

  for (const step of candidateSteps) {
    assert.doesNotMatch(step, /\$\{\{\s*secrets\./, "candidate containers must not receive any GitHub secret expression");
    assert.doesNotMatch(step, /(?:--env|-e)\s+(?:GITHUB_TOKEN|GH_TOKEN|GITHUB_[A-Z0-9_]+)(?:=|\s|$)/, "Docker --env and -e forms must not forward GitHub credentials");
    assert.doesNotMatch(step, /--env-file(?:=|\s)/, "candidate containers must not inherit an unreviewed environment file");
    assert.doesNotMatch(step, /^\s*(?:GITHUB_TOKEN|GH_TOKEN|GITHUB_[A-Z0-9_]+)\s*:/m, "candidate steps must not declare GitHub credential environment variables");
  }
});

test("preflight GitHub tokens remain limited to the exact trusted orchestration steps", () => {
  const { start, end } = findJobSection(preflight, "prepare-task");
  const prepareTask = preflight.slice(start, end);
  const lines = prepareTask.split("\n");
  const tokenSteps = [];
  for (let index = 0; index < lines.length; index += 1) {
    if (!/GITHUB_TOKEN:\s*\$\{\{\s*secrets\.GITHUB_TOKEN\s*\}\}/.test(lines[index])) continue;
    let stepIndex = index;
    while (stepIndex > 0 && !/^\s*- name:/.test(lines[stepIndex])) stepIndex -= 1;
    tokenSteps.push(lines[stepIndex]?.trim() || "unknown step");
  }
  assert.deepEqual(tokenSteps.sort(), [
    "- name: Check durable circuit-breaker cooldown",
    "- name: Generate one bounded roadmap task when the queue is truly empty",
    "- name: Record failed task and activate cooldown after three consecutive failures",
    "- name: Reserve durable V2 worker lease",
    "- name: Select one queued task for every queue trigger",
    "- name: Transition task to patching",
    "- name: Transition task to planning",
    "- name: Transition task to preparing",
    "- name: Validate task and create a safe handoff bundle",
  ].sort(), "only trusted state/orchestration steps may receive the job token");
});

test("candidate dependency install and offline test retain separate least-network container profiles", () => {
  const { start: prepareStart, end: prepareEnd } = findJobSection(preflight, "prepare-task");
  const install = findNamedStepBlock(preflight, "Install candidate dependencies inside restricted container (attempt 1)", prepareStart, prepareEnd);
  const retry = findNamedStepBlock(preflight, "Retry candidate dependency installation once", prepareStart, prepareEnd);
  const offlineTest = findNamedStepBlock(preflight, "Test patched candidate offline inside restricted container", prepareStart, prepareEnd);

  for (const section of [install, retry]) {
    assert.ok(section.includes("--network bridge"), "dependency installation may use network only inside the disposable container");
    assert.equal(section.includes("--network none"), false, "dependency installation must not claim to be offline");
    assert.ok(section.includes("--read-only"));
    assert.ok(section.includes("--cap-drop ALL"));
    assert.ok(section.includes("--security-opt no-new-privileges"));
    assert.ok(section.includes("--user 1000:1000"));
    assert.ok(section.includes("--ignore-scripts"), "candidate dependency lifecycle scripts must stay disabled");
    assert.ok(section.includes("--env npm_config_cache=/npm-cache"));
    assert.doesNotMatch(section, /GITHUB_TOKEN|GH_TOKEN/);
  }

  assert.ok(offlineTest.includes("--network none"), "candidate code tests must run without network access");
  assert.ok(offlineTest.includes("--read-only"));
  assert.ok(offlineTest.includes("--cap-drop ALL"));
  assert.ok(offlineTest.includes("--security-opt no-new-privileges"));
  assert.ok(offlineTest.includes("--user 1000:1000"));
  assert.ok(offlineTest.includes("npm run test:unit && npx --no-install tsc --noEmit && npm run lint"));
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
  assert.ok(preflight.includes("  schedule:\n    - cron: \"3-59/5 * * * *\""));
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
test("CI diagnostics use the verified Windows Runner and preserve fallback evidence before checkout", () => {
  const x = findJobSection(workflow, "ci-diagnostics");
  const section = workflow.slice(x.start, x.end);
  assert.ok(section.includes("runs-on: [self-hosted, Windows, X64]"));
  assert.ok(section.includes("group: global-citizen-ai-network-self-hosted-runner"));
  assert.ok(section.includes("queue: max"));
  assert.ok(section.includes("cancel-in-progress: false"));
  assert.ok(section.includes("actions: read"));
  assert.ok(section.includes("contents: read"));
  assert.ok(section.includes("Invoke-RestMethod"));
  assert.ok(section.includes("CI_EXPECTED_HEAD_SHA"));
  assert.ok(section.includes("ci-failure-diagnostics.json"));
  assert.ok(section.includes("retention-days: 90"));
  assert.equal(section.includes("issues: write"), false);
  const fallback = section.indexOf("Initialize fallback CI evidence before checkout");
  const checkout = section.indexOf("Checkout exact tested revision");
  const upload = section.indexOf("Upload redacted CI failure evidence");
  assert.ok(fallback >= 0 && fallback < checkout);
  assert.ok(upload > checkout && section.slice(upload).includes("if: always()"));
  assert.ok(section.includes("${{ runner.temp }}/ci-failure-diagnostics.json"));
  assert.ok(section.includes("if-no-files-found: error"),
    "missing CI failure evidence must fail closed");
  assert.ok(section.includes("WORKFLOW_EVENT: ${{ github.event_name }}"));
  assert.ok(section.includes("WORKFLOW_REF: ${{ github.ref }}"));
  assert.ok(section.includes("ConvertTo-Json -Depth 10"));
  assert.ok(section.includes("System.Text.UTF8Encoding"));
  assert.equal(section.includes("shell: bash"), false);
  assert.equal(section.includes("shell: pwsh"), false, "the Runner provides Windows PowerShell, not pwsh");
});

test("resolver failure evidence is initialized before checkout and always uploaded", () => {
  const x = findJobSection(workflow, "resolve-candidate");
  const s = workflow.slice(x.start, x.end);
  const fallback = s.indexOf("Initialize fallback resolver evidence before checkout");
  const checkout = s.indexOf("Checkout resolver");
  const upload = s.indexOf("Upload redacted resolver failure evidence");
  assert.ok(fallback >= 0 && fallback < checkout);
  assert.ok(upload > checkout && s.slice(upload).includes("if: always()"));
  assert.ok(s.includes("resolver-diagnostics.json"));
  assert.ok(s.includes("WORKFLOW_EVENT: ${{ github.event_name }}"));
  assert.ok(s.includes("WORKFLOW_REF: ${{ github.ref }}"));
  assert.ok(s.includes("event = $env:WORKFLOW_EVENT"));
  assert.ok(s.includes("ref = $env:WORKFLOW_REF"));
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

  for (const [index, match] of offlineSteps.entries()) {
    const next = preflight.indexOf("\n      - name:", match.index + match[0].length);
    const section = preflight.slice(match.index, next < 0 ? preflight.length : next);
    const exitEvidence = index === 0
      ? "$testExitCode = $LASTEXITCODE"
      : "$startExitCode = $LASTEXITCODE";
    assert.ok(section.includes(exitEvidence), "preserve the native Docker process exit evidence");
    assert.ok(section.includes("Out-File -LiteralPath $testLog"), "persist stdout and stderr before raising failure");

    if (index === 1) {
      assert.ok(section.includes("docker inspect --format '{{json .State}}'"), "inspect the candidate container after attached start");
      assert.ok(section.includes("candidateContainerFailureScope(state)"), "classify the inspected process result with the shared fail-closed policy");
      assert.ok(section.includes("$classificationExitCode"), "preserve classifier execution failure as system evidence");
    }
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


test("system breaker recovery resolves one trusted main PR from the completed CI exact SHA", () => {
  const recovery = readFileSync(new URL("../.github/workflows/agent-factory-system-health.yml", import.meta.url), "utf8").replace(/\r\n/g, "\n");
  const ci = readFileSync(new URL("../.github/workflows/ci.yml", import.meta.url), "utf8").replace(/\r\n/g, "\n");
  assert.equal(ci.includes("AGENT_FACTORY_MODE: success"), false,
    "the in-progress CI workflow must not invoke the legacy non-mutating success callback");
  assert.ok(recovery.includes('  workflow_run:\n    workflows: ["CI"]\n    types: [completed]'));
  for (const guard of [
    'process.env.WORKFLOW_PATH === ".github/workflows/ci.yml"',
    'process.env.WORKFLOW_CONCLUSION === "success"',
    'process.env.WORKFLOW_EVENT === "pull_request"',
    'process.env.WORKFLOW_HEAD_REPOSITORY === process.env.GITHUB_REPOSITORY',
  ]) assert.ok(recovery.includes(guard), "in-job eligibility resolver must retain " + guard);
  assert.equal(recovery.includes("workflow_run.pull_requests"), false,
    "PR association must be resolved from the completed workflow's exact SHA, not optional workflow_run metadata");

  for (const guard of [
    "commits/${sha}/pulls",
    'pr.state === "open"',
    'pr.base?.ref === "main"',
    "pr.base?.repo?.full_name === process.env.GITHUB_REPOSITORY",
    "pr.head?.repo?.full_name === process.env.GITHUB_REPOSITORY",
    "pr.head?.sha === sha",
    "pr.head?.ref === ref",
    '!ref?.startsWith("ai-task/issue-") && !ref?.startsWith("codex/issue-")',
  ]) assert.ok(recovery.includes(guard), "exact-SHA PR resolver must retain " + guard);

  const zeroMatchStart = recovery.indexOf("if (matches.length === 0)");
  const ambiguousMatchStart = recovery.indexOf("if (matches.length > 1)");
  assert.ok(zeroMatchStart >= 0 && ambiguousMatchStart > zeroMatchStart,
    "zero exact-head matches must be handled before the multiple-match rejection");
  const zeroMatchBranch = recovery.slice(zeroMatchStart, ambiguousMatchStart);
  assert.ok(zeroMatchBranch.includes("should_recover=false"),
    "zero exact-head matches must produce a safe no-recovery output");
  assert.ok(zeroMatchBranch.includes("process.exit(0)"),
    "zero exact-head matches must finish as a no-op");
  assert.ok(recovery.slice(ambiguousMatchStart).includes("Ambiguous exact-head PR resolution"),
    "multiple exact-head matches must fail closed as ambiguous");

  const resolveStart = recovery.indexOf("- name: Resolve and verify the unique exact-head main PR");
  const verifyStart = recovery.indexOf("- name: Verify completed CI provenance and reset global breaker");
  assert.ok(resolveStart >= 0 && verifyStart > resolveStart,
    "the unique PR resolution must complete before the privileged Factory state mutation");
  assert.ok(recovery.includes("WORKFLOW_HEAD_SHA: " + "$" + "{{ github.event.workflow_run.head_sha }}"));
  assert.ok(recovery.includes("WORKFLOW_HEAD_REF: " + "$" + "{{ github.event.workflow_run.head_branch }}"));
  assert.ok(recovery.includes("SYSTEM_HEALTH_PULL_REQUEST_NUMBER: " + "$" + "{{ steps.resolve-pr.outputs.number }}"));
  assert.ok(recovery.includes("SYSTEM_HEALTH_PR_HEAD_SHA: " + "$" + "{{ steps.resolve-pr.outputs.head_sha }}"));
  const recoveryWorkflowHeader = recovery.slice(0, recovery.indexOf("\njobs:"));
  assert.equal(recoveryWorkflowHeader.includes("global-citizen-ai-network-self-hosted-runner"), false,
    "cancelled/failed workflow_run events must not reserve the shared Runner queue at workflow scope");
  const { start: recoveryJobStart, end: recoveryJobEnd } = findJobSection(recovery, "reset-system-breaker");
  const recoveryJob = recovery.slice(recoveryJobStart, recoveryJobEnd);
  assert.ok(recoveryJob.includes("group: global-citizen-ai-network-self-hosted-runner"));
  assert.ok(recoveryJob.includes("queue: max"));
  assert.ok(recoveryJob.includes("cancel-in-progress: false"));
  assert.ok(recovery.includes("runs-on: ubuntu-latest"),
    "the state recovery job must stay on hosted Linux while retaining the shared cross-process queue");
  assert.ok(recoveryJob.includes("waits in the shared cross-process state-writer queue"));
  assert.ok(recoveryJob.includes("may queue behind"));
  assert.ok(recoveryJob.includes("atomic CAS/lease"),
    "do not imply hosted Linux removes the state-writer queue or permits unsafe lock splitting");
  for (const permission of ["actions: read", "contents: read", "issues: write", "pull-requests: read"])
    assert.ok(recovery.includes(permission));
  assert.ok(recovery.includes("ref: main"));
  assert.ok(recovery.includes("persist-credentials: false"));
  assert.ok(recovery.includes("AGENT_FACTORY_MODE: system-health-success"));
  assert.ok(recovery.includes("SYSTEM_HEALTH_RUN_ID: " + "$" + "{{ github.event.workflow_run.id }}"));
  assert.ok(recovery.includes("SYSTEM_HEALTH_RUN_ATTEMPT: " + "$" + "{{ github.event.workflow_run.run_attempt }}"));
  assert.ok(recovery.includes("SYSTEM_HEALTH_HEAD_SHA: " + "$" + "{{ github.event.workflow_run.head_sha }}"));
  assert.equal(recoveryJob.includes("    if: >-"), false,
    "the recovery observer job must not be skipped before it can persist diagnostics");
  assert.ok(recovery.includes("WORKFLOW_CONCLUSION"));
  assert.ok(recovery.includes("WORKFLOW_HEAD_REPOSITORY"));
  assert.ok(recovery.includes("Write redacted recovery diagnostic summary"));
  assert.ok(recovery.includes("Upload recovery diagnostics"));
  assert.ok(recovery.includes("run: |\n          set +e\n          node scripts/agent-factory-v2-controller.mjs"));
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
  assert.ok(section.includes("if-no-files-found: error"),
    "missing resolver fallback evidence must fail closed");
  assert.ok(section.includes("retention-days: 90"));
});

test("CI carries provider rate-limit cooldown from the candidate controller to the cross-job breaker", () => {
  const buildJob = findJobSection(workflow, "build");
  const buildSection = workflow.slice(buildJob.start, buildJob.end);
  assert.ok(buildSection.includes("api_cooldown_until: ${{ steps.register-candidate.outputs.api_cooldown_until }}"));

  const breakerJob = findJobSection(workflow, "circuit-breaker");
  const breakerSection = workflow.slice(breakerJob.start, breakerJob.end);
  assert.ok(breakerSection.includes("AGENT_FACTORY_API_COOLDOWN_UNTIL: ${{ needs.build.outputs.api_cooldown_until }}"));
});


test("preflight transports only the validated publisher cooldown through an artifact on job failure", () => {
  const publisherJob = findJobSection(preflight, "publish-task");
  const publisher = preflight.slice(publisherJob.start, publisherJob.end);
  assert.ok(publisher.includes("AGENT_FACTORY_API_COOLDOWN_FILE: artifacts/agent-api-cooldown.txt"),
    "the publisher must write the sanitized deadline to a dedicated handoff file");
  assert.ok(publisher.includes("- name: Initialize sanitized publisher cooldown handoff"),
    "the handoff file must exist before the publisher can fail");
  assert.ok(publisher.includes("if: always()\n        uses: actions/upload-artifact@v4"),
    "the sanitized handoff artifact must upload even when the publisher step fails");
  assert.ok(publisher.includes("name: ai-agent-api-cooldown-${{ github.run_id }}-${{ github.run_attempt }}"),
    "the handoff artifact must be scoped to this workflow run");
  assert.ok(!publisher.includes("api_cooldown_until: ${{ steps.publish.outputs.api_cooldown_until }}"),
    "the workflow must not rely on outputs from a failed publisher job");

  const recordJob = findJobSection(preflight, "record-publication");
  const record = preflight.slice(recordJob.start, recordJob.end);
  assert.ok(record.includes("needs: [prepare-task, begin-publication, publish-task]"),
    "the state-writer job must explicitly depend on the publisher job");
  assert.ok(record.includes("Download sanitized publisher cooldown handoff"),
    "the state writer must retrieve the sanitized artifact");
  assert.ok(record.includes("if: always()\n        continue-on-error: true\n        uses: actions/download-artifact@v4"),
    "missing artifacts must not mask the original publisher failure");
  assert.ok(record.includes("Restore validated publisher cooldown for durable failure callback"),
    "the state writer must validate and restore the deadline into its own environment");
  assert.ok(record.includes("node scripts/restore-agent-factory-api-cooldown.mjs"),
    "the state writer must use the tested strict artifact restore helper");
  assert.ok(record.includes('"$env:GITHUB_ENV"'),
    "the validated deadline must be restored only into the state-writer environment");

  const failureStart = record.indexOf("      - name: Record publication failure and preserve the task lease state");
  assert.ok(failureStart >= 0, "the publication failure callback must remain explicit");
  const nextStep = record.indexOf("\n      - name:", failureStart + 1);
  const failureStep = record.slice(failureStart, nextStep < 0 ? record.length : nextStep);
  assert.ok(failureStep.includes("if: failure() || needs.begin-publication.result != 'success' || needs.publish-task.result != 'success'"),
    "the callback must run when the publisher job fails");
  assert.ok(failureStep.includes("AGENT_FACTORY_MODE: failure"));
  assert.ok(!failureStep.includes("needs.publish-task.outputs.api_cooldown_until"),
    "the failure callback must consume the validated artifact-restored environment, not failed-job outputs");
});

test("Agent Factory isolates candidate generation, PR publication, state writes, and dispatch permissions", () => {
  const jobsSource = preflight.slice(preflight.indexOf("\njobs:") + "\njobs:".length);
  const jobNames = [...jobsSource.matchAll(/^  ([A-Za-z0-9_-]+):\s*$/gm)].map((match) => match[1]);
  assert.equal(new Set(jobNames).size, jobNames.length, "workflow job identifiers must be unique");
  const prepare = findJobSection(jobsSource, "prepare-task");
  const prepareSection = jobsSource.slice(prepare.start, prepare.end);
  const publish = findJobSection(jobsSource, "publish-task");
  const publishSection = jobsSource.slice(publish.start, publish.end);
  const record = findJobSection(jobsSource, "record-publication");
  const recordSection = jobsSource.slice(record.start, record.end);
  const dispatch = findJobSection(jobsSource, "dispatch-roadmap-task");
  const dispatchSection = jobsSource.slice(dispatch.start, dispatch.end);

  assert.ok(prepareSection.includes("contents: read"));
  assert.ok(prepareSection.includes("issues: write"));
  assert.ok(prepareSection.includes("pull-requests: read"));
  assert.equal(prepareSection.includes("contents: write"), false);
  assert.equal(prepareSection.includes("pull-requests: write"), false);
  assert.equal(prepareSection.includes("Create a draft PR after isolated tests pass"), false);
  assert.ok(prepareSection.includes("artifacts/agent-scratch-publication.json"), "publication evidence must include the sanitized scratch manifest");
  const uploadStep = findNamedStepBlock(jobsSource, "Upload exact validated publication bundle", prepare.start, prepare.end);
  assert.ok(uploadStep.includes("artifacts/agent-scratch-publication.json"),
    "the upload allowlist must include the sanitized scratch publication manifest");
  assert.equal(uploadStep.includes("artifacts/agent-scratch.json"), false,
    "the raw machine-local scratch manifest must never be in the upload step");

  const cleanupStep = findNamedStepBlock(jobsSource, "Clean disposable scratch workspace", prepare.start, prepare.end);
  assert.ok(cleanupStep.includes('Remove-Item -LiteralPath $manifestPath -Force'),
    "scratch cleanup must remove the raw machine-local manifest");
  const classifyStep = findNamedStepBlock(jobsSource, "Classify known task-scoped failures before updating factory state", prepare.start, prepare.end);
  assert.ok(prepareSection.indexOf(cleanupStep) < prepareSection.indexOf(classifyStep),
    "scratch cleanup must complete before failure classification");

  const begin = findJobSection(jobsSource, "begin-publication");
  const beginSection = jobsSource.slice(begin.start, begin.end);
  assert.ok(prepareSection.includes("lease_id: ${{ steps.reserve-task.outputs.lease_id }}"),
    "the prepare job must export only the exact lease returned by the trusted reserve step");
  assert.ok(beginSection.includes("needs.prepare-task.outputs.lease_id != ''"),
    "publication must fail closed when the lease output is missing");
  assert.ok(beginSection.includes("AGENT_FACTORY_LEASE_ID: ${{ needs.prepare-task.outputs.lease_id }}"),
    "the publishing transition must receive the exact reserved lease through the job output");
  assert.ok(beginSection.includes("NEXT_TASK_STATE: publishing"));
  assert.ok(beginSection.includes("issues: write"));
  assert.ok(beginSection.includes("contents: read"));
  assert.ok(publishSection.includes("needs: [prepare-task, begin-publication]"));
  assert.ok(publishSection.includes("needs.begin-publication.result == 'success'"));
  assert.ok(recordSection.includes("needs: [prepare-task, begin-publication, publish-task]"));
  assert.equal(recordSection.includes("NEXT_TASK_STATE: publishing"), false,
    "the durable publishing transition must complete before the publisher job starts");
  assert.ok(publishSection.includes("contents: write"));
  assert.ok(publishSection.includes("pull-requests: write"));
  assert.ok(publishSection.includes("issues: none"), "publisher must not receive issue-write permission");
  assert.ok(publishSection.includes("PUBLISH_SKIP_ISSUE_COMMENT: \"true\""));
  assert.ok(publishSection.includes("ai-agent-publication-result-${{ github.run_id }}"));
  assert.ok(publishSection.includes("ref: ${{ github.sha }}"), "publisher must validate against the exact workflow SHA");
  assert.equal(publishSection.includes("AGENT_FACTORY_LEASE_ID"), false,
    "the isolated publisher must never receive the privileged Factory worker lease");

  assert.ok(recordSection.includes("needs: [prepare-task, begin-publication, publish-task]"));
  assert.ok(recordSection.includes("issues: write"));
  assert.ok(recordSection.includes("contents: read"));
  assert.equal(recordSection.includes("contents: write"), false);
  assert.equal(recordSection.includes("pull-requests: write"), false);
  assert.ok(recordSection.includes("AGENT_FACTORY_LEASE_ID: ${{ needs.prepare-task.outputs.lease_id }}"),
    "the post-publication state writer must receive the same exact reserved lease");
  assert.ok(recordSection.includes("AGENT_FACTORY_MODE: transition"));
  assert.ok(recordSection.includes("$expectedPullUrl = \"https://github.com/$env:GITHUB_REPOSITORY/pull/$pullNumber\""),
    "the issue-state writer must bind the PR URL to the exact target repository and PR number");
  assert.ok(recordSection.includes("always()"), "the post-publish state writer must run to record publisher failures");
  assert.ok(recordSection.includes("needs.begin-publication.result != 'success'"));
  assert.ok(recordSection.includes("needs.publish-task.result != 'success'"));

  assert.ok(dispatchSection.includes("contents: write"));
  assert.equal(dispatchSection.includes("issues: write"), false);
  assert.equal(dispatchSection.includes("pull-requests: write"), false);

  const planStepStart = prepareSection.indexOf("      - name: Generate and validate a read-only plan with local Ollama");
  const planStepEnd = prepareSection.indexOf("      - name: Transition task to patching", planStepStart);
  assert.ok(planStepStart >= 0 && planStepEnd > planStepStart);
  assert.equal(prepareSection.slice(planStepStart, planStepEnd).includes("GITHUB_TOKEN"), false,
    "local model planning must not receive the GitHub token");
  const patchStepStart = prepareSection.indexOf("      - name: Generate and validate a bounded patch proposal");
  const patchStepEnd = prepareSection.indexOf("      - name: Apply validated patch to a disposable scratch workspace", patchStepStart);
  assert.ok(patchStepStart >= 0 && patchStepEnd > patchStepStart);
  assert.equal(prepareSection.slice(patchStepStart, patchStepEnd).includes("GITHUB_TOKEN"), false,
    "local model patch generation must not receive the GitHub token");
  assert.ok(publisher.includes('process.env.PUBLISH_SKIP_ISSUE_COMMENT !== "true"'),
    "publisher must support operation without issue-write permission");
});


test("post-completion recovery resolver rejects forks, stale heads, wrong bases, and ambiguous PRs", () => {
  const recoveryWorkflow = readFileSync(
    new URL("../.github/workflows/agent-factory-system-health.yml", import.meta.url),
    "utf8",
  ).replace(/\r\n/g, "\n");
  const resolverStart = recoveryWorkflow.indexOf("const matches = prs.filter(");
  const resolverEnd = recoveryWorkflow.indexOf("if (matches.length > 1)", resolverStart);
  assert.ok(resolverStart >= 0 && resolverEnd > resolverStart,
    "recovery must explicitly filter all PR candidates before accepting one");
  const resolver = recoveryWorkflow.slice(resolverStart, resolverEnd);
  for (const requiredGuard of [
    'pr.state === "open"',
    'pr.base?.ref === "main"',
    "pr.base?.repo?.full_name === process.env.GITHUB_REPOSITORY",
    "pr.head?.repo?.full_name === process.env.GITHUB_REPOSITORY",
    "pr.head?.sha === sha",
    "pr.head?.ref === ref",
  ]) assert.ok(resolver.includes(requiredGuard), "exact-head resolver must retain " + requiredGuard);
  assert.ok(recoveryWorkflow.includes("if (matches.length === 0)"),
    "stale or closed-PR CI without an open exact-head PR must be a successful no-op");
  assert.ok(recoveryWorkflow.includes("should_recover=false"),
    "zero matches must prevent the privileged recovery controller from running");
  assert.ok(recoveryWorkflow.includes("if (matches.length > 1)"),
    "ambiguous exact-head PR matches must still fail closed");
  assert.ok(recoveryWorkflow.includes("if: steps.resolve-pr.outputs.should_recover == 'true'"),
    "the privileged recovery controller must run only after a unique exact-head PR is verified");
  assert.ok(recoveryWorkflow.includes('!ref?.startsWith("ai-task/issue-") && !ref?.startsWith("codex/issue-")'),
    "task branches must remain ineligible for system-breaker recovery");
  assert.equal(recoveryWorkflow.includes("workflow_run.pull_requests"), false,
    "recovery must not trust optional workflow_run PR associations");
});


test("Recovery observer passes the source HEAD SHA into the capture step environment", () => {
  const source = readFileSync(
    new URL("../.github/workflows/agent-factory-recovery-observer.yml", import.meta.url),
    "utf8",
  ).replace(/\r\n/g, "\n");
  const captureStart = source.indexOf("- name: Capture run metadata, job steps and log availability");
  const captureEnd = source.indexOf("\n      - name:", captureStart + 1);
  assert.ok(captureStart >= 0 && captureEnd > captureStart, "capture step must exist");
  const captureStep = source.slice(captureStart, captureEnd);
  assert.ok(captureStep.includes("SOURCE_HEAD_SHA: " + "$" + "{{ github.event.workflow_run.head_sha }}"),
    "capture step must receive the exact source HEAD SHA independently of the initialization step");
});

test("resolver skips token and GitHub API requirements for events without a PR candidate", () => {
  const parse = resolver.indexOf('const pullRequestNumber = Number(process.env.PULL_REQUEST_NUMBER ?? 0);');
  const noCandidate = resolver.indexOf('No pull-request candidate metadata applies to this event.');
  const tokenGuard = resolver.indexOf('if (!token)', parse);
  const apiClient = resolver.indexOf('createGitHubApiClient({', parse);
  assert.ok(parse >= 0 && noCandidate > parse, "no-PR event must be detected");
  assert.ok(tokenGuard > noCandidate, "token validation must happen only after no-PR early return");
  assert.ok(apiClient > tokenGuard, "GitHub API client must be created only for PR candidates");
  assert.ok(resolver.includes('is_current_head", "true"'));
  assert.ok(resolver.includes('is_task_pr", "false"'));
});

test("resolver failure evidence preserves event and ref from the pre-checkout fallback", () => {
  assert.ok(resolver.includes('readFileSync(resolverDiagnosticsOutput, "utf8")'),
    "resolver diagnostics must read the pre-checkout fallback before replacing it");
  assert.ok(resolver.includes('fallbackContext.event'));
  assert.ok(resolver.includes('fallbackContext.ref'));
  assert.ok(resolver.includes('event: typeof fallbackContext.event'));
  assert.ok(resolver.includes('ref: typeof fallbackContext.ref'));
});

test("resolver fallback evidence is uploaded only when the resolver did not succeed", () => {
  const { start, end } = findJobSection(workflow, "resolve-candidate");
  const upload = findNamedStepBlock(workflow, "Upload redacted resolver failure evidence", start, end);
  assert.ok(upload.includes("if: always() && steps.resolve.outcome != 'success'"),
    "a successful resolver must not publish the pre-checkout failure fallback");
  assert.ok(upload.includes("path: ${{ runner.temp }}/resolver-diagnostics.json"),
    "failure evidence must retain the pre-checkout fallback path");
});


test("main push CI success invokes exact-SHA Factory system-health persistence", () => {
  const breaker = findJobSection(workflow, "circuit-breaker-success");
  const section = workflow.slice(breaker.start, breaker.end);
  const marker = "      - name: Persist exact-main CI success and reset system breaker";
  const start = section.indexOf(marker);
  assert.ok(start >= 0, "main push must have a dedicated durable system-health callback");
  const next = section.indexOf("\n      - name:", start + marker.length);
  const step = section.slice(start, next < 0 ? undefined : next);
  for (const required of [
    "github.event_name == 'push'",
    "github.ref == 'refs/heads/main'",
    "github.actor == github.repository_owner",
    "AGENT_FACTORY_MODE: main-push-system-health-success",
    "SYSTEM_HEALTH_RUN_ID: ${{ github.run_id }}",
    "SYSTEM_HEALTH_RUN_ATTEMPT: ${{ github.run_attempt }}",
    "SYSTEM_HEALTH_HEAD_SHA: ${{ github.sha }}",
    "run: node scripts/agent-factory-v2-controller.mjs",
  ]) assert.ok(step.includes(required), "main-push persistence must include " + required);
});

test("Windows candidate classifier uses a temporary ESM file instead of native -e quoting", () => {
  assert.ok(preflight.includes("$classifierSource = @("),
    "write the classifier as a real temporary ESM source file");
  assert.ok(preflight.includes('pathToFileURL(join(workspace, "lib/agent-factory-policy.mjs")).href'),
    "resolve the shared policy module from the checked-out workspace");
  assert.ok(preflight.includes("[System.IO.File]::WriteAllText($classifierPath, $classifierSource"),
    "write the classifier without PowerShell here-string terminator ambiguity");
  assert.ok(preflight.includes("$classification = & node $classifierPath"),
    "execute the classifier by file path");
  assert.equal(preflight.includes("& node --input-type=module -e"), false,
    "do not pass quoted ESM source through Windows PowerShell native -e parsing");
});


test("PR Acceptance Gate serializes advisory writes per PR instead of globally", () => {
  const header = acceptance.slice(0, acceptance.indexOf("\njobs:"));
  const start = header.indexOf("\nconcurrency:\n");
  assert.ok(start >= 0, "PR Acceptance Gate must declare workflow-level concurrency");
  const block = header.slice(start);
  assert.ok(block.includes("github.event.pull_request.number"),
    "pull_request and pull_request_review events must share the PR-specific queue");
  assert.ok(block.includes("github.event.workflow_run.pull_requests[0].number"),
    "workflow_run events with an associated PR must share that PR-specific queue");
  assert.ok(block.includes("inputs.pr_number"),
    "manual dispatches must serialize against the selected PR");
  assert.ok(block.includes("github.event.workflow_run.head_sha"),
    "workflow_run events without an embedded PR must fall back to their exact source SHA");
  assert.ok(block.includes("cancel-in-progress: false"),
    "new events must not cancel an in-progress advisory update");
  assert.ok(block.includes("queue: max"),
    "events for the same PR must remain queued rather than silently discarded");
  assert.equal(block.includes("group: global-citizen-ai-network-pr-acceptance\\n"),
    false, "unrelated PRs must not contend for one repository-wide acceptance queue");
});
