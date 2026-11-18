import { NextResponse, type NextRequest } from "next/server";
import { parseReconciliationInput } from "@/lib/ai/reconciliation-input";
import { isActiveAdminProfile } from "@/lib/ai/reconciliation-auth";
import { readJsonBody } from "@/lib/http/read-json-body";
import { getAuthenticatedClient } from "@/lib/supabase/authenticated";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function noStore(body: Record<string, unknown>, status: number) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" },
  });
}

export async function POST(request: NextRequest) {
  const auth = await getAuthenticatedClient();
  if (!auth) return noStore({ error: "請先登入。" }, 401);

  const { data: profile, error: profileError } = await auth.supabase
    .from("profiles")
    .select("role, account_status")
    .eq("id", auth.user.id)
    .maybeSingle();

  if (profileError) return noStore({ error: "無法驗證管理員權限。" }, 503);
  if (!isActiveAdminProfile(profile)) {
    return noStore({ error: "只有啟用中的管理員可以核對 AI 請求。" }, 403);
  }

  const parsed = await readJsonBody(request, 8192);
  if (!parsed.ok) {
    return noStore({ error: parsed.status === 413 ? "請求內容超過大小限制。" : "請提供有效的 JSON。" }, parsed.status);
  }
  const validated = parseReconciliationInput(parsed.value);
  if (!validated.ok) {
    const message = validated.reason === "invalid_billed_cost"
      ? "已確認扣款時，必須提供有效的供應商金額、幣別及換算後 TWD 成本。"
      : validated.reason === "cost_not_allowed_for_decision"
        ? "只有已確認扣款的決策可以提供成本欄位。"
        : "核對欄位格式不正確，請檢查請求、決策、證據參照與理由。";
    return noStore({ error: message }, 400);
  }

  // Keep the privileged RPC behind the server-only service client. The
  // authenticated session was checked above, and the database independently
  // verifies that this actor is still an active admin before any mutation.
  let adminSupabase;
  try {
    adminSupabase = createAdminClient();
  } catch {
    return noStore({ error: "核帳服務尚未完成伺服器端金鑰設定。" }, 503);
  }
  const { data, error } = await adminSupabase.rpc("resolve_ai_reconciliation", {
    p_actor_id: auth.user.id,
    p_request_id: validated.value.requestId,
    p_idempotency_key: validated.value.idempotencyKey,
    p_decision: validated.value.decision,
    p_provider: validated.value.provider,
    p_evidence_reference: validated.value.evidenceReference,
    p_rationale: validated.value.rationale,
    p_provider_billed_cost: validated.value.providerBilledCost ?? null,
    p_provider_billed_currency: validated.value.providerBilledCurrency ?? null,
    p_normalized_cost_twd: validated.value.normalizedCostTwd ?? null,
  });

  if (error) return noStore({ error: "核對未完成，資料庫已拒絕此次操作。請保留相同核對鍵並檢查請求狀態。" }, 409);
  const result = Array.isArray(data) ? data[0] as { disposition?: string; reason?: string; event_id?: string } | undefined : undefined;
  if (!result) return noStore({ error: "資料庫未回傳核對結果。" }, 503);
  if (result.disposition === "rejected") return noStore({ error: "核對遭拒絕：" + (result.reason ?? "狀態不符") }, 409);
  if (result.disposition === "conflict") return noStore({ error: "核對鍵已用於不同內容，請勿重送新決策。" }, 409);

  return noStore({
    disposition: result.disposition,
    reason: result.reason,
    eventId: result.event_id,
  }, 200);
}
