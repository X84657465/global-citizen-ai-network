export const FACTORY_STATE_SCHEMA_VERSION = 2;
export const MAX_TASK_FAILURES = 3;
export const MAX_CANDIDATE_FAILURES = 3;
export const MAX_SYSTEM_FAILURES = 3;
export const SYSTEM_COOLDOWN_MS = 15 * 60 * 1000;
export const DEFAULT_LEASE_MS = 90 * 60 * 1000;
const MAX_PROCESSED_EVENTS = 500;

export const TASK_STATES = Object.freeze([
  "queued", "reserved", "preparing", "planning", "patching",
  "sandbox_testing", "publishing", "draft_pr_created",
  "awaiting_ci", "completed", "retry_wait", "candidate_rejected",
  "quarantined", "superseded",
]);

const TRANSITIONS = Object.freeze({
  reserved: ["preparing", "retry_wait", "quarantined"],
  preparing: ["planning", "retry_wait", "quarantined"],
  planning: ["patching", "retry_wait", "quarantined"],
  patching: ["sandbox_testing", "retry_wait", "quarantined"],
  sandbox_testing: ["publishing", "retry_wait", "candidate_rejected", "quarantined"],
  publishing: ["draft_pr_created", "retry_wait", "quarantined"],
  draft_pr_created: ["awaiting_ci", "retry_wait", "superseded"],
  awaiting_ci: ["completed", "retry_wait", "candidate_rejected", "superseded"],
  retry_wait: ["queued", "reserved", "quarantined"],
  candidate_rejected: ["retry_wait", "quarantined", "superseded"],
  queued: ["reserved", "quarantined", "superseded"],
  completed: [], quarantined: [], superseded: [],
});

const clone = (value) => JSON.parse(JSON.stringify(value));
const iso = (value) => new Date(value).toISOString();
const positiveInteger = (value) => Number.isInteger(value) && value > 0;

function hasExactCandidateCiEvidence(evidence, conclusion) {
  const validRunId = typeof evidence?.ci_run_id === "string"
    ? evidence.ci_run_id.trim().length > 0
    : positiveInteger(evidence?.ci_run_id);
  return typeof evidence?.head_sha === "string" &&
    /^[a-f0-9]{40}$/i.test(evidence.head_sha) &&
    positiveInteger(evidence.pull_request_number) &&
    evidence.ci_conclusion === conclusion &&
    validRunId &&
    positiveInteger(evidence.ci_run_attempt);
}

export function createInitialFactoryState(now = Date.now()) {
  return {
    schema_version: FACTORY_STATE_SCHEMA_VERSION,
    state_version: 0,
    updated_at: iso(now),
    system: { consecutive_failures: 0, cooldown_until: null, last_error_code: null, last_error: null, last_success_at: null },
    tasks: {},
    active_task: null,
    processed_events: [],
  };
}

export function validateFactoryState(state) {
  if (!state || typeof state !== "object" || Array.isArray(state)) throw new TypeError("Factory state must be an object.");
  if (state.schema_version !== FACTORY_STATE_SCHEMA_VERSION) throw new TypeError("Unsupported factory state schema version.");
  if (!Number.isInteger(state.state_version) || state.state_version < 0) throw new TypeError("Invalid factory state version.");
  if (!state.system || typeof state.system !== "object" || !state.tasks || typeof state.tasks !== "object" || Array.isArray(state.tasks)) {
    throw new TypeError("Factory state is missing system or task records.");
  }
  if (!Array.isArray(state.processed_events)) throw new TypeError("processed_events must be an array.");
  for (const [issueNumber, task] of Object.entries(state.tasks)) {
    if (!positiveInteger(Number(issueNumber)) || !task || typeof task !== "object" ||
        !Number.isInteger(task.failures) || task.failures < 0 ||
        !Number.isInteger(task.candidate_failures) || task.candidate_failures < 0 ||
        !Number.isInteger(task.attempts) || task.attempts < 0 ||
        typeof task.quarantined !== "boolean" || !TASK_STATES.includes(task.status ?? "queued")) {
      throw new TypeError("Task state record is invalid.");
    }
  }
  if (state.active_task !== null) {
    const active = state.active_task;
    if (!positiveInteger(active.issue_number) || !positiveInteger(active.attempt) ||
        typeof active.lease_id !== "string" || !active.lease_id ||
        typeof active.lease_owner !== "string" || !active.lease_owner ||
        !TASK_STATES.includes(active.state) ||
        !Number.isFinite(Date.parse(active.lease_expires_at))) {
      throw new TypeError("Active task lease is invalid.");
    }
  }
  return true;
}

function commit(state, now) {
  const next = clone(state);
  next.state_version += 1;
  next.updated_at = iso(now);
  validateFactoryState(next);
  return next;
}

function hasEvent(state, eventKey) {
  if (typeof eventKey !== "string" || eventKey.trim().length < 8 || eventKey.length > 200) {
    throw new TypeError("A stable event key between 8 and 200 characters is required.");
  }
  return state.processed_events.includes(eventKey);
}

function recordEvent(state, eventKey) {
  state.processed_events = [...state.processed_events, eventKey].slice(-MAX_PROCESSED_EVENTS);
}

function ensureTask(state, issueNumber) {
  if (!positiveInteger(issueNumber)) throw new TypeError("A positive task Issue number is required.");
  const key = String(issueNumber);
  state.tasks[key] ??= { status: "queued", attempts: 0, failures: 0, candidate_failures: 0, quarantined: false, next_attempt_at: null, last_error: null, last_success_at: null };
  return state.tasks[key];
}

export function reserveTask(previous, input, now = Date.now()) {
  validateFactoryState(previous);
  if (previous.active_task) throw new Error("Another task already owns the factory lease.");
  if (Date.parse(previous.system.cooldown_until ?? "") > now) throw new Error("System cooldown is active.");
  const issueNumber = input?.issue_number;
  const task = previous.tasks?.[String(issueNumber)];
  if (task?.quarantined || (Number(task?.failures) || 0) >= MAX_TASK_FAILURES || task?.status === "quarantined") throw new Error("Task is quarantined.");
  if (task && task.status !== "queued") throw new Error("Task is not currently queued; explicit retry requeue is required.");
  if (!positiveInteger(issueNumber) || typeof input.lease_id !== "string" || !input.lease_id ||
      typeof input.lease_owner !== "string" || !input.lease_owner ||
      typeof input.workflow_run_id !== "string" || !input.workflow_run_id ||
      !positiveInteger(input.run_attempt) || typeof input.base_sha !== "string" || !input.base_sha) {
    throw new TypeError("Task reservation metadata is incomplete.");
  }
  const leaseMs = input.lease_ms ?? DEFAULT_LEASE_MS;
  if (!Number.isSafeInteger(leaseMs) || leaseMs < 60_000 || leaseMs > 3 * 60 * 60 * 1000) {
    throw new TypeError("Task lease must be between one minute and three hours.");
  }
  const next = commit(previous, now);
  const record = ensureTask(next, issueNumber);
  record.attempts += 1;
  record.status = "reserved";
  record.next_attempt_at = null;
  next.active_task = {
    issue_number: issueNumber, attempt: record.attempts, state: "reserved",
    lease_id: input.lease_id, lease_owner: input.lease_owner,
    lease_started_at: iso(now), lease_expires_at: iso(now + leaseMs),
    workflow_run_id: input.workflow_run_id, run_attempt: input.run_attempt,
    base_sha: input.base_sha, idempotency_key: input.idempotency_key ?? input.lease_id,
  };
  validateFactoryState(next);
  return next;
}

function assertWorkerLease(previous, issueNumber, leaseId) {
  const active = previous.active_task;
  if (!active || active.issue_number !== issueNumber) {
    throw new Error("Task does not own the active factory lease.");
  }
  if (typeof leaseId !== "string" || !leaseId || active.lease_id !== leaseId) {
    throw new Error("Worker lease fencing rejected a missing or stale lease ID.");
  }
  return active;
}

export function transitionTask(previous, issueNumber, leaseId, nextStatus, details = {}, now = Date.now()) {
  validateFactoryState(previous);
  const active = assertWorkerLease(previous, issueNumber, leaseId);
  if (!TASK_STATES.includes(nextStatus) || !(TRANSITIONS[active.state] ?? []).includes(nextStatus)) {
    throw new Error("Illegal task state transition: " + active.state + " -> " + nextStatus);
  }
  const next = commit(previous, now);
  next.active_task.state = nextStatus;
  const taskRecord = ensureTask(next, issueNumber);
  taskRecord.status = nextStatus;
  if (nextStatus === "retry_wait") {
    taskRecord.next_attempt_at = iso(now + Math.min(30 * 60 * 1000, 60_000 * (2 ** Math.max(0, taskRecord.failures))));
  }
  if (details.head_sha) taskRecord.head_sha = details.head_sha;
  if (details.pull_request_number) taskRecord.pull_request_number = details.pull_request_number;
  if (nextStatus === "awaiting_ci") {
    if (!taskRecord.head_sha || !positiveInteger(taskRecord.pull_request_number)) {
      throw new Error("A candidate head SHA and pull request number are required before awaiting CI.");
    }
    taskRecord.candidate_status = "pending";
    taskRecord.candidate_created_at = iso(now);
    next.active_task = null;
  }
  if (["completed", "retry_wait", "candidate_rejected", "quarantined", "superseded"].includes(nextStatus)) {
    next.active_task = null;
  }
  return next;
}

export function recordTaskFailure(previous, issueNumber, leaseId, eventKey, errorCode, summary, now = Date.now()) {
  validateFactoryState(previous);
  if (hasEvent(previous, eventKey)) return { state: previous, duplicate: true };
  assertWorkerLease(previous, issueNumber, leaseId);
  if (!positiveInteger(issueNumber)) throw new TypeError("Task failure requires a valid Issue number.");
  const next = commit(previous, now);
  const task = ensureTask(next, issueNumber);
  task.failures += 1;
  task.last_error = { code: String(errorCode || "TASK_FAILURE"), summary: String(summary || "").slice(0, 1200), at: iso(now) };
  task.quarantined = task.failures >= MAX_TASK_FAILURES;
  task.status = task.quarantined ? "quarantined" : "retry_wait";
  task.next_attempt_at = task.quarantined ? null : iso(now + Math.min(30 * 60 * 1000, 60_000 * (2 ** (task.failures - 1))));
  if (next.active_task?.issue_number === issueNumber) next.active_task = null;
  recordEvent(next, eventKey);
  return { state: next, duplicate: false, quarantined: task.quarantined };
}

export function recordSystemFailure(previous, eventKey, errorCode, summary, now = Date.now()) {
  validateFactoryState(previous);
  if (hasEvent(previous, eventKey)) return { state: previous, duplicate: true };
  const next = commit(previous, now);
  next.system.consecutive_failures += 1;
  next.system.last_error_code = String(errorCode || "SYSTEM_FAILURE");
  next.system.last_error = String(summary || "").slice(0, 1200);
  if (next.system.consecutive_failures >= MAX_SYSTEM_FAILURES) {
    next.system.cooldown_until = iso(now + SYSTEM_COOLDOWN_MS);
  }
  if (next.active_task) ensureTask(next, next.active_task.issue_number).status = "queued";
  next.active_task = null;
  recordEvent(next, eventKey);
  return { state: next, duplicate: false, cooldown_active: Boolean(next.system.cooldown_until) };
}

export function recordTaskSuccess(previous, issueNumber, eventKey, evidence, now = Date.now()) {
  validateFactoryState(previous);
  if (hasEvent(previous, eventKey)) return { state: previous, duplicate: true };
  const existingTask = previous.tasks?.[String(issueNumber)];
  if (!existingTask || existingTask.status !== "awaiting_ci" || existingTask.candidate_status !== "pending" ||
      evidence?.head_sha !== existingTask.head_sha ||
      evidence?.pull_request_number !== existingTask.pull_request_number ||
      !hasExactCandidateCiEvidence(evidence, "success")) {
    throw new Error("Task success requires exact candidate SHA, PR, CI run ID, and run-attempt evidence.");
  }
  const next = commit(previous, now);
  const task = ensureTask(next, issueNumber);
  task.candidate_status = "success";
  task.ci_run_id = evidence.ci_run_id ?? null;
  task.ci_run_attempt = evidence.ci_run_attempt ?? null;
  task.failures = 0;
  task.candidate_failures = 0;
  task.status = "completed";
  task.next_attempt_at = null;
  task.quarantined = false;
  task.last_error = null;
  task.last_success_at = iso(now);
  if (next.active_task?.issue_number === issueNumber) next.active_task = null;
  recordEvent(next, eventKey);
  return { state: next, duplicate: false };
}

export function recordCandidateFailure(previous, issueNumber, eventKey, evidence, summary, now = Date.now()) {
  validateFactoryState(previous);
  if (hasEvent(previous, eventKey)) return { state: previous, duplicate: true };
  const task = previous.tasks?.[String(issueNumber)];
  if (!task || task.status !== "awaiting_ci" || task.candidate_status !== "pending" ||
      evidence?.head_sha !== task.head_sha ||
      evidence?.pull_request_number !== task.pull_request_number ||
      !hasExactCandidateCiEvidence(evidence, "failure")) {
    throw new Error("Candidate failure requires exact candidate SHA, PR, CI run ID, and run-attempt evidence.");
  }
  const next = commit(previous, now);
  const record = ensureTask(next, issueNumber);
  record.candidate_failures += 1;
  record.quarantined = record.candidate_failures >= MAX_CANDIDATE_FAILURES;
  record.status = record.quarantined ? "quarantined" : "candidate_rejected";
  record.candidate_status = "failure";
  record.candidate_error = String(summary || "Candidate CI failed.").slice(0, 1200);
  record.ci_run_id = evidence.ci_run_id ?? null;
  record.ci_run_attempt = evidence.ci_run_attempt ?? null;
  record.candidate_failed_at = iso(now);
  recordEvent(next, eventKey);
  return { state: next, duplicate: false };
}

export function recordSystemSuccess(previous, eventKey, now = Date.now()) {
  validateFactoryState(previous);
  if (hasEvent(previous, eventKey)) return { state: previous, duplicate: true };
  const next = commit(previous, now);
  next.system.consecutive_failures = 0;
  next.system.cooldown_until = null;
  next.system.last_error_code = null;
  next.system.last_error = null;
  next.system.last_success_at = iso(now);
  recordEvent(next, eventKey);
  return { state: next, duplicate: false };
}

export function recoverExpiredLease(previous, options, now = Date.now()) {
  validateFactoryState(previous);
  const active = previous.active_task;
  if (!active) return { state: previous, recovered: false, reason: "no_active_lease" };
  if (Date.parse(active.lease_expires_at) > now) return { state: previous, recovered: false, reason: "lease_not_expired" };
  if (options?.workflow_still_running !== false) return { state: previous, recovered: false, reason: "workflow_may_still_be_running" };
  const eventKey = options?.event_key;
  if (hasEvent(previous, eventKey)) return { state: previous, recovered: false, duplicate: true };
  const next = commit(previous, now);
  ensureTask(next, active.issue_number).status = "queued";
  next.active_task = null;
  next.system.consecutive_failures += 1;
  next.system.last_error_code = "WORKER_LEASE_EXPIRED";
  next.system.last_error = "Expired task lease recovered after confirming the workflow is no longer running.";
  if (next.system.consecutive_failures >= MAX_SYSTEM_FAILURES) next.system.cooldown_until = iso(now + SYSTEM_COOLDOWN_MS);
  recordEvent(next, eventKey);
  return { state: next, recovered: true, issue_number: active.issue_number };
}


export function requeueTask(previous, issueNumber, now = Date.now()) {
  validateFactoryState(previous);
  const task = previous.tasks?.[String(issueNumber)];
  const retryable = task?.status === "retry_wait" ||
    (task?.status === "candidate_rejected" && task.candidate_status === "failure");
  if (!task || task.quarantined || !retryable) throw new Error("Task is not eligible for retry requeue.");
  if (task.status === "retry_wait" && Date.parse(task.next_attempt_at ?? "") > now) {
    throw new Error("Task retry backoff has not elapsed.");
  }
  const wasCandidateRejected = task.status === "candidate_rejected";
  const next = commit(previous, now);
  const record = ensureTask(next, issueNumber);
  record.status = "queued";
  record.next_attempt_at = null;
  if (wasCandidateRejected) record.candidate_status = "retry_queued";
  return next;
}
export function isSystemCooldownActive(state, now = Date.now()) {
  validateFactoryState(state);
  const until = Date.parse(state.system.cooldown_until ?? "");
  return Number.isFinite(until) && until > now;
}