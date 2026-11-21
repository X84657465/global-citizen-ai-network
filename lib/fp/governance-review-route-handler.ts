import { NextResponse } from "next/server.js";
import { FPGovernanceReviewCollectionError } from "./governance-review-source.ts";
import { isSafeGitHubRepositoryName } from "../github-repository-name.mjs";

const SHA = /^[a-f0-9]{40}$/i;

export interface GovernanceReviewsRouteDependencies {
  readonly getAuthenticatedClient: () => Promise<unknown | null>;
  readonly getProfile: (auth: unknown) => Promise<{ data: unknown; error: unknown }>;
  readonly isActiveAdminProfile: (profile: unknown) => boolean;
  readonly repository: string;
  readonly token: string;
  readonly createGitHubApiClient: (options: {
    token: string;
    timeoutMs: number;
    maxRetries: number;
    maxInlineRetryDelayMs: number;
  }) => { request(path: string): Promise<unknown> };
  readonly collectReviews: (input: {
    api: { request(path: string): Promise<unknown> };
    repository: string;
    pullRequestNumber: number;
    candidateSha: string;
  }) => Promise<readonly unknown[]>;
}

function privateJson(
  body: unknown,
  init: { status?: number; headers?: HeadersInit } = {},
) {
  const headers = new Headers(init.headers);
  headers.set("Cache-Control", "no-store");
  headers.set("X-Content-Type-Options", "nosniff");
  return NextResponse.json(body, { ...init, headers });
}

export async function handleGovernanceReviewsGet(
  request: Request,
  dependencies: GovernanceReviewsRouteDependencies,
) {
  const auth = await dependencies.getAuthenticatedClient();
  if (!auth) {
    return privateJson({ error: "請先登入。" }, { status: 401 });
  }

  let profileResult: { data: unknown; error: unknown };
  try {
    profileResult = await dependencies.getProfile(auth);
  } catch {
    return privateJson({ error: "無法驗證管理員權限。" }, { status: 503 });
  }
  if (profileResult.error) {
    return privateJson({ error: "無法驗證管理員權限。" }, { status: 503 });
  }
  if (!dependencies.isActiveAdminProfile(profileResult.data)) {
    return privateJson({ error: "只有有效管理員可以讀取治理審查證據。" }, { status: 403 });
  }

  if (!isSafeGitHubRepositoryName(dependencies.repository) || !dependencies.token) {
    return privateJson(
      { error: "治理審查讀取尚未設定唯讀 GitHub repository/token。" },
      { status: 503 },
    );
  }

  const params = new URL(request.url).searchParams;
  const pullRequestNumber = Number(params.get("pull_request"));
  const candidateSha = params.get("sha") ?? "";
  if (!Number.isSafeInteger(pullRequestNumber) || pullRequestNumber < 1 ||
      !SHA.test(candidateSha) || params.getAll("pull_request").length !== 1 ||
      params.getAll("sha").length !== 1) {
    return privateJson(
      { error: "必須提供單一有效的 pull_request 與 40 位 commit SHA。" },
      { status: 400 },
    );
  }

  try {
    const api = dependencies.createGitHubApiClient({
      token: dependencies.token,
      timeoutMs: 10_000,
      maxRetries: 1,
      maxInlineRetryDelayMs: 5_000,
    });
    const reviews = await dependencies.collectReviews({
      api,
      repository: dependencies.repository,
      pullRequestNumber,
      candidateSha,
    });

    return privateJson(
      {
        repository: dependencies.repository,
        pullRequestNumber,
        candidateSha: candidateSha.toLowerCase(),
        reviewCount: reviews.length,
        reviews,
        governanceApprovalGranted: false,
        mergeAuthorized: false,
        deploymentAuthorized: false,
      },
      { headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } },
    );
  } catch (error) {
    if (error instanceof FPGovernanceReviewCollectionError) {
      const status = error.code === "INVALID_INPUT" ? 400
        : error.code === "CANDIDATE_NOT_CURRENT" ? 409 : 502;
      return privateJson(
        { error: "無法取得完整且符合候選版本的治理審查證據。", code: error.code },
        { status, headers: { "Cache-Control": "no-store" } },
      );
    }
    return privateJson(
      { error: "GitHub 治理證據來源暫時無法使用。" },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  }
}
