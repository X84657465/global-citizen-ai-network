export function extractTaskDependencyNumbers(body) {
  if (typeof body !== "string") return [];
  const dependencies = new Set();
  const lines = body.split(/\r?\n/);
  let inFence = false;
  let inDependencySection = false;

  const addReferences = (value) => {
    for (const reference of value.matchAll(/#([1-9][0-9]*)\b/g)) {
      dependencies.add(Number(reference[1]));
    }
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (/^(?:```|~~~)/.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;

    const heading = /^#{1,6}\s+(.+?)\s*$/.exec(line);
    if (heading) {
      const name = heading[1].trim();
      inDependencySection = /^Dependencies(?:\/context)?$/i.test(name);
      continue;
    }

    if (inDependencySection) {
      addReferences(line);
      continue;
    }

    const inline = /^Dependencies(?:\/context)?\s*:\s*(.*?)\s*$/i.exec(line);
    if (inline) addReferences(inline[1]);
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
