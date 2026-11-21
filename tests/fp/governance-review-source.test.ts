import assert from "node:assert/strict";
import test from "node:test";
import {
  collectFPGovernanceReviewEvidence,
  FPGovernanceReviewCollectionError,
  type FPGovernanceGitHubApi,
  type FPGovernanceReviewCollectionInput,
} from "../../lib/fp/governance-review-source.ts";

const sha = "a".repeat(40);
const oldSha = "b".repeat(40);
const prPath = "/repos/owner/repo/pulls/42";
const reviewsPath = (page = 1) => `${prPath}/reviews?per_page=100&page=${page}`;
const pull = (overrides: Record<string, unknown> = {}) => ({
  number: 42, state: "open",
  base: { ref: "main", repo: { full_name: "owner/repo" } },
  head: { sha, repo: { full_name: "owner/repo" } },
  ...overrides,
});
const review = (overrides: Record<string, unknown> = {}) => ({
  id: 100, commit_id: sha, state: "APPROVED",
  submitted_at: "2026-11-22T12:00:00Z", user: { login: "reviewer-one" },
  ...overrides,
});
function makeInput(responses: Map<string, unknown>, overrides: Partial<FPGovernanceReviewCollectionInput> = {}): FPGovernanceReviewCollectionInput {
  const api: FPGovernanceGitHubApi = {
    async request(path) {
      const value = responses.get(path);
      if (value instanceof Error) throw value;
      if (value === undefined) throw new Error(`Unexpected API path: ${path}`);
      return value;
    },
  };
  return {
    api, repository: "owner/repo", pullRequestNumber: 42, candidateSha: sha,
    verifyReviewerPermission: async () => ({ permission: "push", evidenceRef: "permissions/reviewer-one/push" }),
    ...overrides,
  };
}


test("rejects path traversal and malformed repository names before any GitHub API request", async () => {
  for (const repository of [
    "../repo",
    "owner/../repo",
    "../owner/repo",
    "owner/..",
    ".owner/repo",
    "owner/.repo",
    "owner/repo/extra",
    "owner//repo",
  ]) {
    let requests = 0;
    const api: FPGovernanceGitHubApi = {
      async request() {
        requests += 1;
        throw new Error("GitHub API must not be called for an invalid repository");
      },
    };
    await assert.rejects(
      collectFPGovernanceReviewEvidence(makeInput(new Map(), { api, repository })),
      (error: unknown) => error instanceof FPGovernanceReviewCollectionError && error.code === "INVALID_INPUT",
    );
    assert.equal(requests, 0, `unexpected GitHub API request for repository: ${repository}`);
  }
});

test("collects exact-head submitted reviews and host-verifies reviewer permissions", async () => {
  let checks = 0;
  const result = await collectFPGovernanceReviewEvidence(makeInput(new Map([
    [prPath, pull()], [reviewsPath(), [review()]],
  ]), {
    verifyReviewerPermission: async (login) => {
      checks += 1;
      assert.equal(login, "reviewer-one");
      return { permission: "maintain", evidenceRef: "permissions/reviewer-one/maintain" };
    },
  }));
  assert.equal(checks, 1);
  assert.deepEqual(result, [{
    reviewedSha: sha, decision: "approved", reviewRef: "pull/42/reviews/100",
    reviewerRef: "github:reviewer-one",
    reviewerAuthorizationRef: "permissions/reviewer-one/maintain",
    reviewerAuthorizationStatus: "verified", submittedAt: "2026-11-22T12:00:00Z",
  }]);
});

test("rejects closed, forked, retargeted and moved-head candidates before reading reviews", async () => {
  for (const invalidPull of [
    pull({ state: "closed" }),
    pull({ head: { sha, repo: { full_name: "fork/repo" } } }),
    pull({ base: { ref: "release", repo: { full_name: "owner/repo" } } }),
    pull({ head: { sha: oldSha, repo: { full_name: "owner/repo" } } }),
  ]) {
    let reviewRequests = 0;
    const api: FPGovernanceGitHubApi = {
      async request(path) {
        if (path === prPath) return invalidPull;
        reviewRequests += 1;
        return [];
      },
    };
    await assert.rejects(
      collectFPGovernanceReviewEvidence(makeInput(new Map(), { api })),
      (error: unknown) => error instanceof FPGovernanceReviewCollectionError && error.code === "CANDIDATE_NOT_CURRENT",
    );
    assert.equal(reviewRequests, 0);
  }
});

test("collects complete paginated review history", async () => {
  const first = Array.from({ length: 100 }, (_, index) => review({
    id: index + 1, user: { login: `reviewer-${index + 1}` },
  }));
  const second = [review({ id: 101, user: { login: "reviewer-101" } })];
  const result = await collectFPGovernanceReviewEvidence(makeInput(new Map([
    [prPath, pull()], [reviewsPath(1), first], [reviewsPath(2), second],
  ])));
  assert.equal(result.length, 101);
  assert.equal(result[100].reviewRef, "pull/42/reviews/101");
});

test("refuses review history that exceeds the safe pagination bound", async () => {
  const full = Array.from({ length: 100 }, (_, index) => review({ id: index + 1 }));
  const api: FPGovernanceGitHubApi = {
    async request(path) {
      if (path === prPath) return pull();
      const page = Number(new URLSearchParams(path.split("?")[1]).get("page"));
      return full.map((item, index) => ({ ...item, id: (page - 1) * 100 + index + 1 }));
    },
  };
  await assert.rejects(
    collectFPGovernanceReviewEvidence(makeInput(new Map(), { api })),
    (error: unknown) => error instanceof FPGovernanceReviewCollectionError && error.code === "INCOMPLETE_REVIEW_HISTORY",
  );
});

test("retains stale reviews without checking their reviewer permissions", async () => {
  let checks = 0;
  const result = await collectFPGovernanceReviewEvidence(makeInput(new Map([
    [prPath, pull()], [reviewsPath(), [review({ commit_id: oldSha })]],
  ]), {
    verifyReviewerPermission: async () => {
      checks += 1;
      return { permission: "push", evidenceRef: "permissions/reviewer-one/push" };
    },
  }));
  assert.equal(checks, 0);
  assert.equal(result[0].reviewedSha, oldSha);
  assert.equal(result[0].reviewerAuthorizationStatus, "unverified");
  assert.equal(result[0].reviewerAuthorizationRef, "permission-not-checked-stale-review");
});

test("keeps insufficient permission and permission lookup errors unverified", async () => {
  const result = await collectFPGovernanceReviewEvidence(makeInput(new Map([
    [prPath, pull()],
    [reviewsPath(), [
      review({ id: 100, user: { login: "reviewer-one" } }),
      review({ id: 101, user: { login: "reviewer-two" } }),
    ]],
  ]), {
    verifyReviewerPermission: async (login) => {
      if (login === "reviewer-two") throw new Error("permission source unavailable");
      return { permission: "pull", evidenceRef: "permissions/reviewer-one/pull" };
    },
  }));
  assert.equal(result[0].reviewerAuthorizationStatus, "unverified");
  assert.equal(result[1].reviewerAuthorizationStatus, "unverified");
  assert.equal(result[1].reviewerAuthorizationRef, "permission-check-unavailable");
});

test("caches permission checks and ignores pending or dismissed reviews", async () => {
  let checks = 0;
  const result = await collectFPGovernanceReviewEvidence(makeInput(new Map([
    [prPath, pull()],
    [reviewsPath(), [
      review({ id: 100 }),
      review({ id: 101, state: "CHANGES_REQUESTED" }),
      review({ id: 102, state: "PENDING", submitted_at: null }),
      review({ id: 103, state: "DISMISSED" }),
    ]],
  ]), {
    verifyReviewerPermission: async () => {
      checks += 1;
      return { permission: "push", evidenceRef: "permissions/reviewer-one/push" };
    },
  }));
  assert.equal(checks, 1);
  assert.equal(result.length, 2);
});

test("rejects malformed IDs, unsupported states, reviewer identities, timestamps and permission references", async () => {
  for (const item of [
    review({ id: 0 }),
    review({ state: "UNKNOWN" }),
    review({ user: { login: "bad login" } }),
    review({ submitted_at: "not-a-date" }),
  ]) {
    await assert.rejects(
      collectFPGovernanceReviewEvidence(
        makeInput(new Map([
          [prPath, pull()],
          [reviewsPath(), [item]],
        ])),
      ),
      (error: unknown) => error instanceof FPGovernanceReviewCollectionError && error.code === "INVALID_REVIEW_DATA",
    );
  }
  await assert.rejects(
    collectFPGovernanceReviewEvidence(makeInput(new Map([[prPath, pull()], [reviewsPath(), [review()]]]), {
      verifyReviewerPermission: async () => ({ permission: "push", evidenceRef: "../unsafe" }),
    })),
    (error: unknown) => error instanceof FPGovernanceReviewCollectionError && error.code === "INVALID_REVIEW_DATA",
  );
});

test("rejects duplicate review IDs and non-array review responses", async () => {
  await assert.rejects(
    collectFPGovernanceReviewEvidence(makeInput(new Map([
      [prPath, pull()], [reviewsPath(), [review(), review({ user: { login: "reviewer-two" } })]],
    ]))),
    (error: unknown) => error instanceof FPGovernanceReviewCollectionError && error.code === "INVALID_REVIEW_DATA",
  );
  await assert.rejects(
    collectFPGovernanceReviewEvidence(makeInput(new Map([
      [prPath, pull()], [reviewsPath(), { reviews: [review()] }],
    ]))),
    (error: unknown) => error instanceof FPGovernanceReviewCollectionError && error.code === "INCOMPLETE_REVIEW_HISTORY",
  );
});
