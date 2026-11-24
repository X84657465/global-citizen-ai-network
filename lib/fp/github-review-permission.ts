import {
  GITHUB_REVIEWER_LOGIN,
  type FPGovernanceRepositoryPermission,
  type FPGovernanceReviewerPermission,
  type FPGovernanceReviewCollectionInput,
} from "./governance-review-source.ts";
import { isSafeGitHubRepositoryName } from "../github-repository-name.mjs";

export interface FPGitHubPermissionApi {
  request(path: string): Promise<unknown>;
}

interface CollaboratorPermissionResponse {
  readonly permission?: unknown;
}

/**
 * Creates the trusted-host callback used by the P review collector.
 *
 * The caller must provide the existing authenticated GitHub API client.
 * This adapter only reads repository collaborator permissions; it does not
 * authenticate a human session, grant approval, or authorize merge/deploy.
 */
export function createFPGitHubReviewerPermissionVerifier(input: {
  readonly api: FPGitHubPermissionApi;
  readonly repository: string;
}): NonNullable<FPGovernanceReviewCollectionInput["verifyReviewerPermission"]> {
  if (
    !input ||
    !input.api ||
    typeof input.api.request !== "function" ||
    !isSafeGitHubRepositoryName(input.repository)
  ) {
    throw new TypeError("A valid repository and authenticated GitHub API client are required.");
  }

  return async (reviewerLogin: string): Promise<FPGovernanceReviewerPermission> => {
    if (
      typeof reviewerLogin !== "string" ||
      !GITHUB_REVIEWER_LOGIN.test(reviewerLogin)
    ) {
      throw new TypeError("A valid GitHub reviewer login is required.");
    }

    const response = await input.api.request(
      `/repos/${input.repository}/collaborators/${encodeURIComponent(reviewerLogin)}/permission`,
    ) as CollaboratorPermissionResponse | null;

    const permission = response?.permission;
    const allowed: readonly FPGovernanceRepositoryPermission[] = [
      "admin",
      "write",
      "read",
      "none",
    ];
    if (typeof permission !== "string" || !allowed.includes(permission as FPGovernanceRepositoryPermission)) {
      throw new TypeError("GitHub returned an unsupported repository permission.");
    }

    // Keep the bot identity distinct while using only safe reference characters.
    const reviewerRef = reviewerLogin.replace(/\[bot\]$/, ":bot");
    return Object.freeze({
      permission: permission as FPGovernanceRepositoryPermission,
      evidenceRef: `github:${input.repository}:collaborator-permission:${reviewerRef}:${permission}`,
    });
  };
}
