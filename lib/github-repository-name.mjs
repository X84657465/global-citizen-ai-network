export function isSafeGitHubRepositoryName(value) {
  if (typeof value !== "string") return false;
  const segments = value.split("/");
  return segments.length === 2 && segments.every((segment) =>
    /^(?!.*\.\.)[A-Za-z0-9](?:[A-Za-z0-9_.-]*[A-Za-z0-9_-])?$/.test(segment)
  );
}
