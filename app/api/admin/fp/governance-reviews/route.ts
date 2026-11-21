import { getAuthenticatedClient } from "@/lib/supabase/authenticated";
import { isActiveAdminProfile } from "@/lib/ai/reconciliation-auth";
import { createGitHubApiClient } from "@/lib/github-api-client.mjs";
import { collectFPGovernanceReviewEvidenceFromTrustedHost } from "@/lib/fp/governance-review-host";
import { handleGovernanceReviewsGet } from "@/lib/fp/governance-review-route-handler";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type AuthenticatedClient = NonNullable<Awaited<ReturnType<typeof getAuthenticatedClient>>>;

export async function GET(request: Request) {
  return handleGovernanceReviewsGet<AuthenticatedClient>(request, {
    getAuthenticatedClient,
    getProfile: async (auth) => auth.supabase
      .from("profiles")
      .select("role, account_status")
      .eq("id", auth.user.id)
      .maybeSingle(),
    isActiveAdminProfile,
    repository: process.env.GCAN_GITHUB_REPOSITORY ?? "",
    token: process.env.GCAN_GITHUB_READ_TOKEN ?? "",
    createGitHubApiClient,
    collectReviews: collectFPGovernanceReviewEvidenceFromTrustedHost,
  });
}
