const PRIORITY_RANK = Object.freeze({ P0: 0, P1: 1, P2: 2, P3: 3 });

export function taskPriority(issue) {
  const body = typeof issue?.body === "string" ? issue.body : "";
  const match = /^##\s+Priority\s*\r?\n([^\r\n]+)/im.exec(body);
  const value = match?.[1]?.trim().match(/^(P[0-3])(?:\s|$)/i)?.[1]?.toUpperCase();
  return value && Object.hasOwn(PRIORITY_RANK, value) ? value : null;
}

export function compareTaskIssues(a, b) {
  const rankA = PRIORITY_RANK[taskPriority(a) ?? "P3"] ?? 4;
  const rankB = PRIORITY_RANK[taskPriority(b) ?? "P3"] ?? 4;
  if (rankA !== rankB) return rankA - rankB;
  const createdA = Date.parse(a?.created_at ?? "") || Number.MAX_SAFE_INTEGER;
  const createdB = Date.parse(b?.created_at ?? "") || Number.MAX_SAFE_INTEGER;
  if (createdA !== createdB) return createdA - createdB;
  return Number(a?.number ?? 0) - Number(b?.number ?? 0);
}

export function sortTaskIssues(issues) {
  if (!Array.isArray(issues)) throw new TypeError("Task queue must be an array.");
  return [...issues].sort(compareTaskIssues);
}

export function isMergedTaskPullRequest(pull) {
  return pull?.merged === true || (typeof pull?.merged_at === "string" && pull.merged_at.length > 0);
}
