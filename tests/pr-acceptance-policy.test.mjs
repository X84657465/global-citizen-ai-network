import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { evaluateAcceptance, REQUIRED_CI_JOBS } = require("../scripts/pr-acceptance-policy.cjs");
const sha = "a".repeat(40);
function valid(overrides = {}) {
  const runId = 12345, runAttempt = 2;
  return {
    currentHeadSha: sha,
    ci: { workflowId: 987, workflowPath: ".github/workflows/ci.yml", event: "pull_request",
      runId, runAttempt, headSha: sha, status: "completed", conclusion: "success",
      jobs: REQUIRED_CI_JOBS.map(name => ({ name, runId, runAttempt, status: "completed", conclusion: "success" })) },
    preflight: { applicable: false, status: "not_applicable" },
    hasCurrentHeadApproval: true, mergeable: true, draft: false, ...overrides,
  };
}
test("accepts four successful required jobs from one exact CI run and attempt", () => {
  assert.equal(evaluateAcceptance(valid()).accepted, true);
});
test("rejects a required job with SKIPPED", () => {
  const input=valid(); input.ci.jobs[1].conclusion="skipped";
  assert.ok(evaluateAcceptance(input).failures.some(x=>x.code==="REQUIRED_JOB_SKIPPED"));
});
test("rejects old SHA", () => {
  const input=valid(); input.ci.headSha="b".repeat(40);
  assert.ok(evaluateAcceptance(input).failures.some(x=>x.code==="CI_SHA_MISMATCH"));
});
test("rejects pending CI", () => {
  const input=valid(); input.ci.status="in_progress"; input.ci.conclusion=null;
  assert.ok(evaluateAcceptance(input).failures.some(x=>x.code==="CI_NOT_SUCCESS"));
});
test("rejects mixed run IDs", () => {
  const input=valid(); input.ci.jobs[2].runId++;
  assert.ok(evaluateAcceptance(input).failures.some(x=>x.code==="REQUIRED_JOB_NOT_SUCCESS"));
});
test("rejects mixed attempts", () => {
  const input=valid(); input.ci.jobs[1].runAttempt++;
  assert.ok(evaluateAcceptance(input).failures.some(x=>x.code==="REQUIRED_JOB_NOT_SUCCESS"));
});
test("rejects duplicate required jobs", () => {
  const input=valid(); input.ci.jobs.push({...input.ci.jobs[0]});
  assert.ok(evaluateAcceptance(input).failures.some(x=>x.code==="REQUIRED_JOB_DUPLICATE"));
});
test("rejects missing required job", () => {
  const input=valid(); input.ci.jobs.pop();
  assert.ok(evaluateAcceptance(input).failures.some(x=>x.code==="REQUIRED_JOB_MISSING"));
});
test("rejects missing or invalid run identity", () => {
  const input=valid(); input.ci.runId=null;
  assert.ok(evaluateAcceptance(input).failures.some(x=>x.code==="CI_RUN_IDENTITY_INVALID"));
});
test("rejects applicable Preflight failure or SKIPPED from the exact trusted workflow attempt", () => {
  for (const conclusion of ["failure","skipped"]) {
    const input=valid({preflight:{
      applicable:true, workflowId:654, workflowPath:".github/workflows/agent-task-preflight.yml",
      event:"pull_request", runId:456, runAttempt:3, headSha:sha,
      status:"completed", conclusion:"success",
      jobs:[{name:"Linux offline scratch fixture validation",runId:456,runAttempt:3,
        status:"completed",conclusion}]
    }});
    assert.ok(evaluateAcceptance(input).failures.some(x=>x.code==="PREFLIGHT_NOT_SUCCESS"));
  }
});
test("rejects missing approval, mergeability false/unknown, and Draft", () => {
  assert.ok(evaluateAcceptance(valid({hasCurrentHeadApproval:false})).failures.some(x=>x.code==="APPROVAL_MISSING"));
  assert.ok(evaluateAcceptance(valid({mergeable:false})).failures.some(x=>x.code==="NOT_MERGEABLE"));
  assert.ok(evaluateAcceptance(valid({mergeable:null})).failures.some(x=>x.code==="MERGEABILITY_UNKNOWN"));
  assert.ok(evaluateAcceptance(valid({draft:true})).failures.some(x=>x.code==="DRAFT_NOT_READY"));
});


test("merge audit renders the exact CI jobs collection without an undefined variable", async () => {
  const { readFile } = await import("node:fs/promises");
  const source = await readFile(new URL("../.github/workflows/main-merge-audit.yml", import.meta.url), "utf8");
  assert.match(source, /\.\.\.ci\.jobs\.map\(job =>/);
  assert.doesNotMatch(source, /\.\.\.ciJobs\.map\(job =>/);
});

test("manual PR acceptance dispatch always checks out policy from the repository default branch", async () => {
  const { readFile } = await import("node:fs/promises");
  const source = await readFile(new URL("../.github/workflows/pr-acceptance.yml", import.meta.url), "utf8");
  assert.match(source, /ref: \$\{\{ github\.event\.repository\.default_branch \}\}/);
  assert.doesNotMatch(source, /github\.event_name == 'workflow_dispatch' && github\.ref/);
});


test("rejects same-name Preflight check from another workflow without trusted run provenance", () => {
  const input = valid({ preflight: {
    applicable: true, headSha: sha, status: "completed", conclusion: "success",
    requiredJobConclusion: "success"
  }});
  const result = evaluateAcceptance(input);
  assert.ok(result.failures.some(x => x.code === "PREFLIGHT_RUN_IDENTITY_INVALID"));
  assert.ok(result.failures.some(x => x.code === "PREFLIGHT_JOB_MISSING"));
});

test("accepts Preflight only from the exact trusted workflow run and attempt", () => {
  const input = valid({ preflight: {
    applicable: true, workflowId: 654, workflowPath: ".github/workflows/agent-task-preflight.yml",
    event: "pull_request", runId: 456, runAttempt: 3, headSha: sha,
    status: "completed", conclusion: "success",
    jobs: [{ name: "Linux offline scratch fixture validation", runId: 456, runAttempt: 3,
      status: "completed", conclusion: "success" }]
  }});
  assert.equal(evaluateAcceptance(input).accepted, true);
});

test("rejects Preflight job from a different run or attempt", () => {
  const input = valid({ preflight: {
    applicable: true, workflowId: 654, workflowPath: ".github/workflows/agent-task-preflight.yml",
    event: "pull_request", runId: 456, runAttempt: 3, headSha: sha,
    status: "completed", conclusion: "success",
    jobs: [{ name: "Linux offline scratch fixture validation", runId: 456, runAttempt: 2,
      status: "completed", conclusion: "success" }]
  }});
  assert.ok(evaluateAcceptance(input).failures.some(x => x.code === "PREFLIGHT_NOT_SUCCESS"));
});

test("merge audit retains applicable Preflight evidence for final policy evaluation", async () => {
  const { readFile } = await import("node:fs/promises");
  const source = await readFile(new URL("../.github/workflows/main-merge-audit.yml", import.meta.url), "utf8");
  const initialDeclaration = source.indexOf("let preflight = { applicable: false, status: 'not_applicable' };");
  const applicabilityGuard = source.indexOf("if (preflightApplicable) {", initialDeclaration);
  const applicableAssignment = source.indexOf("preflight = {", applicabilityGuard);
  assert.ok(initialDeclaration >= 0, "Preflight must be initialized before the applicability branch");
  assert.ok(applicabilityGuard > initialDeclaration, "Preflight applicability branch must follow initialization");
  assert.ok(applicableAssignment > applicabilityGuard, "Applicable Preflight evidence must be assigned inside the branch");
  assert.equal(source.indexOf("let preflight =", applicabilityGuard), -1,
    "Preflight evidence must not be redeclared inside the applicability branch");
});


test("PR acceptance gate retains applicable Preflight evidence for final policy evaluation", async () => {
  const { readFile } = await import("node:fs/promises");
  const source = await readFile(new URL("../.github/workflows/pr-acceptance.yml", import.meta.url), "utf8");
  const initialDeclaration = source.indexOf("let preflight = { applicable: false, status: 'not_applicable' };");
  const applicabilityGuard = source.indexOf("if (preflightApplicable) {", initialDeclaration);
  const applicableAssignment = source.indexOf("preflight = {", applicabilityGuard);
  assert.ok(initialDeclaration >= 0, "Preflight must be initialized before the applicability branch");
  assert.ok(applicabilityGuard > initialDeclaration, "Preflight applicability branch must follow initialization");
  assert.ok(applicableAssignment > applicabilityGuard, "Applicable Preflight evidence must be assigned inside the branch");
  assert.equal(source.indexOf("let preflight =", applicabilityGuard), -1,
    "Preflight evidence must not be redeclared inside the applicability branch");
});


test("acceptance re-evaluates review submit and dismissal events and guards stale HEAD writes", async () => {
  const { readFile } = await import("node:fs/promises");
  const source = await readFile(new URL("../.github/workflows/pr-acceptance.yml", import.meta.url), "utf8");
  assert.match(source, /pull_request_review:\s*types: \[submitted, edited, dismissed\]/);
  assert.match(source, /effectiveReviewStates = new Set\(\['APPROVED', 'CHANGES_REQUESTED', 'DISMISSED'\]\)/);
  assert.match(source, /currentPrResponse\.data\.head\.sha !== headSha/);
});

test("merge audit uses isolated concurrency and effective review decisions", async () => {
  const { readFile } = await import("node:fs/promises");
  const source = await readFile(new URL("../.github/workflows/main-merge-audit.yml", import.meta.url), "utf8");
  assert.match(source, /group: merge-audit-pr-\$\{\{ github\.event\.pull_request\.number/);
  assert.match(source, /effectiveReviewStates = new Set\(\['APPROVED', 'CHANGES_REQUESTED', 'DISMISSED'\]\)/);
});


test("merge audit uses merged_at as a strict cutoff for historical CI and Preflight attempts", async () => {
  const { readFile } = await import("node:fs/promises");
  const source = await readFile(new URL("../.github/workflows/main-merge-audit.yml", import.meta.url), "utf8");
  assert.match(source, /Date\.parse\(pr\.merged_at \|\| ''\)/);
  assert.match(source, /actions\/runs\/\{run_id\}\/attempts\/\{attempt_number\}/);
  assert.match(source, /attemptCompletedAt <= evidenceCutoff/);
  assert.match(source, /completedAt <= evidenceCutoff/);
  assert.match(source, /requiredJobNames: \['Linux offline scratch fixture validation'\]/);
  assert.match(source, /submittedAt > evidenceCutoff/);
});

test("merge audit does not select a post-merge retry over an earlier eligible attempt", async () => {
  const { readFile } = await import("node:fs/promises");
  const source = await readFile(new URL("../.github/workflows/main-merge-audit.yml", import.meta.url), "utf8");
  assert.match(source, /for \(let attemptNumber = 1; attemptNumber <= run\.run_attempt; attemptNumber \+= 1\)/);
  assert.match(source, /eligible\.sort\(\(a, b\) => b\.completedAt - a\.completedAt\)/);
  assert.match(source, /if \(eligible\.length\) return eligible\[0\]\.summary/);
  assert.match(source, /status: 'not_completed_by_merge'/);
});

test("merge audit fails closed when timestamps are missing or reviews were submitted after merge", async () => {
  const { readFile } = await import("node:fs/promises");
  const source = await readFile(new URL("../.github/workflows/main-merge-audit.yml", import.meta.url), "utf8");
  assert.match(source, /!Number\.isFinite\(mergedAt\)/);
  assert.match(source, /!Number\.isFinite\(attemptStartedAt\)/);
  assert.match(source, /!Number\.isFinite\(attemptCompletedAt\)/);
  assert.match(source, /!Number\.isFinite\(completedAt\)/);
  assert.match(source, /!Number\.isFinite\(submittedAt\)/);
  assert.match(source, /DISMISSED reviews are conservatively treated as non-approvals/);
});
