import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const migration = readFileSync(
  new URL("../supabase/migrations/20261118123000_grant_authenticated_ai_reconciliation_rpc.sql", import.meta.url),
  "utf8",
);
const normalized = migration.toLowerCase().replace(/\\s+/g, " ");

test("authenticated reconciliation RPC binds the supplied actor to the JWT identity", () => {
  assert.ok(normalized.includes("security definer set search_path = ''"));
  assert.ok(normalized.includes("auth.uid() is null or auth.uid() is distinct from p_actor_id"));
  assert.ok(normalized.includes("where id = auth.uid()"));
  assert.ok(normalized.includes("revoke all on function public.resolve_ai_reconciliation"));
  assert.ok(normalized.includes("from public, anon, service_role;"));
  assert.ok(normalized.includes("grant execute on function public.resolve_ai_reconciliation"));
  assert.ok(normalized.includes("to authenticated;"));
  assert.equal(normalized.includes("to authenticated, service_role;"), false);
});

test("migration does not trust p_actor_id as identity without auth.uid equality", () => {
  const guard = normalized.indexOf("auth.uid() is null or auth.uid() is distinct from p_actor_id");
  const profileLookup = normalized.indexOf("where id = auth.uid()", guard);
  assert.ok(guard >= 0, "missing JWT-to-actor equality check");
  assert.ok(profileLookup > guard, "active admin lookup must use the authenticated JWT identity");
});
