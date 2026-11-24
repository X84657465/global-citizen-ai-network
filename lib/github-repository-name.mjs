/**
 * Validates a GitHub owner/repository pair before constructing API paths.
 * Rejects extra path segments, URL delimiters, and oversized names.
 */
const OWNER_SEGMENT = /^[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?$/;
const REPOSITORY_SEGMENT = /^(?:[A-Za-z0-9](?:[A-Za-z0-9_.-]*[A-Za-z0-9_-])?|-(?=[A-Za-z0-9_.-]*[A-Za-z0-9_.])[A-Za-z0-9_.-]*[A-Za-z0-9_-])$/;

export function isSafeGitHubRepositoryName(value) {
  if (typeof value !== "string") return false;
  const segments = value.split("/");
  if (segments.length !== 2) return false;
  const [owner, repository] = segments;
  return owner.length <= 39 && OWNER_SEGMENT.test(owner) &&
    repository.length <= 100 && !repository.includes("..") && REPOSITORY_SEGMENT.test(repository);
}
