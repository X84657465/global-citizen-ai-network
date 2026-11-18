import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const migration = readFileSync(
  new URL("../supabase/migrations/20261118120000_reconciliation_budget_hard_stop.sql", import.meta.url),
  "utf8",
);

const required = [
  /create\s+or\s+replace\s+function\s+public\.enforce_ai_budget_hard_stop_after_reconciliation/i,
  /security\s+definer\s+set\s+search_path\s*=\s*''/i,
  /new\.decision\s*<>\s*'confirmed_billed'/i,
  /after\s+insert\s+on\s+public\.ai_reconciliation_events/i,
  /when\s*\(new\.decision\s*=\s*'confirmed_billed'\)/i,
  /v_global_committed\s*>\s*v_controls\.monthly_spend_cap/i,
  /set\s+ai_enabled\s*=\s*false[\s\S]*?where\s+id\s*=\s*true/i,
  /v_user_committed\s*>\s*v_user_limits\.monthly_spend_limit/i,
  /set\s+ai_enabled\s*=\s*false[\s\S]*?where\s+owner_id\s*=\s*v_owner_id/i,
  /ai_platform_budget_hard_stop_triggered/i,
  /ai_member_budget_hard_stop_triggered/i,
  /admin_verified_provider_billed_reconciliation/i,
  /revoke\s+all\s+on\s+function\s+public\.enforce_ai_budget_hard_stop_after_reconciliation\(\)[\s\S]*?from\s+public,\s*anon,\s*authenticated,\s*service_role/i,
];

for (const pattern of required) {
  assert.match(migration, pattern, `Missing reconciliation budget invariant: ${pattern}`);
}

assert.equal(
  (migration.match(/create\s+trigger\s+ai_reconciliation_budget_hard_stop/gi) ?? []).length,
  1,
  "Expected exactly one reconciliation hard-stop trigger",
);

console.log(
  "AI reconciliation budget hard-stop guard passed: confirmed-billed events enforce global and member caps with audit records. Static regression validation only; PostgreSQL execution is still required.",
);
