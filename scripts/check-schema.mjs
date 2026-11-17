import { readFileSync } from "node:fs";
import { strict as assert } from "node:assert";

const sql = readFileSync("supabase/migrations/0001_initial_schema.sql", "utf8");
const statusSql = readFileSync("supabase/migrations/0002_member_status_rls.sql", "utf8");
const budgetSql = readFileSync("supabase/migrations/0003_atomic_ai_budget_reservations.sql", "utf8");
const hardStopSql = readFileSync("supabase/migrations/0004_ai_budget_overrun_hard_stop.sql", "utf8");
const idempotencySql = readFileSync("supabase/migrations/0005_ai_request_idempotency.sql", "utf8");
const rateLimitSql = readFileSync("supabase/migrations/0006_ai_request_rate_limits.sql", "utf8");
const env = readFileSync(".env.example", "utf8");
const page = readFileSync("app/page.tsx", "utf8");
const bodyReader = readFileSync("lib/http/read-json-body.ts", "utf8");
const projectApi = readFileSync("app/api/projects/route.ts", "utf8");
const conversationApi = readFileSync("app/api/conversations/route.ts", "utf8");
const messageApi = readFileSync("app/api/conversations/[id]/messages/route.ts", "utf8");

const tables = [...sql.matchAll(/create table public[.]([a-z_]+)/gi)].map((m) => m[1]);
const rls = [...sql.matchAll(/alter table public[.]([a-z_]+) enable row level security;/gi)].map((m) => m[1]);
const normalize = (xs) => [...new Set(xs)].sort();

assert.equal(tables.length, 16, "Expected 16 initial public tables");
assert.deepEqual(normalize(rls), normalize(tables), "Every public table must have RLS enabled");

for (const table of ["ai_cost_ledger", "contribution_ledger", "reward_ledger"]) {
  assert.ok(sql.includes("before update or delete on public." + table), table + " must be append-only");
}
assert.ok(sql.includes("revoke execute on function public.handle_new_user() from public, anon, authenticated;"),
  "SECURITY DEFINER auth trigger must not be callable as a public RPC");
assert.ok(sql.includes("values (true, false, 0, 0, 'TWD', true)"),
  "AI global kill switch must default to disabled with zero budget");

assert.ok(statusSql.includes("private.member_can_access"));
assert.ok(statusSql.includes("private.member_can_write"));
assert.ok(statusSql.includes("revoke all on schema private from anon"));
assert.ok(statusSql.includes("grant execute on function private.member_can_access() to authenticated"));
assert.ok(statusSql.includes("grant execute on function private.member_can_write() to authenticated"));
assert.ok(statusSql.includes("account_status = 'active'"));

assert.ok(budgetSql.includes("create table public.ai_budget_reservations"));
assert.ok(budgetSql.includes("enable row level security"));
assert.ok(budgetSql.includes("revoke all on public.ai_budget_reservations from anon, authenticated"));
assert.ok(budgetSql.includes("for update"), "Budget reservation must lock shared control rows");
assert.ok(budgetSql.includes("create or replace function public.reserve_ai_budget"));
assert.ok(budgetSql.includes("create or replace function public.finalize_ai_budget"));
assert.ok(budgetSql.includes("p_provider_billed_currency char(3)"), "Invoice currency must be recorded separately from normalized TWD budget cost");
assert.ok(budgetSql.includes("provider_billed_cost = p_provider_billed_cost"));
assert.ok(budgetSql.includes("provider_billed_currency = p_provider_billed_currency"));
assert.ok(budgetSql.includes("create or replace function public.release_ai_budget"));
assert.ok(budgetSql.includes("grant execute on function public.reserve_ai_budget") && budgetSql.includes("to service_role"));
assert.ok(budgetSql.includes("grant execute on function public.finalize_ai_budget") && budgetSql.includes("to service_role"));
assert.ok(budgetSql.includes("grant execute on function public.release_ai_budget") && budgetSql.includes("to service_role"));
assert.ok(budgetSql.includes("platform_monthly_budget_exceeded"));
assert.ok(budgetSql.includes("member_daily_request_limit"));
assert.ok(budgetSql.includes("member_monthly_request_limit"));
assert.ok(budgetSql.includes("member_not_active"));
assert.ok(!budgetSql.includes("not v_controls.hard_stop_enabled"), "Hard-stop policy must not block requests merely because automatic overrun shutdown is disabled");

assert.ok(budgetSql.includes("count(*) filter (where created_at >= v_day_start)"), "Daily quota must count all attempts, including released failures");
assert.ok(budgetSql.includes("Record the provider's actual charge even when it exceeds the estimate"));

assert.ok(budgetSql.includes("Record the provider's actual charge even when it exceeds the estimate"));

assert.ok(hardStopSql.includes("create or replace function public.finalize_ai_budget"));
assert.ok(hardStopSql.includes("from public.platform_ai_controls") && hardStopSql.includes("for update"), "Settlement must serialize against reservations");
assert.ok(hardStopSql.includes("set ai_enabled = false"), "Actual-cost overrun must trigger the global AI hard-stop");
assert.ok(hardStopSql.includes("v_monthly_committed > v_controls.monthly_spend_cap"), "Hard-stop must compare committed actual spend with the monthly cap");
assert.ok(hardStopSql.includes("grant execute on function public.finalize_ai_budget") && hardStopSql.includes("to service_role"), "Settlement RPC must remain server-only");

assert.ok(statusSql.includes("'active', 'restricted'"));

assert.ok(env.includes("ENABLE_PUBLIC_SIGNUP=false"), "Server signup gate must default closed");
assert.ok(env.includes("NEXT_PUBLIC_ENABLE_PUBLIC_SIGNUP=false"), "Signup UI must default closed");
assert.ok(page.includes("Global Citizen AI Network") || page.includes("全球公民 AI 網路"),
  "Main product entry page must remain present");

assert.ok(bodyReader.includes("request.body.getReader()"), "JSON bodies must be read as a bounded stream");
assert.ok(bodyReader.includes("totalBytes > maxBytes"), "JSON body reader must enforce byte limits");
assert.ok(projectApi.includes("readJsonBody(request, 32768)"), "Project API must enforce 32 KiB request limit");
assert.ok(conversationApi.includes("readJsonBody(request, 32768)"), "Conversation API must enforce 32 KiB request limit");
assert.ok(messageApi.includes("readJsonBody(request, 98304)"), "Message API must enforce 96 KiB request limit");

for (const forbidden of [
  "request_id uuid references public.ai_requests(id) on delete set null",
  "invoice_import_id uuid references public.provider_invoice_imports(id) on delete set null",
  "submission_id uuid references public.task_submissions(id) on delete set null",
]) {
  assert.equal(sql.includes(forbidden), false, "Immutable ledger FK must not be rewritten by ON DELETE SET NULL: " + forbidden);
}

console.log("Schema guard passed: RLS, immutable ledgers, restricted trigger RPC, account-status gates, atomic AI budget reservations, overrun hard-stop, bounded request parsing, and closed AI/signup defaults.");


const aiGateway = readFileSync("app/api/ai/chat/route.ts", "utf8");
assert.ok(aiGateway.includes('reserve_ai_budget'), "AI gateway must reserve budget before provider calls");
assert.ok(aiGateway.includes('finalize_ai_budget'), "AI gateway must settle successful provider calls");
assert.ok(aiGateway.includes('release_ai_budget'), "AI gateway must release failed reservations");
assert.ok(aiGateway.includes('AbortController'), "AI gateway must enforce provider timeout");
assert.ok(aiGateway.includes('max_tokens: 1200'), "AI gateway must cap provider output");
assert.ok(aiGateway.includes('ai_cost_ledger'), "AI gateway must append an internal cost ledger entry");
assert.ok(aiGateway.includes('SUPABASE_SERVICE_ROLE_KEY'), "AI gateway must require server-only service role credentials");
assert.ok(aiGateway.includes('worstCaseCost > config.maxRequestCostTwd'), "AI gateway must reject conservative preflight cost overruns");

assert.ok(idempotencySql.includes("create table public.ai_request_idempotency"));
assert.ok(idempotencySql.includes("unique (owner_id, idempotency_key)"));
assert.ok(idempotencySql.includes("pg_advisory_xact_lock"), "Idempotency claims must serialize by owner/key");
assert.ok(idempotencySql.includes("request_hash"), "Idempotency key reuse must validate payload hash");
assert.ok(idempotencySql.includes("create or replace function public.claim_ai_request"));
assert.ok(idempotencySql.includes("create or replace function public.complete_ai_request_idempotency"));
assert.ok(idempotencySql.includes("create or replace function public.fail_ai_request_idempotency"));
assert.ok(idempotencySql.includes("revoke all on public.ai_request_idempotency from public, anon, authenticated"));
assert.ok(idempotencySql.includes("to service_role"));
assert.ok(idempotencySql.includes("interval '24 hours'"), "Cached responses must have a bounded replay window");
assert.ok(aiGateway.includes('request.headers.get("Idempotency-Key")'));
assert.ok(aiGateway.includes('claim_ai_request'));
assert.ok(aiGateway.includes('complete_ai_request_idempotency'));
assert.ok(aiGateway.includes('fail_ai_request_idempotency'));

assert.ok(rateLimitSql.includes("create table public.ai_request_rate_limits"));
assert.ok(rateLimitSql.includes("primary key (owner_id, window_seconds, window_start)"));
assert.ok(rateLimitSql.includes("create or replace function public.consume_ai_request_rate_limit"));
assert.ok(rateLimitSql.includes("pg_catalog.to_timestamp"));
assert.ok(rateLimitSql.includes("consume_ai_request_rate_limit(p_owner_id, 60, 10)"));
assert.ok(rateLimitSql.includes("consume_ai_request_rate_limit(p_owner_id, 3600, 60)"));
assert.ok(rateLimitSql.includes("revoke all on public.ai_request_rate_limits from public, anon, authenticated"));
assert.ok(rateLimitSql.includes("to service_role"));
