import {
  collectFPGovernanceReviewEvidence,
  type FPGovernanceGitHubApi,
} from "./governance-review-source.ts";
import { createFPGitHubReviewerPermissionVerifier } from "./github-review-permission.ts";

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
