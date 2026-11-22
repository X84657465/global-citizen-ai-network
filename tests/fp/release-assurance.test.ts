import assert from "node:assert/strict";
import test from "node:test";
import {
  assessGExactHeadEvidence,
  G_REQUIRED_CI_JOBS,
  type GAcceptanceBundle,
  type GJobEvidence,
} from "../../lib/fp/release-assurance.ts";

const sha = "a".repeat(40);
const repo = "X84657465/global-citizen-ai-network";
const job = (jobId: string, overrides: Partial<GJobEvidence> = {}): GJobEvidence => ({
  jobId,
  runAttempt: 1,
  status: "completed",
  conclusion: "success",
  jobUrl: "https://github.com/X84657465/global-citizen-ai-network/actions/runs/123/job/456",
  ...overrides,
});
const bundle = (overrides: Partial<GAcceptanceBundle> = {}): GAcceptanceBundle => ({
  candidateRepository: repo,
  candidateSha: sha,
  pullRequestNumber: 216,
  run: {
    runId: 123,
    runAttempt: 1,
    pullRequestNumber: 216,
    repository: repo,
    headRepository: repo,
    event: "pull_request",
    baseRef: "main",
    headSha: sha,
    workflowPath: ".github/workflows/ci.yml",
    status: "completed",
    conclusion: "success",
    runUrl: "https://github.com/X84657465/global-citizen-ai-network/actions/runs/123/attempts/1",
    jobs: G_REQUIRED_CI_JOBS.map((id) => job(id)),
  },
  ...overrides,
});

test("requires all four mainline CI jobs to pass for the exact candidate SHA", () => {
  const result = assessGExactHeadEvidence(bundle());
  assert.equal(result.status, "ready-for-review");
  assert.equal(result.passed, 4);
  assert.equal(result.acceptanceGranted, false);
  assert.equal(result.mergeAuthorized, false);
  assert.equal(result.deploymentAuthorized, false);
});

test("rejects a required job record from a different workflow run attempt", () => {
  const mixedAttemptJobs = G_REQUIRED_CI_JOBS.map((id) =>
    job(id, id === "quality" ? { runAttempt: 2 } : {}),
  );
  assert.throws(() => assessGExactHeadEvidence(bundle({
    run: { ...bundle().run, jobs: mixedAttemptJobs },
  })), TypeError);
});

test("does not accept a green summary when database or build job is missing", () => {
  const result = assessGExactHeadEvidence(bundle({
    run: { ...bundle().run, jobs: [job("resolve-candidate"), job("quality")] },
  }));
  assert.equal(result.status, "incomplete");
  assert.equal(result.missing, 2);
});

test("blocks on failed, cancelled, or skipped required jobs", () => {
  for (const conclusion of ["failure", "cancelled", "skipped"] as const) {
    const result = assessGExactHeadEvidence(bundle({
      run: {
        ...bundle().run,
        jobs: G_REQUIRED_CI_JOBS.map((id) =>
          job(id, id === "database" ? { conclusion } : {}),
        ),
      },
    }));
    assert.equal(result.status, "blocked");
    assert.equal(result.failed, 1);
  }
});

test("rejects evidence from a parent commit or another repository", () => {
  const staleSha = assessGExactHeadEvidence(bundle({
    run: { ...bundle().run, headSha: "b".repeat(40) },
  }));
  assert.equal(staleSha.status, "stale");
  const foreignRepo = assessGExactHeadEvidence(bundle({
    run: { ...bundle().run, headRepository: "attacker/fork" },
  }));
  assert.equal(foreignRepo.status, "stale");
});

test("binds run and job links to the exact repository, run, and pull request", () => {
  const wrongPullRequest = assessGExactHeadEvidence(bundle({
    run: { ...bundle().run, pullRequestNumber: 217 },
  }));
  assert.equal(wrongPullRequest.status, "stale");
  assert.throws(() => assessGExactHeadEvidence(bundle({
    run: {
      ...bundle().run,
      jobs: G_REQUIRED_CI_JOBS.map((id) =>
        job(id, { jobUrl: "https://github.com/attacker/fork/actions/runs/999/job/456" }),
      ),
    },
  })), TypeError);
});

test("requires the trusted mainline workflow and pull-request event", () => {
  for (const overrides of [
    { event: "push" },
    { baseRef: "release" },
    { workflowPath: ".github/workflows/other.yml" },
  ]) {
    const result = assessGExactHeadEvidence(bundle({
      run: { ...bundle().run, ...overrides },
    }));
    assert.equal(result.status, "stale");
  }
});

test("treats queued or in-progress runs and jobs as incomplete", () => {
  const queuedRun = assessGExactHeadEvidence(bundle({
    run: { ...bundle().run, status: "in_progress", conclusion: null },
  }));
  assert.equal(queuedRun.status, "incomplete");
  const queuedJob = assessGExactHeadEvidence(bundle({
    run: {
      ...bundle().run,
      jobs: G_REQUIRED_CI_JOBS.map((id) =>
        job(id, id === "quality" ? { status: "queued", conclusion: null } : {}),
      ),
    },
  }));
  assert.equal(queuedJob.status, "incomplete");
  assert.equal(queuedJob.pending, 1);
});

test("requires the run URL to identify the exact Actions attempt", () => {
  for (const runUrl of [
    "https://github.com/X84657465/global-citizen-ai-network/actions/runs/123",
    "https://github.com/X84657465/global-citizen-ai-network/actions/runs/123/attempts/2",
  ]) {
    assert.throws(() => assessGExactHeadEvidence(bundle({
      run: { ...bundle().run, runUrl },
    })), /exact repository, run ID, and attempt/);
  }
});

test("rejects duplicate job records and malformed run evidence", () => {
  assert.throws(() => assessGExactHeadEvidence(bundle({
    run: { ...bundle().run, jobs: [job("quality"), job("quality")] },
  })), TypeError);
  assert.throws(() => assessGExactHeadEvidence(bundle({
    run: { ...bundle().run, runUrl: "https://example.com/fake-success" },
  })), TypeError);
  assert.throws(() => assessGExactHeadEvidence(bundle({
    candidateSha: "bad",
  })), TypeError);
});


test("rejects hostile G job arrays and accessor-backed job records", () => {
  const validJobs = G_REQUIRED_CI_JOBS.map((id) => job(id));
  const customIterator = [...validJobs] as GJobEvidence[] & { [Symbol.iterator]?: () => Iterator<GJobEvidence> };
  Object.defineProperty(customIterator, Symbol.iterator, {
    value: function* () { yield validJobs[0]; },
  });
  assert.throws(() => assessGExactHeadEvidence(bundle({
    run: { ...bundle().run, jobs: customIterator },
  })), /bounded dense plain array/);

  const sparse = new Array<GJobEvidence>(1);
  assert.throws(() => assessGExactHeadEvidence(bundle({
    run: { ...bundle().run, jobs: sparse },
  })), /bounded dense plain array/);

  const accessorSlot = [...validJobs];
  Object.defineProperty(accessorSlot, "0", { enumerable: true, configurable: true, get: () => validJobs[0] });
  assert.throws(() => assessGExactHeadEvidence(bundle({
    run: { ...bundle().run, jobs: accessorSlot },
  })), /bounded dense plain array/);

  let getterCalled = false;
  const getterJob = { ...validJobs[0] };
  Object.defineProperty(getterJob, "jobId", {
    enumerable: true,
    configurable: true,
    get() { getterCalled = true; return "resolve-candidate"; },
  });
  assert.throws(() => assessGExactHeadEvidence(bundle({
    run: { ...bundle().run, jobs: [getterJob as GJobEvidence, ...validJobs.slice(1)] },
  })), /plain own-data fields/);
  assert.equal(getterCalled, false);
});

test("uses descriptor snapshots for G bundle, run, and job Proxy records", () => {
  let getTrapCalls = 0;
  const base = bundle();
  const jobs = base.run.jobs.map((item) => new Proxy(item, {
    get(target, property, receiver) {
      getTrapCalls += 1;
      if (property === "runAttempt") return 2;
      return Reflect.get(target, property, receiver);
    },
  }));
  const run = new Proxy({ ...base.run, jobs }, {
    get(target, property, receiver) {
      getTrapCalls += 1;
      if (property === "runAttempt") return 2;
      return Reflect.get(target, property, receiver);
    },
  });
  const proxiedBundle = new Proxy({ ...base, run }, {
    get(target, property, receiver) {
      getTrapCalls += 1;
      if (property === "candidateSha") return "b".repeat(40);
      return Reflect.get(target, property, receiver);
    },
  });

  const result = assessGExactHeadEvidence(proxiedBundle);
  assert.equal(result.status, "ready-for-review");
  assert.equal(result.runAttempt, 1);
  assert.equal(getTrapCalls, 0);
});

 
test("rejects job-array properties outside the ECMAScript array-index range", () => {
  const extraProperty = [] as GJobEvidence[];
  Object.defineProperty(extraProperty, "4294967295", {
    configurable: true,
    enumerable: true,
    value: job("quality"),
  });
  assert.throws(
    () => assessGExactHeadEvidence(bundle({
      run: { ...bundle().run, jobs: extraProperty },
    })),
    /bounded dense plain array/,
  );
});


test("rejects Proxy-reported canonical job-array indices outside the declared length", () => {
  const emptyWithReportedIndex = new Proxy([] as GJobEvidence[], {
    ownKeys: () => ["1", "length"],
    getOwnPropertyDescriptor: (target, key) => key === "1"
      ? { configurable: true, enumerable: true, writable: true, value: job("quality") }
      : Reflect.getOwnPropertyDescriptor(target, key),
  });
  assert.equal(Object.getOwnPropertyDescriptor(emptyWithReportedIndex, "length")?.value, 0);
  assert.throws(
    () => assessGExactHeadEvidence(bundle({
      run: { ...bundle().run, jobs: emptyWithReportedIndex },
    })),
    /bounded dense plain array/,
  );
});
