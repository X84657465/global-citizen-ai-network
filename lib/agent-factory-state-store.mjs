import { createInitialFactoryState, MAX_TASK_FAILURES, validateFactoryState } from "./agent-factory-state-machine.mjs";

export const FACTORY_STATE_ISSUE_TITLE = "[AI Factory State] Durable scheduler and circuit-breaker state";
const STATE_MARKER = /<!-- agent-factory-state:([A-Za-z0-9+/=]+) -->/;
// Leave headroom below GitHub's 65,536-character Issue body limit.
export const MAX_STATE_ISSUE_BODY_CHARS = 60_000;

// Serialize all store instances in this Node process by repository. The
// repository-wide GitHub Actions concurrency group remains the cross-process fence.
const repositoryWriteQueues = new Map();

function serializeRepositoryWrite(repository, operation) {
  // GitHub repository names are case-insensitive; normalize the lock key so
  // differently-cased owner/repo inputs cannot bypass the same process lock.
  const queueKey = repository.toLowerCase();
  const previous = repositoryWriteQueues.get(queueKey) ?? Promise.resolve();
  const pending = previous.then(operation);
  const settled = pending.then(() => undefined, () => undefined);
  repositoryWriteQueues.set(queueKey, settled);
  return pending.finally(() => {
    if (repositoryWriteQueues.get(queueKey) === settled) repositoryWriteQueues.delete(queueKey);
  });
}

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
  try {
    const decoded = Buffer.from(match[1], "base64");
    // Buffer's base64 decoder is permissive (it silently accepts malformed
    // padding and non-canonical encodings). Reject anything that does not
    // round-trip exactly before trusting the durable state payload.
    if (decoded.toString("base64") !== match[1]) {
      throw new Error("non-canonical base64");
    }
    // Buffer.toString() replaces malformed UTF-8 with U+FFFD. A durable
    // machine-state record must instead reject invalid byte sequences.
    const decoder = new TextDecoder("utf-8", { fatal: true });
    state = JSON.parse(decoder.decode(decoded));
  } catch {
    throw new Error("Factory state Issue contains invalid base64 JSON.");
  }
  if (state?.schema_version !== 2) return { state: migrateLegacyState(state), migrated: true };
  validateFactoryState(state);
  return { state, migrated: false };
}


function assertPersistedState(issue, expectedState) {
  const decoded = decodeState(issue);
  if (JSON.stringify(decoded.state) !== JSON.stringify(expectedState)) {
    throw new Error("GitHub state Issue response does not confirm the requested state version and payload.");
  }
  return decoded.state;
}

function encodeBody(state) {
  validateFactoryState(state);
  const body = "Machine-managed V2 factory state. Do not edit this Issue manually.\n\n<!-- agent-factory-state:" +
    Buffer.from(JSON.stringify(state)).toString("base64") + " -->";
  if (body.length > MAX_STATE_ISSUE_BODY_CHARS) {
    throw new Error(
      "Factory state Issue payload exceeds the 60,000-character safety limit; refusing to write. " +
      "An audited state compaction/schema migration is required.",
    );
  }
  return body;
}

export function createFactoryStateStore(api, options = {}) {
  if (!api || typeof api.request !== "function") throw new TypeError("A GitHub API client is required.");
  const repository = options.repository;
  if (typeof repository !== "string" || !/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository)) {
    throw new TypeError("A valid repository name is required.");
  }

  let cachedIssueNumber = options.issueNumber === undefined || options.issueNumber === null || options.issueNumber === ""
    ? null
    : Number(options.issueNumber);
  if (cachedIssueNumber !== null && (!Number.isSafeInteger(cachedIssueNumber) || cachedIssueNumber < 1)) {
    throw new TypeError("State Issue number must be a positive integer.");
  }

  async function findStateIssue() {
    if (cachedIssueNumber !== null) {
      const issue = await api.request("/repos/" + repository + "/issues/" + cachedIssueNumber);
      if (issue?.title !== FACTORY_STATE_ISSUE_TITLE || issue.pull_request) {
        throw new Error("Configured factory state Issue number does not identify the machine-managed state Issue.");
      }
      return issue;
    }
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
    cachedIssueNumber = matches[0]?.number ?? null;
    return matches[0] ?? null;
  }

  async function read() {
    const issue = await findStateIssue();
    if (!issue) return { issue: null, state: createInitialFactoryState(), migrated: false };
    const decoded = decodeState(issue);
    return { issue, state: decoded.state, migrated: decoded.migrated };
  }

  async function write(expectedVersion, nextState) {
    return serializeRepositoryWrite(repository, () => writeUnlocked(expectedVersion, nextState));
  }

  async function writeUnlocked(expectedVersion, nextState) {
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
        if (!Number.isSafeInteger(issue?.number) || issue.number < 1 || issue.title !== FACTORY_STATE_ISSUE_TITLE) {
          throw new Error("GitHub did not confirm creation of the factory state Issue.");
        }
        assertPersistedState(issue, nextState);
        cachedIssueNumber = issue.number;
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
      if (!issue || issue.number !== current.issue.number || issue.title !== FACTORY_STATE_ISSUE_TITLE) {
        throw new Error("GitHub did not confirm the expected factory state Issue update.");
      }
      assertPersistedState(issue, nextState);
      cachedIssueNumber = issue.number;
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

  async function migrate() {
    const current = await read();
    if (!current.migrated) return { ...current, migrated: false };
    const next = { ...current.state, state_version: 1, updated_at: new Date().toISOString() };
    const result = await write(0, next);
    return { ...result, migrated: true };
  }

  return Object.freeze({ read, write, migrate, getStateIssueNumber: () => cachedIssueNumber });
}