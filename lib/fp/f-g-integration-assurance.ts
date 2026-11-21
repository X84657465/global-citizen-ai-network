/**
 * F–G integration gate.
 *
 * Binds the security-control evidence (F) to the exact shared CI run
 * evaluated by release assurance (G). This is an advisory evidence check:
 * it never grants acceptance, approval, merge, or deployment authority.
 */
import {
  assessFPSecurityEvidence,
  type FPSecurityEvidenceBundle,
  type FPSecurityAssessment,
} from "./security-assurance.ts";
import {
  assessGExactHeadEvidence,
  type GAcceptanceBundle,
  type GAcceptanceAssessment,
} from "./release-assurance.ts";

export interface FPGIntegrationEvidenceBundle {
  readonly security: FPSecurityEvidenceBundle;
  readonly release: GAcceptanceBundle;
}

export interface FPGIntegrationAssessment {
  readonly schemaVersion: "1";
  readonly candidateRepository: string;
  readonly candidateSha: string;
  readonly pullRequestNumber: number;
  readonly status: "blocked" | "stale" | "incomplete" | "ready-for-review";
  readonly reason: string;
  readonly security: FPSecurityAssessment;
  readonly release: GAcceptanceAssessment;
  readonly sharedRun: {
    readonly runId: number;
    readonly runAttempt: number;
  } | null;
  readonly acceptanceGranted: false;
  readonly mergeAuthorized: false;
  readonly deploymentAuthorized: false;
}

export function assessFPGIntegrationEvidence(
  bundle: FPGIntegrationEvidenceBundle,
): FPGIntegrationAssessment {
  if (!bundle || !bundle.security || !bundle.release) {
    throw new TypeError("F–G security and release evidence bundles are required.");
  }

  const security = assessFPSecurityEvidence(bundle.security);
  const release = assessGExactHeadEvidence(bundle.release);

  const candidateMatches =
    bundle.security.candidateRepository === bundle.release.candidateRepository &&
    bundle.security.candidateSha.toLowerCase() === bundle.release.candidateSha.toLowerCase() &&
    bundle.security.pullRequestNumber === bundle.release.pullRequestNumber;

  const firstSecurityRecord = bundle.security.evidence[0];
  const sharedRun = firstSecurityRecord
    ? {
        runId: firstSecurityRecord.ci.runId,
        runAttempt: firstSecurityRecord.ci.runAttempt,
      }
    : null;

  const runMatches = Boolean(
    sharedRun &&
    sharedRun.runId === release.runId &&
    sharedRun.runAttempt === release.runAttempt &&
    firstSecurityRecord?.ci.headSha.toLowerCase() === release.candidateSha.toLowerCase(),
  );

  const status = security.status === "blocked" || release.status === "blocked"
    ? "blocked"
    : !candidateMatches || (sharedRun !== null && !runMatches)
      ? "stale"
      : security.status !== "ready-for-review" || release.status !== "ready-for-review" || !runMatches
        ? "incomplete"
        : "ready-for-review";

  const reason = status === "blocked"
    ? "F security or G release evidence contains a failed required control/job."
    : status === "stale"
      ? "F and G evidence do not identify the same repository, PR, candidate SHA, workflow run, and attempt."
      : status === "incomplete"
        ? "F and G evidence is incomplete or cannot yet be bound to one exact CI run and attempt."
        : "F security controls and G required jobs pass on the same exact candidate run; independent review is still required.";

  return Object.freeze({
    schemaVersion: "1",
    candidateRepository: bundle.release.candidateRepository,
    candidateSha: bundle.release.candidateSha,
    pullRequestNumber: bundle.release.pullRequestNumber,
    status,
    reason,
    security,
    release,
    sharedRun,
    acceptanceGranted: false,
    mergeAuthorized: false,
    deploymentAuthorized: false,
  });
}
