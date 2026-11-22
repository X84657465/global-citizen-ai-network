import assert from "node:assert/strict";
import test from "node:test";
import {
  assessFPGIntegrationEvidence,
  type FPGIntegrationEvidenceBundle,
} from "../../lib/fp/f-g-integration-assurance.ts";
import {
  FP_SECURITY_CONTROLS,
  type FPSecurityEvidence,
  type FPSecurityCIEvidence,
} from "../../lib/fp/security-assurance.ts";
import { G_REQUIRED_CI_JOBS } from "../../lib/fp/release-assurance.ts";

const repository = "X84657465/global-citizen-ai-network";
const sha = "a".repeat(40);
const runId = 123;
const runAttempt = 1;
const runBaseUrl = `https://github.com/${repository}/actions/runs/${runId}`;
const runUrl = `${runBaseUrl}/attempts/${runAttempt}`;

const securityCI = (
  jobKey: "quality" | "database",
  overrides: Partial<FPSecurityCIEvidence> = {},
): FPSecurityCIEvidence => ({
  repository,
  pullRequestNumber: 226,
  headSha: sha,
  event: "pull_request",
  baseRef: "main",
  workflowPath: ".github/workflows/ci.yml",
  runId,
  runAttempt,
  jobRunAttempt: runAttempt,
  runUrl,
  jobKey,
  jobConclusion: "success",
  jobUrl: `${runBaseUrl}/job/${jobKey === "database" ? 456 : 789}`,
  ...overrides,
});

const makeSecurityEvidence = (
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
    ci: securityCI(control.requiredJob),
    ...overrides,
  };
};

const bundle = (overrides: {
  securityEvidence?: readonly FPSecurityEvidence[];
  releaseRunId?: number;
  releaseAttempt?: number;
  releaseConclusion?: "success" | "failure" | "cancelled" | "skipped" | "timed_out" | "action_required" | "neutral" | null;
  failedJob?: string;
} = {}): FPGIntegrationEvidenceBundle => {
  const releaseRunId = overrides.releaseRunId ?? runId;
  const releaseAttempt = overrides.releaseAttempt ?? runAttempt;
  const releaseRunBaseUrl = `https://github.com/${repository}/actions/runs/${releaseRunId}`;
  const releaseRunUrl = `${releaseRunBaseUrl}/attempts/${releaseAttempt}`;
  return {
    security: {
      candidateRepository: repository,
      pullRequestNumber: 226,
      candidateSha: sha,
      evidence: overrides.securityEvidence ?? FP_SECURITY_CONTROLS.map((control) => makeSecurityEvidence(control.id)),
    },
    release: {
      candidateRepository: repository,
      candidateSha: sha,
      pullRequestNumber: 226,
      run: {
        runId: releaseRunId,
        runAttempt: releaseAttempt,
        pullRequestNumber: 226,
        repository,
        headRepository: repository,
        event: "pull_request",
        baseRef: "main",
        headSha: sha,
        workflowPath: ".github/workflows/ci.yml",
        status: "completed",
        conclusion: overrides.releaseConclusion ?? "success",
        runUrl: releaseRunUrl,
        jobs: G_REQUIRED_CI_JOBS.map((jobId) => ({
          jobId,
          status: "completed" as const,
          conclusion: jobId === overrides.failedJob ? "failure" as const : "success" as const,
          jobUrl: `${releaseRunBaseUrl}/job/456`,
        })),
      },
    },
  };
};

test("requires F controls and G jobs to share the same exact run and attempt", () => {
  const result = assessFPGIntegrationEvidence(bundle());
  assert.equal(result.status, "ready-for-review");
  assert.equal(result.sharedRun?.runId, runId);
  assert.equal(result.sharedRun?.runAttempt, runAttempt);
  assert.equal(result.acceptanceGranted, false);
  assert.equal(result.mergeAuthorized, false);
  assert.equal(result.deploymentAuthorized, false);
});

test("marks evidence stale when F and G use different run IDs", () => {
  const result = assessFPGIntegrationEvidence(bundle({ releaseRunId: 124 }));
  assert.equal(result.status, "stale");
  assert.match(result.reason, /same repository, PR, candidate SHA, workflow run, and attempt/);
});

test("marks evidence stale when F and G use different run attempts", () => {
  const result = assessFPGIntegrationEvidence(bundle({ releaseAttempt: 2 }));
  assert.equal(result.status, "stale");
});

test("does not infer a shared run when F evidence is absent", () => {
  const result = assessFPGIntegrationEvidence(bundle({ securityEvidence: [] }));
  assert.equal(result.status, "incomplete");
  assert.equal(result.sharedRun, null);
});

test("blocks the integrated result when a required G job fails", () => {
  const result = assessFPGIntegrationEvidence(bundle({ failedJob: "database" }));
  assert.equal(result.status, "blocked");
  assert.equal(result.acceptanceGranted, false);
});

test("blocks the integrated result when a registered F control fails", () => {
  const evidence = FP_SECURITY_CONTROLS.map((control) =>
    makeSecurityEvidence(control.id, control.id === "member-isolation" ? { status: "failed" } : {}),
  );
  const result = assessFPGIntegrationEvidence(bundle({ securityEvidence: evidence }));
  assert.equal(result.status, "blocked");
});
