import { appendFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { cooldownActive, nextFailureState, nextPlannerTask, plannerIssueBody, successState } from "../lib/agent-factory-policy.mjs";

const repository = process.env.GITHUB_REPOSITORY ?? "";
const token = process.env.GITHUB_TOKEN ?? "";
const mode = process.env.AGENT_FACTORY_MODE ?? "check";
const output = process.env.GITHUB_OUTPUT ?? "";
if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository) || !token) throw new Error("GITHUB_REPOSITORY and GITHUB_TOKEN are required.");
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
const headers = { Accept: "application/vnd.github+json", Authorization: "Bearer " + token, "X-GitHub-Api-Version": "2022-11-28", "Content-Type": "application/json" };

async function api(path, options = {}) {
  const response = await fetch(base + path, { ...options, headers: { ...headers, ...(options.headers ?? {}) }, signal: AbortSignal.timeout(15000) });
  const raw = await response.text();
  let data = null;
  try { data = raw ? JSON.parse(raw) : null; } catch {}
  if (!response.ok) {
    const detail = data?.message || raw.slice(0, 300) || response.statusText;
    throw new Error("GitHub API HTTP " + response.status + ": " + detail +
      (response.headers.get("retry-after") ? "; Retry-After=" + response.headers.get("retry-after") : "") +
      (response.headers.get("x-ratelimit-reset") ? "; rate-limit-reset=" + response.headers.get("x-ratelimit-reset") : ""));
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
const writeOutput = (key, value) => { if (output) appendFileSync(output, key + "=" + String(value) + "\n", "utf8"); };
if (mode === "check" && cooldownActive(localState)) {
  writeOutput("cooldown_active", true);
  writeOutput("cooldown_until", localState.cooldown_until);
  writeOutput("skipped_issues", (localState.skipped_issue_numbers ?? []).join(","));
  console.log("Local circuit breaker active until " + localState.cooldown_until + "; skipped GitHub API calls and task work.");
  process.exit(0);
}

try {
const allIssues = await listIssues("all");
const stateIssue = allIssues.find(isStateIssue);
const remoteState = readState(stateIssue);
const localUpdated = Date.parse(localState.updated_at ?? "") || 0;
const remoteUpdated = Date.parse(remoteState.updated_at ?? "") || 0;
let state = localUpdated > remoteUpdated ? localState : remoteState;

if (mode === "check") {
  const active = cooldownActive(state);
  writeOutput("cooldown_active", active);
  writeOutput("cooldown_until", state.cooldown_until ?? "");
  writeOutput("skipped_issues", (state.skipped_issue_numbers ?? []).join(","));
  saveLocalState(state);
  console.log(active ? "Circuit breaker active until " + state.cooldown_until + "; no task is started." : "Circuit breaker clear.");
} else if (mode === "failure") {
  state = nextFailureState(state, process.env.FAILURE_SUMMARY || "Task workflow failed; inspect the Actions run.", Date.now(), Number(process.env.FAILED_ISSUE_NUMBER) || null);
  saveLocalState(state);
  await persistState(allIssues, state);
  console.log("Recorded consecutive failure " + state.consecutive_failures + "/3. " + (state.cooldown_until ? "Cooldown until " + state.cooldown_until : "Next failure triggers 15 minutes of cooldown."));
} else if (mode === "success") {
  const reset = successState(Date.now(), state, Number(process.env.COMPLETED_ISSUE_NUMBER) || null);
  saveLocalState(reset);
  await persistState(allIssues, reset);
  console.log("Successful task publication recorded; circuit breaker reset.");
} else if (mode === "plan") {
  const openIssues = await listIssues("open");
  const openPulls = await api("/pulls?state=open&per_page=100");
  const skipped = new Set(state.skipped_issue_numbers ?? []);
  const openTasks = openIssues.filter((issue) => !issue.pull_request && issue.title?.startsWith("[AI Task]"));
  const pendingTasks = openTasks.filter((issue) => !skipped.has(issue.number));
  const activeTaskPull = openPulls.some((pull) => /<!-- ai-task:\d+ -->/.test(pull.body || ""));
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
  const retryAfter = /Retry-After=(\\d+)/i.exec(message);
  const retrySeconds = retryAfter ? Number(retryAfter[1]) : 15 * 60;
  const reset = {
    consecutive_failures: Math.max(3, Number(localState.consecutive_failures) || 0),
    cooldown_until: new Date(Date.now() + Math.max(60, retrySeconds) * 1000).toISOString(),
    last_failure_at: new Date().toISOString(),
    last_error: message.slice(0, 1200),
    updated_at: new Date().toISOString(),
  };
  saveLocalState(reset);
  if (mode === "check") {
    writeOutput("cooldown_active", true);
    writeOutput("cooldown_until", reset.cooldown_until);
    console.warn("API/controller error opened a local cooldown until " + reset.cooldown_until + ": " + message);
    process.exit(0);
  }
  throw error;
}
