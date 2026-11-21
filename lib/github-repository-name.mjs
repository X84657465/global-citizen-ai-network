const GITHUB_REPOSITORY_NAME = /^[A-Za-z0-9][A-Za-z0-9_.-]*\/[A-Za-z0-9][A-Za-z0-9_.-]*$/;

/**
 * Validate an owner/repository pair before interpolating it into GitHub API paths.
 * This deliberately accepts GitHub's common owner/repository punctuation while
 * rejecting URLs, whitespace, extra path segments, and dot-segment traversal.
 *
 * @param {unknown} value
 * @returns {value is string}
 */
export function isSafeGitHubRepositoryName(value) {
  if (typeof value !== "string" || !GITHUB_REPOSITORY_NAME.test(value)) {
    return false;
  }

  const [owner, repository] = value.split("/");
  return owner !== "." && owner !== ".." &&
    repository !== "." && repository !== "..";
}
