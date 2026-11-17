import { readFileSync } from "node:fs";
import { strict as assert } from "node:assert";

const sql = readFileSync("supabase/migrations/0001_initial_schema.sql", "utf8");
const env = readFileSync(".env.example", "utf8");
const page = readFileSync("app/page.tsx", "utf8");

const tables = [...sql.matchAll(/create table public\.([a-z_]+)/gi)].map((m) => m[1]);
const rls = [...sql.matchAll(/alter table public\.([a-z_]+) enable row level security;/gi)].map((m) => m[1]);
const normalize = (xs) => [...new Set(xs)].sort();

assert.equal(tables.length, 16, "Expected 16 initial public tables");
assert.deepEqual(normalize(rls), normalize(tables), "Every public table must have RLS enabled exactly by explicit migration statement");

for (const table of ["ai_cost_ledger", "contribution_ledger", "reward_ledger"]) {
  assert.match(sql, new RegExp("before update or delete on public\\." + table), table + " must be append-only");
}
assert.match(sql, /revoke execute on function public\.handle_new_user\(\) from public, anon, authenticated;/,
  "SECURITY DEFINER auth trigger must not be callable as a public RPC");
assert.match(sql, /values \(true, false, 0, 0, 'TWD', true\)/,
  "AI global kill switch must default to disabled with zero budget");
assert.match(env, /ENABLE_PUBLIC_SIGNUP=false/, "Server signup gate must default closed");
assert.match(env, /NEXT_PUBLIC_ENABLE_PUBLIC_SIGNUP=false/, "Signup UI must default closed");
assert.match(page, /Global Citizen AI Network|全球公民 AI 網路/,
  "Main product entry page must remain present");

for (const forbidden of [
  "request_id uuid references public.ai_requests(id) on delete set null",
  "invoice_import_id uuid references public.provider_invoice_imports(id) on delete set null",
  "submission_id uuid references public.task_submissions(id) on delete set null",
]) {
  assert.equal(sql.includes(forbidden), false, "Immutable ledger FK must not be rewritten by ON DELETE SET NULL: " + forbidden);
}

console.log("Schema guard passed: 16 tables, RLS coverage, append-only ledgers, restricted trigger RPC, closed AI/signup defaults.");
