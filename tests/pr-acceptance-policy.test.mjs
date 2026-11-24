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
test("rejects applicable Preflight failure or SKIPPED", () => {
  for (const conclusion of ["failure","skipped"]) {
    const input=valid({preflight:{applicable:true,headSha:sha,status:"completed",conclusion,requiredJobConclusion:conclusion}});
    assert.ok(evaluateAcceptance(input).failures.some(x=>x.code==="PREFLIGHT_NOT_SUCCESS"));
  }
});
test("rejects missing approval, mergeability false/unknown, and Draft", () => {
  assert.ok(evaluateAcceptance(valid({hasCurrentHeadApproval:false})).failures.some(x=>x.code==="APPROVAL_MISSING"));
  assert.ok(evaluateAcceptance(valid({mergeable:false})).failures.some(x=>x.code==="NOT_MERGEABLE"));
  assert.ok(evaluateAcceptance(valid({mergeable:null})).failures.some(x=>x.code==="MERGEABILITY_UNKNOWN"));
  assert.ok(evaluateAcceptance(valid({draft:true})).failures.some(x=>x.code==="DRAFT_NOT_READY"));
});
