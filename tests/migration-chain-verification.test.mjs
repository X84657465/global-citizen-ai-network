import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const migrationsDir = resolve(root, "supabase/migrations");
const sqlTestsDir = resolve(root, "supabase/tests");

const migrationFiles = readdirSync(migrationsDir)
  .filter((name) => name.endsWith(".sql"))
  .sort();

const requiredMigrations = [
  "20261118003031_initial_schema.sql",
  "20261118003035_member_status_rls.sql",
  "20261118003039_atomic_ai_budget_reservations.sql",
  "20261118003043_ai_budget_overrun_hard_stop.sql",
  "20261118003047_ai_request_idempotency.sql",
  "20261118003051_ai_request_rate_limits.sql",
  "20261118003055_ai_operational_retention.sql",
  "20261118003059_atomic_contribution_review.sql",
  "20261118003104_atomic_appeal_review.sql",
  "20261118003109_immutable_contribution_reward_snapshots.sql",
  "20261118003121_submission_appeal_lifecycle_hardening.sql",
  "20261118003125_atomic_ai_chat_completion_and_reconciliation.sql",
  "20261118003129_bound_ai_reconciliation_queue.sql",
  "20261118003135_single_unresolved_ai_request_per_member.sql",
  "20261118003138_audited_ai_reconciliation_resolution.sql",
  "20261118003142_conversation_project_ownership.sql",
  "20261118003146_conversation_project_locking.sql",
  "20261118005041_service_role_ai_reconciliation.sql",
  "20261118045417_least_privilege_public_grants.sql",
  "20261118045832_foreign_key_indexes_and_policy_split.sql",
  "20261118050801_atomic_contribution_task_admin.sql",
  "20261118060600_ai_providerless_completed_replay.sql",
  "20261118060607_single_active_task_submission.sql",
  "20261118061217_dedupe_active_submission_index.sql",
];

const requiredSqlTests = [
  "ai_gateway.test.sql",
  "ai_lifecycle_rpc_security.test.sql",
  "ai_reconciliation.test.sql",
  "contribution_task_admin.test.sql",
  "database_security.test.sql",
  "performance_indexes_policies.test.sql",
  "project_conversation_security.test.sql",
  "public_table_grants.test.sql",
  "messages_owner_security.test.sql",
  "task_submission_uniqueness.test.sql",
];

test("all migration filenames preserve unique, strictly ordered 14-digit versions", () => {
  assert.ok(migrationFiles.length > 0, "Supabase migration directory must not be empty");
  const versions = migrationFiles.map((name) => {
    const match = /^(\d{14})_[a-z0-9_]+\.sql$/i.exec(name);
    assert.ok(match, `Invalid migration filename: ${name}`);
    return match[1];
  });
  assert.equal(new Set(versions).size, versions.length, "Migration versions must be unique");
  assert.deepEqual(versions, [...versions].sort(), "Migrations must be ordered by version");
});

test("the complete migration inventory matches the reviewed 24-file chain", () => {
  assert.deepEqual(migrationFiles, requiredMigrations, "Migration inventory changed; review and update the explicit chain baseline");
});

test("critical security and lifecycle migrations remain in the chain", () => {
  for (const name of requiredMigrations) {
    assert.ok(migrationFiles.includes(name), `Missing required migration: ${name}`);
  }
});

test("database regression suites for critical boundaries remain present", () => {
  const available = new Set(readdirSync(sqlTestsDir));
  for (const name of requiredSqlTests) {
    assert.ok(available.has(name), `Missing database regression suite: ${name}`);
  }
});

test("repository migration-version checker succeeds", () => {
  execFileSync(process.execPath, ["scripts/check-migration-versions.mjs"], {
    cwd: root,
    stdio: "pipe",
  });
});

test("repository static schema contract checker succeeds", () => {
  execFileSync(process.execPath, ["scripts/check-schema.mjs"], {
    cwd: root,
    stdio: "pipe",
  });
});

test("migration verification documentation explicitly distinguishes static and database evidence", () => {
  const documentation = readFileSync(resolve(root, "docs/migration-chain-verification.md"), "utf8");
  assert.match(documentation, /not verified/i);
  assert.match(documentation, /disposable/i);
  assert.match(documentation, /production/i);
});
