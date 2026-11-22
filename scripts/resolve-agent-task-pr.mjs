import { appendFileSync, writeFileSync } from "node:fs";
import { createGitHubApiClient } from "../lib/github-api-client.mjs";
import { createFactoryStateStore } from "../lib/agent-factory-state-store.mjs";
import { persistApiCooldownDeadline } from "../lib/agent-factory-api-cooldown.mjs";
import {
  isAgentTaskBranchForIssue,
  parseAgentTaskIssueNumber,
} from "../lib/agent-task-pr-metadata.mjs";

const repository = process.env.GITHUB_REPOSITORY ?? "";
const token = process.env.GITHUB_TOKEN ?? "";
const apiBase = (process.env.GITHUB_API_URL || "https://api.github.com").replace(/\/+$/, "");
const resolverDiagnosticsOutput = process.env.RESOLVER_DIAGNOSTICS_OUTPUT ?? "";
let resolverStage = "startup";

function writeResolverDiagnostic(error) {
  if (error?.rateLimited === true) {
    try { persistApiCooldownDeadline(error); } catch {
      console.error("Unable to persist the resolver's provider rate-limit deadline.");
    }
  }
  if (!resolverDiagnosticsOutput) return;
  const safePath = typeof error?.path === "string" &&
    /^\/repos\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+\/(pulls|issues)\/\d+$/.test(error.path)
    ? error.path
    : "";
  const evidence = {
    schemaVersion: 1,
    stage: resolverStage,
    errorName: typeof error?.name === "string" ? error.name.slice(0, 80) : "Error",
    httpStatus: Number.isInteger(error?.status) ? error.status : null,
    method: typeof error?.method === "string" ? error.method.slice(0, 12) : "",
    path: safePath,
    rateLimited: error?.rateLimited === true,
    retryAfterMs: Number.isFinite(error?.retryAfterMs) ? error.retryAfterMs : null,
  };
  try {
    writeFileSync(resolverDiagnosticsOutput, JSON.stringify(evidence, null, 2) + "\n", "utf8");
  } catch {
    console.error("Resolver redacted diagnostic artifact could not be written.");
  }
}

function writeOutput(key, value) {
  const output = process.env.GITHUB_OUTPUT;
  if (!output) return;
  const safeValue = String(value ?? "").replace(/[\r\n]/g, " ");
  appendFileSync(output, key + "=" + safeValue + "\n", "utf8");
}

async function main() {
  resolverStage = "validate_environment";
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository) || !token) {
    throw new Error("GITHUB_REPOSITORY and GITHUB_TOKEN are required.");
  }
  resolverStage = "parse_event_metadata";
  const pullRequestNumber = Number(process.env.PULL_REQUEST_NUMBER ?? 0);
  const api = createGitHubApiClient({
    baseUrl: apiBase,
    token,
    timeoutMs: 15_000,
    maxRetries: 2,
    maxInlineRetryDelayMs: 30_000,
  });
  if (!Number.isSafeInteger(pullRequestNumber) || pullRequestNumber < 1) {
    writeOutput("state_issue_number", "");
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
  resolverStage = "fetch_pull_request";
  console.log("Resolver stage: requesting PR metadata; repository=" + repository + ", pull_request=" + pullRequestNumber + ".");
  try {
    pull = await api.request("/repos/" + repository + "/pulls/" + pullRequestNumber);
    console.log("Resolver stage: PR metadata received; state=" + String(pull.state ?? "unknown") +
      ", head_sha=" + String(pull.head?.sha ?? "unknown") + ".");
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
    console.error("Resolver PR metadata request failed: status=" + String(error?.status ?? "unknown") +
      ", method=" + String(error?.method ?? "GET") +
      ", path=" + String(error?.path ?? "unknown") +
      ", rate_limited=" + String(error?.rateLimited === true) +
      ", retry_after_ms=" + String(error?.retryAfterMs ?? "unknown") + ".");
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
  const sameBaseRepository = pull.base?.repo?.full_name === repository && pull.base?.ref === "main";
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
      console.log("Resolver stage: verifying authorized task issue #" + issueNumber + ".");
      const issue = await api.request("/repos/" + repository + "/issues/" + issueNumber);
      authorizedTaskIssue = issue?.state === "open" &&
        String(issue?.user?.login ?? "").toLowerCase() === owner &&
        typeof issue?.title === "string" &&
        issue.title.startsWith("[AI Task]");
    } catch (error) {
      if (error?.status !== 404) throw error;
    }
  }
  const isTaskPr = Boolean(issueNumber && sameRepository && sameBaseRepository && trustedPullAuthor &&
    isAgentTaskBranchForIssue(pull.head?.ref, issueNumber) && authorizedTaskIssue);

  // Ordinary product/documentation PRs do not need durable factory state.
  // Defer the Issue scan until an authorized AI-task PR actually needs it.
  let stateIssueNumber = "";
  if (isTaskPr) {
    resolverStage = "read_factory_state";
    const stateStore = createFactoryStateStore(api, {
      repository,
      issueNumber: process.env.AGENT_FACTORY_STATE_ISSUE_NUMBER,
    });
    console.log("Resolver stage: reading durable Factory state for authorized task PR #" + pullRequestNumber + ".");
    const stateRecord = await stateStore.read();
    stateIssueNumber = stateRecord.issue?.number ?? "";
  }
  resolverStage = "write_outputs";
  writeOutput("state_issue_number", stateIssueNumber);

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
  writeResolverDiagnostic(error);
  console.error("Candidate PR metadata resolution failed: stage=" + resolverStage +
    ", name=" + String(error?.name ?? "Error") +
    ", status=" + String(error?.status ?? "unknown") +
    ", method=" + String(error?.method ?? "unknown") +
    ", path=" + String(error?.path ?? "unknown") +
    ", rate_limited=" + String(error?.rateLimited === true) + ".");
  process.exitCode = 1;
});
