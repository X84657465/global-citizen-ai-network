import assert from "node:assert/strict";
import test from "node:test";
import {
  assessFPSecurityEvidence,
  FP_SECURITY_CONTROLS,
  type FPSecurityEvidence,
  type FPSecurityCIEvidence,
} from "../../lib/fp/security-assurance.ts";

const sha = "a".repeat(40);
const repository = "X84657465/global-citizen-ai-network";
const pullRequestNumber = 216;

const ci = (jobKey: "quality" | "database", overrides: Partial<FPSecurityCIEvidence> = {}): FPSecurityCIEvidence => ({
  repository,
  pullRequestNumber,
  headSha: sha,
  event: "pull_request",
  baseRef: "main",
  workflowPath: ".github/workflows/ci.yml",
  runId: 123,
  runAttempt: 1,
  runUrl: "https://github.com/X84657465/global-citizen-ai-network/actions/runs/123",
  jobKey,
  jobConclusion: "success",
  jobUrl: `https://github.com/X84657465/global-citizen-ai-network/actions/runs/123/job/${jobKey === "database" ? 456 : 789}`,
  ...overrides,
});

const evidence = (
  controlId: FPSecurityEvidence["controlId"],
  overrides: Partial<FPSecurityEvidence> = {},
): FPSecurityEvidence => {
  const control = FP_SECURITY_CONTROLS.find((item) => item.id === controlId)!;
  return {
    controlId,
    testedSha: sha,
    status: "passed",
    evidenceRef: control.evidencePath,
    executedAt: "2026-11-21T12:00:00.000Z",
    ci: ci(control.requiredJob),
    ...overrides,
  };
};

const bundle = (overrides: {
  candidateRepository?: string;
  pullRequestNumber?: number;
  candidateSha?: string;
  evidence?: readonly FPSecurityEvidence[];
} = {}) => ({
  candidateRepository: repository,
  pullRequestNumber,
  candidateSha: sha,
  evidence: FP_SECURITY_CONTROLS.map((control) => evidence(control.id)),
  ...overrides,
});

test("rejects malformed repository path segments before assessing F evidence", () => {
  for (const candidateRepository of [
    "../repo",
    "owner/../repo",
    ".owner/repo",
    "owner/.repo",
    "owner/repo/extra",
    "owner//repo",
  ]) {
    assert.throws(
      () => assessFPSecurityEvidence(bundle({ candidateRepository })),
      TypeError,
    );
  }
});

test("requires all F controls on the exact candidate SHA and trusted CI run", () => {
  const result = assessFPSecurityEvidence(bundle());
  assert.equal(result.status, "ready-for-review");
  assert.equal(result.passed, FP_SECURITY_CONTROLS.length);
  assert.equal(result.acceptanceGranted, false);
  assert.equal(result.candidateRepository, repository);
  assert.equal(result.pullRequestNumber, pullRequestNumber);
});

test("maps RLS and database privilege controls to database CI; route and header controls to quality CI", () => {
  const result = assessFPSecurityEvidence(bundle());
  assert.equal(result.controls.find((item) => item.controlId === "member-isolation")?.status, "passed");
  assert.equal(result.controls.find((item) => item.controlId === "database-privileges")?.status, "passed");
  assert.equal(result.controls.find((item) => item.controlId === "api-role-inheritance")?.status, "passed");
  assert.equal(result.controls.find((item) => item.controlId === "security-headers")?.status, "passed");
  assert.equal(result.controls.find((item) => item.controlId === "route-authorization")?.status, "passed");
});

test("marks missing or unexecuted controls incomplete", () => {
  const result = assessFPSecurityEvidence(bundle({
    evidence: [
      evidence("member-isolation", { status: "not-run" }),
      evidence("database-privileges"),
      evidence("api-role-inheritance"),
      evidence("security-headers"),
    ],
  }));
  assert.equal(result.status, "incomplete");
  assert.equal(result.missing, 1);
  assert.equal(result.notRun, 1);
});

test("blocks a failed security control or a non-success CI job", () => {
  const failedControl = assessFPSecurityEvidence(bundle({
    evidence: FP_SECURITY_CONTROLS.map((control) =>
      evidence(control.id, control.id === "member-isolation" ? { status: "failed" } : {}),
    ),
  }));
  assert.equal(failedControl.status, "blocked");
  assert.equal(failedControl.failed, 1);

  const failedJob = assessFPSecurityEvidence(bundle({
    evidence: FP_SECURITY_CONTROLS.map((control) =>
      evidence(control.id, control.id === "database-privileges"
        ? { ci: ci("database", { jobConclusion: "skipped" }) }
        : {}),
    ),
  }));
  assert.equal(failedJob.status, "blocked");
  assert.equal(failedJob.failed, 1);
});

test("rejects evidence from a different candidate SHA as stale", () => {
  const result = assessFPSecurityEvidence(bundle({
    candidateSha: "b".repeat(40),
  }));
  assert.equal(result.status, "stale");
  assert.equal(result.stale, FP_SECURITY_CONTROLS.length);
});

test("rejects a CI run from another PR, repository, workflow, base, or event", () => {
  for (const overrides of [
    { pullRequestNumber: 217 },
    { repository: "attacker/fork" },
    { workflowPath: ".github/workflows/other.yml" },
    { baseRef: "release" },
    { event: "push" },
  ]) {
    assert.throws(() => assessFPSecurityEvidence(bundle({
      evidence: FP_SECURITY_CONTROLS.map((control) =>
        evidence(control.id, { ci: ci(control.requiredJob, overrides as unknown as Partial<FPSecurityCIEvidence>) }),
      ),
    })), TypeError);
  }
});

test("rejects controls assigned to the wrong job and evidence mixed across CI runs", () => {
  assert.throws(() => assessFPSecurityEvidence(bundle({
    evidence: FP_SECURITY_CONTROLS.map((control) =>
      evidence(control.id, control.id === "member-isolation"
        ? { ci: ci("quality") }
        : {}),
    ),
  })), TypeError);

  assert.throws(() => assessFPSecurityEvidence(bundle({
    evidence: FP_SECURITY_CONTROLS.map((control) =>
      evidence(control.id, control.id === "route-authorization"
        ? { ci: ci("quality", {
            runId: 124,
            runUrl: "https://github.com/X84657465/global-citizen-ai-network/actions/runs/124",
            jobUrl: "https://github.com/X84657465/global-citizen-ai-network/actions/runs/124/job/789",
          }) }
        : {}),
    ),
  })), TypeError);
});

test("rejects forged run/job URLs, duplicate controls, invalid SHAs, and unregistered paths", () => {
  assert.throws(() => assessFPSecurityEvidence(bundle({ candidateSha: "bad" })), TypeError);
  assert.throws(() => assessFPSecurityEvidence(bundle({
    evidence: [evidence("member-isolation"), evidence("member-isolation")],
  })), TypeError);
  assert.throws(() => assessFPSecurityEvidence(bundle({
    evidence: FP_SECURITY_CONTROLS.map((control) =>
      evidence(control.id, control.id === "member-isolation"
        ? { ci: ci("database", { jobUrl: "https://attacker.invalid/job/1" }) }
        : {}),
    ),
  })), TypeError);
  assert.throws(() => assessFPSecurityEvidence(bundle({
    evidence: [evidence("member-isolation", { evidenceRef: "tests/other-unrelated.test.ts" })],
  })), TypeError);
});

test("accepts a leading repository hyphen in evidence bound to the candidate CI run", () => {
  const candidateRepository = "owner/-repo";
  const records = bundle().evidence.map((item) => ({
    ...item,
    ci: {
      ...item.ci,
      repository: candidateRepository,
      runUrl: item.ci.runUrl.replace(repository, candidateRepository),
      jobUrl: item.ci.jobUrl.replace(repository, candidateRepository),
    },
  }));
  assert.equal(assessFPSecurityEvidence(bundle({ candidateRepository, evidence: records })).status, "ready-for-review");
});
