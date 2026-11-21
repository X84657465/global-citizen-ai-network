import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedClient } from "@/lib/supabase/authenticated";
import { isActiveAdminProfile } from "@/lib/ai/reconciliation-auth";
import { createGitHubApiClient } from "@/lib/github-api-client.mjs";
import { collectFPGovernanceReviewEvidenceFromTrustedHost } from "@/lib/fp/governance-review-host";
import { FPGovernanceReviewCollectionError } from "@/lib/fp/governance-review-source";
import { isSafeGitHubRepositoryName } from "@/lib/github-repository-name.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SHA = /^[a-f0-9]{40}$/i;

function privateJson(
  body: unknown,
  init: { status?: number; headers?: HeadersInit } = {},
) {
  const headers = new Headers(init.headers);
  headers.set("Cache-Control", "no-store");
  headers.set("X-Content-Type-Options", "nosniff");
  return NextResponse.json(body, { ...init, headers });
}

export async function GET(request: NextRequest) {
  const auth = await getAuthenticatedClient();
  if (!auth) {
    return privateJson({ error: "請先登入。" }, { status: 401 });
  }

  const { data: profile, error: profileError } = await auth.supabase
    .from("profiles")
    .select("role, account_status")
    .eq("id", auth.user.id)
    .maybeSingle();

  if (profileError) {
    return privateJson({ error: "無法驗證管理員權限。" }, { status: 503 });
  }
  if (!isActiveAdminProfile(profile)) {
    return privateJson({ error: "只有有效管理員可以讀取治理審查證據。" }, { status: 403 });
  }

  const repository = process.env.GCAN_GITHUB_REPOSITORY ?? "";
  const token = process.env.GCAN_GITHUB_READ_TOKEN ?? "";
  if (!isSafeGitHubRepositoryName(repository) || !token) {
    return privateJson(
      { error: "治理審查讀取尚未設定唯讀 GitHub repository/token。" },
      { status: 503 },
    );
  }

  const params = request.nextUrl.searchParams;
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
    const api = createGitHubApiClient({
      token,
      timeoutMs: 10_000,
      maxRetries: 1,
      maxInlineRetryDelayMs: 5_000,
    });
    const reviews = await collectFPGovernanceReviewEvidenceFromTrustedHost({
      api,
      repository,
      pullRequestNumber,
      candidateSha,
    });

    return privateJson(
      {
        repository,
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
