import { NextResponse } from "next/server";
import { getAuthenticatedClient } from "@/lib/supabase/authenticated";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type StaleRequest = {
  request_id: string;
  owner_id: string;
  provider: string;
  model: string;
  request_status: string;
  request_created_at: string;
  reservation_status: string;
  reserved_amount: number | string;
  actual_cost: number | string | null;
  idempotency_state: string | null;
  provider_request_id: string | null;
};

export async function GET() {
  const auth = await getAuthenticatedClient();
  if (!auth) {
    return NextResponse.json({ error: "請先登入。" }, { status: 401 });
  }

  const { data: profile, error: profileError } = await auth.supabase
    .from("profiles")
    .select("role,account_status")
    .eq("id", auth.user.id)
    .maybeSingle();

  if (profileError) {
    return NextResponse.json({ error: "無法驗證管理員權限。" }, { status: 503 });
  }
  if (!profile || profile.role !== "admin" || profile.account_status !== "active") {
    return NextResponse.json({ error: "只有有效管理員可以查看待核對請求。" }, { status: 403 });
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: "伺服器尚未設定管理端資料庫金鑰。" }, { status: 503 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin.rpc("list_stale_ai_requests", {
    p_older_than_seconds: 900,
  });

  if (error) {
    return NextResponse.json(
      { error: "待核對請求讀取失敗，請確認資料庫 Migration 與權限。" },
      { status: 503 },
    );
  }

  const requests = ((data ?? []) as StaleRequest[]).map((row) => ({
    requestId: row.request_id,
    ownerId: row.owner_id,
    provider: row.provider,
    model: row.model,
    status: row.request_status,
    createdAt: row.request_created_at,
    reservationStatus: row.reservation_status,
    reservedAmount: Number(row.reserved_amount),
    actualCost: row.actual_cost === null ? null : Number(row.actual_cost),
    idempotencyState: row.idempotency_state,
    providerRequestId: row.provider_request_id,
  }));

  return NextResponse.json(
    { generatedAt: new Date().toISOString(), olderThanSeconds: 900, requests },
    { headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } },
  );
}
