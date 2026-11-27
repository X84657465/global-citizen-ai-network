import { createHash } from "node:crypto";
import { collectGitHubPages } from "./github-pagination.mjs";
import { taskDependenciesResolved } from "./agent-task-dependencies.mjs";
import { sortTaskIssues, isMergedTaskPullRequest, isTaskAlreadyPublished } from "./agent-task-queue.mjs";
import { createFactoryStateStore } from "./agent-factory-state-store.mjs";
import { validateAndBuildTask } from "./agent-task-validation.mjs";
import { createTrustedAcceptanceOracle } from "./agent-factory-trusted-oracle.mjs";
import { createLocalFactoryPublicationTarget } from "./agent-factory-local-publication-contract.mjs";

const REPOSITORY_RE = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;
const SHA_RE = /^[a-f0-9]{40}$/i;

function fail(message, scope = "system") {
  const error = new Error(message);
  error.scope = scope;
  throw error;
}

function digest(value) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function issueUrl(repository, issueNumber) {
  return "https://github.com/" + repository + "/issues/" + issueNumber;
}

export function buildGitHubIssueSourceEnvelope({
  repository,
  issue,
  sourceStateVersion,
} = {}) {
  if (!REPOSITORY_RE.test(repository ?? "") ||
      !Number.isSafeInteger(issue?.number) || issue.number < 1 ||
      issue.pull_request || issue.state !== "open" ||
      issue.html_url !== issueUrl(repository, issue.number) ||
      typeof issue.updated_at !== "string" || !Number.isFinite(Date.parse(issue.updated_at)) ||
      typeof issue.body !== "string" ||
      !Number.isSafeInteger(sourceStateVersion) || sourceStateVersion < 0) {
    fail("GitHub Issue source identity or durable state version is invalid.", "task");
  }
  const dedupeKey = digest(repository.toLowerCase() + "#" + issue.number);
  return Object.freeze({
    schema_version: 1,
    kind: "github-issue-source",
    repository,
    issue_number: issue.number,
    canonical_url: issueUrl(repository, issue.number),
    updated_at: issue.updated_at,
    source_state_version: sourceStateVersion,
    stable_dedupe_key: dedupeKey,
    issue_body_sha256: digest(issue.body),
  });
}

export function selectEligibleGitHubTask({
  issues,
  pulls,
  factoryState,
  repository,
  skippedIssueNumbers = [],
} = {}) {
  if (!Array.isArray(issues) || !Array.isArray(pulls) ||
      !factoryState || typeof factoryState !== "object" ||
      !REPOSITORY_RE.test(repository ?? "")) {
    fail("GitHub task selection inputs are incomplete.", "system");
  }
  if (factoryState.active_task) {
    return { selected: null, reason: "active_factory_lease" };
  }
  const owner = repository.split("/")[0].toLowerCase();
  const taskStateByIssue = factoryState.tasks ?? {};
  const skipped = new Set(skippedIssueNumbers);
  const merged = new Set();
  const openTaskPrs = new Set();
  const issuesByNumber = new Map(issues.filter((issue) => !issue.pull_request).map((issue) => [issue.number, issue]));
  for (const pull of pulls) {
    const match = typeof pull.body === "string" ? pull.body.match(/<!-- ai-task:(\d+) -->/) : null;
    if (match && pull.state === "open") openTaskPrs.add(Number(match[1]));
    if (match && isMergedTaskPullRequest(pull)) merged.add(Number(match[1]));
  }
  const ready = issues.filter((issue) =>
    !issue.pull_request &&
    issue.state === "open" &&
    (issue.user?.login?.toLowerCase() === owner ||
      (issue.user?.login?.toLowerCase() === "github-actions[bot]" &&
       typeof issue.body === "string" && issue.body.includes("<!-- ai-task-generated-by-planner -->"))) &&
    typeof issue.title === "string" && issue.title.startsWith("[AI Task]") &&
    !isTaskAlreadyPublished(issue.number, taskStateByIssue[String(issue.number)], openTaskPrs, merged) &&
    !skipped.has(issue.number) &&
    (!taskStateByIssue[String(issue.number)] ||
      (taskStateByIssue[String(issue.number)].status === "queued" && !taskStateByIssue[String(issue.number)].quarantined))
  );
  const dependencyReady = ready.filter((issue) => taskDependenciesResolved(issue.body, issuesByNumber, merged));
  const ordered = sortTaskIssues(dependencyReady);
  return {
    selected: ordered[0] ?? null,
    reason: ordered.length > 0 ? "selected" : ready.length > dependencyReady.length ? "dependencies_blocked" : "queue_empty",
    blocked_by_dependencies: ready.length - dependencyReady.length,
    open_task_prs: openTaskPrs.size,
  };
}

export async function intakeNextGitHubIssue({
  api,
  queue,
  repository,
  repositoryRoot,
  oracleTestFiles,
  baseSha,
  baseBranch,
  stateIssueNumber,
  skippedIssueNumbers = [],
} = {}) {
  fail("GitHub Issue intake is disabled until a cross-executor V2 lease/fencing coordinator is implemented and independently verified. Local SQLite idempotency is not a distributed lock.", "system");
  if (!api || typeof api.request !== "function" ||
      !queue || typeof queue.addFromSource !== "function" ||
      !REPOSITORY_RE.test(repository ?? "") ||
      typeof repositoryRoot !== "string" || repositoryRoot.length === 0 ||
      !Array.isArray(oracleTestFiles) || oracleTestFiles.length === 0 ||
      !SHA_RE.test(baseSha ?? "") ||
      typeof baseBranch !== "string" || baseBranch.length === 0) {
    fail("Local Issue intake requires GitHub API, SQLite queue, exact base SHA, base branch and operator-configured Oracle files.", "system");
  }

  const [issues, pulls] = await Promise.all([
    collectGitHubPages((page) => api.request(
      "/repos/" + repository + "/issues?state=all&per_page=100&sort=created&direction=asc&page=" + page,
    )),
    collectGitHubPages((page) => api.request(
      "/repos/" + repository + "/pulls?state=all&per_page=100&page=" + page,
    )),
  ]);
  const stateStore = createFactoryStateStore(api, { repository, issueNumber: stateIssueNumber });
  const stored = await stateStore.read();
  const selection = selectEligibleGitHubTask({
    issues,
    pulls,
    factoryState: stored.state,
    repository,
    skippedIssueNumbers,
  });
  if (!selection.selected) {
    return { queued: false, reason: selection.reason, blocked_by_dependencies: selection.blocked_by_dependencies ?? 0 };
  }

  const selected = selection.selected;
  const exactIssue = await api.request("/repos/" + repository + "/issues/" + selected.number);
  if (!exactIssue || exactIssue.number !== selected.number ||
      exactIssue.updated_at !== selected.updated_at ||
      exactIssue.html_url !== issueUrl(repository, selected.number) ||
      exactIssue.state !== "open" || exactIssue.pull_request) {
    fail("Selected GitHub Issue changed during intake; rerun selection against the latest durable state.", "system");
  }

  let task;
  try {
    task = validateAndBuildTask(exactIssue, repository);
  } catch (error) {
    fail("Selected GitHub Issue failed the existing V2 task validation: " +
      (error instanceof Error ? error.message : "unknown validation error"), "task");
  }
  const taskId = "github-issue-" + exactIssue.number;
  const sourceEnvelope = buildGitHubIssueSourceEnvelope({
    repository,
    issue: exactIssue,
    sourceStateVersion: stored.state.state_version,
  });
  const trustedOracleContract = createTrustedAcceptanceOracle({
    repositoryRoot,
    baseSha,
    taskId,
    oracleTestFiles,
    workerAllowedPaths: task.allowed_paths,
  });
  const publicationTarget = createLocalFactoryPublicationTarget({
    taskId,
    repository,
    baseBranch,
    baseSha,
    contractSha256: trustedOracleContract.contract_sha256,
  });
  const queued = queue.addFromSource({
    id: taskId,
    title: task.title,
    sourceEnvelope,
    payload: {
      schema_version: 1,
      kind: "local-agent-task",
      task_id: taskId,
      source_envelope: sourceEnvelope,
      task,
      trusted_oracle_contract: trustedOracleContract,
      publication_target: publicationTarget,
    },
  });
  return {
    queued: queued.created,
    duplicate: !queued.created,
    reason: queued.created ? "issue_intake_persisted" : "same_issue_already_intaken",
    source_envelope: sourceEnvelope,
    task: queued.task,
  };
}
