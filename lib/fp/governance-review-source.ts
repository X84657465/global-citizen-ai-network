import type { FPGovernanceReviewEvidence } from "./governance-assurance.ts";

export interface FPGovernanceGitHubApi {
  request(path: string): Promise<unknown>;
}
export type FPGovernanceRepositoryPermission = "admin" | "maintain" | "push" | "triage" | "pull" | "none";
export interface FPGovernanceReviewerPermission {
  readonly permission: FPGovernanceRepositoryPermission;
  readonly evidenceRef: string;
}
export interface FPGovernanceReviewCollectionInput {
  readonly api: FPGovernanceGitHubApi;
  readonly repository: string;
  readonly pullRequestNumber: number;
  readonly candidateSha: string;
  /** The existing trusted host must independently verify repository permissions. */
  readonly verifyReviewerPermission: (reviewerLogin: string) => Promise<FPGovernanceReviewerPermission>;
}
export type FPGovernanceReviewCollectionErrorCode =
  | "INVALID_INPUT" | "CANDIDATE_NOT_CURRENT" | "INCOMPLETE_REVIEW_HISTORY" | "INVALID_REVIEW_DATA";
export class FPGovernanceReviewCollectionError extends Error {
  readonly code: FPGovernanceReviewCollectionErrorCode;

  constructor(code: FPGovernanceReviewCollectionErrorCode, message: string) {
    super(message);
    this.name = "FPGovernanceReviewCollectionError";
    this.code = code;
  }
}

const SHA = /^[a-f0-9]{40}$/i;
const REPOSITORY = /^[A-Za-z0-9][A-Za-z0-9_.-]*\/[A-Za-z0-9][A-Za-z0-9_.-]*$/;
const LOGIN = /^(?:[A-Za-z0-9][A-Za-z0-9-]{0,38}|[A-Za-z0-9][A-Za-z0-9-]{0,33}\[bot\])$/;
const UTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/;
const PAGE_SIZE = 100;
const MAX_PAGES = 10;
const VERIFIED = new Set<FPGovernanceRepositoryPermission>(["admin", "maintain", "push"]);

function safeReference(value: unknown): value is string {
  return typeof value === "string" &&
    /^[A-Za-z0-9][A-Za-z0-9._:/#-]{0,255}$/.test(value) &&
    !value.startsWith("/") && !value.includes("..") && !value.includes("//");
}
function invalid(message: string): never {
  throw new FPGovernanceReviewCollectionError("INVALID_REVIEW_DATA", message);
}

interface PullRecord {
  readonly number?: number;
  readonly state?: string;
  readonly base?: { readonly ref?: string; readonly repo?: { readonly full_name?: string } };
  readonly head?: { readonly sha?: string; readonly repo?: { readonly full_name?: string } | null };
}
interface ReviewRecord {
  readonly id?: number;
  readonly commit_id?: string | null;
  readonly state?: string;
  readonly submitted_at?: string | null;
  readonly user?: { readonly login?: string } | null;
}

/**
 * Collects the complete submitted-review history for the current open PR head.
 * Permission verification is delegated to the trusted host; lookup failures
 * remain unverified. This function cannot authenticate reviewers or authorize
 * governance, merge, execution or deployment.
 */
export async function collectFPGovernanceReviewEvidence(
  input: FPGovernanceReviewCollectionInput,
): Promise<readonly FPGovernanceReviewEvidence[]> {
  if (!input || !input.api || typeof input.api.request !== "function" ||
      !REPOSITORY.test(input.repository) || !Number.isSafeInteger(input.pullRequestNumber) ||
      input.pullRequestNumber < 1 || !SHA.test(input.candidateSha) ||
      typeof input.verifyReviewerPermission !== "function") {
    throw new FPGovernanceReviewCollectionError("INVALID_INPUT", "A valid repository, PR, candidate SHA, GitHub API client and trusted-host permission verifier are required.");
  }

  const pull = await input.api.request(
    `/repos/${input.repository}/pulls/${input.pullRequestNumber}`,
  ) as PullRecord;
  if (pull?.number !== input.pullRequestNumber || pull.state !== "open" ||
      pull.base?.ref !== "main" || pull.base?.repo?.full_name !== input.repository ||
      pull.head?.repo?.full_name !== input.repository ||
      typeof pull.head?.sha !== "string" ||
      pull.head.sha.toLowerCase() !== input.candidateSha.toLowerCase()) {
    throw new FPGovernanceReviewCollectionError("CANDIDATE_NOT_CURRENT", "Governance reviews require the current open same-repository PR head targeting main.");
  }

  const raw: ReviewRecord[] = [];
  const ids = new Set<number>();
  let complete = false;
  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const response = await input.api.request(
      `/repos/${input.repository}/pulls/${input.pullRequestNumber}/reviews?per_page=${PAGE_SIZE}&page=${page}`,
    );
    if (!Array.isArray(response)) {
      throw new FPGovernanceReviewCollectionError("INCOMPLETE_REVIEW_HISTORY", "GitHub review history response was not an array.");
    }
    const pageRecords = response as ReviewRecord[];
    for (const item of pageRecords) {
      if (!item || typeof item.id !== "number" || !Number.isSafeInteger(item.id) ||
          item.id < 1 || ids.has(item.id)) {
        invalid("GitHub review history contains an invalid or duplicate review ID.");
      }
      ids.add(item.id);
      raw.push(item);
    }
    if (pageRecords.length < PAGE_SIZE) {
      complete = true;
      break;
    }
  }
  if (!complete) {
    throw new FPGovernanceReviewCollectionError("INCOMPLETE_REVIEW_HISTORY", "Review history exceeded the safe pagination limit; refusing to assess partial history.");
  }

  const evidence: FPGovernanceReviewEvidence[] = [];
  const permissions = new Map<string, FPGovernanceReviewerPermission | null>();
  for (const item of raw) {
    if (item.state === "PENDING" || item.state === "DISMISSED") continue;
    const decision = item.state === "APPROVED" ? "approved"
      : item.state === "CHANGES_REQUESTED" ? "changes-requested"
        : item.state === "COMMENTED" ? "commented" : undefined;
    if (!decision) invalid("GitHub returned an unsupported submitted review state.");

    const login = item.user?.login;
    if (typeof login !== "string" || !LOGIN.test(login) ||
        typeof item.commit_id !== "string" || !SHA.test(item.commit_id) ||
        typeof item.submitted_at !== "string" || !UTC.test(item.submitted_at) ||
        Number.isNaN(Date.parse(item.submitted_at))) {
      invalid("GitHub review is missing a valid reviewer, commit SHA or UTC submission timestamp.");
    }

    const current = item.commit_id.toLowerCase() === input.candidateSha.toLowerCase();
    let permission: FPGovernanceReviewerPermission | null = null;
    if (current) {
      if (!permissions.has(login)) {
        try {
          const checked = await input.verifyReviewerPermission(login);
          if (!checked || !["admin", "maintain", "push", "triage", "pull", "none"].includes(checked.permission) ||
              !safeReference(checked.evidenceRef)) {
            invalid("Trusted host returned invalid reviewer-permission evidence.");
          }
          permissions.set(login, checked);
        } catch (error) {
          if (error instanceof FPGovernanceReviewCollectionError) throw error;
          permissions.set(login, null);
        }
      }
      permission = permissions.get(login) ?? null;
    }

    evidence.push({
      reviewedSha: item.commit_id,
      decision,
      reviewRef: `pull/${input.pullRequestNumber}/reviews/${item.id}`,
      reviewerRef: `github:${login}`,
      reviewerAuthorizationRef: permission?.evidenceRef ??
        (current ? "permission-check-unavailable" : "permission-not-checked-stale-review"),
      reviewerAuthorizationStatus: permission && VERIFIED.has(permission.permission) ? "verified" : "unverified",
      submittedAt: item.submitted_at,
    });
  }
  return Object.freeze(evidence.map((item) => Object.freeze(item)));
}
