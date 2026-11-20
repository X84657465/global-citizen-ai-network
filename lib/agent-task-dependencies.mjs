export function extractTaskDependencyNumbers(body) {
  if (typeof body !== "string") return [];
  const dependencies = new Set();
  let inFence = false;
  let fenceCharacter = "";
  let fenceLength = 0;
  let inDependencySection = false;

  const addReferences = (value) => {
    for (const reference of value.matchAll(/#([1-9][0-9]*)\\b/g)) {
      dependencies.add(Number(reference[1]));
    }
  };

  for (const rawLine of body.split(/\\r?\\n/)) {
    const line = rawLine.trim();
    const fence = /^(`{3,}|~{3,})/.exec(line);
    if (fence) {
      const marker = fence[1];
      if (!inFence) {
        inFence = true;
        fenceCharacter = marker[0];
        fenceLength = marker.length;
      } else if (marker[0] === fenceCharacter && marker.length >= fenceLength) {
        inFence = false;
        fenceCharacter = "";
        fenceLength = 0;
      }
      continue;
    }
    if (inFence || !line) continue;

    const heading = /^#{1,6}\\s+(.+?)\\s*$/.exec(line);
    if (heading) {
      inDependencySection = /^Dependencies(?:\\/context)?$/i.test(heading[1].trim());
      continue;
    }

    const inline = /^Dependencies(?:\\/context)?\\s*:\\s*(.*?)\\s*$/i.exec(line);
    if (inline) {
      addReferences(inline[1]);
      continue;
    }
    if (inDependencySection) addReferences(line);
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
