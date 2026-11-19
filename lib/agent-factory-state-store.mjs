import { createInitialFactoryState, MAX_TASK_FAILURES, validateFactoryState } from "./agent-factory-state-machine.mjs";

export const FACTORY_STATE_ISSUE_TITLE = "[AI Factory State] Durable scheduler and circuit-breaker state";
const STATE_MARKER = /<!-- agent-factory-state:([A-Za-z0-9+/=]+) -->/;

function migrateLegacyState(legacy) {
  if (!legacy || typeof legacy !== "object" || !legacy.task_failures || typeof legacy.task_failures !== "object") {
    throw new Error("Legacy factory state does not match the supported V1 shape.");
  }
  const skipped = new Set(Array.isArray(legacy.skipped_issue_numbers) ? legacy.skipped_issue_numbers : []);
  const tasks = {};
  for (const [issueNumber, failuresValue] of Object.entries(legacy.task_failures)) {
    const failures = Math.max(0, Number(failuresValue) || 0);
    const quarantined = skipped.has(Number(issueNumber)) || failures >= MAX_TASK_FAILURES;
    tasks[issueNumber] = {
      status: quarantined ? "quarantined" : failures > 0 ? "retry_wait" : "queued",
      attempts: failures, failures, candidate_failures: 0, quarantined, next_attempt_at: null,
      last_error: null, last_success_at: null,
    };
  }
  const state = {
    schema_version: 2, state_version: 0,
    updated_at: legacy.updated_at ?? new Date(0).toISOString(),
    system: {
      consecutive_failures: Math.max(0, Number(legacy.consecutive_failures) || 0),
      cooldown_until: legacy.cooldown_until ?? null,
      last_error_code: legacy.last_error ? "LEGACY_ERROR" : null,
      last_error: legacy.last_error ?? null,
      last_success_at: legacy.last_task_success_at ?? null,
    },
    tasks, active_task: null, processed_events: [],
  };
  validateFactoryState(state);
  return state;
}

function decodeState(issue) {
  const match = typeof issue?.body === "string" ? STATE_MARKER.exec(issue.body) : null;
  if (!match) throw new Error("Factory state Issue exists but its state marker is missing.");
  let state;
  try { state = JSON.parse(Buffer.from(match[1], "base64").toString("utf8")); }
  catch { throw new Error("Factory state Issue contains invalid base64 JSON."); }
  if (state?.schema_version !== 2) return { state: migrateLegacyState(state), migrated: true };
  validateFactoryState(state);
  return { state, migrated: false };
}

function encodeBody(state) {
  validateFactoryState(state);
  return "Machine-managed V2 factory state. Do not edit this Issue manually.\n\n<!-- agent-factory-state:" +
    Buffer.from(JSON.stringify(state)).toString("base64") + " -->";
}

export function createFactoryStateStore(api, options = {}) {
  if (!api || typeof api.request !== "function") throw new TypeError("A GitHub API client is required.");
  const repository = options.repository;
  if (typeof repository !== "string" || !/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository)) {
    throw new TypeError("A valid repository name is required.");
  }
  const [owner] = repository.split("/");

  async function findStateIssue() {
    const found = [];
    for (let page = 1; page <= 100; page += 1) {
      const issues = await api.request("/repos/" + repository + "/issues?state=all&per_page=100&page=" + page);
      if (!Array.isArray(issues)) throw new Error("GitHub returned an invalid Issues page.");
      found.push(...issues.filter((issue) => !issue.pull_request));
      if (issues.length < 100) break;
      if (page === 100) throw new Error("Factory state lookup exceeded the 100-page safety limit.");
    }
    const matches = found.filter((issue) => issue.title === FACTORY_STATE_ISSUE_TITLE);
    if (matches.length > 1) throw new Error("Multiple machine-managed factory state Issues exist; refusing ambiguous writes.");
    return matches[0] ?? null;
  }

  async function read() {
    const issue = await findStateIssue();
    if (!issue) return { issue: null, state: createInitialFactoryState(), migrated: false };
    const decoded = decodeState(issue);
    return { issue, state: decoded.state, migrated: decoded.migrated };
  }

  async function write(expectedVersion, nextState) {
    validateFactoryState(nextState);
    if (!Number.isInteger(expectedVersion) || expectedVersion < 0 || nextState.state_version !== expectedVersion + 1) {
      throw new TypeError("State write must advance exactly one version.");
    }
    const current = await read();
    if (current.state.state_version !== expectedVersion) {
      throw new Error("Factory state version conflict: expected " + expectedVersion + ", found " + current.state.state_version + ".");
    }
    const body = encodeBody(nextState);
    if (!current.issue) {
      try {
        const issue = await api.request("/repos/" + repository + "/issues", { method: "POST", body: { title: FACTORY_STATE_ISSUE_TITLE, body } });
        return { issue, state: nextState, recovered: false, migrated: false };
      } catch (error) {
        const reread = await read();
        if (reread.state.state_version === nextState.state_version &&
            JSON.stringify(reread.state) === JSON.stringify(nextState)) {
          return { ...reread, recovered: true, migrated: false };
        }
        throw error;
      }
    }

    try {
      const issue = await api.request("/repos/" + repository + "/issues/" + current.issue.number, { method: "PATCH", body: { body }, retrySafe: true });
      return { issue: issue ?? current.issue, state: nextState, recovered: false, migrated: false };
    } catch (error) {
      const reread = await read();
      if (reread.state.state_version === nextState.state_version &&
          JSON.stringify(reread.state) === JSON.stringify(nextState)) {
        return { ...reread, recovered: true, migrated: false };
      }
      throw error;
    }
  }

  async function migrate() {
    const current = await read();
    if (!current.migrated) return { ...current, migrated: false };
    const next = { ...current.state, state_version: 1, updated_at: new Date().toISOString() };
    const result = await write(0, next);
    return { ...result, migrated: true };
  }

  return Object.freeze({ read, write, migrate });
}