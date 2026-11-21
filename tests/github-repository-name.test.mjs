import assert from "node:assert/strict";
import test from "node:test";
import { isSafeGitHubRepositoryName } from "../lib/github-repository-name.mjs";

test("accepts a GitHub owner/repository pair", () => {
  for (const value of ["owner/repo", "Owner-1/repo.name_2", "a/b"]) {
    assert.equal(isSafeGitHubRepositoryName(value), true, value);
  }
});

test("rejects malformed repository paths before API path interpolation", () => {
  for (const value of [
    null,
    undefined,
    "",
    " owner/repo",
    "owner/repo ",
    "/repo",
    "owner/",
    "owner/repo/extra",
    "../repo",
    "owner/..",
    "https://github.com/owner/repo",
    "owner%2Frepo",
    "owner\\repo",
    "owner?query/repo",
  ]) {
    assert.equal(isSafeGitHubRepositoryName(value), false, String(value));
  }
});
