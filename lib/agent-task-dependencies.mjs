export function extractTaskDependencyNumbers(body) {
  if (typeof body !== "string") return [];
  const dependencies = new Set();
  const lines = body.split(/\r?\n/);
  for (const line of lines) {
    const match = /^\s*Dependencies(?:\/context)?\s*:\s*(.*?)\s*$/i.exec(line);
    if (!match) continue;
    for (const reference of match[1].matchAll(/#([1-9][0-9]*)\b/g)) {
      dependencies.add(Number(reference[1]));
    }
  }
  return [...dependencies].sort((a, b) => a - b);
}

export function taskDependenciesResolved(body, issuesByNumber, mergedTaskIssueNumbers = new Set()) {
  for (const issueNumber of extractTaskDependencyNumbers(body)) {
    if (mergedTaskIssueNumbers.has(issueNumber)) continue;
    const dependency = issuesByNumber.get(issueNumber);
    if (dependency?.state === "closed" && dependency.state_reason === "completed") continue;
    return false;
  }
  return true;
}
