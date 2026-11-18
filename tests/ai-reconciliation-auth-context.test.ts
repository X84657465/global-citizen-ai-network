import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const migration = readFileSync(
  new URL("../supabase/migrations/20261118123000_grant_authenticated_ai_reconciliation_rpc.sql", import.meta.url),
  "utf8",
);

test("authenticated reconciliation RPC binds the supplied actor to the JWT identity", () => {
  assert.match(migration, /security\\s+definer\\s+set\\s+search_path\\s*=\\s*''/i);
  assert.match(migration, /auth\\.uid\\(\\)\\s+is\\s+null\\s+or\\s+auth\\.uid\\(\\)\\s+is\\s+distinct\\s+from\\s+p_actor_id/i);
  assert.match(migration, /where\\s+id\\s*=\\s*auth\\.uid\\(\\)/i);
  assert.match(migration, /revoke\\s+all\\s+on\\s+function[\\s\\S]*?from\\s+public,\\s*anon,\\s*service_role/i);
  assert.match(migration, /grant\\s+execute\\s+on\\s+function[\\s\\S]*?to\\s+authenticated/i);
  assert.doesNotMatch(migration, /grant\\s+execute\\s+on\\s+function[\\s\\S]*?to\\s+authenticated\\s*,\\s*service_role/i);
});

test("migration does not trust p_actor_id as identity without auth.uid equality", () => {
  const guard = migration.indexOf("auth.uid() is null or auth.uid() is distinct from p_actor_id");
  const profileLookup = migration.indexOf("where id = auth.uid()", guard);
  assert.ok(guard >= 0, "missing JWT-to-actor equality check");
  assert.ok(profileLookup > guard, "active admin lookup must use the authenticated JWT identity");
});
