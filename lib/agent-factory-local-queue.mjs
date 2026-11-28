import { randomUUID, createHash } from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import { verifyLocalFactoryPublicationTarget } from "./agent-factory-local-publication-contract.mjs";

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

function rejectAcceptance(message) {
  const error = new Error("SQLite Trusted Acceptance Gate rejected task completion: " + message);
  error.scope = "task";
  throw error;
}

function validTapEvidence(evidence) {
  const summary = evidence?.tap_summary;
  return evidence?.exit_code === 0 &&
    Number.isSafeInteger(evidence?.passed_tests) && evidence.passed_tests > 0 &&
    summary?.valid === true &&
    summary.tests === evidence.passed_tests &&
    summary.pass === summary.tests &&
    summary.fail === 0 && summary.cancelled === 0 &&
    summary.skipped === 0 && summary.todo === 0 &&
    Array.isArray(evidence.test_files) && evidence.test_files.length > 0;
}

export function createLocalFactoryQueue({
  databasePath,
  now = () => Date.now(),
  leaseMs = 10 * 60 * 1000,
  retryDelayMs = 5_000,
  systemRetryDelayMs = 30_000,
  maxSystemRetryDelayMs = 5 * 60 * 1000,
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
  if (!Number.isSafeInteger(systemRetryDelayMs) || systemRetryDelayMs < 1_000) {
    throw new TypeError("systemRetryDelayMs must be an integer of at least 1000 milliseconds.");
  }
  if (!Number.isSafeInteger(maxSystemRetryDelayMs) || maxSystemRetryDelayMs < systemRetryDelayMs) {
    throw new TypeError("maxSystemRetryDelayMs must be at least systemRetryDelayMs.");
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
      system_failures INTEGER NOT NULL DEFAULT 0 CHECK (system_failures >= 0),
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
    CREATE TABLE IF NOT EXISTS factory_local_publications (
      task_id TEXT PRIMARY KEY REFERENCES factory_local_tasks(id),
      idempotency_key TEXT NOT NULL UNIQUE,
      state TEXT NOT NULL CHECK (state IN ('prepared','branch_created','draft_pr_created')),
      repository TEXT NOT NULL,
      base_branch TEXT NOT NULL,
      base_sha TEXT NOT NULL,
      contract_sha256 TEXT NOT NULL,
      target_sha256 TEXT NOT NULL,
      branch TEXT NOT NULL,
      patch_sha256 TEXT NOT NULL,
      commit_sha TEXT,
      pull_request_number INTEGER,
      pull_request_url TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  const existingColumns = new Set(db.prepare("PRAGMA table_info(factory_local_tasks)").all().map((column) => column.name));
  if (!existingColumns.has("system_failures")) db.exec("ALTER TABLE factory_local_tasks ADD COLUMN system_failures INTEGER NOT NULL DEFAULT 0");
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
      system_failures: row.system_failures,
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
      event(taskId, "task_queued", {
        title: taskTitle,
        trusted_oracle_contract_sha256: payload.trusted_oracle_contract?.contract_sha256 ?? null,
      });
    });
    return get(taskId);
  }

  function addFromSource({ id, title, payload, sourceEnvelope, maxFailures = 3 } = {}) {
    const taskId = requiredString(id, "Task id", 128);
    const taskTitle = requiredString(title, "Task title", 300);
    if (!payload || typeof payload !== "object" || Array.isArray(payload) ||
        !sourceEnvelope || typeof sourceEnvelope !== "object" || Array.isArray(sourceEnvelope)) {
      throw new TypeError("A task payload and trusted source envelope are required.");
    }
    if (sourceEnvelope.schema_version !== 1 ||
        sourceEnvelope.kind !== "github-issue-source" ||
        typeof sourceEnvelope.repository !== "string" ||
        !/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(sourceEnvelope.repository) ||
        !Number.isSafeInteger(sourceEnvelope.issue_number) || sourceEnvelope.issue_number < 1 ||
        taskId !== "github-issue-" + sourceEnvelope.issue_number ||
        sourceEnvelope.canonical_url !== "https://github.com/" + sourceEnvelope.repository + "/issues/" + sourceEnvelope.issue_number ||
        typeof sourceEnvelope.updated_at !== "string" || !Number.isFinite(Date.parse(sourceEnvelope.updated_at)) ||
        !Number.isSafeInteger(sourceEnvelope.source_state_version) || sourceEnvelope.source_state_version < 0 ||
        !/^[a-f0-9]{64}$/.test(sourceEnvelope.stable_dedupe_key ?? "") ||
        sourceEnvelope.stable_dedupe_key !== createHash("sha256")
          .update(sourceEnvelope.repository.toLowerCase() + "#" + sourceEnvelope.issue_number).digest("hex") ||
        !/^[a-f0-9]{64}$/.test(sourceEnvelope.issue_body_sha256 ?? "") ||
        JSON.stringify(payload.source_envelope) !== JSON.stringify(sourceEnvelope)) {
      throw new TypeError("GitHub source envelope is malformed or detached from the queued payload.");
    }
    if (!Number.isSafeInteger(maxFailures) || maxFailures < 1 || maxFailures > 3) {
      throw new TypeError("maxFailures must be an integer from 1 to 3.");
    }
    const created = timestamp();
    return transaction(() => {
      const existing = db.prepare("SELECT * FROM factory_local_tasks WHERE id=?").get(taskId);
      if (existing) {
        const previous = parseJson(existing.payload_json, "task payload");
        const priorSource = previous?.source_envelope;
        if (priorSource?.stable_dedupe_key !== sourceEnvelope.stable_dedupe_key ||
            priorSource?.updated_at !== sourceEnvelope.updated_at ||
            priorSource?.issue_body_sha256 !== sourceEnvelope.issue_body_sha256) {
          throw new Error("GitHub Issue source changed after prior intake; explicit reconciliation is required before re-intake.");
        }
        return { created: false, task: mapTask(existing) };
      }
      db.prepare(`
        INSERT INTO factory_local_tasks
          (id,title,payload_json,status,attempts,failures,max_failures,created_at,updated_at,available_at)
        VALUES(?,?,?,'queued',0,0,?,?,?,?)
      `).run(taskId, taskTitle, JSON.stringify(payload), maxFailures, created, created, now());
      event(taskId, "task_queued_from_github_issue", {
        source_dedupe_key: sourceEnvelope.stable_dedupe_key,
        issue_number: sourceEnvelope.issue_number,
        source_state_version: sourceEnvelope.source_state_version,
        issue_updated_at: sourceEnvelope.updated_at,
      });
      return { created: true, task: get(taskId) };
    });
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
    return transaction(() => {
      // Sample time only after BEGIN IMMEDIATE succeeds. Sampling before lock
      // acquisition can miss leases that expire while this connection waits.
      const current = now();
      return recoverExpiredRows(current);
    });
  }

  function claim(workerId) {
    const owner = requiredString(workerId, "Worker id", 128);
    return transaction(() => {
      // A write-lock wait must not consume the newly granted worker lease.
      const current = now();
      recoverExpiredRows(current);
      const row = db.prepare(`
        SELECT id FROM factory_local_tasks
        WHERE status IN ('queued','retry_wait') AND available_at <= ?
          AND NOT EXISTS (SELECT 1 FROM factory_local_tasks WHERE status='running')
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
      const current = db.prepare(`
        SELECT payload_json FROM factory_local_tasks
        WHERE id=? AND status='running' AND lease_owner=? AND lease_token=? AND lease_expires_at > ?
      `).get(id, owner, token, now());
      if (!current) throw new Error("Task lease is not owned by this worker.");
      const payload = parseJson(current.payload_json, "task payload");
      let acceptanceDigest = null;
      if (payload.kind === "local-agent-task") {
        const contract = payload.trusted_oracle_contract;
        const oracleEvidence = result.acceptance_evidence;
        const trusted = result.trusted_oracle;
        const generatedEvidence = result.scratch_evidence?.sandbox_evidence;
        const expectedOracleFiles = Array.isArray(contract?.files)
          ? contract.files.map((file) => file.path).sort()
          : [];
        const actualOracleFiles = Array.isArray(oracleEvidence?.test_files)
          ? [...oracleEvidence.test_files].sort()
          : [];
        const patchArtifact = result.patch_artifact;
        const patchFiles = Array.isArray(patchArtifact?.patch?.files) ? patchArtifact.patch.files : [];
        const patchedEvidence = Array.isArray(result.scratch_evidence?.patched_files)
          ? result.scratch_evidence.patched_files
          : [];
        const allowedPaths = new Set(Array.isArray(payload.task?.allowed_paths) ? payload.task.allowed_paths : []);
        const seenPaths = new Set();
        const canonicalPatchEvidence = [];
        let patchBytes = 0;
        let patchIntegrityValid = patchArtifact?.status === "VALIDATED_PATCH" &&
          patchArtifact.patch.schema_version === 1 && patchFiles.length > 0 &&
          patchFiles.length === patchedEvidence.length;
        for (const file of patchFiles) {
          if (!file || typeof file.path !== "string" || !allowedPaths.has(file.path) ||
              !["add", "modify"].includes(file.operation) || typeof file.content !== "string" ||
              seenPaths.has(file.path.toLowerCase())) {
            patchIntegrityValid = false;
            break;
          }
          seenPaths.add(file.path.toLowerCase());
          const bytes = Buffer.byteLength(file.content, "utf8");
          const sha256 = createHash("sha256").update(file.content, "utf8").digest("hex");
          patchBytes += bytes;
          canonicalPatchEvidence.push({ path: file.path, operation: file.operation, bytes, sha256 });
        }
        const suppliedPatchEvidence = patchedEvidence
          .map((file) => ({
            path: file?.path,
            operation: file?.operation,
            bytes: file?.bytes,
            sha256: file?.sha256,
          }))
          .sort((a, b) => String(a.path).localeCompare(String(b.path)));
        const expectedPatchEvidence = [...canonicalPatchEvidence]
          .sort((a, b) => a.path.localeCompare(b.path));
        if (patchBytes > 256 * 1024 ||
            JSON.stringify(suppliedPatchEvidence) !== JSON.stringify(expectedPatchEvidence)) {
          patchIntegrityValid = false;
        }
        const expectedGeneratedFiles = patchFiles
          .filter((file) => typeof file?.path === "string" &&
            file.path.startsWith("tests/") && file.path.endsWith(".test.mjs"))
          .map((file) => file.path).sort();
        const actualGeneratedFiles = Array.isArray(generatedEvidence?.test_files)
          ? [...generatedEvidence.test_files].sort()
          : [];
        const generatedFilesMatch = expectedGeneratedFiles.length > 0 &&
          JSON.stringify(expectedGeneratedFiles) === JSON.stringify(actualGeneratedFiles);
        const oracleFilesMatch = expectedOracleFiles.length > 0 &&
          JSON.stringify(expectedOracleFiles) === JSON.stringify(actualOracleFiles);
        let publicationTargetValid = false;
        try {
          verifyLocalFactoryPublicationTarget(payload.publication_target, { taskId: id, contract });
          publicationTargetValid = true;
        } catch {
          publicationTargetValid = false;
        }
        if (payload.task_id !== id || contract?.task_id !== id ||
            typeof contract.contract_sha256 !== "string" ||
            result.outcome !== "accepted" || result.acceptance_status !== "ACCEPTED" ||
            result.generated_code_executed !== true ||
            result.scratch_evidence?.generated_code_executed !== true ||
            result.scratch_evidence?.repository_files_modified !== false ||
            result.scratch_evidence?.status !== "SANDBOX_TESTS_PASSED" ||
            trusted?.valid !== true || trusted.task_id !== id ||
            trusted.base_sha !== contract.base_sha ||
            trusted.contract_sha256 !== contract.contract_sha256 ||
            oracleEvidence?.valid !== true || oracleEvidence.task_id !== id ||
            oracleEvidence.base_sha !== contract.base_sha ||
            oracleEvidence.contract_sha256 !== contract.contract_sha256 ||
            !validTapEvidence(oracleEvidence) || !oracleFilesMatch ||
            !validTapEvidence(generatedEvidence) || !generatedFilesMatch ||
            !patchIntegrityValid || !publicationTargetValid) {
          rejectAcceptance("the task ID, exact patch/scratch digests, publication target, separate generated-test evidence, and independent Oracle evidence must all match and pass.");
        }
        acceptanceDigest = contract.contract_sha256;
      }
      const update = db.prepare(`
        UPDATE factory_local_tasks SET status='succeeded', result_json=?, updated_at=?,
          lease_owner=NULL, lease_token=NULL, lease_expires_at=NULL, last_error=NULL
        WHERE id=? AND status='running' AND lease_owner=? AND lease_token=? AND lease_expires_at > ?
      `).run(JSON.stringify(result), timestamp(), id, owner, token, now());
      if (Number(update.changes) !== 1) throw new Error("Task lease is not owned by this worker.");
      event(id, "task_succeeded", {
        result_keys: Object.keys(result).sort(),
        acceptance_status: result.acceptance_status ?? null,
        trusted_oracle_contract_sha256: acceptanceDigest,
      });
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
        "SELECT failures,system_failures,max_failures FROM factory_local_tasks WHERE id=? AND status='running' AND lease_owner=? AND lease_token=? AND lease_expires_at > ?",
      ).get(id, owner, token, now());
      if (!current) throw new Error("Task lease is not owned by this worker.");
      const failures = current.failures + (scope === "task" ? 1 : 0);
      const systemFailures = current.system_failures + (scope === "system" ? 1 : 0);
      const status = scope === "system" ? "queued" :
        failures >= current.max_failures ? "quarantined" : "retry_wait";
      const systemDelayMs = Math.min(
        maxSystemRetryDelayMs,
        systemRetryDelayMs * (2 ** Math.min(systemFailures - 1, 10)),
      );
      const nextAvailableAt = now() + (scope === "system"
        ? systemDelayMs
        : status === "retry_wait" ? retryDelayMs : 0);
      const update = db.prepare(`
        UPDATE factory_local_tasks SET status=?, failures=?, system_failures=?, available_at=?, updated_at=?,
          lease_owner=NULL, lease_token=NULL, lease_expires_at=NULL, last_error=?
        WHERE id=? AND status='running' AND lease_owner=? AND lease_token=? AND lease_expires_at > ?
      `).run(
        status,
        failures,
        systemFailures,
        nextAvailableAt,
        timestamp(),
        summary,
        id,
        owner,
        token,
        now(),
      );
      if (Number(update.changes) !== 1) throw new Error("Task lease is not owned by this worker.");
      event(id, scope === "system" ? "system_failure_released" : "task_failure_recorded", {
        scope, failures, system_failures: systemFailures,
        retry_delay_ms: scope === "system" ? systemDelayMs : status === "retry_wait" ? retryDelayMs : 0,
        next_status: status, error: summary,
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

  function mapPublication(row) {
    if (!row) return null;
    return {
      task_id: row.task_id,
      idempotency_key: row.idempotency_key,
      state: row.state,
      repository: row.repository,
      base_branch: row.base_branch,
      base_sha: row.base_sha,
      contract_sha256: row.contract_sha256,
      target_sha256: row.target_sha256,
      branch: row.branch,
      patch_sha256: row.patch_sha256,
      commit_sha: row.commit_sha,
      pull_request_number: row.pull_request_number,
      pull_request_url: row.pull_request_url,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }

  function getPublication(taskId) {
    const id = requiredString(taskId, "Task id", 128);
    return mapPublication(db.prepare("SELECT * FROM factory_local_publications WHERE task_id=?").get(id));
  }

  function recordPublication(taskId, input) {
    const id = requiredString(taskId, "Task id", 128);
    if (!input || typeof input !== "object" || Array.isArray(input)) {
      throw new TypeError("Publication state must be an object.");
    }
    const idempotencyKey = requiredString(input.idempotency_key, "Publication idempotency key", 128);
    const repository = requiredString(input.repository, "Publication repository", 200);
    const baseBranch = requiredString(input.base_branch, "Publication base branch", 200);
    const baseSha = requiredString(input.base_sha, "Publication base SHA", 40);
    const contractSha = requiredString(input.contract_sha256, "Publication contract SHA-256", 64);
    const targetSha = requiredString(input.target_sha256, "Publication target SHA-256", 64);
    const branch = requiredString(input.branch, "Publication branch", 240);
    const patchSha = requiredString(input.patch_sha256, "Publication patch SHA-256", 64);
    const state = input.state;
    const rank = { prepared: 1, branch_created: 2, draft_pr_created: 3 };
    if (!rank[state]) throw new TypeError("Unsupported local publication state.");
    if (!/^[a-f0-9]{64}$/.test(idempotencyKey) ||
        !/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository) ||
        !/^[a-f0-9]{40}$/i.test(baseSha) ||
        !/^[a-f0-9]{64}$/.test(contractSha) ||
        !/^[a-f0-9]{64}$/.test(targetSha) ||
        !/^[a-f0-9]{64}$/.test(patchSha) ||
        !/^[A-Za-z0-9_.\/-]+$/.test(branch) || branch.includes("..") || branch.includes("//")) {
      throw new TypeError("Local publication identity fields are invalid.");
    }
    let commitSha = input.commit_sha ?? null;
    let pullNumber = input.pull_request_number ?? null;
    let pullUrl = input.pull_request_url ?? null;
    if (state !== "prepared" && !/^[a-f0-9]{40}$/i.test(commitSha ?? "")) {
      throw new TypeError("A verified commit SHA is required after branch creation.");
    }
    if (state === "draft_pr_created" &&
        (!Number.isSafeInteger(pullNumber) || pullNumber < 1 ||
         typeof pullUrl !== "string" || !/^https:\/\/github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+\/pull\/\d+$/.test(pullUrl))) {
      throw new TypeError("A verified Draft PR number and GitHub URL are required.");
    }
    return transaction(() => {
      const task = db.prepare("SELECT status,payload_json,result_json FROM factory_local_tasks WHERE id=?").get(id);
      if (!task || task.status !== "succeeded" || !task.result_json) {
        throw new Error("Only a succeeded task can be published.");
      }
      const payload = parseJson(task.payload_json, "task payload");
      const result = parseJson(task.result_json, "task result");
      const target = payload.publication_target;
      const contract = payload.trusted_oracle_contract;
      verifyLocalFactoryPublicationTarget(target, { taskId: id, contract });
      if (result.acceptance_status !== "ACCEPTED" ||
          repository !== target.repository || baseBranch !== target.base_branch ||
          baseSha !== target.base_sha || contractSha !== target.contract_sha256 ||
          targetSha !== target.target_sha256) {
        throw new Error("Publication identity does not match the accepted task's immutable intake target.");
      }

      const existing = db.prepare("SELECT * FROM factory_local_publications WHERE task_id=?").get(id);
      if (existing) {
        const immutableMatches =
          existing.idempotency_key === idempotencyKey &&
          existing.repository === repository &&
          existing.base_branch === baseBranch &&
          existing.base_sha === baseSha &&
          existing.contract_sha256 === contractSha &&
          existing.target_sha256 === targetSha &&
          existing.branch === branch &&
          existing.patch_sha256 === patchSha;
        if (!immutableMatches) throw new Error("Publication replay changed its immutable task/base/patch identity.");
        if (rank[state] < rank[existing.state]) return mapPublication(existing);
        if (existing.commit_sha && commitSha && existing.commit_sha !== commitSha) {
          throw new Error("Publication replay returned a different commit for the same deterministic branch.");
        }
        if (existing.pull_request_number && pullNumber && existing.pull_request_number !== pullNumber) {
          throw new Error("Publication replay returned a different pull request for the same task.");
        }
        if (existing.pull_request_url && pullUrl && existing.pull_request_url !== pullUrl) {
          throw new Error("Publication replay returned a different pull request URL for the same task.");
        }
        if (rank[state] === rank[existing.state]) return mapPublication(existing);
      }

      const createdAt = existing?.created_at ?? timestamp();
      const updatedAt = timestamp();
      db.prepare(`
        INSERT INTO factory_local_publications
          (task_id,idempotency_key,state,repository,base_branch,base_sha,contract_sha256,target_sha256,
           branch,patch_sha256,commit_sha,pull_request_number,pull_request_url,created_at,updated_at)
        VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
        ON CONFLICT(task_id) DO UPDATE SET
          state=excluded.state,commit_sha=COALESCE(excluded.commit_sha,factory_local_publications.commit_sha),
          pull_request_number=COALESCE(excluded.pull_request_number,factory_local_publications.pull_request_number),
          pull_request_url=COALESCE(excluded.pull_request_url,factory_local_publications.pull_request_url),
          updated_at=excluded.updated_at
      `).run(
        id,idempotencyKey,state,repository,baseBranch,baseSha,contractSha,targetSha,
        branch,patchSha,commitSha,pullNumber,pullUrl,createdAt,updatedAt,
      );
      event(id, "publication_" + state, {
        idempotency_key: idempotencyKey,
        branch,
        commit_sha: commitSha,
        pull_request_number: pullNumber,
        pull_request_url: pullUrl,
      });
      return getPublication(id);
    });
  }

  return Object.freeze({
    add,
    addFromSource,
    claim,
    complete,
    fail,
    get,
    list,
    events,
    getPublication,
    recordPublication,
    recoverExpiredLeases,
    close: () => db.close(),
  });
}
