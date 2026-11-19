function isSha(value) {
  return typeof value === "string" && /^[a-f0-9]{40}$/i.test(value);
}

function refPath(repository, branch) {
  const encodedBranch = branch.split("/").map(encodeURIComponent).join("/");
  return "/repos/" + repository + "/git/ref/heads/" + encodedBranch;
}

async function readBranchRef(api, repository, branch) {
  try {
    return await api(refPath(repository, branch));
  } catch (error) {
    if (error?.status === 404) return null;
    throw error;
  }
}

async function verifyExistingBranch(api, repository, ref, expectedTreeSha) {
  const commitSha = ref?.object?.sha;
  if (!isSha(commitSha)) throw new Error("Existing deterministic branch has an invalid commit reference.");
  const commit = await api("/repos/" + repository + "/git/commits/" + commitSha);
  if (commit?.tree?.sha !== expectedTreeSha) {
    throw new Error("Existing deterministic branch does not contain the exact validated patch tree.");
  }
  return commitSha;
}

export async function ensureDeterministicBranch(api, repository, branch, baseCommit, treeSha, message) {
  if (typeof api !== "function") throw new TypeError("A GitHub API request function is required.");
  if (typeof repository !== "string" || !/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository)) {
    throw new TypeError("A valid repository name is required.");
  }
  if (typeof branch !== "string" || !/^[A-Za-z0-9._/-]+$/.test(branch) ||
      branch.startsWith("/") || branch.endsWith("/") || branch.includes("..") || branch.includes("//")) {
    throw new TypeError("A safe deterministic branch name is required.");
  }
  if (!isSha(baseCommit) || !isSha(treeSha) || typeof message !== "string" || !message.trim()) {
    throw new TypeError("A valid base commit, tree SHA, and commit message are required.");
  }

  const existing = await readBranchRef(api, repository, branch);
  if (existing) {
    return {
      commit_sha: await verifyExistingBranch(api, repository, existing, treeSha),
      created: false,
      recovered: false,
    };
  }

  const commit = await api("/repos/" + repository + "/git/commits", "POST", {
    message,
    tree: treeSha,
    parents: [baseCommit],
  });
  if (!isSha(commit?.sha)) throw new Error("GitHub did not return a valid commit SHA.");

  try {
    await api("/repos/" + repository + "/git/refs", "POST", {
      ref: "refs/heads/" + branch,
      sha: commit.sha,
    });
    return { commit_sha: commit.sha, created: true, recovered: false };
  } catch (createError) {
    const raced = await readBranchRef(api, repository, branch);
    if (raced) {
      return {
        commit_sha: await verifyExistingBranch(api, repository, raced, treeSha),
        created: false,
        recovered: true,
      };
    }
    throw createError;
  }
}
