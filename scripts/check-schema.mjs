import { readFileSync } from "node:fs";
import { strict as assert } from "node:assert";

const sql = readFileSync("supabase/migrations/0001_initial_schema.sql", "utf8");
const statusSql = readFileSync("supabase/migrations/0002_member_status_rls.sql", "utf8");
const budgetSql = readFileSync("supabase/migrations/0003_atomic_ai_budget_reservations.sql", "utf8");
const rewardSnapshotSql = readFileSync("supabase/migrations/0010_immutable_contribution_reward_snapshots.sql", "utf8");
const submissionLifecycleSql = readFileSync("supabase/migrations/0011_submission_appeal_lifecycle_hardening.sql", "utf8");
const hardStopSql = readFileSync("supabase/migrations/0004_ai_budget_overrun_hard_stop.sql", "utf8");
const idempotencySql = readFileSync("supabase/migrations/0005_ai_request_idempotency.sql", "utf8");
const rateLimitSql = readFileSync("supabase/migrations/0006_ai_request_rate_limits.sql", "utf8");
const singlePendingSql = readFileSync("supabase/migrations/0014_single_unresolved_ai_request_per_member.sql", "utf8");
const contributionReviewSql = readFileSync("supabase/migrations/0008_atomic_contribution_review.sql", "utf8");
const appealReviewSql = readFileSync("supabase/migrations/0009_atomic_appeal_review.sql", "utf8");
const appealReviewApi = readFileSync("app/api/admin/contribution/appeals/route.ts", "utf8");
const appealReviewClient = readFileSync("app/admin/appeals/appeal-review-client.tsx", "utf8");
const reviewApi = readFileSync("app/api/admin/contribution/reviews/route.ts", "utf8");
const memberSummaryApi = readFileSync("app/api/contribution/summary/route.ts", "utf8");
const appealApi = readFileSync("app/api/contribution/appeals/route.ts", "utf8");
const memberContributionsClient = readFileSync("app/contributions/member-contributions-client.tsx", "utf8");
const reviewClient = readFileSync("app/admin/contributions/review-client.tsx", "utf8");
const env = readFileSync(".env.example", "utf8");
const page = readFileSync("app/page.tsx", "utf8");
const bodyReader = readFileSync("lib/http/read-json-body.ts", "utf8");
const projectApi = readFileSync("app/api/projects/route.ts", "utf8");
const conversationApi = readFileSync("app/api/conversations/route.ts", "utf8");
const messageApi = readFileSync("app/api/conversations/[id]/messages/route.ts", "utf8");
const contributionApi = readFileSync("app/api/contribution/tasks/route.ts", "utf8");
const workspaceClient = readFileSync("app/workspace/workspace-client.tsx", "utf8");
const aiPendingRecoveryApi = readFileSync("app/api/ai/pending/route.ts", "utf8");
const pendingRecovery = readFileSync("lib/ai/pending-recovery.ts", "utf8");
const aiHistory = readFileSync("lib/ai/history.ts", "utf8");
const adminOpsApi = readFileSync("app/api/admin/ai-operations/route.ts", "utf8");
const aiCostsApi = readFileSync("app/api/admin/ai-costs/route.ts", "utf8");
const aiCostsClient = readFileSync("app/admin/ai-costs/cost-dashboard-client.tsx", "utf8");
const adminTasksApi = readFileSync("app/api/admin/contribution/tasks/route.ts", "utf8");
const taskAdminClient = readFileSync("app/admin/contribution-tasks/tasks-client.tsx", "utf8");
const taskAdminRpcSql = readFileSync("supabase/migrations/0021_atomic_contribution_task_admin.sql", "utf8");

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
assert.ok(budgetSql.includes("p_max_cost_twd > 9999999999.99999999"),
  "Direct budget reservations must reject values outside numeric(18,8)");
assert.ok(budgetSql.includes("p_max_cost_twd::text in ('NaN', 'Infinity', '-Infinity')"),
  "Direct budget reservations must reject non-finite ceilings");
assert.ok(budgetSql.includes("p_actual_cost_twd > 9999999999.99999999"),
  "Legacy budget settlement must reject values outside numeric(18,8)");
assert.ok(budgetSql.includes("p_actual_cost_twd::text in ('NaN', 'Infinity', '-Infinity')"),
  "Legacy budget settlement must reject non-finite normalized costs");
assert.ok(budgetSql.includes("p_provider_billed_cost > 9999999999.99999999"),
  "Legacy provider billed cost must fit numeric(18,8)");
assert.ok(budgetSql.includes("p_provider_billed_cost::text in ('NaN', 'Infinity', '-Infinity')"),
  "Legacy budget settlement must reject non-finite provider billed costs");
assert.ok(hardStopSql.includes("p_actual_cost_twd::text in ('NaN', 'Infinity', '-Infinity')"),
  "Hard-stop settlement must reject non-finite normalized costs");
assert.ok(hardStopSql.includes("p_actual_cost_twd > 9999999999.99999999"),
  "Hard-stop settlement costs must fit numeric(18,8)");
assert.ok(hardStopSql.includes("p_provider_billed_cost::text in ('NaN', 'Infinity', '-Infinity')"),
  "Hard-stop settlement must reject non-finite provider billed costs");
assert.ok(hardStopSql.includes("p_provider_billed_cost > 9999999999.99999999"),
  "Hard-stop provider billed costs must fit numeric(18,8)");
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
assert.ok(aiGateway.includes('buildAiProviderMessages'), "AI gateway must use the tested provider history builder");
assert.ok(aiHistory.includes('item.role !== "assistant" && item.role !== "user"'), "Provider history builder must exclude system/tool and unknown roles");
assert.ok(aiHistory.includes("totalCharacters + item.content.length > maxTotalCharacters"), "Provider history builder must enforce an aggregate character ceiling");

const atomicAiSql = readFileSync("supabase/migrations/0012_atomic_ai_chat_completion_and_reconciliation.sql", "utf8");
const providerResponse = readFileSync("lib/ai/provider-response.ts", "utf8");
const aiRuntimeConfig = readFileSync("lib/ai/config.ts", "utf8");
assert.ok(aiGateway.includes('claim_ai_request'), "AI gateway must claim an idempotent request and reserve budget before provider calls");
const claimPosition = aiGateway.indexOf('admin.rpc("claim_ai_request"');
const routePreflightPosition = aiGateway.indexOf("const worstCaseCost");
assert.ok(routePreflightPosition >= 0 && claimPosition > routePreflightPosition
  && aiGateway.includes("p_preflight_cost_twd: worstCaseCost"),
  "AI gateway must pass the conservative preflight estimate into the atomic claim RPC");
const existingIdempotencyPosition = singlePendingSql.indexOf("if found and (v_existing.state = 'processing' or v_existing.expires_at > now())");
const sqlPreflightPosition = singlePendingSql.indexOf("if p_preflight_cost_twd > p_max_cost_twd");
const reservationPosition = singlePendingSql.indexOf("public.reserve_ai_budget(");
assert.ok(existingIdempotencyPosition >= 0 && sqlPreflightPosition > existingIdempotencyPosition
  && reservationPosition > sqlPreflightPosition,
  "Claim RPC must return completed/processing idempotency outcomes before preflight, and reject oversized new requests before reserving budget or persisting prompts");
assert.ok(singlePendingSql.includes("p_preflight_cost_twd::text in ('NaN', 'Infinity', '-Infinity')")
  && aiGateway.includes("preflight_cost_exceeds_reservation"),
  "AI preflight must reject non-finite costs and expose a distinct over-ceiling result");
assert.ok(idempotencySql.includes("public.reserve_ai_budget("), "Idempotency claim must atomically reserve AI budget");
assert.ok(aiGateway.includes('complete_ai_chat_request'), "AI gateway must atomically settle successful provider calls");
assert.ok(aiGateway.includes('fail_ai_chat_request'), "AI gateway must atomically release known failed reservations");
assert.ok(aiGateway.includes('mark_ai_request_reconciliation_required'), "AI gateway must preserve uncertain provider outcomes for reconciliation");
assert.ok(aiGateway.includes("isKnownProviderRejection") && providerResponse.includes("[400, 401, 403, 404, 422]"), "Only explicit validation/authentication rejection statuses may release reservations; ambiguous provider 4xx must reconcile");
assert.ok(aiRuntimeConfig.includes('parsed.protocol === "https:"') && aiRuntimeConfig.includes('parsed.protocol === "http:" && isLoopback'), "AI provider configuration must require HTTPS except explicit loopback development");
assert.ok(aiRuntimeConfig.includes("parsed.username") && aiRuntimeConfig.includes("parsed.password") && aiRuntimeConfig.includes("parsed.search") && aiRuntimeConfig.includes("parsed.hash"), "AI provider configuration must reject URL credentials and query/fragment secrets");
assert.ok(atomicAiSql.includes("insert into public.messages"), "Atomic completion must persist the assistant message");
assert.ok(atomicAiSql.includes("insert into public.ai_cost_ledger"), "Atomic completion must write the internal cost ledger");
assert.ok(atomicAiSql.includes("estimated_internal_cost = p_estimated_cost_twd"), "Atomic completion must store the computed internal estimate");
const reconciliationFunction = atomicAiSql.slice(atomicAiSql.indexOf("create or replace function public.mark_ai_request_reconciliation_required"));
assert.ok(reconciliationFunction.includes("v_reservation.status <> 'reserved'"), "Reconciliation may only mark a still-reserved request");
assert.ok(!reconciliationFunction.includes("status = 'released'"), "Uncertain provider outcomes must never release the budget reservation");
assert.ok(atomicAiSql.includes("ai_member_budget_hard_stop_triggered"), "Member budget hard stops must be audited");
assert.ok(atomicAiSql.includes("ai_platform_budget_hard_stop_triggered"), "Global budget hard stops must be audited");
assert.ok(providerResponse.includes("MAX_PROVIDER_RESPONSE_BYTES = 1024 * 1024"), "Provider response bodies must be byte bounded");
assert.ok(providerResponse.includes("Number.isSafeInteger(value)"), "Provider token counts must be validated as safe integers");
assert.ok(aiGateway.includes('AbortController'), "AI gateway must enforce provider timeout");
assert.ok(aiGateway.includes('max_tokens: 1200'), "AI gateway must cap provider output");
assert.ok(atomicAiSql.includes("amount_kind, calculation_method"), "AI gateway settlement must append a labelled internal cost ledger entry");
assert.ok(aiGateway.includes('SUPABASE_SERVICE_ROLE_KEY'), "AI gateway must require server-only service role credentials");
assert.ok(singlePendingSql.includes("if p_preflight_cost_twd > p_max_cost_twd"), "Atomic claim RPC must reject conservative preflight cost overruns before reservation and prompt persistence");

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
assert.ok(aiGateway.includes('complete_ai_chat_request'));
assert.ok(aiGateway.includes('fail_ai_chat_request'));

assert.ok(rateLimitSql.includes("create table public.ai_request_rate_limits"));
assert.ok(rateLimitSql.includes("primary key (owner_id, window_seconds, window_start)"));
assert.ok(rateLimitSql.includes("create or replace function public.consume_ai_request_rate_limit"));
assert.ok(rateLimitSql.includes("pg_catalog.to_timestamp"));
assert.ok(rateLimitSql.includes("consume_ai_request_rate_limit(p_owner_id, 60, 10)"));
assert.ok(rateLimitSql.includes("consume_ai_request_rate_limit(p_owner_id, 3600, 60)"));
assert.ok(rateLimitSql.includes("revoke all on public.ai_request_rate_limits from public, anon, authenticated"));
assert.ok(rateLimitSql.includes("to service_role"));

assert.ok(idempotencySql.includes("v_existing.state = 'processing' or v_existing.expires_at > now()"),
  "In-flight idempotency claims must never expire automatically");
assert.ok(rateLimitSql.includes("v_existing.state = 'processing' or v_existing.expires_at > now()"),
  "Rate-limit claim path must preserve in-flight idempotency records");

assert.ok(singlePendingSql.includes("p_conversation_id uuid"), "AI request claim must receive the originating conversation");
assert.ok(singlePendingSql.includes("set conversation_id = p_conversation_id"), "AI request claim must persist the conversation in the reservation transaction");
assert.ok(singlePendingSql.includes("p_prompt text") && singlePendingSql.includes("length(p_prompt) > 8000"), "AI request claim must validate the original prompt before persistence");
assert.ok(singlePendingSql.includes("pg_catalog.sha256") && singlePendingSql.includes("v_expected_hash := pg_catalog.encode") && singlePendingSql.includes("pg_catalog.rtrim(p_request_hash::text) <> v_expected_hash"), "Database claim must verify the stored prompt matches its conversation-bound SHA-256 hash");
assert.ok(pendingRecovery.includes(".update(`${conversationId.toLowerCase()}\\n${content}`)") && aiGateway.includes("hashPendingPrompt(conversationId, content)"), "API and recovery must share the canonical database-normalized conversation-bound prompt hash");
assert.ok(singlePendingSql.includes("p_preflight_cost_twd numeric") && singlePendingSql.includes("preflight_cost_exceeds_reservation"), "AI request claim must reject over-budget new requests before reservation and prompt persistence");
assert.ok(singlePendingSql.includes("if p_preflight_cost_twd > p_max_cost_twd") && singlePendingSql.indexOf("if p_preflight_cost_twd > p_max_cost_twd") < singlePendingSql.indexOf("public.reserve_ai_budget("), "Preflight ceiling must be checked before budget reservation");
assert.ok(aiGateway.includes("p_preflight_cost_twd: worstCaseCost"), "AI gateway must pass the conservative preflight estimate into the atomic claim");
assert.ok(aiGateway.indexOf("p_preflight_cost_twd: worstCaseCost") < aiGateway.indexOf("claim.disposition === \"completed\""), "Preflight data must be supplied without blocking completed idempotent replay");
assert.ok(singlePendingSql.includes("insert into public.messages") && singlePendingSql.includes("p_conversation_id, p_owner_id, 'user', p_prompt"), "AI request claim must atomically persist the original user prompt");
assert.ok(aiGateway.includes("p_prompt: content"), "AI gateway must pass the exact validated prompt into the atomic claim");
assert.ok(!aiGateway.includes('auth.supabase\n    .from("messages")\n    .insert('), "AI gateway must not persist the user prompt outside the atomic claim transaction");
assert.ok(aiGateway.includes("p_conversation_id: conversationId"), "AI gateway must bind the claimed request to the validated conversation");
assert.ok(singlePendingSql.includes("pg_catalog.hashtextextended(p_owner_id::text, 0)"), "AI claims must serialize across all conversations for one member");
const claimLockPositions = [
  singlePendingSql.indexOf("pg_catalog.pg_advisory_xact_lock"),
  singlePendingSql.indexOf("from public.platform_ai_controls\n  where id = true\n  for update"),
  singlePendingSql.indexOf("select * into v_existing"),
];
assert.ok(claimLockPositions.every((position) => position >= 0)
  && claimLockPositions[0] < claimLockPositions[1]
  && claimLockPositions[1] < claimLockPositions[2],
  "AI claim must lock member advisory key, global controls, then idempotency in the same global-first order as completion/failure RPCs");
assert.ok(singlePendingSql.includes("r.status in ('queued','running')"), "A member must be blocked while any AI request is unresolved");
assert.ok(singlePendingSql.includes("b.status = 'reserved'") && singlePendingSql.includes("i.state = 'processing'"), "Cross-conversation lock must only block requests with a live reservation and processing idempotency record");
assert.ok(singlePendingSql.includes("member_has_unresolved_request"), "Cross-conversation lock must return a distinguishable disposition reason");
assert.ok(singlePendingSql.includes("revoke all on function public.claim_ai_request") && singlePendingSql.includes("to service_role"), "Replaced claim RPC must remain service-role only");
assert.ok(workspaceClient.includes("findStoredPendingConversationId"), "Workspace must detect pending requests across conversations");
assert.ok(aiPendingRecoveryApi.includes('getAuthenticatedClient()'), "Pending AI recovery must require an authenticated member");
assert.ok(aiPendingRecoveryApi.includes('.eq("owner_id", auth.user.id)'), "Pending AI recovery must scope requests to the authenticated owner");
assert.ok(aiPendingRecoveryApi.includes('.eq("state", "processing")'), "Pending AI recovery must only return unresolved idempotency records");
assert.ok(aiPendingRecoveryApi.includes("request_hash") && aiPendingRecoveryApi.includes("findOriginalPendingMessage"), "Pending AI recovery must verify the original prompt against the idempotency payload hash");
assert.ok(pendingRecovery.includes("timingSafeEqual") && pendingRecovery.includes("hashPendingPrompt"), "Pending recovery must compare fixed-length SHA-256 digests safely");
assert.ok(pendingRecovery.includes("message.content.length > 8000"), "Pending recovery must enforce the original prompt size limit");
assert.ok(aiPendingRecoveryApi.includes('Cache-Control": "no-store"'), "Pending AI recovery responses must never be cached");
assert.ok(workspaceClient.includes('fetch("/api/ai/pending"'), "Workspace must recover unresolved requests from the server after session loss");
assert.ok(aiPendingRecoveryApi.includes("unresolved: false") && aiPendingRecoveryApi.includes("unresolved: true"), "Pending recovery API must distinguish no pending request from an unresolved but unrecoverable request");
assert.ok(workspaceClient.includes("pendingRecoveryBlocked") && workspaceClient.includes("pendingData.unresolved === true"), "Workspace must retain local pending keys and block new prompts when server recovery is incomplete");
assert.ok(workspaceClient.includes("另一個對話的 AI 請求尚未確認"), "Workspace must explain why a second request is blocked");


const retentionSql = readFileSync("supabase/migrations/0007_ai_operational_retention.sql", "utf8");
assert.ok(retentionSql.includes("cleanup_expired_ai_operational_records"));
assert.ok(retentionSql.includes("state in ('completed', 'failed')"), "Cleanup must never delete processing idempotency rows");
assert.ok(retentionSql.includes("interval '48 hours'"), "Rate-limit cleanup must retain recent windows");
assert.ok(retentionSql.includes("list_stale_ai_requests"));
assert.ok(retentionSql.includes("b.status = 'reserved'"), "Stale report must only surface outstanding reservations");
assert.ok(retentionSql.includes("revoke all on function public.cleanup_expired_ai_operational_records() from public, anon, authenticated"));
assert.ok(retentionSql.includes("grant execute on function public.cleanup_expired_ai_operational_records() to service_role"));
assert.ok(retentionSql.includes("grant execute on function public.list_stale_ai_requests(integer) to service_role"));
assert.ok(!retentionSql.toLowerCase().includes("cron.schedule"), "Do not silently schedule cleanup before Cron is deliberately enabled");


assert.ok(contributionApi.includes('getAuthenticatedClient()'), "Contribution API must require an authenticated member");
assert.ok(contributionApi.includes('.eq("status", "published")'), "Only published contribution tasks may be listed or submitted");
assert.ok(contributionApi.includes('closes_at.gt.'), "Expired contribution tasks must be filtered out");
assert.ok(contributionApi.includes('content.length < 10 || content.length > 16000'), "Contribution submission content must be bounded");
assert.ok(contributionApi.includes('contributor_id: auth.user.id'), "Submission ownership must come from the authenticated session");
assert.ok(!contributionApi.includes("reward_amount:"), "Client submission must never set or alter reward amounts");
assert.ok(workspaceClient.includes('"Idempotency-Key": key'), "Workspace AI calls must use idempotency keys");
assert.ok(workspaceClient.includes("data.retryWithSameKey !== true"), "Workspace must retain the same idempotency key for uncertain outcomes");
assert.ok(workspaceClient.includes("sessionStorage"), "Workspace must preserve pending idempotency keys across page reloads");
assert.ok(aiGateway.includes("retryWithSameKey: true"), "AI gateway must explicitly identify uncertain outcomes that require the same idempotency key");
assert.ok(workspaceClient.includes('"/api/conversations"'), "Workspace must use the authenticated conversation API");
assert.ok(adminOpsApi.includes('profile?.role !== "admin"'), "Operations API must verify admin role");
assert.ok(adminOpsApi.includes('profile.account_status !== "active"'), "Operations API must reject inactive admins");
assert.ok(adminOpsApi.includes('list_stale_ai_requests'), "Operations API must use the server-only stale request report");

console.log("Product guard passed: authenticated AI workspace, admin-only operational visibility, and RLS-backed contribution task submission.");


assert.ok(contributionReviewSql.includes("create table public.task_review_idempotency"), "Review idempotency table must exist");
assert.ok(contributionReviewSql.includes("alter table public.task_review_idempotency enable row level security"), "Review idempotency table must have RLS");
assert.ok(contributionReviewSql.includes("create or replace function public.review_task_submission"), "Atomic review RPC must exist");
assert.ok(contributionReviewSql.includes("pg_catalog.sha256("), "Review request hashes must use PostgreSQL SHA-256");
assert.ok(contributionReviewSql.includes("for update of s, t"), "Review must lock the submission and task rows");
assert.ok(contributionReviewSql.includes("insert into public.contribution_ledger"), "Review must write the contribution ledger");
assert.ok(contributionReviewSql.includes("insert into public.reward_ledger"), "Accepted submissions must accrue reward ledger entries");
assert.ok(contributionReviewSql.includes("insert into public.audit_logs"), "Review must write an audit record");
assert.ok(contributionReviewSql.includes("grant execute on function public.review_task_submission(uuid,uuid,text,text,text)") && contributionReviewSql.includes("to service_role;"), "Review RPC must be service-role only");
assert.ok(reviewApi.includes('["admin", "reviewer"]'), "Review API must enforce reviewer/admin role");
assert.ok(reviewApi.includes('"Idempotency-Key"'), "Review API must require idempotency key");
assert.ok(reviewApi.includes('p_actor_id: context.auth.user.id'), "Review actor must come from authenticated session");
assert.ok(memberSummaryApi.includes('from("contribution_ledger")') && memberSummaryApi.includes('from("reward_ledger")'), "Member dashboard must read both immutable ledgers");
assert.ok(reviewClient.includes('"/api/admin/contribution/reviews"'), "Reviewer UI must use server-side review API");
assert.ok(reviewClient.includes("requestKeys[row.id]?.signature === signature"), "Reviewer retries must reuse the same idempotency key for an identical payload");

console.log("Contribution review guard passed: idempotent review, immutable ledgers, member visibility, and reviewer-only controls.");


assert.ok(adminTasksApi.includes('getOperator(false)'), "Task creation and status changes must be admin-only");
assert.ok(adminTasksApi.includes('manage_contribution_task') && adminTasksApi.includes('p_action: "create"'),
  "Task mutations must use the atomic server-side task administration RPC");
assert.ok(adminTasksApi.includes('action !== "publish"') && adminTasksApi.includes('action !== "pause"') && adminTasksApi.includes('action !== "close"'),
  "Task lifecycle actions must be allowlisted");
assert.ok(adminTasksApi.includes('acceptanceCriteria'), "Task creation must require explicit acceptance criteria");
assert.ok(!adminTasksApi.includes('.from("audit_logs")') && !adminTasksApi.includes('.from("contribution_tasks").insert'),
  "Task mutations and audit events must not be split across independent API writes");
assert.ok(taskAdminRpcSql.includes("create or replace function public.manage_contribution_task")
  && taskAdminRpcSql.includes("security definer") && taskAdminRpcSql.includes("set search_path = ''"),
  "Task administration must use a hardened SECURITY DEFINER RPC");
assert.ok(taskAdminRpcSql.includes("v_profile.role <> 'admin'") && taskAdminRpcSql.includes("v_profile.account_status <> 'active'"),
  "Task administration RPC must independently verify active admin status");
assert.ok((taskAdminRpcSql.match(/insert into public\.audit_logs/gi) ?? []).length >= 2
  && taskAdminRpcSql.includes("for update"),
  "Task changes and audit events must share a row-locked database transaction");
assert.ok(taskAdminRpcSql.includes("from public, anon, authenticated")
  && taskAdminRpcSql.includes("to service_role;")
  && taskAdminRpcSql.includes("'TWD', 'draft'"),
  "Task RPC must be service-role only and create TWD draft tasks");
assert.ok(taskAdminClient.includes('"/api/admin/contribution/tasks"'), "Task admin UI must use authenticated server API");
assert.ok(taskAdminClient.includes('"建立草稿"'), "Task admin UI must create drafts before publication");

console.log("Contribution operations guard passed: task authoring, controlled publication, reviewer approval, and member ledger access.");

const reconciliationQueueSql = readFileSync("supabase/migrations/0013_bound_ai_reconciliation_queue.sql", "utf8");
const reconciliationApi = readFileSync("app/api/admin/ai-reconciliation/route.ts", "utf8");
assert.ok(aiGateway.includes('redirect: "error"'), "AI provider calls must reject unexpected redirects");
assert.ok(reconciliationQueueSql.includes("limit 100;"), "Admin reconciliation query must have a hard result bound");
assert.ok(reconciliationQueueSql.includes("ai_requests_stale_queue_idx"), "Stale AI queue must have a partial ordered index");
assert.ok(reconciliationQueueSql.includes("p_older_than_seconds < 300") && reconciliationQueueSql.includes("p_older_than_seconds > 86400"),
  "Admin reconciliation age filter must be bounded");
assert.ok(reconciliationQueueSql.includes("to service_role"), "Stale request report must remain service-role only");
assert.ok(reconciliationApi.includes('profile.role !== "admin"') && reconciliationApi.includes('profile.account_status !== "active"'),
  "AI reconciliation endpoint must require an active admin");
assert.ok(reconciliationApi.includes('Cache-Control": "no-store"'), "AI reconciliation response must not be cached");
console.log("AI reconciliation guard passed: admin-only read access, bounded stale queue, and redirect-safe provider calls.");



assert.ok(appealApi.includes('getAuthenticatedClient()'), "Contribution appeals must require authentication");
assert.ok(appealApi.includes('submission.status !== "rejected"'), "Only rejected submissions may be appealed");
assert.ok(appealApi.includes('appellant_id: auth.user.id'), "Appeal ownership must come from the authenticated session");
assert.ok(memberSummaryApi.includes('from("task_appeals")'), "Member ledger summary must include appeal status");
assert.ok(memberContributionsClient.includes('"/api/contribution/appeals"'), "Member contribution page must use the appeal API");
assert.ok(memberContributionsClient.includes("提出申訴"), "Member page must expose an appeal action for rejected work");


assert.ok(appealReviewSql.includes("create table public.task_appeal_review_idempotency"), "Appeal review idempotency table must exist");
assert.ok(appealReviewSql.includes("create or replace function public.review_task_appeal"), "Atomic appeal adjudication RPC must exist");
assert.ok(appealReviewSql.includes("v_new_submission_status := 'accepted'"), "Overturned appeals must restore accepted submission status");
assert.ok(appealReviewSql.includes("insert into public.contribution_ledger"), "Overturned appeals must append contribution ledger events");
assert.ok(appealReviewSql.includes("insert into public.reward_ledger"), "Overturned appeals must accrue reward entries");
assert.ok(appealReviewSql.includes("grant execute on function public.review_task_appeal(uuid,uuid,text,text,text)") && appealReviewSql.includes("to service_role;"), "Appeal review RPC must be service-role only");
assert.ok(appealReviewApi.includes('["admin", "reviewer"]'), "Appeal review API must enforce reviewer/admin role");
assert.ok(appealReviewApi.includes('"Idempotency-Key"'), "Appeal review API must require idempotency key");
assert.ok(appealReviewClient.includes('"/api/admin/contribution/appeals"'), "Appeal review UI must use server-side API");
assert.ok(appealReviewClient.includes("申訴成立，撤銷退回"), "Reviewer UI must offer appeal overturn decision");


assert.ok(aiCostsApi.includes('profile.role !== "admin"'), "AI cost dashboard API must be admin-only");
assert.ok(aiCostsApi.includes('SUPABASE_SERVICE_ROLE_KEY'), "AI cost dashboard must use server-only admin access");
assert.ok(aiCostsApi.includes('.limit(500)'), "AI cost dashboard queries must be bounded");
assert.ok(aiCostsApi.includes('amount_kind'), "AI cost dashboard must distinguish invoice, allocation, and estimate types");
assert.ok(aiCostsApi.includes('provider_billed_currency'), "Provider billed amounts must remain grouped by currency");
assert.ok(aiCostsApi.includes('.in("request_id", requestIds)'), "Provider model estimates must come from linked internal-estimate ledger rows");
assert.ok(aiCostsApi.includes("unpricedRequests"), "Requests without a cost ledger must be reported separately, not priced from reservation ceilings");
assert.ok(!aiCostsApi.includes("estimated_internal_cost"), "Cost dashboard must not report reservation ceilings as internal estimates");
assert.ok(aiCostsClient.includes("成本性質（依幣別分開）"), "AI cost UI must separate cost types and currencies");
assert.ok(aiCostsClient.includes("不代表供應商請款金額"), "AI cost UI must disclose estimates are not supplier invoices");
assert.ok(hardStopSql.includes("p_actual_cost_twd::text in ('NaN', 'Infinity', '-Infinity')"),
  "Hard-stop settlement must reject non-finite normalized costs");
assert.ok(hardStopSql.includes("p_actual_cost_twd > 9999999999.99999999"),
  "Hard-stop settlement costs must fit numeric(18,8)");
assert.ok(hardStopSql.includes("p_provider_billed_cost::text in ('NaN', 'Infinity', '-Infinity')"),
  "Hard-stop settlement must reject non-finite provider billed costs");
assert.ok(hardStopSql.includes("p_provider_billed_cost > 9999999999.99999999"),
  "Hard-stop provider billed costs must fit numeric(18,8)");
assert.ok(rewardSnapshotSql.includes("new.reward_amount_snapshot := v_reward_amount"),
  "Submission reward snapshots must be assigned by the database, not the client");
assert.ok(rewardSnapshotSql.includes("new.reward_amount_snapshot is distinct from old.reward_amount_snapshot"),
  "Submission reward snapshots must remain immutable after insert");
assert.ok(rewardSnapshotSql.includes("s.reward_amount_snapshot, s.reward_currency_snapshot"),
  "Review and appeal rewards must use the submission-time snapshot");
assert.ok(submissionLifecycleSql.includes("t.status = 'published'") && submissionLifecycleSql.includes("t.closes_at > now()"),
  "Submissions must be rejected for unpublished or expired tasks");
assert.ok(submissionLifecycleSql.includes("for update") && submissionLifecycleSql.includes("v_contributor_id is distinct from new.appellant_id"),
  "Appeal creation must lock the rejected submission and verify its owner");

const aiCompletionSql = readFileSync("supabase/migrations/0012_atomic_ai_chat_completion_and_reconciliation.sql", "utf8");
assert.ok(aiCompletionSql.includes("v_request.conversation_id is distinct from p_conversation_id"),
  "AI completion must remain bound to the conversation persisted during the atomic claim");
assert.ok(aiCompletionSql.includes("p_estimated_cost_twd > 9999999999.99999999"),
  "AI completion costs must fit numeric(18,8)");
assert.ok(aiCompletionSql.includes("p_estimated_cost_twd::text in ('NaN', 'Infinity', '-Infinity')"),
  "AI completion must reject non-finite settlement costs");
assert.ok(singlePendingSql.includes("p_max_cost_twd > 9999999999.99999999"),
  "AI claim reservation ceilings must fit numeric(18,8)");
assert.ok(singlePendingSql.includes("p_preflight_cost_twd > 9999999999.99999999"),
  "AI claim preflight estimates must fit numeric(18,8)");
assert.ok(singlePendingSql.includes("p_max_cost_twd::text in ('NaN', 'Infinity', '-Infinity')"),
  "AI claim must reject non-finite reservation ceilings");

const reconciliationSql = readFileSync("supabase/migrations/0015_audited_ai_reconciliation_resolution.sql", "utf8") + "\n" + readFileSync("supabase/migrations/0018_service_role_ai_reconciliation.sql", "utf8");
const reconciliationResolveApi = readFileSync("app/api/admin/ai-reconciliation/resolve/route.ts", "utf8");
const reconciliationUi = readFileSync("app/admin/ai-operations/ai-reconciliation-form.tsx", "utf8");
const reconciliationTests = readFileSync("supabase/tests/ai_reconciliation.test.sql", "utf8");
const reconciliationOperationsPage = readFileSync("app/admin/ai-operations/page.tsx", "utf8");
assert.ok(reconciliationSql.includes("where id = p_actor_id"),
  "Reconciliation RPC must verify the supplied actor against the authoritative profile row");
assert.ok(reconciliationSql.includes("v_profile.role <> 'admin'") && reconciliationSql.includes("v_profile.account_status <> 'active'"),
  "Reconciliation RPC must independently require an active admin");
assert.ok(reconciliationSql.includes("create trigger ai_reconciliation_events_immutable"),
  "Reconciliation evidence events must reject updates and deletes");
assert.ok(reconciliationSql.includes("revoke update, delete, truncate on public.ai_reconciliation_events from service_role"),
  "Service role must not mutate or truncate reconciliation evidence events");
assert.ok(reconciliationSql.includes("unique (request_id, idempotency_key)"),
  "Reconciliation evidence must be idempotent per request");
assert.ok(reconciliationSql.includes("inconclusive deliberately leaves request, reservation, and idempotency untouched"),
  "Inconclusive review must preserve the unresolved request and reservation");
assert.ok(reconciliationSql.includes("provider_billed_delivery_unavailable"),
  "Confirmed billing must not fabricate or deliver an unavailable assistant response");
assert.ok(reconciliationSql.includes("from public, anon, authenticated") && reconciliationSql.includes("to service_role"),
  "Reconciliation RPC must be callable only through the server service role");
assert.ok(reconciliationResolveApi.includes("createAdminClient()") && reconciliationResolveApi.includes("adminSupabase.rpc(\"resolve_ai_reconciliation\""),
  "Admin resolution API must call the privileged RPC through a server-only service-role client");
assert.ok(reconciliationResolveApi.includes("profile?.role !== \"admin\"") && reconciliationResolveApi.includes("profile.account_status !== \"active\""),
  "Admin resolution API must enforce active-admin authorization");
assert.ok(reconciliationUi.includes("crypto.randomUUID()") && reconciliationUi.includes("使用相同資料重試"),
  "Admin resolution UI must preserve an idempotency key for safe retries");
assert.ok(reconciliationTests.includes("authoritative profile row instead of trusting the supplied ID"),
  "Database tests must verify the RPC checks the actor against the authoritative profile");

assert.ok(reconciliationOperationsPage.includes('.from("ai_reconciliation_events")') &&
  reconciliationOperationsPage.includes('.order("created_at", { ascending: false })') &&
  reconciliationOperationsPage.includes(".limit(100)"),
  "Admin operations page must load a bounded, newest-first reconciliation event history");
assert.ok(reconciliationOperationsPage.includes("event.evidence_reference") &&
  reconciliationOperationsPage.includes("event.rationale") &&
  reconciliationOperationsPage.includes("event.actor_id"),
  "Admin reconciliation history must expose evidence, rationale, and accountable actor metadata");

const projectsApi = readFileSync("app/api/projects/route.ts", "utf8");
const projectDetailApi = readFileSync("app/api/projects/[id]/route.ts", "utf8");
assert.ok(projectsApi.includes('request.nextUrl.searchParams.get("includeArchived")'),
  "Project listing must support explicit inclusion of archived records");
assert.ok(projectsApi.includes('.is("archived_at", null)'),
  "Archived projects must be excluded from the default active-project list");
assert.ok(projectDetailApi.includes("typeof input.archived !== \"boolean\"") && projectDetailApi.includes("updates.archived_at"),
  "Project archive and restore operations must accept only a boolean state");
const projectsPage = readFileSync("app/projects/page.tsx", "utf8");
const projectsClient = readFileSync("app/projects/projects-client.tsx", "utf8");
assert.ok(projectsPage.includes("getUser()") && projectsPage.includes("redirect(\"/login\")"),
  "Project management page must require an authenticated member session");
assert.ok(projectsClient.includes('fetch("/api/projects?includeArchived=true"') && projectsClient.includes('method: "PATCH"'),
  "Project management UI must load archived records and use the owned-project archive API");
assert.ok(projectsClient.includes("還原專案") && projectsClient.includes("封存專案"),
  "Project management UI must expose both archive and restore actions");
const conversationsApi = readFileSync("app/api/conversations/route.ts", "utf8");
const conversationProjectApi = readFileSync("app/api/conversations/[id]/route.ts", "utf8");
const projectLinkedWorkspaceClient = readFileSync("app/workspace/workspace-client.tsx", "utf8");
assert.ok(conversationsApi.includes('.eq("owner_id", auth.user.id)') && conversationsApi.includes('.is("archived_at", null)'),
  "Conversation creation must reject projects not owned by the member or already archived");
assert.ok(projectLinkedWorkspaceClient.includes('fetch("/api/projects", { cache: "no-store" })') &&
  projectLinkedWorkspaceClient.includes("project_id: selectedProjectId || null"),
  "Workspace must load active projects and persist the selected project on new conversations");
assert.ok(projectLinkedWorkspaceClient.includes("新對話歸屬專案") && projectLinkedWorkspaceClient.includes("未分類對話"),
  "Workspace must expose project assignment and identify unclassified conversations");
const projectOwnershipSql = readFileSync("supabase/migrations/0016_conversation_project_ownership.sql", "utf8");
const projectOwnershipTests = readFileSync("supabase/tests/project_conversation_security.test.sql", "utf8");
assert.ok(projectOwnershipSql.includes("v_project_owner is distinct from new.owner_id") &&
  projectOwnershipSql.includes("v_archived_at is not null"),
  "Database trigger must reject cross-owner and archived project links");
assert.ok(projectOwnershipSql.includes("before insert or update of project_id, owner_id"),
  "Conversation project ownership must be enforced on inserts and relinking updates");
assert.ok(projectOwnershipTests.includes("cross-owner and archived project associations are rejected"),
  "Database tests must cover invalid project associations");
const projectMetadataUi = readFileSync("app/projects/projects-client.tsx", "utf8");
assert.ok(projectMetadataUi.includes("async function saveProject(project: Project)") &&
  projectMetadataUi.includes("JSON.stringify({ title: editTitle, description: editDescription.trim() || null })"),
  "Project management UI must support editing title and description through the authenticated PATCH endpoint");
assert.ok(projectMetadataUi.includes("編輯") && projectMetadataUi.includes("儲存") && projectMetadataUi.includes("取消"),
  "Project metadata editing must provide explicit edit, save, and cancel controls");

assert.ok(conversationProjectApi.includes('.eq("owner_id", auth.user.id)') &&
  conversationProjectApi.includes('.eq("id", id)') &&
  conversationProjectApi.includes('.is("archived_at", null)'),
  "Conversation project reassignment must be owner-scoped and reject archived or foreign projects");
assert.ok(conversationProjectApi.includes('readJsonBody(request, 32768)') &&
  conversationProjectApi.includes('hasOwnProperty.call(body, "project_id")'),
  "Conversation project reassignment must use bounded JSON parsing and explicit nullable project_id input");
assert.ok(projectLinkedWorkspaceClient.includes('method: "PATCH"') &&
  projectLinkedWorkspaceClient.includes("assignConversationProject"),
  "Workspace must allow existing conversations to be reassigned or unassigned from active projects");

const projectOwnershipLockSql = readFileSync("supabase/migrations/0017_conversation_project_locking.sql", "utf8");
assert.ok(projectOwnershipLockSql.includes("for share") && !projectOwnershipLockSql.includes("for key share"),
  "Project ownership trigger must take a row lock that conflicts with concurrent archived_at updates");
assert.ok(projectOwnershipTests.includes("project row lock conflicts with concurrent archive updates"),
  "Database tests must verify the stronger project row-lock mode");
