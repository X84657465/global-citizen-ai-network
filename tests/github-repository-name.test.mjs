import assert from "node:assert/strict";
import test from "node:test";

import { isSafeGitHubRepositoryName } from "../lib/github-repository-name.mjs";

test("accepts valid GitHub owner and repository identifiers", () => {
  for (const repository of [
    "owner/repo",
    "octo-org/repo",
    "owner/repo.v2",
    "owner/repo_name",
    "owner/repo-name",
    "owner/-repo",
    "owner/-repo-name",
  ]) {
    assert.equal(isSafeGitHubRepositoryName(repository), true, repository);
  }
});

test("rejects malformed, ambiguous, and URL-altering repository identifiers", () => {
  for (const repository of [
    "",
    "owner",
    "/repo",
    "owner/",
    "owner//repo",
    "owner/repo/extra",
    "./repo",
    ".owner/repo",
    "owner/.repo",
    "..owner/repo",
    "owner./repo",
    "owner/repo.",
    "owner/repo..archive",
    "owner\\repo",
    "owner/%2e%2e",
    "owner/%2Fadmin",
    "owner/repo?query",
    "owner/repo#fragment",
    "owner/repo:tag",
    "owner/repo with space",
    "owner/repo\n",
    "owner.with.dot/repo",
    "_owner/repo",
    "owner/-",
    "owner/--",
    "owner/" + "r".repeat(101),
    "o".repeat(40) + "/repo",
  ]) {
    assert.equal(isSafeGitHubRepositoryName(repository), false, repository);
  }
});

test("rejects non-string repository identifiers", () => {
  for (const repository of [null, undefined, 1, {}, [], true]) {
    assert.equal(isSafeGitHubRepositoryName(repository), false);
  }
});
