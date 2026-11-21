import type {
  FPGovernanceReviewerPermission,
  FPGovernanceReviewCollectionInput,
} from "./governance-review-source.ts";

export interface FPGitHubPermissionApi {
  request(path: string): Promise<unknown>;
}

interface CollaboratorPermissionResponse {
  readonly permission?: unknown;
  readonly role_name?: unknown;
}

/**
 * Normalizes GitHub's legacy base permission and role_name into the internal
 * GCAN permission vocabulary. GitHub maps maintain -> write and triage -> read.
 */
function normalizeGitHubPermission(response: CollaboratorPermissionResponse | null): FPGovernanceReviewerPermission["permission"] {
  const permission = response?.permission;
  const roleName = response?.role_name;

  if (roleName === "maintain" && permission !== "write") {
    throw new TypeError("GitHub returned an inconsistent maintain permission payload.");
  }
  if (roleName === "triage" && permission !== "read") {
    throw new TypeError("GitHub returned an inconsistent triage permission payload.");
  }

  switch (permission) {
    case "admin":
      return "admin";
    case "write":
      return roleName === "maintain" ? "maintain" : "push";
    case "read":
      return roleName === "triage" ? "triage" : "pull";
    case "none":
      return "none";
    default:
      throw new TypeError("GitHub returned an unsupported repository permission.");
  }
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
    const permission = normalizeGitHubPermission(response);

    return Object.freeze({
      permission,
      evidenceRef: `github:${input.repository}:collaborator-permission:${reviewerLogin}:${permission}`,
    });
  };
}
