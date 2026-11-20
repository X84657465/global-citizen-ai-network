export function parseAgentTaskIssueNumber(body) {
  if (typeof body !== "string" || !body) return null;
  const matches = [...body.matchAll(/<!--\s*ai-task:(\d+)\s*-->/g)];
  if (matches.length !== 1) return null;
  const issueNumber = Number(matches[0][1]);
  return Number.isSafeInteger(issueNumber) && issueNumber > 0 ? issueNumber : null;
}

export function isAgentTaskBranchForIssue(branch, issueNumber) {
  if (typeof branch !== "string" ||
      !Number.isSafeInteger(Number(issueNumber)) ||
      Number(issueNumber) < 1) {
    return false;
  }
  // The publisher derives exactly 12 lowercase hex characters from the
  // validated base SHA and canonical patch. Reject loose prefixes, control
  // characters, and arbitrary suffixes at the candidate trust boundary.
  return new RegExp("^ai-task/issue-" + Number(issueNumber) + "-[a-f0-9]{12}$").test(branch);
}
