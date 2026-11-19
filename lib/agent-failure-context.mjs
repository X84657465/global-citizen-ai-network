export function inferTaskIssueNumber({ branch = "", body = "" } = {}) {
  const branchMatch = /^(?:ai-task|codex)\/issue-([1-9][0-9]*)(?:-|$)/.exec(branch);
  const markerMatch = /<!-- ai-task:([1-9][0-9]*) -->/.exec(body);
  const branchNumber = branchMatch ? Number(branchMatch[1]) : null;
  const markerNumber = markerMatch ? Number(markerMatch[1]) : null;
  if (branchNumber && markerNumber && branchNumber !== markerNumber) return null;
  return markerNumber || branchNumber || null;
}
