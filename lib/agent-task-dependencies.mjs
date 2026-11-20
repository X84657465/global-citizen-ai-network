export function extractTaskDependencyNumbers(body) {
  if (typeof body !== "string") return [];
  const dependencies = new Set();
  let inDependencySection = false;
  let inFence = false;

  const addReferences = (value) => {
    for (const reference of value.matchAll(/#([1-9][0-9]*)\b/g)) {
      dependencies.add(Number(reference[1]));
    }
  };

  for (const rawLine of body.split(/\r?\n/)) {
    const line = rawLine.trim();

    if (line.startsWith("\x60\x60\x60") || line.startsWith("~~~")) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;

    const heading = /^#{1,6}\s+(.+?)\s*$/.exec(line);
    if (heading) {
      inDependencySection = /^Dependencies(?:\s*\/\s*context)?$/i.test(heading[1].trim());
      continue;
    }

    const inlineDeclaration = /^\s*Dependencies(?:\s*\/\s*context)?\s*:\s*(.*?)\s*$/i.exec(rawLine);
    if (inlineDeclaration) {
      if (inlineDeclaration[1].trim()) addReferences(inlineDeclaration[1]);
      else inDependencySection = true;
      continue;
    }

    if (inDependencySection) addReferences(rawLine);
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
