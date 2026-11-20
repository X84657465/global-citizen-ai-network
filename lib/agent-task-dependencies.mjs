export function extractTaskDependencyNumbers(body) {
  if (typeof body !== "string") return [];
  const dependencies = new Set();
  const lines = body.split(/\r?\n/);
  let fence = null;
  let inDependencySection = false;

  const addReferences = (value) => {
    for (const reference of value.matchAll(/#([1-9][0-9]*)\b/g)) {
      dependencies.add(Number(reference[1]));
    }
  };

  for (const rawLine of lines) {
    const fenceMatch = /^ {0,3}(`{3,}|~{3,})(.*)$/.exec(rawLine);
    if (fence) {
      if (
        fenceMatch &&
        fenceMatch[1][0] === fence.character &&
        fenceMatch[1].length >= fence.length &&
        /^\s*$/.test(fenceMatch[2])
      ) {
        fence = null;
      }
      continue;
    }

    if (fenceMatch) {
      const info = fenceMatch[2];
      if (fenceMatch[1][0] !== "`" || !info.includes("`")) {
        fence = { character: fenceMatch[1][0], length: fenceMatch[1].length };
        continue;
      }
    }

    const line = rawLine.trim();
    const heading = /^#{1,6}\s+(.+?)(?:\s+#+\s*)?$/.exec(line);
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
