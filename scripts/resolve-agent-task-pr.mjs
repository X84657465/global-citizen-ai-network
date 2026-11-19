import { appendFileSync } from "node:fs";
import { createGitHubApiClient } from "../lib/github-api-client.mjs";
import { createFactoryStateStore } from "../lib/agent-factory-state-store.mjs";
import {
  isAgentTaskBranchForIssue,
  parseAgentTaskIssueNumber,
} from "../lib/agent-task-pr-metadata.mjs";

const repository = process.env.GITHUB_REPOSITORY ?? "";
const token = process.env.GITHUB_TOKEN ?? "";
const apiBase = (process.env.GITHUB_API_URL || "https://api.github.com").replace(/\/+$/, "");

function writeOutput(key, value) {
  const output = process.env.GITHUB_OUTPUT;
  if (!output) return;
  const safeValue = String(value ?? "").replace(/[\r\n]/g, " ");
  appendFileSync(output, key + "=" + safeValue + "\n", "utf8");
}

async function main() {
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository) || !token) {
    throw new Error("GITHUB_REPOSITORY and GITHUB_TOKEN are required.");
  }
  const pullRequestNumber = Number(process.env.PULL_REQUEST_NUMBER ?? 0);
  const api = createGitHubApiClient({
    baseUrl: apiBase,
    token,
    timeoutMs: 15_000,
    maxRetries: 2,
    maxInlineRetryDelayMs: 30_000,
  });
  const stateStore = createFactoryStateStore(api, {
    repository,
    issueNumber: process.env.AGENT_FACTORY_STATE_ISSUE_NUMBER,
  });
  const stateRecord = await stateStore.read();
  writeOutput("state_issue_number", stateRecord.issue?.number ?? "");

  if (!Number.isSafeInteger(pullRequestNumber) || pullRequestNumber < 1) {
    writeOutput("is_current_head", "true");
    writeOutput("is_task_pr", "false");
    writeOutput("issue_number", "");
    writeOutput("pull_request_number", "");
    writeOutput("head_sha", "");
    writeOutput("head_ref", "");
    console.log("No pull-request candidate metadata applies to this event.");
    return;
  }

  let pull;
  try {
    pull = await api.request("/repos/" + repository + "/pulls/" + pullRequestNumber);
  } catch (error) {
    if (error?.status === 404) {
      writeOutput("is_current_head", "false");
      writeOutput("is_task_pr", "false");
      writeOutput("issue_number", "");
      writeOutput("pull_request_number", pullRequestNumber);
      writeOutput("head_sha", "");
      writeOutput("head_ref", "");
      console.log("Pull request no longer exists; stale event will be ignored.");
      return;
    }
    throw error;
  }

  const body = typeof pull.body === "string" ? pull.body : "";
  const markerPresent = body.includes("<!-- ai-task:");
  const issueNumber = parseAgentTaskIssueNumber(body);
  if (markerPresent && !issueNumber) {
    throw new Error("Pull request contains an ambiguous or invalid AI task marker.");
  }

  const expectedSha = process.env.EXPECTED_HEAD_SHA ?? "";
  const expectedRef = process.env.EXPECTED_HEAD_REF ?? "";
  const sameRepository = pull.head?.repo?.full_name === repository;
  const owner = repository.split("/")[0].toLowerCase();
  const pullAuthor = String(pull.user?.login ?? "").toLowerCase();
  const trustedPullAuthor = pullAuthor === owner || pullAuthor === "github-actions[bot]";
  const currentHead = pull.state === "open" &&
    sameRepository &&
    (!expectedSha || pull.head?.sha === expectedSha) &&
    (!expectedRef || pull.head?.ref === expectedRef);
  let authorizedTaskIssue = false;
  if (issueNumber && sameRepository && trustedPullAuthor &&
      isAgentTaskBranchForIssue(pull.head?.ref, issueNumber)) {
    try {
      const issue = await api.request("/repos/" + repository + "/issues/" + issueNumber);
      authorizedTaskIssue = issue?.state === "open" &&
        String(issue?.user?.login ?? "").toLowerCase() === owner &&
        typeof issue?.title === "string" &&
        issue.title.startsWith("[AI Task]");
    } catch (error) {
      if (error?.status !== 404) throw error;
    }
  }
  const isTaskPr = Boolean(issueNumber && sameRepository && trustedPullAuthor &&
    isAgentTaskBranchForIssue(pull.head?.ref, issueNumber) && authorizedTaskIssue);

  writeOutput("is_current_head", currentHead ? "true" : "false");
  writeOutput("is_task_pr", isTaskPr ? "true" : "false");
  writeOutput("issue_number", isTaskPr ? issueNumber : "");
  writeOutput("pull_request_number", pullRequestNumber);
  writeOutput("head_sha", pull.head?.sha ?? "");
  writeOutput("head_ref", pull.head?.ref ?? "");

  if (!currentHead) {
    console.log("Stale or closed pull-request event ignored; current PR head differs from the event SHA/ref.");
  } else if (isTaskPr) {
    console.log("Resolved AI task PR #" + pullRequestNumber + " for Issue #" + issueNumber +
      " at exact head " + pull.head.sha + ".");
  } else {
    console.log("Pull request is not an eligible AI task candidate.");
  }
}

main().catch((error) => {
  console.error("Candidate PR metadata resolution failed: " + (error instanceof Error ? error.message : String(error)));
  process.exitCode = 1;
});
