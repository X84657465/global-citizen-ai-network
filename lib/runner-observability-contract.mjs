const ROOT_KEYS = new Set(["schemaVersion", "repository", "observedAt", "runner", "queue", "metrics", "quota"]);
const RUNNER_KEYS = new Set(["id", "name", "status", "lastHeartbeatAt", "labels"]);
const QUEUE_KEYS = new Set(["queued", "running", "oldestQueuedAt"]);
const METRIC_KEYS = new Set(["completed", "failed", "retried", "windowMinutes"]);
const QUOTA_KEYS = new Set(["limit", "used", "unit", "resetAt"]);
const REPOSITORY_PATTERN = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;
const TIMESTAMP_PATTERN = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,3})?(Z|([+-])(\d{2}):(\d{2}))$/;

function isRecord(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function onlyKeys(value, allowed) {
  return Object.keys(value).every((key) => allowed.has(key));
}

function validTimestamp(value) {
  if (typeof value !== "string") return false;
  const match = TIMESTAMP_PATTERN.exec(value);
  if (!match) return false;
  const [, y, m, d, h, min, sec, zone, , offsetHourText, offsetMinuteText] = match;
  const year = Number(y), month = Number(m), day = Number(d);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return false;
  if (Number(h) > 23 || Number(min) > 59 || Number(sec) > 59) return false;
  if (zone !== "Z") {
    const offsetHour = Number(offsetHourText), offsetMinute = Number(offsetMinuteText);
    if (offsetMinute > 59 || offsetHour > 14 || (offsetHour === 14 && offsetMinute !== 0)) return false;
  }
  return Number.isFinite(Date.parse(value));
}

function nonNegativeInteger(value) {
  return Number.isSafeInteger(value) && value >= 0;
}

/**
 * Validate a privacy-minimized Runner/queue snapshot.
 * The contract deliberately excludes tokens, environment variables, host paths and job payloads.
 */
export function validateRunnerSnapshot(snapshot, options = {}) {
  const errors = [];
  if (!isRecord(snapshot)) return { valid: false, errors: ["snapshot must be a plain object"] };
  if (!isRecord(options)) return { valid: false, errors: ["options must be a plain object"] };
  if (!onlyKeys(snapshot, ROOT_KEYS)) errors.push("snapshot contains unsupported root fields");
  if (snapshot.schemaVersion !== 1) errors.push("schemaVersion must equal 1");
  if (typeof snapshot.repository !== "string" || !REPOSITORY_PATTERN.test(snapshot.repository)) errors.push("repository must use owner/repository format");
  if (options.expectedRepository !== undefined && snapshot.repository !== options.expectedRepository) errors.push("repository does not match expected repository");
  if (!validTimestamp(snapshot.observedAt)) errors.push("observedAt must be a valid timezone-qualified ISO timestamp");

  if (!isRecord(snapshot.runner)) {
    errors.push("runner must be a plain object");
  } else {
    const runner = snapshot.runner;
    if (!onlyKeys(runner, RUNNER_KEYS)) errors.push("runner contains unsupported fields");
    if (typeof runner.id !== "string" || runner.id.trim().length === 0 || runner.id.length > 128) errors.push("runner.id must be a non-empty string up to 128 characters");
    if (typeof runner.name !== "string" || runner.name.trim().length === 0 || runner.name.length > 128) errors.push("runner.name must be a non-empty string up to 128 characters");
    if (!["online", "offline", "busy", "idle"].includes(runner.status)) errors.push("runner.status must be online, offline, busy or idle");
    if (!validTimestamp(runner.lastHeartbeatAt)) errors.push("runner.lastHeartbeatAt must be a valid timezone-qualified ISO timestamp");
    if (!Array.isArray(runner.labels) || runner.labels.length > 32 || runner.labels.some((label) => typeof label !== "string" || label.length === 0 || label.length > 64)) errors.push("runner.labels must contain at most 32 non-empty strings up to 64 characters");
  }

  if (!isRecord(snapshot.queue)) {
    errors.push("queue must be a plain object");
  } else {
    const queue = snapshot.queue;
    if (!onlyKeys(queue, QUEUE_KEYS)) errors.push("queue contains unsupported fields");
    if (!nonNegativeInteger(queue.queued)) errors.push("queue.queued must be a non-negative safe integer");
    if (!nonNegativeInteger(queue.running)) errors.push("queue.running must be a non-negative safe integer");
    if (queue.oldestQueuedAt !== null && !validTimestamp(queue.oldestQueuedAt)) errors.push("queue.oldestQueuedAt must be null or a valid timezone-qualified ISO timestamp");
    if (queue.queued === 0 && queue.oldestQueuedAt !== null) errors.push("queue.oldestQueuedAt must be null when no tasks are queued");
    if (queue.queued > 0 && queue.oldestQueuedAt === null) errors.push("queue.oldestQueuedAt is required when tasks are queued");
  }

  if (!isRecord(snapshot.metrics)) {
    errors.push("metrics must be a plain object");
  } else {
    const metrics = snapshot.metrics;
    if (!onlyKeys(metrics, METRIC_KEYS)) errors.push("metrics contains unsupported fields");
    for (const key of ["completed", "failed", "retried"]) {
      if (!nonNegativeInteger(metrics[key])) errors.push("metrics." + key + " must be a non-negative safe integer");
    }
    if (!Number.isSafeInteger(metrics.windowMinutes) || metrics.windowMinutes < 1 || metrics.windowMinutes > 10080) errors.push("metrics.windowMinutes must be between 1 and 10080");
    if (nonNegativeInteger(metrics.failed) && nonNegativeInteger(metrics.completed) && metrics.failed + metrics.completed > Number.MAX_SAFE_INTEGER) errors.push("metrics outcome total exceeds the safe integer range");
  }

  if (!isRecord(snapshot.quota)) {
    errors.push("quota must be a plain object");
  } else {
    const quota = snapshot.quota;
    if (!onlyKeys(quota, QUOTA_KEYS)) errors.push("quota contains unsupported fields");
    if (!Number.isSafeInteger(quota.limit) || quota.limit < 1) errors.push("quota.limit must be a positive safe integer");
    if (!nonNegativeInteger(quota.used)) errors.push("quota.used must be a non-negative safe integer");
    if (typeof quota.unit !== "string" || !/^[A-Za-z][A-Za-z0-9_-]{0,23}$/.test(quota.unit)) errors.push("quota.unit must be a short identifier");
    if (quota.resetAt !== null && !validTimestamp(quota.resetAt)) errors.push("quota.resetAt must be null or a valid timezone-qualified ISO timestamp");
  }
  return { valid: errors.length === 0, errors };
}

const DEFAULT_POLICY = Object.freeze({
  heartbeatStaleMs: 120000,
  queueWarningDepth: 5,
  queueCriticalDepth: 15,
  failureRateWarning: 0.1,
  quotaWarningRatio: 0.8,
  quotaCriticalRatio: 0.95,
});

const POLICY_KEYS = new Set(Object.keys(DEFAULT_POLICY));

/**
 * Produce advisory health findings only. This function never pauses or mutates a Runner.
 */
export function evaluateRunnerHealth(snapshot, policy = {}) {
  const validation = validateRunnerSnapshot(snapshot);
  if (!validation.valid) return { valid: false, severity: "invalid", findings: validation.errors, recommendedActions: [] };
  if (!isRecord(policy) || !onlyKeys(policy, POLICY_KEYS)) {
    return { valid: false, severity: "invalid", findings: ["policy must be a plain object containing only supported thresholds"], recommendedActions: [] };
  }
  const thresholds = { ...DEFAULT_POLICY, ...policy };
  const integerThresholds = ["heartbeatStaleMs", "queueWarningDepth", "queueCriticalDepth"];
  for (const key of integerThresholds) {
    if (!Number.isSafeInteger(thresholds[key]) || thresholds[key] < 1) return { valid: false, severity: "invalid", findings: ["policy." + key + " must be a positive safe integer"], recommendedActions: [] };
  }
  for (const key of ["failureRateWarning", "quotaWarningRatio", "quotaCriticalRatio"]) {
    if (typeof thresholds[key] !== "number" || !Number.isFinite(thresholds[key]) || thresholds[key] < 0 || thresholds[key] > 1) return { valid: false, severity: "invalid", findings: ["policy." + key + " must be between 0 and 1"], recommendedActions: [] };
  }
  if (thresholds.queueCriticalDepth < thresholds.queueWarningDepth || thresholds.quotaCriticalRatio < thresholds.quotaWarningRatio) {
    return { valid: false, severity: "invalid", findings: ["critical thresholds must not be lower than warning thresholds"], recommendedActions: [] };
  }

  const findings = [];
  const recommendedActions = new Set();
  const observedAt = Date.parse(snapshot.observedAt);
  const heartbeatAgeMs = observedAt - Date.parse(snapshot.runner.lastHeartbeatAt);
  if (heartbeatAgeMs < 0) findings.push("runner heartbeat is later than the observation timestamp");
  if (snapshot.runner.status === "offline" || (heartbeatAgeMs >= 0 && heartbeatAgeMs > thresholds.heartbeatStaleMs)) {
    findings.push("runner is offline or its heartbeat is stale");
    recommendedActions.add("pause_new_tasks_pending_operator_review");
  }
  if (snapshot.queue.queued >= thresholds.queueCriticalDepth) {
    findings.push("queue depth is at or above the critical threshold");
    recommendedActions.add("alert_operator");
    recommendedActions.add("consider_capacity_reduction_or_extra_runner");
  } else if (snapshot.queue.queued >= thresholds.queueWarningDepth) {
    findings.push("queue depth is at or above the warning threshold");
    recommendedActions.add("alert_operator");
  }
  const outcomes = snapshot.metrics.completed + snapshot.metrics.failed;
  const failureRate = outcomes === 0 ? 0 : snapshot.metrics.failed / outcomes;
  if (outcomes > 0 && failureRate >= thresholds.failureRateWarning) {
    findings.push("failure rate is at or above the warning threshold");
    recommendedActions.add("inspect_recent_failure_signatures");
  }
  const quotaRatio = snapshot.quota.used / snapshot.quota.limit;
  if (quotaRatio >= thresholds.quotaCriticalRatio) {
    findings.push("quota consumption is at or above the critical threshold");
    recommendedActions.add("pause_quota_consuming_work_pending_operator_review");
  } else if (quotaRatio >= thresholds.quotaWarningRatio) {
    findings.push("quota consumption is at or above the warning threshold");
    recommendedActions.add("alert_operator");
  }
  if (heartbeatAgeMs < 0) recommendedActions.add("verify_clock_synchronization");
  const severity = recommendedActions.has("pause_new_tasks_pending_operator_review") || recommendedActions.has("pause_quota_consuming_work_pending_operator_review") || findings.some((item) => item.includes("critical threshold"))
    ? "critical"
    : findings.length > 0 ? "warning" : "normal";
  return {
    valid: true,
    severity,
    findings,
    metrics: { heartbeatAgeMs, failureRate, quotaRatio },
    recommendedActions: [...recommendedActions],
  };
}
