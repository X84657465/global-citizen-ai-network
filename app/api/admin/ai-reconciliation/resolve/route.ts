import { NextResponse, type NextRequest } from "next/server";
import { readJsonBody } from "@/lib/http/read-json-body";
import { getAuthenticatedClient, isUuid } from "@/lib/supabase/authenticated";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ResolutionInput = {
  requestId?: unknown;
  idempotencyKey?: unknown;
  decision?: unknown;
  provider?: unknown;
  evidenceReference?: unknown;
  rationale?: unknown;
  providerBilledCost?: unknown;
  providerBilledCurrency?: unknown;
  normalizedCostTwd?: unknown;
};

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
  if (profile?.role !== "admin" || profile.account_status !== "active") {
    return noStore({ error: "只有啟用中的管理員可以核對 AI 請求。" }, 403);
  }

  const parsed = await readJsonBody(request, 8192);
  if (!parsed.ok) {
    return noStore({ error: parsed.status === 413 ? "請求內容超過大小限制。" : "請提供有效的 JSON。" }, parsed.status);
  }
  if (!parsed.value || typeof parsed.value !== "object" || Array.isArray(parsed.value)) {
    return noStore({ error: "請提供有效的核對資料。" }, 400);
  }

  const input = parsed.value as ResolutionInput;
  const requestId = typeof input.requestId === "string" ? input.requestId : "";
  const idempotencyKey = typeof input.idempotencyKey === "string" ? input.idempotencyKey : "";
  const decision = input.decision;
  const provider = typeof input.provider === "string" ? input.provider.trim() : "";
  const evidenceReference = typeof input.evidenceReference === "string" ? input.evidenceReference.trim() : "";
  const rationale = typeof input.rationale === "string" ? input.rationale.trim() : "";
  const billedCost = input.providerBilledCost;
  const billedCurrency = input.providerBilledCurrency;
  const normalizedCost = input.normalizedCostTwd;

  if (!isUuid(requestId) || !isUuid(idempotencyKey)
      || !["confirmed_billed", "confirmed_not_billed", "inconclusive"].includes(String(decision))
      || provider.length < 1 || provider.length > 120
      || evidenceReference.length < 8 || evidenceReference.length > 500
      || rationale.length < 20 || rationale.length > 2000) {
    return noStore({ error: "核對欄位格式不正確，請檢查請求、決策、證據參照與理由。" }, 400);
  }

  const isBilled = decision === "confirmed_billed";
  if (isBilled) {
    if (typeof billedCost !== "number" || !Number.isFinite(billedCost) || billedCost < 0 || billedCost > 9999999999.99999999
        || typeof normalizedCost !== "number" || !Number.isFinite(normalizedCost) || normalizedCost < 0 || normalizedCost > 9999999999.99999999
        || typeof billedCurrency !== "string" || !/^[A-Z]{3}$/.test(billedCurrency)) {
      return noStore({ error: "已確認扣款時，必須提供有效的供應商金額、幣別及換算後 TWD 成本。" }, 400);
    }
  } else if (billedCost !== undefined || billedCurrency !== undefined || normalizedCost !== undefined) {
    return noStore({ error: "只有已確認扣款的決策可以提供成本欄位。" }, 400);
  }

  // Use the authenticated session client, not service-role credentials. The
  // SECURITY DEFINER RPC independently verifies auth.uid() and active-admin
  // status before it can mutate any financial or request state.
  const { data, error } = await auth.supabase.rpc("resolve_ai_reconciliation", {
    p_actor_id: auth.user.id,
    p_request_id: requestId,
    p_idempotency_key: idempotencyKey,
    p_decision: decision,
    p_provider: provider,
    p_evidence_reference: evidenceReference,
    p_rationale: rationale,
    p_provider_billed_cost: isBilled ? billedCost : null,
    p_provider_billed_currency: isBilled ? billedCurrency : null,
    p_normalized_cost_twd: isBilled ? normalizedCost : null,
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
