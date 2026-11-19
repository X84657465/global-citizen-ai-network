import { appendFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { apiCooldownUntil, cooldownActive, nextFailureState, nextPlannerTask, plannerIssueBody, successState } from "../lib/agent-factory-policy.mjs";
import { inferTaskIssueNumber } from "../lib/agent-failure-context.mjs";

const repository = process.env.GITHUB_REPOSITORY ?? "";
const token = process.env.GITHUB_TOKEN ?? "";
const mode = process.env.AGENT_FACTORY_MODE ?? "check";
const output = process.env.GITHUB_OUTPUT ?? "";
const writeOutput = (key, value) => { if (output) appendFileSync(output, key + "=" + String(value) + "\n", "utf8"); };
if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository) || !token) throw new Error("GITHUB_REPOSITORY and GITHUB_TOKEN are required.");
const [owner] = repository.split("/");
const base = "https://api.github.com/repos/" + repository;
const localStateDir = join(homedir(), ".global-citizen-ai-network");
const localStatePath = join(localStateDir, "agent-factory-state.json");
function readLocalState() {
  try { return JSON.parse(readFileSync(localStatePath, "utf8")); } catch { return {}; }
}
function saveLocalState(value) {
  mkdirSync(localStateDir, { recursive: true });
  writeFileSync(localStatePath, JSON.stringify(value, null, 2) + "\n", "utf8");
}
const localState = readLocalState();
if (mode === "check" && cooldownActive(localState)) {
  writeOutput("cooldown_active", true);
  writeOutput("cooldown_until", localState.cooldown_until);
  writeOutput("skipped_issues", (localState.skipped_issue_numbers ?? []).join(","));
  console.log("Local circuit breaker active until " + localState.cooldown_until + "; skipped GitHub API calls and task work.");
  process.exit(0);
}
let effectiveState = localState;
const headers = { Accept: "application/vnd.github+json", Authorization: "Bearer " + token, "X-GitHub-Api-Version": "2022-11-28", "Content-Type": "application/json" };

async function api(path, options = {}) {
  const response = await fetch(base + path, { ...options, headers: { ...headers, ...(options.headers ?? {}) }, signal: AbortSignal.timeout(15000) });
  const raw = await response.text();
  let data = null;
  try { data = raw ? JSON.parse(raw) : null; } catch {}
  if (!response.ok) {
    const detail = data?.message || raw.slice(0, 300) || response.statusText;
    const error = new Error("GitHub API HTTP " + response.status + ": " + detail);
    error.status = response.status;
    error.retryAfter = response.headers.get("retry-after");
    error.rateLimitReset = response.headers.get("x-ratelimit-reset");
    throw error;
  }
  return data;
}
async function listIssues(state) {
  const collected = [];
  for (let page = 1; page <= 10; page += 1) {
    const batch = await api("/issues?state=" + state + "&per_page=100&page=" + page + "&sort=created&direction=asc");
    if (!Array.isArray(batch)) throw new Error("GitHub issue listing returned an unexpected response.");
    collected.push(...batch);
    if (batch.length < 100) break;
  }
  return collected;
}
const isStateIssue = (issue) => !issue.pull_request && issue.title === "[AI Factory State] Durable scheduler and circuit-breaker state";
function readState(issue) {
  const match = issue?.body?.match(/<!-- agent-factory-state:([A-Za-z0-9+/=]+) -->/);
  if (!match) return {};
  try { return JSON.parse(Buffer.from(match[1], "base64").toString("utf8")); } catch { return {}; }
}
const stateBody = (state) => "Machine-managed scheduler state. Do not edit this issue manually.\n\n<!-- agent-factory-state:" + Buffer.from(JSON.stringify(state)).toString("base64") + " -->";
async function persistState(issues, state) {
  const existing = issues.find(isStateIssue);
  if (!existing) return api("/issues", { method: "POST", body: JSON.stringify({ title: "[AI Factory State] Durable scheduler and circuit-breaker state", body: stateBody(state) }) });
  await api("/issues/" + existing.number, { method: "PATCH", body: JSON.stringify({ body: stateBody(state) }) });
  return existing;
}
async function inferFailedIssueNumber() {
  const explicit = Number(process.env.FAILED_ISSUE_NUMBER);
  if (Number.isInteger(explicit) && explicit > 0) return explicit;
  try {
    const event = JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, "utf8"));
    const dispatchedIssue = Number(event.inputs?.issue_number ?? event.issue?.number ?? 0);
    if (Number.isInteger(dispatchedIssue) && dispatchedIssue > 0) return dispatchedIssue;

    let branch = event.pull_request?.head?.ref ?? "";
    let body = event.pull_request?.body ?? "";

    const dispatchedPullNumber = Number(event.client_payload?.pull_request_number ?? 0);
    if (Number.isInteger(dispatchedPullNumber) && dispatchedPullNumber > 0) {
      const pull = await api("/pulls/" + dispatchedPullNumber);
      branch = pull.head?.ref ?? branch;
      body = pull.body ?? body;
    }

    if (!branch && typeof event.ref === "string") {
      branch = event.ref.startsWith("refs/heads/") ? event.ref.slice("refs/heads/".length) : event.ref;
    }

    let issueNumber = inferTaskIssueNumber({ branch, body });
    if (issueNumber) return issueNumber;

    if (!body && branch) {
      const pulls = await api("/pulls?state=open&head=" + encodeURIComponent(owner + ":" + branch) + "&per_page=20");
      body = pulls.find((pull) => pull.head?.ref === branch)?.body ?? "";
      issueNumber = inferTaskIssueNumber({ branch, body });
    }
    return issueNumber;
  } catch {
    return null;
  }
}
try {
  const allIssues = await listIssues("all");
  const stateIssue = allIssues.find(isStateIssue);
  const remoteState = readState(stateIssue);
  const localUpdated = Date.parse(localState.updated_at ?? "") || 0;
  const remoteUpdated = Date.parse(remoteState.updated_at ?? "") || 0;
  let state = localUpdated > remoteUpdated ? localState : remoteState;
  effectiveState = state;

  if (mode === "check") {
    const active = cooldownActive(state);
    writeOutput("cooldown_active", active);
    writeOutput("cooldown_until", state.cooldown_until ?? "");
    writeOutput("skipped_issues", (state.skipped_issue_numbers ?? []).join(","));
    saveLocalState(state);
    console.log(active ? "Circuit breaker active until " + state.cooldown_until + "; no task is started." : "Circuit breaker clear.");
  } else if (mode === "failure") {
    const failedIssueNumber = await inferFailedIssueNumber();
    const requestedScope = process.env.AGENT_FACTORY_FAILURE_SCOPE === "task" ? "task" : "system";
    const failureScope = requestedScope === "task" && failedIssueNumber ? "task" : "system";
    state = nextFailureState(state, process.env.FAILURE_SUMMARY || "Task workflow failed; inspect the Actions run.", Date.now(), failedIssueNumber, failureScope);
    effectiveState = state;
    saveLocalState(state);
    await persistState(allIssues, state);
    if (failedIssueNumber && (state.skipped_issue_numbers ?? []).includes(failedIssueNumber)) {
      await api("/issues/" + failedIssueNumber + "/comments", {
        method: "POST",
        body: JSON.stringify({
          body: "<!-- ai-task-skipped -->\nThis task has failed three consecutive automated attempts and was moved to the skipped queue. The factory will continue with other eligible tasks. Review the linked Actions runs before manually reopening or editing this task."
        }),
      });
    }
    console.log(failureScope === "task"
      ? "Recorded task-scoped failure for issue #" + failedIssueNumber + " (" + (state.task_failures[String(failedIssueNumber)] ?? 0) + "/" + 3 + "). " + ((state.skipped_issue_numbers ?? []).includes(failedIssueNumber) ? "Task quarantined; other queued tasks remain eligible." : "Global circuit breaker unchanged.")
      : "Recorded system-scoped failure " + state.consecutive_failures + "/3. " + (state.cooldown_until ? "Cooldown until " + state.cooldown_until : "Next system failure may trigger 15 minutes of cooldown."));
  } else if (mode === "success") {
    const requestedSuccessScope = process.env.AGENT_FACTORY_SUCCESS_SCOPE ?? "system";
    const explicitCompletedIssueNumber = Number(process.env.COMPLETED_ISSUE_NUMBER) || null;
    const inferredCompletedIssueNumber = requestedSuccessScope === "task_and_system"
      ? await inferFailedIssueNumber()
      : null;
    const completedIssueNumber = explicitCompletedIssueNumber || inferredCompletedIssueNumber;
    const successScope = requestedSuccessScope === "task" && completedIssueNumber
      ? "task"
      : requestedSuccessScope === "task_and_system" && completedIssueNumber
        ? "task_and_system"
        : "system";
    const reset = successState(Date.now(), state, completedIssueNumber, successScope);
    effectiveState = reset;
    saveLocalState(reset);
    await persistState(allIssues, reset);
    console.log(successScope === "task"
      ? "Successful task publication recorded; only issue #" + completedIssueNumber + " retry state was cleared."
      : successScope === "task_and_system"
        ? "Verified CI success cleared global cooldown and issue #" + completedIssueNumber + " retry state."
        : "System-level success recorded; global circuit breaker reset.");
  } else if (mode === "plan") {
    const openIssues = await listIssues("open");
    const allPulls = await api("/pulls?state=all&per_page=100");
    const skipped = new Set(state.skipped_issue_numbers ?? []);
    const taskPulls = allPulls.map((pull) => ({
      pull,
      issueNumber: Number(/<!-- ai-task:(\d+) -->/.exec(pull.body || "")?.[1]) || null,
    })).filter((entry) => entry.issueNumber);
    const completedByMerge = new Set(taskPulls.filter((entry) => entry.pull.merged === true).map((entry) => entry.issueNumber));
    const activeTaskPull = taskPulls.some((entry) => entry.pull.state === "open");
    const openTasks = openIssues.filter((issue) => !issue.pull_request && issue.title?.startsWith("[AI Task]"));
    const pendingTasks = openTasks.filter((issue) => !skipped.has(issue.number) && !completedByMerge.has(issue.number));
    if (pendingTasks.length || activeTaskPull) {
      writeOutput("created_issue_number", "");
      console.log("Planner idle: open task Issues or an active task PR still exist.");
    } else {
      const task = nextPlannerTask(allIssues.map((issue) => issue.title));
      if (!task) {
        writeOutput("created_issue_number", "");
        console.log("Planner exhausted its approved roadmap templates; no speculative task created.");
      } else {
        const created = await api("/issues", { method: "POST", body: JSON.stringify({ title: task.title, body: plannerIssueBody(task) }) });
        writeOutput("created_issue_number", created.number);
        console.log("Created one bounded roadmap task: #" + created.number);
      }
    }
  } else {
    throw new Error("Unsupported AGENT_FACTORY_MODE: " + mode);
  }
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  const now = Date.now();
  const cooldownUntil = apiCooldownUntil(error, now);
  const reset = {
    ...effectiveState,
    consecutive_failures: Math.max(3, Number(effectiveState.consecutive_failures) || 0),
    cooldown_until: cooldownUntil,
    task_failures: { ...(effectiveState.task_failures ?? {}) },
    skipped_issue_numbers: [...(effectiveState.skipped_issue_numbers ?? [])],
    last_failure_at: new Date(now).toISOString(),
    last_error: message.slice(0, 1200),
    updated_at: new Date(now).toISOString(),
  };
  saveLocalState(reset);
  if (mode === "check") {
    writeOutput("cooldown_active", true);
    writeOutput("cooldown_until", reset.cooldown_until);
    writeOutput("skipped_issues", (reset.skipped_issue_numbers ?? []).join(","));
    console.warn("API/controller error opened a local cooldown until " + reset.cooldown_until + ": " + message);
    process.exit(0);
  }
  throw error;
}
