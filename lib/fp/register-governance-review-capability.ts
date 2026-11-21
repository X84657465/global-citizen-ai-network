import type { FPGovernanceReviewEvidence } from "./governance-assurance.ts";
import {
  collectFPGovernanceReviewEvidence,
  type FPGovernanceGitHubApi,
} from "./governance-review-source.ts";
import { createFPGitHubReviewerPermissionVerifier } from "./github-review-permission.ts";
import { FPHostAdapter } from "./host-adapter.ts";

export interface FPGovernanceReviewCapabilityInput {
  readonly pullRequestNumber: number;
  readonly candidateSha: string;
}

/**
 * Registers P's read-only GitHub review-evidence capability with the existing
 * trusted host adapter. Repository identity and the authenticated API client
 * are captured at registration time; callers cannot select another repository.
 *
 * Host authorization remains mandatory. This capability only reads GitHub
 * review history and collaborator permissions; it cannot approve, merge,
 * execute, deploy, or mutate repository state.
 */
export function registerFPGovernanceReviewCapability(input: {
  readonly host: FPHostAdapter;
  readonly api: FPGovernanceGitHubApi;
  readonly repository: string;
}): void {
  if (!input || !(input.host instanceof FPHostAdapter)) {
    throw new TypeError("An existing FPHostAdapter is required.");
  }

  const verifyReviewerPermission = createFPGitHubReviewerPermissionVerifier({
    api: input.api,
    repository: input.repository,
  });

  input.host.register<FPGovernanceReviewCapabilityInput, readonly FPGovernanceReviewEvidence[]>(
    "P",
    "collect-review-evidence",
    async (request) => {
      if (
        !request ||
        !Number.isSafeInteger(request.pullRequestNumber) ||
        request.pullRequestNumber < 1 ||
        typeof request.candidateSha !== "string" ||
        !/^[a-f0-9]{40}$/i.test(request.candidateSha)
      ) {
        throw new TypeError("A valid pull request number and exact candidate SHA are required.");
      }

      return collectFPGovernanceReviewEvidence({
        api: input.api,
        repository: input.repository,
        pullRequestNumber: request.pullRequestNumber,
        candidateSha: request.candidateSha,
        verifyReviewerPermission,
      });
    },
  );
}
