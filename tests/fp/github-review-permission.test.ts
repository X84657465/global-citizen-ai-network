import assert from "node:assert/strict";
import test from "node:test";
import { createFPGitHubReviewerPermissionVerifier } from "../../lib/fp/github-review-permission.ts";

test("reads collaborator permission through the supplied authenticated host client", async () => {
  const calls: string[] = [];
  const verify = createFPGitHubReviewerPermissionVerifier({
    api: {
      async request(path) {
        calls.push(path);
        return { permission: "maintain" };
      },
    },
    repository: "owner/repo",
  });

  const result = await verify("reviewer-one");
  assert.deepEqual(calls, [
    "/repos/owner/repo/collaborators/reviewer-one/permission",
  ]);
  assert.deepEqual(result, {
    permission: "maintain",
    evidenceRef: "github:owner/repo:collaborator-permission:reviewer-one:maintain",
  });
});

test("preserves all supported GitHub repository permission levels without elevating them", async () => {
  for (const permission of ["admin", "maintain", "write", "triage", "read", "none"]) {
    const verify = createFPGitHubReviewerPermissionVerifier({
      api: { async request() { return { permission }; } },
      repository: "owner/repo",
    });
    assert.equal((await verify("reviewer-one")).permission, permission);
  }
});

test("encodes reviewer login as one path segment", async () => {
  let requestedPath = "";
  const verify = createFPGitHubReviewerPermissionVerifier({
    api: { async request(path) { requestedPath = path; return { permission: "read" }; } },
    repository: "owner/repo",
  });
  await verify("reviewer-one");
  assert.equal(requestedPath, "/repos/owner/repo/collaborators/reviewer-one/permission");
});

test("rejects invalid repositories, reviewer logins and unsupported permission payloads", async () => {
  assert.throws(() => createFPGitHubReviewerPermissionVerifier({
    api: { async request() { return { permission: "admin" }; } },
    repository: "../repo",
  }), TypeError);
  for (const repository of [
    "owner/..", "./repo", "owner/.", "owner/repo/extra", "/repo", "owner/",
    ".owner/repo", "owner/.repo", "owner./repo", "owner/repo.",
    "owner/foo..bar", "owner/foo//bar",
  ]) {
    assert.throws(() => createFPGitHubReviewerPermissionVerifier({
      api: { async request() { return { permission: "admin" }; } },
      repository,
    }), TypeError, repository);
  }

  const verify = createFPGitHubReviewerPermissionVerifier({
    api: { async request() { return { permission: "owner" }; } },
    repository: "owner/repo",
  });
  await assert.rejects(verify("reviewer-one"), TypeError);
  await assert.rejects(verify("bad login"), TypeError);
});

test("propagates permission API failures so the collector can mark evidence unverified", async () => {
  const failure = new Error("permission endpoint unavailable");
  const verify = createFPGitHubReviewerPermissionVerifier({
    api: { async request() { throw failure; } },
    repository: "owner/repo",
  });
  await assert.rejects(verify("reviewer-one"), (error) => error === failure);
});
