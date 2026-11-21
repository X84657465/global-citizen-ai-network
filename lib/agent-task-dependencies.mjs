export function extractTaskDependencyNumbers(body) {
  if (typeof body !== "string") return [];
  const dependencies = new Set();
  let inDependencySection = false;
  let fenceCharacter = null;
  let fenceLength = 0;
  let previousLineWasBlank = true;
  let inIndentedCodeBlock = false;

  // Accept both legacy inline declarations and explicit Markdown dependency sections.
  const addReferences = (value) => {
    for (const reference of value.matchAll(/#([1-9][0-9]*)\b/g)) {
      dependencies.add(Number(reference[1]));
    }
  };

  for (const rawLine of body.split(/\r?\n/)) {
    const line = rawLine.trim();

    // CommonMark indented code blocks start at four spaces or a tab after a
    // block boundary. Ignore their contents before heading/dependency parsing.
    if (line === "") {
      previousLineWasBlank = true;
      continue;
    }
    if (/^(?: {4,}|\t)/.test(rawLine) && (previousLineWasBlank || inIndentedCodeBlock)) {
      inIndentedCodeBlock = true;
      previousLineWasBlank = false;
      continue;
    }
    inIndentedCodeBlock = false;
    previousLineWasBlank = false;

    // CommonMark fences close only with the same marker character and at least
    // the opening fence length. A mismatched or shorter fence is code content.
    const fence = /^ {0,3}(`{3,}|~{3,})(.*)$/.exec(rawLine);
    if (fence) {
      if (fenceCharacter === null) {
        // CommonMark forbids backticks in a backtick fence's info string.
        // Treat such a line as ordinary task text, not as an opener that
        // could hide real dependencies later in this section.
        if (fence[1][0] === "`" && fence[2].includes("`")) {
          if (inDependencySection) addReferences(rawLine);
          continue;
        }
        fenceCharacter = fence[1][0];
        fenceLength = fence[1].length;
      } else if (
        fence[1][0] === fenceCharacter &&
        fence[1].length >= fenceLength &&
        fence[2].trim() === ""
      ) {
        fenceCharacter = null;
        fenceLength = 0;
      }
      continue;
    }
    if (fenceCharacter !== null) continue;

    const heading = /^#{1,6}\s+(.+?)\s*$/.exec(line);
    if (heading) {
      inDependencySection = /^Dependencies(?:\s*\/\s*context)?$/i.test(heading[1].trim());
      previousLineWasBlank = true;
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
