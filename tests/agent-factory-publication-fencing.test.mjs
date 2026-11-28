import test from "node:test";
import assert from "node:assert/strict";
import { ensureDeterministicBranch } from "../lib/agent-publisher-branch.mjs";

const BASE = "a".repeat(40);
const BRANCH = "factory/local-task/github-issue-42";

function createRacingGitHubApi() {
  let branchRef = null;
  let initialReads = 0;
  let nextCommit = 0;
  let releaseInitialReads;
  const initialReadsComplete = new Promise((resolve) => {
    releaseInitialReads = resolve;
  });
  const commits = new Map();

  const api = async (path, method = "GET", payload = undefined) => {
    if (path === "/repos/owner/repo/git/ref/heads/" + BRANCH) {
      if (!branchRef) {
        initialReads += 1;
        if (initialReads === 2) releaseInitialReads();
        await initialReadsComplete;
        if (!branchRef) throw Object.assign(new Error("Reference not found"), { status: 404 });
      }
      return branchRef;
    }

    if (path === "/repos/owner/repo/git/commits" && method === "POST") {
      const sha = String(++nextCommit).padStart(40, "0");
      commits.set(sha, {
        sha,
        tree: { sha: payload.tree },
        parents: payload.parents.map((parent) => ({ sha: parent })),
      });
      return { sha };
    }

    if (path === "/repos/owner/repo/git/refs" && method === "POST") {
      if (branchRef) {
        throw Object.assign(new Error("Reference already exists"), { status: 422 });
      }
      branchRef = { ref: payload.ref, object: { sha: payload.sha } };
      return branchRef;
    }

    const commitPrefix = "/repos/owner/repo/git/commits/";
    if (path.startsWith(commitPrefix)) {
      const commit = commits.get(path.slice(commitPrefix.length));
      if (!commit) throw Object.assign(new Error("Commit not found"), { status: 404 });
      return commit;
    }

    throw new Error("Unexpected GitHub API request: " + method + " " + path);
  };

  return { api, get branchRef() { return branchRef; } };
}

test("different accepted patches for one task cannot reserve different publication branches", async () => {
  const github = createRacingGitHubApi();
  const results = await Promise.allSettled([
    ensureDeterministicBranch(github.api, "owner/repo", BRANCH, BASE, "b".repeat(40), "publish A"),
    ensureDeterministicBranch(github.api, "owner/repo", BRANCH, BASE, "c".repeat(40), "publish B"),
  ]);

  assert.equal(results.filter((result) => result.status === "fulfilled").length, 1);
  assert.equal(results.filter((result) => result.status === "rejected").length, 1);
  assert.ok(github.branchRef);
});

test("identical accepted patches racing for one task recover the same reserved branch", async () => {
  const github = createRacingGitHubApi();
  const results = await Promise.all([
    ensureDeterministicBranch(github.api, "owner/repo", BRANCH, BASE, "b".repeat(40), "publish"),
    ensureDeterministicBranch(github.api, "owner/repo", BRANCH, BASE, "b".repeat(40), "publish"),
  ]);

  assert.equal(results[0].commit_sha, results[1].commit_sha);
  assert.equal(results.filter((result) => result.created).length, 1);
  assert.equal(results.filter((result) => result.recovered).length, 1);
});
