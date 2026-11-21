import { isAgentTaskBranchForIssue } from "./agent-task-pr-metadata.mjs";

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
  publishing: ["draft_pr_created", "retry_wait", "quarantined", "superseded"],
  draft_pr_created: ["awaiting_ci", "retry_wait", "superseded"],
  awaiting_ci: ["completed", "retry_wait", "candidate_rejected", "superseded"],
  retry_wait: ["queued", "reserved", "quarantined"],
  candidate_rejected: ["retry_wait", "quarantined", "superseded"],
  queued: ["reserved", "quarantined", "superseded"],
  completed: [], quarantined: [], superseded: [],
});

const clone = (value) => JSON.parse(JSON.stringify(value));
const iso = (value) => new Date(value).toISOString();
const positiveInteger = (value) => Number.isSafeInteger(value) && value > 0;

function hasExactCandidateCiEvidence(evidence, conclusion) {
  const validRunId = typeof evidence?.ci_run_id === "string"
    ? evidence.ci_run_id.trim().length > 0 && evidence.ci_run_id.length <= 100
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
  const validTimestamp = (value) => {
    if (typeof value !== "string") return false;
    const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,9})?(?:Z|([+-])(\d{2}):(\d{2}))$/.exec(value);
    if (!match || !Number.isFinite(Date.parse(value))) return false;
    const [, yearText, monthText, dayText, hourText, minuteText, secondText, , offsetHourText, offsetMinuteText] = match;
    const year = Number(yearText), month = Number(monthText), day = Number(dayText);
    const hour = Number(hourText), minute = Number(minuteText), second = Number(secondText);
    const offsetHour = offsetHourText === undefined ? 0 : Number(offsetHourText);
    const offsetMinute = offsetMinuteText === undefined ? 0 : Number(offsetMinuteText);
    const date = new Date(0);
    date.setUTCFullYear(year, month - 1, day);
    date.setUTCHours(0, 0, 0, 0);
    return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 &&
      date.getUTCDate() === day && hour <= 23 && minute <= 59 && second <= 59 &&
      offsetHour <= 14 && offsetMinute <= 59 && (offsetHour !== 14 || offsetMinute === 0);
  };
  const nullableTimestamp = (value) => value === null || validTimestamp(value);
  if (!state || typeof state !== "object" || Array.isArray(state)) throw new TypeError("Factory state must be an object.");
  if (state.schema_version !== FACTORY_STATE_SCHEMA_VERSION) throw new TypeError("Unsupported factory state schema version.");
  if (!Number.isSafeInteger(state.state_version) || state.state_version < 0 || !validTimestamp(state.updated_at)) {
    throw new TypeError("Invalid factory state version or update timestamp.");
  }
  if (!state.system || typeof state.system !== "object" || Array.isArray(state.system) ||
      !state.tasks || typeof state.tasks !== "object" || Array.isArray(state.tasks)) {
    throw new TypeError("Factory state is missing system or task records.");
  }
  const system = state.system;
  if (!Number.isSafeInteger(system.consecutive_failures) || system.consecutive_failures < 0 ||
      !nullableTimestamp(system.cooldown_until) ||
      !(system.last_error_code === null || typeof system.last_error_code === "string") ||
      !(system.last_error === null || typeof system.last_error === "string") ||
      !nullableTimestamp(system.last_success_at)) {
    throw new TypeError("Factory system breaker state is invalid.");
  }
  if (!Array.isArray(state.processed_events) || state.processed_events.length > MAX_PROCESSED_EVENTS ||
      state.processed_events.some((key) => typeof key !== "string" || key.trim().length < 8 || key.length > 200) ||
      new Set(state.processed_events).size !== state.processed_events.length) {
    throw new TypeError("Processed event history is invalid.");
  }
  for (const [issueNumber, task] of Object.entries(state.tasks)) {
    const status = task?.status ?? "queued";
    const parsedIssueNumber = Number(issueNumber);
    if (!positiveInteger(parsedIssueNumber) || String(parsedIssueNumber) !== issueNumber ||
        !task || typeof task !== "object" || Array.isArray(task) ||
        !Number.isInteger(task.failures) || task.failures < 0 ||
        (task.candidate_failures !== undefined &&
          (!Number.isInteger(task.candidate_failures) || task.candidate_failures < 0)) ||
        (task.lease_id !== undefined && (typeof task.lease_id !== "string" || !task.lease_id.trim() || task.lease_id.length > 200)) ||
        !Number.isSafeInteger(task.attempts) || task.attempts < 0 ||
        typeof task.quarantined !== "boolean" || !TASK_STATES.includes(status) ||
        task.quarantined !== (status === "quarantined") ||
        (task.next_attempt_at !== undefined && !nullableTimestamp(task.next_attempt_at)) ||
        (task.last_success_at !== undefined && !nullableTimestamp(task.last_success_at))) {
      throw new TypeError("Task state record is invalid.");
    }
    if (task.last_error !== undefined && task.last_error !== null &&
        (typeof task.last_error !== "object" || Array.isArray(task.last_error) ||
          typeof task.last_error.code !== "string" || typeof task.last_error.summary !== "string" ||
          !validTimestamp(task.last_error.at))) {
      throw new TypeError("Task error record is invalid.");
    }
  }
  const leaseBoundStates = new Set([
    "reserved", "preparing", "planning", "patching", "sandbox_testing",
    "publishing", "draft_pr_created",
  ]);
  const leaseBoundTasks = Object.entries(state.tasks)
    .filter(([, task]) => leaseBoundStates.has(task.status));
  if (state.active_task === null) {
    if (leaseBoundTasks.length !== 0) {
      throw new TypeError("A lease-bound task exists without the single active worker lease.");
    }
  } else {
    const active = state.active_task;
    const task = state.tasks[String(active?.issue_number)];
    if (!positiveInteger(active?.issue_number) || !positiveInteger(active?.attempt) ||
        typeof active.lease_id !== "string" || !active.lease_id.trim() || active.lease_id.length > 200 ||
        typeof active.lease_owner !== "string" || !active.lease_owner.trim() || active.lease_owner.length > 200 ||
        typeof active.workflow_run_id !== "string" || !active.workflow_run_id.trim() || active.workflow_run_id.length > 100 ||
        !positiveInteger(active.run_attempt) ||
        typeof active.base_sha !== "string" || !/^[a-f0-9]{40}$/i.test(active.base_sha) ||
        typeof active.idempotency_key !== "string" || !active.idempotency_key.trim() || active.idempotency_key.length > 200 ||
        !TASK_STATES.includes(active.state) ||
        !validTimestamp(active.lease_started_at) || !validTimestamp(active.lease_expires_at) ||
        Date.parse(active.lease_expires_at) <= Date.parse(active.lease_started_at) ||
        !task || task.lease_id !== active.lease_id ||
        task.workflow_run_id !== active.workflow_run_id || task.run_attempt !== active.run_attempt ||
        task.base_sha !== active.base_sha || task.attempts !== active.attempt ||
        task.status !== active.state ||
        leaseBoundTasks.length !== 1 || leaseBoundTasks[0][0] !== String(active.issue_number)) {
      throw new TypeError("Active task lease is invalid or inconsistent with its task record.");
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
  if (state.processed_events.length >= MAX_PROCESSED_EVENTS) {
    throw new Error(
      "Processed event ledger capacity reached; refusing to evict idempotency keys. " +
      "An audited state-schema migration or operator intervention is required.",
    );
  }
  state.processed_events.push(eventKey);
}

export function getTaskRetryAt(task, fallbackTimestamp) {
  const explicit = Date.parse(task?.next_attempt_at ?? "");
  if (Number.isFinite(explicit)) return explicit;
  // Older V2 states persisted candidate_failed_at before next_attempt_at was
  // introduced. Preserve those tasks with a conservative one-minute delay.
  if (task?.status === "candidate_rejected") {
    const failedAt = Date.parse(task.candidate_failed_at ?? "");
    if (Number.isFinite(failedAt)) return failedAt + 60_000;
  }
  if (task?.status === "retry_wait") {
    // Legacy V1 migration cannot reconstruct per-task retry time. Prefer the
    // original task failure timestamp; only when absent, use the immutable
    // state.updated_at snapshot supplied by the controller.
    const taskFailureAt = Date.parse(task.last_error?.at ?? "");
    const stateFallback = Number.isFinite(fallbackTimestamp)
      ? fallbackTimestamp
      : Date.parse(fallbackTimestamp ?? "");
    const anchor = Number.isFinite(taskFailureAt) ? taskFailureAt : stateFallback;
    if (!Number.isFinite(anchor)) return Number.NaN;
    const failures = Number.isSafeInteger(task.failures) && task.failures > 0 ? task.failures : 1;
    const exponent = Math.min(5, Math.max(0, failures - 1));
    const delay = Math.min(30 * 60 * 1000, 60_000 * (2 ** exponent));
    return anchor + delay;
  }
  return Number.NaN;
}


/**
 * Persist a one-time retry deadline for legacy V2 retry_wait records that
 * predate next_attempt_at. Prefer the task's last_error.at; use the durable
 * state updated_at only when the task has no trustworthy failure timestamp.
 * Capture the fallback before committing so all tasks in this pass share it.
 */
export function normalizeLegacyRetryTimestamps(previous, fallbackTimestamp = previous?.updated_at, now = Date.now()) {
  validateFactoryState(previous);
  const hasLegacyRetry = Object.values(previous.tasks).some((task) =>
    task.status === "retry_wait" && !task.quarantined && !Number.isFinite(Date.parse(task.next_attempt_at ?? "")),
  );
  if (!hasLegacyRetry) return previous;

  const next = commit(previous, now);
  for (const task of Object.values(next.tasks)) {
    if (task.status !== "retry_wait" || task.quarantined || Number.isFinite(Date.parse(task.next_attempt_at ?? ""))) continue;
    const retryAt = getTaskRetryAt(task, fallbackTimestamp);
    if (Number.isFinite(retryAt)) task.next_attempt_at = iso(retryAt);
  }
  validateFactoryState(next);
  return next;
}

function ensureTask(state, issueNumber) {
  if (!positiveInteger(issueNumber)) throw new TypeError("A positive task Issue number is required.");
  const key = String(issueNumber);
  state.tasks[key] ??= { status: "queued", attempts: 0, failures: 0, candidate_failures: 0, quarantined: false, next_attempt_at: null, last_error: null, last_success_at: null };
  state.tasks[key].candidate_failures ??= 0;
  return state.tasks[key];
}

export function reserveTask(previous, input, now = Date.now()) {
  validateFactoryState(previous);
  if (previous.active_task) {
    const active = previous.active_task;
    if (active.issue_number === input?.issue_number &&
        active.lease_id === input?.lease_id &&
        active.workflow_run_id === input?.workflow_run_id &&
        active.run_attempt === input?.run_attempt &&
        active.base_sha === input?.base_sha &&
        active.lease_owner === input?.lease_owner &&
        active.idempotency_key === (input?.idempotency_key ?? input?.lease_id)) return previous;
    throw new Error("Another task already owns the factory lease.");
  }
  if (Date.parse(previous.system.cooldown_until ?? "") > now) throw new Error("System cooldown is active.");
  const issueNumber = input?.issue_number;
  const task = previous.tasks?.[String(issueNumber)];
  if (task?.quarantined || (Number(task?.failures) || 0) >= MAX_TASK_FAILURES || task?.status === "quarantined") throw new Error("Task is quarantined.");
  if (task && task.status !== "queued") throw new Error("Task is not currently queued; explicit retry requeue is required.");
  const idempotencyKey = input?.idempotency_key ?? input?.lease_id;
  const boundedIdentity = (value, maxLength) =>
    typeof value === "string" && value.trim().length > 0 && value.length <= maxLength;
  if (!positiveInteger(issueNumber) ||
      !boundedIdentity(input?.lease_id, 200) ||
      !boundedIdentity(input?.lease_owner, 200) ||
      !boundedIdentity(input?.workflow_run_id, 100) ||
      !boundedIdentity(idempotencyKey, 200) ||
      !positiveInteger(input?.run_attempt) ||
      typeof input?.base_sha !== "string" || !/^[a-f0-9]{40}$/i.test(input.base_sha)) {
    throw new TypeError("Task reservation metadata is incomplete or outside its allowed bounds.");
  }
  const leaseMs = input.lease_ms ?? DEFAULT_LEASE_MS;
  if (!Number.isSafeInteger(leaseMs) || leaseMs < 60_000 || leaseMs > 3 * 60 * 60 * 1000) {
    throw new TypeError("Task lease must be between one minute and three hours.");
  }
  const next = commit(previous, now);
  const record = ensureTask(next, issueNumber);
  record.attempts += 1;
  record.lease_id = input.lease_id;
  record.workflow_run_id = input.workflow_run_id;
  record.run_attempt = input.run_attempt;
  record.base_sha = input.base_sha;
  record.status = "reserved";
  record.next_attempt_at = null;
  next.active_task = {
    issue_number: issueNumber, attempt: record.attempts, state: "reserved",
    lease_id: input.lease_id, lease_owner: input.lease_owner,
    lease_started_at: iso(now), lease_expires_at: iso(now + leaseMs),
    workflow_run_id: input.workflow_run_id, run_attempt: input.run_attempt,
    base_sha: input.base_sha, idempotency_key: idempotencyKey,
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
  const priorRecord = previous.tasks?.[String(issueNumber)];
  const detailsMatch = (!details.head_sha || details.head_sha === priorRecord?.head_sha) &&
    (!details.pull_request_number || details.pull_request_number === priorRecord?.pull_request_number);
  if (priorRecord?.lease_id === leaseId && priorRecord.status === nextStatus && detailsMatch) return previous;
  const active = assertWorkerLease(previous, issueNumber, leaseId);
  if (!TASK_STATES.includes(nextStatus) || !(TRANSITIONS[active.state] ?? []).includes(nextStatus)) {
    throw new Error("Illegal task state transition: " + active.state + " -> " + nextStatus);
  }
  const next = commit(previous, now);
  next.active_task.state = nextStatus;
  const taskRecord = ensureTask(next, issueNumber);
  taskRecord.status = nextStatus;
  if (nextStatus === "quarantined") taskRecord.quarantined = true;
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
      evidence?.ci_run_id !== existingTask.ci_run_id ||
      evidence?.ci_run_attempt !== existingTask.ci_run_attempt ||
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

export function recordCandidateStarted(previous, issueNumber, eventKey, evidence, now = Date.now()) {
  validateFactoryState(previous);
  if (hasEvent(previous, eventKey)) return { state: previous, duplicate: true };
  if (!positiveInteger(issueNumber) ||
      !/^[a-f0-9]{40}$/i.test(evidence?.head_sha ?? "") ||
      !positiveInteger(evidence?.pull_request_number) ||
      typeof evidence?.ci_run_id !== "string" ||
      evidence.ci_run_id.trim().length === 0 || evidence.ci_run_id.length > 100 ||
      !positiveInteger(evidence?.ci_run_attempt) ||
      !isAgentTaskBranchForIssue(evidence?.head_ref, issueNumber)) {
    throw new Error("Candidate start requires an exact task branch, PR number, head SHA, CI run ID, and run attempt.");
  }
  const existing = previous.tasks?.[String(issueNumber)];
  const allowedStates = new Set(["publishing", "draft_pr_created", "awaiting_ci", "completed", "candidate_rejected", "queued", "retry_wait"]);
  if ((existing && (existing.quarantined || !allowedStates.has(existing.status))) ||
      (existing?.pull_request_number && existing.pull_request_number !== evidence.pull_request_number) ||
      (previous.active_task?.issue_number === issueNumber)) {
    throw new Error("Candidate start does not match an eligible task and its exact PR.");
  }
  const next = commit(previous, now);
  const task = ensureTask(next, issueNumber);
  task.status = "awaiting_ci";
  task.candidate_status = "pending";
  task.head_sha = evidence.head_sha;
  task.pull_request_number = evidence.pull_request_number;
  task.ci_run_id = evidence.ci_run_id;
  task.ci_run_attempt = evidence.ci_run_attempt;
  task.candidate_started_at = iso(now);
  task.candidate_error = null;
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
      evidence?.ci_run_id !== task.ci_run_id ||
      evidence?.ci_run_attempt !== task.ci_run_attempt ||
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
  record.next_attempt_at = record.quarantined
    ? null
    : iso(now + Math.min(30 * 60 * 1000, 60_000 * (2 ** (record.candidate_failures - 1))));
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


export function requeueTask(previous, issueNumber, now = Date.now(), fallbackTimestamp = Date.parse(previous.updated_at)) {
  validateFactoryState(previous);
  const task = previous.tasks?.[String(issueNumber)];
  if (task?.status === "queued" && !task.quarantined) return previous;
  const retryable = task?.status === "retry_wait" ||
    (task?.status === "candidate_rejected" && task.candidate_status === "failure");
  if (!task || task.quarantined || !retryable) throw new Error("Task is not eligible for retry requeue.");
  const retryAt = getTaskRetryAt(task, fallbackTimestamp);
  if (!Number.isFinite(retryAt) || retryAt > now) {
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