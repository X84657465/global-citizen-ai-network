import {
  collectFPGovernanceReviewEvidence,
  type FPGovernanceGitHubApi,
} from "./governance-review-source.ts";
import { createFPGitHubReviewerPermissionVerifier } from "./github-review-permission.ts";

/**
 * Trusted-host composition boundary for collecting P review evidence.
 *
 * The caller must inject the platform's existing authenticated GitHub API
 * client. This function composes the current-PR/review-history collector with
 * the repository collaborator-permission verifier so callers cannot
 * accidentally omit reviewer authorization checks.
 *
 * Returned reviews remain descriptive evidence. This function does not
 * authenticate an end user, approve governance, authorize execution, merge,
 * or deploy.
 */
export interface FPGovernanceReviewHostInput {
  readonly api: FPGovernanceGitHubApi;
  readonly repository: string;
  readonly pullRequestNumber: number;
  readonly candidateSha: string;
}

export async function collectFPGovernanceReviewEvidenceFromTrustedHost(
  input: FPGovernanceReviewHostInput,
) {
  if (!input) {
    throw new TypeError("A trusted-host review collection input is required.");
  }

  const verifyReviewerPermission = createFPGitHubReviewerPermissionVerifier({
    api: input.api,
    repository: input.repository,
  });

  return collectFPGovernanceReviewEvidence({
    api: input.api,
    repository: input.repository,
    pullRequestNumber: input.pullRequestNumber,
    candidateSha: input.candidateSha,
    verifyReviewerPermission,
  });
}
