import test from "node:test";
import assert from "node:assert/strict";
import { ensureDeterministicBranch } from "../lib/agent-publisher-branch.mjs";

const repository = "owner/repo";
const branch = "ai-task/issue-73-abcdef123456";
const baseSha = "a".repeat(40);
const treeSha = "b".repeat(40);
const commitSha = "c".repeat(40);
const refPath = "/repos/" + repository + "/git/ref/heads/ai-task/issue-73-abcdef123456";

function notFound() {
  return Object.assign(new Error("Not Found"), { status: 404 });
}

function fakeApi(options = {}) {
  const calls = [];
  let ref = options.ref ?? null;
  const api = async (path, method = "GET", body) => {
    calls.push({ path, method, body });
    if (path === refPath && method === "GET") {
      if (!ref) throw notFound();
      return ref;
    }
    if (path === "/repos/owner/repo/git/commits" && method === "POST") {
      return { sha: commitSha };
    }
    if (path === "/repos/owner/repo/git/refs" && method === "POST") {
      ref = { ref: "refs/heads/" + branch, object: { sha: body.sha } };
      if (options.ambiguousCreate) throw new Error("connection lost after ref creation");
      return ref;
    }
    if (path === "/repos/owner/repo/git/commits/" + commitSha && method === "GET") {
      return { tree: { sha: options.existingTreeSha ?? treeSha } };
    }
    throw new Error("Unexpected fake API request: " + method + " " + path);
  };
  return { api, calls, get ref() { return ref; } };
}

test("creates a deterministic branch from the exact expected tree", async () => {
  const fake = fakeApi();
  const result = await ensureDeterministicBranch(fake.api, repository, branch, baseSha, treeSha, "test patch");
  assert.deepEqual(result, { commit_sha: commitSha, created: true, recovered: false });
  assert.equal(fake.ref.object.sha, commitSha);
  assert.equal(fake.calls.filter((call) => call.method === "POST").length, 2);
});

test("reuses an existing branch only when its commit has the exact expected tree", async () => {
  const fake = fakeApi({ ref: { object: { sha: commitSha } }, existingTreeSha: treeSha });
  const result = await ensureDeterministicBranch(fake.api, repository, branch, baseSha, treeSha, "test patch");
  assert.deepEqual(result, { commit_sha: commitSha, created: false, recovered: false });
  assert.equal(fake.calls.some((call) => call.method === "POST"), false);
});

test("fails closed when an existing deterministic branch contains different content", async () => {
  const fake = fakeApi({ ref: { object: { sha: commitSha } }, existingTreeSha: "d".repeat(40) });
  await assert.rejects(
    ensureDeterministicBranch(fake.api, repository, branch, baseSha, treeSha, "test patch"),
    /does not contain the exact validated patch tree/,
  );
});

test("recovers an ambiguous ref creation only after verifying the resulting tree", async () => {
  const fake = fakeApi({ ambiguousCreate: true });
  const result = await ensureDeterministicBranch(fake.api, repository, branch, baseSha, treeSha, "test patch");
  assert.deepEqual(result, { commit_sha: commitSha, created: false, recovered: true });
});

test("rejects unsafe branch names and malformed commit identifiers", async () => {
  const fake = fakeApi();
  await assert.rejects(
    ensureDeterministicBranch(fake.api, repository, "../main", baseSha, treeSha, "test patch"),
    /safe deterministic branch/,
  );
  await assert.rejects(
    ensureDeterministicBranch(fake.api, repository, branch, "not-a-sha", treeSha, "test patch"),
    /valid base commit/,
  );
});
