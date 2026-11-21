import assert from "node:assert/strict";
import test from "node:test";
import { createFPGitHubReviewerPermissionVerifier } from "../../lib/fp/github-review-permission.ts";

test("reads and normalizes the real GitHub collaborator permission response", async () => {
  const calls: string[] = [];
  const verify = createFPGitHubReviewerPermissionVerifier({
    api: {
      async request(path) {
        calls.push(path);
        return { permission: "write", role_name: "maintain" };
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

test("normalizes GitHub legacy base roles without elevating or misclassifying access", async () => {
  const cases = [
    [{ permission: "admin", role_name: "admin" }, "admin"],
    [{ permission: "write", role_name: "maintain" }, "maintain"],
    [{ permission: "write", role_name: "write" }, "push"],
    [{ permission: "write" }, "push"],
    [{ permission: "read", role_name: "triage" }, "triage"],
    [{ permission: "read", role_name: "read" }, "pull"],
    [{ permission: "read" }, "pull"],
    [{ permission: "none", role_name: "none" }, "none"],
  ] as const;

  for (const [payload, expected] of cases) {
    const verify = createFPGitHubReviewerPermissionVerifier({
      api: { async request() { return payload; } },
      repository: "owner/repo",
    });
    assert.equal((await verify("reviewer-one")).permission, expected);
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

test("rejects invalid repositories, reviewer logins and unsupported or inconsistent API payloads", async () => {
  assert.throws(() => createFPGitHubReviewerPermissionVerifier({
    api: { async request() { return { permission: "admin" }; } },
    repository: "../repo",
  }), TypeError);

  const unsupported = createFPGitHubReviewerPermissionVerifier({
    api: { async request() { return { permission: "push" }; } },
    repository: "owner/repo",
  });
  await assert.rejects(unsupported("reviewer-one"), TypeError);

  const inconsistent = createFPGitHubReviewerPermissionVerifier({
    api: { async request() { return { permission: "read", role_name: "maintain" }; } },
    repository: "owner/repo",
  });
  await assert.rejects(inconsistent("reviewer-one"), TypeError);
  await assert.rejects(unsupported("bad login"), TypeError);
});

test("propagates permission API failures so the collector can mark evidence unverified", async () => {
  const failure = new Error("permission endpoint unavailable");
  const verify = createFPGitHubReviewerPermissionVerifier({
    api: { async request() { throw failure; } },
    repository: "owner/repo",
  });
  await assert.rejects(verify("reviewer-one"), (error) => error === failure);
});
