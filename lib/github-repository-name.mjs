export function isSafeGitHubRepositoryName(value) {
  if (typeof value !== "string") return false;
  const [owner, repository, ...rest] = value.split("/");
  return repository !== undefined && rest.length === 0 &&
    /^(?!.*\.\.)[A-Za-z0-9](?:[A-Za-z0-9_.-]*[A-Za-z0-9_-])?$/.test(owner) &&
    /^(?!.*\.\.|\.$)[A-Za-z0-9_.-](?:[A-Za-z0-9_.-]*[A-Za-z0-9_-])?$/.test(repository);
}
