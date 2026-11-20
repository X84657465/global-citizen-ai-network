import { isAgentTaskBranchForIssue } from "./agent-task-pr-metadata.mjs";

const SHA = /^[a-f0-9]{40}$/i;
const REPOSITORY = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;
const ISO_TIMESTAMP = /^\d{4}-\d{2}-\d{2}T/;

function positiveInteger(value, label) {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1) throw new TypeError(label + " must be a positive safe integer.");
  return parsed;
}
function boundedText(value, label, maxLength) {
  if (typeof value !== "string" || !value.trim() || value.length > maxLength || /[\r\n\0]/.test(value)) {
    throw new TypeError(label + " must be non-empty, bounded text.");
  }
  return value.trim();
}

/** Create the model-independent EvidenceRecord v1.0.0 consumed by C/D. */
export function createFactoryCandidateEvidenceRecord(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new TypeError("Evidence input must be an object.");
  const repository = boundedText(input.repository, "repository", 200);
  if (!REPOSITORY.test(repository)) throw new TypeError("repository must use owner/repo format.");
  const issueNumber = positiveInteger(input.issue_number, "issue_number");
  const pullRequestNumber = positiveInteger(input.pull_request_number, "pull_request_number");
  const branch = boundedText(input.branch, "branch", 255);
  if (!isAgentTaskBranchForIssue(branch, issueNumber)) throw new TypeError("branch must be the exact deterministic branch for the task Issue.");
  if (typeof input.commit_sha !== "string" || !SHA.test(input.commit_sha)) throw new TypeError("commit_sha must be a 40-character hexadecimal SHA.");
  const runId = positiveInteger(input.ci_run_id, "ci_run_id");
  const runAttempt = positiveInteger(input.ci_run_attempt, "ci_run_attempt");
  if (input.conclusion !== "success" && input.conclusion !== "failure") {
    throw new TypeError("conclusion must be success or failure; non-terminal runs are not evidence.");
  }
  if (typeof input.timestamp !== "string" || !ISO_TIMESTAMP.test(input.timestamp) || !Number.isFinite(Date.parse(input.timestamp))) {
    throw new TypeError("timestamp must be a valid ISO-8601 timestamp.");
  }
  return {
    repository,
    branch,
    commit_sha: input.commit_sha.toLowerCase(),
    command: "Agent Factory candidate CI evidence v1.0.0; Issue #" + issueNumber +
      "; PR #" + pullRequestNumber + "; run #" + runId + "; attempt " + runAttempt,
    result: input.conclusion === "success" ? "pass" : "fail",
    run_url: "https://github.com/" + repository + "/actions/runs/" + runId,
    timestamp: new Date(input.timestamp).toISOString(),
  };
}
