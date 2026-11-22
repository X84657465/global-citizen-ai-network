/**
 * Validates a GitHub owner/repository pair before constructing API paths.
 * Rejects extra path segments, dot-segment ambiguity, and oversized names.
 */
const SEGMENT = /^(?!.*\\.\\.)[A-Za-z0-9](?:[A-Za-z0-9_.-]*[A-Za-z0-9_-])?$/;

export function isSafeGitHubRepositoryName(value) {
  if (typeof value !== "string") return false;
  const segments = value.split("/");
  return segments.length === 2 && segments.every((segment) =>
    segment.length <= 100 && SEGMENT.test(segment)
  );
}
