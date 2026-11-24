import assert from "node:assert/strict";
import test from "node:test";
import { collectFPGovernanceReviewEvidenceFromTrustedHost } from "../../lib/fp/governance-review-host.ts";
import { assessFPGovernanceDossier, FP_GOVERNANCE_POLICY_VERSION } from "../../lib/fp/governance-assurance.ts";

const sha = "a".repeat(40);
const pullPath = "/repos/owner/repo/pulls/42";
const reviewsPath = `${pullPath}/reviews?per_page=100&page=1`;
const permissionPath = "/repos/owner/repo/collaborators/reviewer-one/permission";

test("trusted-host composition always verifies current reviewers through the same authenticated API client", async () => {
  const calls: string[] = [];
  const api = {
    async request(path: string): Promise<unknown> {
      calls.push(path);
      if (path === pullPath) {
        return {
          number: 42,
          state: "open",
          base: { ref: "main", repo: { full_name: "owner/repo" } },
          head: { sha, repo: { full_name: "owner/repo" } },
        };
      }
      if (path === reviewsPath) {
        return [{
          id: 100,
          commit_id: sha,
          state: "APPROVED",
          submitted_at: "2026-11-20T12:00:00Z",
          user: { login: "reviewer-one" },
        }];
      }
      if (path === permissionPath) return { permission: "write" };
      throw new Error(`Unexpected GitHub API path: ${path}`);
    },
  };

  const result = await collectFPGovernanceReviewEvidenceFromTrustedHost({
    api,
    repository: "owner/repo",
    pullRequestNumber: 42,
    candidateSha: sha,
  });

  assert.deepEqual(calls, [pullPath, reviewsPath, permissionPath]);
  assert.equal(result.length, 1);
  assert.equal(result[0].reviewerAuthorizationStatus, "verified");
  assert.equal(result[0].reviewerAuthorizationRef,
    "github:owner/repo:collaborator-permission:reviewer-one:write");
  assert.equal(result[0].reviewedSha, sha);
});

test("trusted-host composition fails closed before reading reviews for a stale candidate", async () => {
  const calls: string[] = [];
  const api = {
    async request(path: string): Promise<unknown> {
      calls.push(path);
      if (path === pullPath) {
        return {
          number: 42,
          state: "open",
          base: { ref: "main", repo: { full_name: "owner/repo" } },
          head: { sha: "b".repeat(40), repo: { full_name: "owner/repo" } },
        };
      }
      throw new Error("Review or permission lookup must not occur for a stale candidate.");
    },
  };

  await assert.rejects(
    collectFPGovernanceReviewEvidenceFromTrustedHost({
      api,
      repository: "owner/repo",
      pullRequestNumber: 42,
      candidateSha: sha,
    }),
    /current open same-repository PR head/,
  );
  assert.deepEqual(calls, [pullPath]);
});

test("trusted-host composition rejects unsafe repositories before issuing API requests", async () => {
  let requests = 0;
  await assert.rejects(
    collectFPGovernanceReviewEvidenceFromTrustedHost({
      api: { async request() { requests += 1; return null; } },
      repository: "owner/../repo",
      pullRequestNumber: 42,
      candidateSha: sha,
    }),
    TypeError,
  );
  assert.equal(requests, 0);
});

test("retains bot review history and verifies a current bot only through the permission API", async () => {
  const login = "copilot-pull-request-reviewer[bot]";
  const staleLogin = "another-reviewer[bot]";
  for (const permission of ["write", "read", null]) {
    const calls: string[] = [];
    const reviews = await collectFPGovernanceReviewEvidenceFromTrustedHost({
      repository: "owner/repo",
      pullRequestNumber: 42,
      candidateSha: sha,
      api: {
        async request(path) {
          calls.push(path);
          if (path === pullPath) {
            return {
              number: 42,
              state: "open",
              base: { ref: "main", repo: { full_name: "owner/repo" } },
              head: { sha, repo: { full_name: "owner/repo" } },
            };
          }
          if (path === reviewsPath) {
            const submitted = { state: "COMMENTED", submitted_at: "2026-11-20T12:00:00Z" };
            return [
              { ...submitted, id: 100, commit_id: "b".repeat(40), user: { login: staleLogin } },
              { ...submitted, id: 101, commit_id: sha, user: { login } },
            ];
          }
          if (permission === null) throw new Error("Permission lookup unavailable");
          return { permission };
        },
      },
    });
    assert.deepEqual(calls, [pullPath, reviewsPath, "/repos/owner/repo/collaborators/copilot-pull-request-reviewer%5Bbot%5D/permission"]);
    assert.deepEqual(reviews.map((review) => [review.reviewerRef, review.reviewerAuthorizationStatus]), [
      [`github:${staleLogin}`, "unverified"],
      [`github:${login}`, permission === "write" ? "verified" : "unverified"],
    ]);
    assert.equal(reviews[0].reviewerAuthorizationRef, "permission-not-checked-stale-review");
    const assessment = assessFPGovernanceDossier({
      candidateSha: sha,
      policyVersion: FP_GOVERNANCE_POLICY_VERSION,
      workstreams: [],
      reviews,
    });
    assert.deepEqual(assessment.reviews.map((review) => review.status), [
      "stale", permission === "write" ? "commented" : "unverified-reviewer",
    ]);
  }
});
