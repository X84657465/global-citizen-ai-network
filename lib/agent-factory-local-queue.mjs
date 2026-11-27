import { randomUUID } from "node:crypto";
import { DatabaseSync } from "node:sqlite";

const TASK_STATUSES = new Set(["queued", "running", "retry_wait", "succeeded", "failed", "quarantined"]);

function requiredString(value, label, maxLength = 500) {
  if (typeof value !== "string" || value.trim().length === 0 || value.length > maxLength) {
    throw new TypeError(label + " must be a non-empty string no longer than " + maxLength + " characters.");
  }
  return value.trim();
}

function parseJson(value, label) {
  try {
    return JSON.parse(value);
  } catch {
    throw new Error("Stored " + label + " is invalid JSON.");
  }
}

export function createLocalFactoryQueue({
  databasePath,
  now = () => Date.now(),
  leaseMs = 10 * 60 * 1000,
  retryDelayMs = 5_000,
} = {}) {
  if (typeof databasePath !== "string" || databasePath.trim().length === 0) {
    throw new TypeError("A local SQLite database path is required.");
  }
  if (!Number.isSafeInteger(leaseMs) || leaseMs < 1_000) {
    throw new TypeError("leaseMs must be an integer of at least 1000 milliseconds.");
  }
  if (!Number.isSafeInteger(retryDelayMs) || retryDelayMs < 0) {
    throw new TypeError("retryDelayMs must be a non-negative safe integer.");
  }

  const db = new DatabaseSync(databasePath);
  db.exec("PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;");
  db.exec(`
    CREATE TABLE IF NOT EXISTS factory_local_tasks (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      payload_json TEXT NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('queued','running','retry_wait','succeeded','failed','quarantined')),
      attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts >= 0),
      failures INTEGER NOT NULL DEFAULT 0 CHECK (failures >= 0),
      max_failures INTEGER NOT NULL CHECK (max_failures BETWEEN 1 AND 3),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      available_at INTEGER NOT NULL,
      lease_owner TEXT,
      lease_token TEXT,
      lease_expires_at INTEGER,
      lease_expiries INTEGER NOT NULL DEFAULT 0 CHECK (lease_expiries >= 0),
      result_json TEXT,
      last_error TEXT
    );
    CREATE INDEX IF NOT EXISTS factory_local_tasks_ready
      ON factory_local_tasks(status, available_at, created_at);
    CREATE TABLE IF NOT EXISTS factory_local_events (
      event_id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id TEXT NOT NULL REFERENCES factory_local_tasks(id),
      event_type TEXT NOT NULL,
      occurred_at TEXT NOT NULL,
      detail_json TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS factory_local_events_task
      ON factory_local_events(task_id, event_id);
  `);

  const existingColumns = new Set(db.prepare("PRAGMA table_info(factory_local_tasks)").all().map((column) => column.name));
  if (!existingColumns.has("lease_token")) db.exec("ALTER TABLE factory_local_tasks ADD COLUMN lease_token TEXT");
  if (!existingColumns.has("lease_expiries")) db.exec("ALTER TABLE factory_local_tasks ADD COLUMN lease_expiries INTEGER NOT NULL DEFAULT 0");

  const timestamp = () => new Date(now()).toISOString();
  const recordEvent = db.prepare(
    "INSERT INTO factory_local_events(task_id,event_type,occurred_at,detail_json) VALUES(?,?,?,?)",
  );

  function event(taskId, type, detail = {}) {
    recordEvent.run(taskId, type, timestamp(), JSON.stringify(detail));
  }

  function mapTask(row, { includeLeaseToken = false } = {}) {
    if (!row) return null;
    if (!TASK_STATUSES.has(row.status)) throw new Error("SQLite contains an unsupported task status.");
    return {
      id: row.id,
      title: row.title,
      payload: parseJson(row.payload_json, "task payload"),
      status: row.status,
      attempts: row.attempts,
      failures: row.failures,
      max_failures: row.max_failures,
      created_at: row.created_at,
      updated_at: row.updated_at,
      available_at: row.available_at,
      lease_owner: row.lease_owner,
      lease_token: includeLeaseToken ? row.lease_token : null,
      lease_expires_at: row.lease_expires_at,
      lease_expiries: row.lease_expiries,
      result: row.result_json === null ? null : parseJson(row.result_json, "task result"),
      last_error: row.last_error,
    };
  }

  function transaction(operation) {
    db.exec("BEGIN IMMEDIATE");
    try {
      const result = operation();
      db.exec("COMMIT");
      return result;
    } catch (error) {
      try { db.exec("ROLLBACK"); } catch { /* preserve the original failure */ }
      throw error;
    }
  }

  function add({ id = randomUUID(), title, payload, maxFailures = 3 } = {}) {
    const taskId = requiredString(id, "Task id", 128);
    const taskTitle = requiredString(title, "Task title", 300);
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      throw new TypeError("Task payload must be a JSON object.");
    }
    if (!Number.isSafeInteger(maxFailures) || maxFailures < 1 || maxFailures > 3) {
      throw new TypeError("maxFailures must be an integer from 1 to 3.");
    }
    const created = timestamp();
    transaction(() => {
      db.prepare(`
        INSERT INTO factory_local_tasks
          (id,title,payload_json,status,attempts,failures,max_failures,created_at,updated_at,available_at)
        VALUES(?,?,?,'queued',0,0,?,?,?,?)
      `).run(taskId, taskTitle, JSON.stringify(payload), maxFailures, created, created, now());
      event(taskId, "task_queued", { title: taskTitle });
    });
    return get(taskId);
  }

  function recoverExpiredRows(current) {
    const expired = db.prepare(
      "SELECT id, failures, max_failures, lease_expiries FROM factory_local_tasks WHERE status='running' AND lease_expires_at <= ?",
    ).all(current);
    for (const row of expired) {
      const leaseExpiries = row.lease_expiries + 1;
      const quarantined = leaseExpiries >= row.max_failures;
      db.prepare(`
        UPDATE factory_local_tasks
        SET status=?, lease_owner=NULL, lease_token=NULL, lease_expires_at=NULL,
            lease_expiries=?, available_at=?, updated_at=?, last_error=?
        WHERE id=? AND status='running' AND lease_expires_at <= ?
      `).run(
        quarantined ? "quarantined" : "queued",
        leaseExpiries,
        current,
        timestamp(),
        "Worker lease expired; recovery is bounded and does not count as a task failure.",
        row.id,
        current,
      );
      event(row.id, quarantined ? "task_quarantined_after_expired_lease" : "task_lease_recovered", {
        failure_count: row.failures,
        lease_expiries: leaseExpiries,
        max_lease_expiries: row.max_failures,
      });
    }
    return expired.length;
  }

  function recoverExpiredLeases() {
    const current = now();
    return transaction(() => recoverExpiredRows(current));
  }

  function claim(workerId) {
    const owner = requiredString(workerId, "Worker id", 128);
    const current = now();
    return transaction(() => {
      recoverExpiredRows(current);
      const row = db.prepare(`
        SELECT id FROM factory_local_tasks
        WHERE status IN ('queued','retry_wait') AND available_at <= ?
        ORDER BY created_at ASC, id ASC LIMIT 1
      `).get(current);
      if (!row) return null;
      const expires = current + leaseMs;
      const leaseToken = randomUUID();
      const update = db.prepare(`
        UPDATE factory_local_tasks SET status='running', attempts=attempts+1,
          lease_owner=?, lease_token=?, lease_expires_at=?, updated_at=?
        WHERE id=? AND status IN ('queued','retry_wait') AND available_at <= ?
      `).run(owner, leaseToken, expires, timestamp(), row.id, current);
      if (Number(update.changes) !== 1) return null;
      event(row.id, "task_claimed", { worker_id: owner, lease_expires_at: expires });
      return mapTask(db.prepare("SELECT * FROM factory_local_tasks WHERE id=?").get(row.id), { includeLeaseToken: true });
    });
  }

  function complete(taskId, workerId, leaseToken, result) {
    const id = requiredString(taskId, "Task id", 128);
    const owner = requiredString(workerId, "Worker id", 128);
    const token = requiredString(leaseToken, "Lease token", 128);
    if (!result || typeof result !== "object" || Array.isArray(result)) {
      throw new TypeError("Task result must be a JSON object.");
    }
    return transaction(() => {
      const update = db.prepare(`
        UPDATE factory_local_tasks SET status='succeeded', result_json=?, updated_at=?,
          lease_owner=NULL, lease_token=NULL, lease_expires_at=NULL, last_error=NULL
        WHERE id=? AND status='running' AND lease_owner=? AND lease_token=? AND lease_expires_at > ?
      `).run(JSON.stringify(result), timestamp(), id, owner, token, now());
      if (Number(update.changes) !== 1) throw new Error("Task lease is not owned by this worker.");
      event(id, "task_succeeded", { result_keys: Object.keys(result).sort() });
      return get(id);
    });
  }

  function fail(taskId, workerId, leaseToken, error, { scope = "task" } = {}) {
    const id = requiredString(taskId, "Task id", 128);
    const owner = requiredString(workerId, "Worker id", 128);
    const token = requiredString(leaseToken, "Lease token", 128);
    const summary = requiredString(String(error ?? "Unspecified failure"), "Failure summary", 1200);
    if (scope !== "task" && scope !== "system") throw new TypeError("Failure scope must be task or system.");
    return transaction(() => {
      const current = db.prepare(
        "SELECT failures,max_failures FROM factory_local_tasks WHERE id=? AND status='running' AND lease_owner=? AND lease_token=? AND lease_expires_at > ?",
      ).get(id, owner, token, now());
      if (!current) throw new Error("Task lease is not owned by this worker.");
      const failures = current.failures + (scope === "task" ? 1 : 0);
      const status = scope === "system" ? "queued" :
        failures >= current.max_failures ? "quarantined" : "retry_wait";
      db.prepare(`
        UPDATE factory_local_tasks SET status=?, failures=?, available_at=?, updated_at=?,
          lease_owner=NULL, lease_token=NULL, lease_expires_at=NULL, last_error=?
        WHERE id=? AND status='running' AND lease_owner=? AND lease_token=? AND lease_expires_at > ?
      `).run(
        status,
        failures,
        now() + (status === "retry_wait" ? retryDelayMs : 0),
        timestamp(),
        summary,
        id,
        owner,
        token,
        now(),
      );
      event(id, scope === "system" ? "system_failure_released" : "task_failure_recorded", {
        scope, failures, next_status: status, error: summary,
      });
      return get(id);
    });
  }

  function get(taskId) {
    const id = requiredString(taskId, "Task id", 128);
    return mapTask(db.prepare("SELECT * FROM factory_local_tasks WHERE id=?").get(id));
  }

  function list({ status, limit = 50 } = {}) {
    if (!Number.isSafeInteger(limit) || limit < 1 || limit > 500) {
      throw new TypeError("Task list limit must be from 1 to 500.");
    }
    if (status !== undefined && !TASK_STATUSES.has(status)) throw new TypeError("Unsupported task status.");
    const rows = status
      ? db.prepare("SELECT * FROM factory_local_tasks WHERE status=? ORDER BY created_at,id LIMIT ?").all(status, limit)
      : db.prepare("SELECT * FROM factory_local_tasks ORDER BY created_at,id LIMIT ?").all(limit);
    return rows.map(mapTask);
  }

  function events(taskId) {
    const id = requiredString(taskId, "Task id", 128);
    return db.prepare(
      "SELECT event_id,task_id,event_type,occurred_at,detail_json FROM factory_local_events WHERE task_id=? ORDER BY event_id",
    ).all(id).map((row) => ({
      event_id: row.event_id,
      task_id: row.task_id,
      event_type: row.event_type,
      occurred_at: row.occurred_at,
      detail: parseJson(row.detail_json, "event detail"),
    }));
  }

  return Object.freeze({
    add,
    claim,
    complete,
    fail,
    get,
    list,
    events,
    recoverExpiredLeases,
    close: () => db.close(),
  });
}
