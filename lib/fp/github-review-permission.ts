import type {
  FPGovernanceRepositoryPermission,
  FPGovernanceReviewerPermission,
  FPGovernanceReviewCollectionInput,
} from "./governance-review-source.ts";

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
    typeof input.repository !== "string" ||
    !/^[A-Za-z0-9][A-Za-z0-9_.-]*\/[A-Za-z0-9][A-Za-z0-9_.-]*$/.test(input.repository)
  ) {
    throw new TypeError("A valid repository and authenticated GitHub API client are required.");
  }

  return async (reviewerLogin: string): Promise<FPGovernanceReviewerPermission> => {
    if (
      typeof reviewerLogin !== "string" ||
      !/^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/.test(reviewerLogin)
    ) {
      throw new TypeError("A valid GitHub reviewer login is required.");
    }

    const response = await input.api.request(
      `/repos/${input.repository}/collaborators/${encodeURIComponent(reviewerLogin)}/permission`,
    ) as CollaboratorPermissionResponse | null;

    const permission = response?.permission;
    const allowed: readonly FPGovernanceRepositoryPermission[] = [
      "admin",
      "maintain",
      "push",
      "triage",
      "pull",
      "none",
    ];
    if (typeof permission !== "string" || !allowed.includes(permission as FPGovernanceRepositoryPermission)) {
      throw new TypeError("GitHub returned an unsupported repository permission.");
    }

    return Object.freeze({
      permission: permission as FPGovernanceRepositoryPermission,
      evidenceRef: `github:${input.repository}:collaborator-permission:${reviewerLogin}:${permission}`,
    });
  };
}
