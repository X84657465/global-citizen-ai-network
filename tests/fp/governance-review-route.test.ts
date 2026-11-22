import assert from "node:assert/strict";
import test from "node:test";
import {
  handleGovernanceReviewsGet,
  type GovernanceReviewsRouteDependencies,
} from "../../lib/fp/governance-review-route-handler.ts";
import { FPGovernanceReviewCollectionError } from "../../lib/fp/governance-review-source.ts";

const sha = "a".repeat(40);

type TestDependencies = GovernanceReviewsRouteDependencies & { calls: string[] };

function makeDependencies(
  overrides: Partial<GovernanceReviewsRouteDependencies> = {},
): TestDependencies {
  const calls: string[] = [];
  const deps: TestDependencies = {
    calls,
    getAuthenticatedClient: async () => {
      calls.push("auth");
      return { user: { id: "user-1" }, supabase: {} };
    },
    getProfile: async () => {
      calls.push("profile");
      return { data: { role: "admin", account_status: "active" }, error: null };
    },
    isActiveAdminProfile: (profile: unknown) => {
      if (typeof profile !== "object" || profile === null) return false;
      const candidate = profile as { role?: unknown; account_status?: unknown };
      return candidate.role === "admin" && candidate.account_status === "active";
    },
    repository: "owner/repo",
    token: "read-only-token",
    createGitHubApiClient: () => {
      calls.push("github-client");
      return { request: async () => null };
    },
    collectReviews: async () => {
      calls.push("collect-reviews");
      return [{ decision: "approved", reviewedSha: sha }];
    },
    ...overrides,
  };
  return deps;
}

function makeRequest(query = `pull_request=42&sha=${sha}`) {
  return new Request(`https://example.test/api/admin/fp/governance-reviews?${query}`);
}

test("authentication provider failure returns 503 without profile or GitHub access", async () => {
  const deps = makeDependencies({
    getAuthenticatedClient: async () => {
      deps.calls.push("auth");
      throw new Error("auth provider unavailable");
    },
  });
  const response = await handleGovernanceReviewsGet(makeRequest(), deps);
  assert.equal(response.status, 503);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  assert.deepEqual(deps.calls, ["auth"]);
});

test("unauthenticated request returns 401 and private headers before any profile/GitHub access", async () => {
  const deps = makeDependencies({
    getAuthenticatedClient: async () => { deps.calls.push("auth"); return null; },
  });
  const response = await handleGovernanceReviewsGet(makeRequest(), deps);
  assert.equal(response.status, 401);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  assert.deepEqual(deps.calls, ["auth"]);
});

test("non-admin profile returns 403 before GitHub access", async () => {
  const deps = makeDependencies({
    getProfile: async () => {
      deps.calls.push("profile");
      return { data: { role: "user", account_status: "active" }, error: null };
    },
  });
  const response = await handleGovernanceReviewsGet(makeRequest(), deps);
  assert.equal(response.status, 403);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  assert.deepEqual(deps.calls, ["auth", "profile"]);
});

test("profile lookup error returns 503 without creating a GitHub client", async () => {
  const deps = makeDependencies({
    getProfile: async () => {
      deps.calls.push("profile");
      return { data: null, error: new Error("database unavailable") };
    },
  });
  const response = await handleGovernanceReviewsGet(makeRequest(), deps);
  assert.equal(response.status, 503);
  assert.deepEqual(deps.calls, ["auth", "profile"]);
});

test("malformed profile provider results fail closed without GitHub access", async () => {
  const malformedResults = [
    null,
    { data: { role: "admin", account_status: "active" } },
    { error: null },
  ];
  for (const result of malformedResults) {
    const deps = makeDependencies({
      getProfile: async () => result as { data: unknown; error: unknown },
    });
    const response = await handleGovernanceReviewsGet(makeRequest(), deps);
    assert.equal(response.status, 503);
    assert.equal(response.headers.get("cache-control"), "no-store");
    assert.deepEqual(deps.calls, ["auth"]);
  }
});

test("admin profile evaluator failure returns 503 without GitHub access", async () => {
  const deps = makeDependencies({
    isActiveAdminProfile: () => { throw new Error("profile evaluator unavailable"); },
  });
  const response = await handleGovernanceReviewsGet(makeRequest(), deps);
  assert.equal(response.status, 503);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.deepEqual(deps.calls, ["auth", "profile"]);
});

test("invalid and duplicate query parameters return 400 before GitHub access", async () => {
  const queries = [
    "pull_request=0&sha=" + sha,
    "pull_request=42&sha=bad",
    "pull_request=42&pull_request=43&sha=" + sha,
    "pull_request=42&sha=" + sha + "&sha=" + sha,
  ];
  for (const query of queries) {
    const deps = makeDependencies();
    const response = await handleGovernanceReviewsGet(makeRequest(query), deps);
    assert.equal(response.status, 400, query);
    assert.equal(response.headers.get("cache-control"), "no-store");
    assert.deepEqual(deps.calls, ["auth", "profile"]);
  }
});

test("successful response contains exact candidate evidence and cannot grant authority", async () => {
  const deps = makeDependencies();
  const response = await handleGovernanceReviewsGet(makeRequest(), deps);
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  assert.equal(body.repository, "owner/repo");
  assert.equal(body.pullRequestNumber, 42);
  assert.equal(body.candidateSha, sha);
  assert.equal(body.reviewCount, 1);
  assert.equal(body.governanceApprovalGranted, false);
  assert.equal(body.mergeAuthorized, false);
  assert.equal(body.deploymentAuthorized, false);
  assert.deepEqual(deps.calls, ["auth", "profile", "github-client", "collect-reviews"]);
});

test("unsafe repository or missing token returns 503 before GitHub access", async () => {
  for (const overrides of [{ repository: "../unsafe/repo" }, { token: "" }]) {
    const deps = makeDependencies(overrides);
    const response = await handleGovernanceReviewsGet(makeRequest(), deps);
    assert.equal(response.status, 503);
    assert.deepEqual(deps.calls, ["auth", "profile"]);
  }
});

test("stale candidate maps to 409 and provider failure maps to 502", async () => {
  const stale = makeDependencies({
    collectReviews: async () => {
      throw new FPGovernanceReviewCollectionError("CANDIDATE_NOT_CURRENT", "stale");
    },
  });
  const staleResponse = await handleGovernanceReviewsGet(makeRequest(), stale);
  assert.equal(staleResponse.status, 409);
  assert.equal((await staleResponse.json()).code, "CANDIDATE_NOT_CURRENT");
  assert.equal(staleResponse.headers.get("cache-control"), "no-store");

  const unavailable = makeDependencies({
    collectReviews: async () => { throw new Error("provider unavailable"); },
  });
  const unavailableResponse = await handleGovernanceReviewsGet(makeRequest(), unavailable);
  assert.equal(unavailableResponse.status, 502);
  assert.equal(unavailableResponse.headers.get("cache-control"), "no-store");
});
