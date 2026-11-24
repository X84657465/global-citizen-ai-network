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
    runUrl: "https://github.com/X84657465/global-citizen-ai-network/actions/runs/123",
    jobs: G_REQUIRED_CI_JOBS.map((id) => job(id)),
  },
  ...overrides,
});

test("rejects malformed repository path segments in candidate and run identity", () => {
  for (const candidateRepository of [
    "../repo",
    "owner/../repo",
    ".owner/repo",
    "owner/.",
    "owner/..",
    "owner/...",
    "owner/._repo",
    "owner/repo/extra",
    "owner//repo",
  ]) {
    assert.throws(
      () => assessGExactHeadEvidence(bundle({ candidateRepository })),
      TypeError,
    );
  }

  assert.throws(() => assessGExactHeadEvidence(bundle({
    run: { ...bundle().run, repository: "../repo" },
  })), TypeError);
  assert.throws(() => assessGExactHeadEvidence(bundle({
    run: { ...bundle().run, headRepository: "owner/../repo" },
  })), TypeError);
  assert.throws(() => assessGExactHeadEvidence(bundle({
    run: { ...bundle().run, runUrl: "https://github.com/../repo/actions/runs/123" },
  })), TypeError);
});

test("requires all four mainline CI jobs to pass for the exact candidate SHA", () => {
  const result = assessGExactHeadEvidence(bundle());
  assert.equal(result.status, "ready-for-review");
  assert.equal(result.passed, 4);
  assert.equal(result.acceptanceGranted, false);
  assert.equal(result.mergeAuthorized, false);
  assert.equal(result.deploymentAuthorized, false);
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

test("accepts supported repository prefixes in the candidate, run and job URLs", () => {
  for (const candidateRepository of ["owner/-repo", "owner/.github"]) {
    const original = bundle().run;
    const run = {
      ...original,
      repository: candidateRepository,
      headRepository: candidateRepository,
      runUrl: original.runUrl.replace(repo, candidateRepository),
      jobs: original.jobs.map((item) => ({ ...item, jobUrl: item.jobUrl.replace(repo, candidateRepository) })),
    };
    assert.equal(assessGExactHeadEvidence(bundle({ candidateRepository, run })).status, "ready-for-review");
  }
});
