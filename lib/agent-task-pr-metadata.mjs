export function parseAgentTaskIssueNumber(body) {
  if (typeof body !== "string" || !body) return null;
  const matches = [...body.matchAll(/<!--\s*ai-task:(\d+)\s*-->/g)];
  if (matches.length !== 1) return null;
  const issueNumber = Number(matches[0][1]);
  return Number.isSafeInteger(issueNumber) && issueNumber > 0 ? issueNumber : null;
}

export function isAgentTaskBranchForIssue(branch, issueNumber) {
  return typeof branch === "string" &&
    Number.isSafeInteger(Number(issueNumber)) &&
    Number(issueNumber) > 0 &&
    branch.startsWith("ai-task/issue-" + Number(issueNumber) + "-") &&
    branch.length > ("ai-task/issue-" + Number(issueNumber) + "-").length;
}
