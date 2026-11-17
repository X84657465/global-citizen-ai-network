import { NextResponse, type NextRequest } from "next/server";
import { readJsonBody } from "@/lib/http/read-json-body";
import { getAuthenticatedClient, isUuid } from "@/lib/supabase/authenticated";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function reviewerContext() {
  const auth = await getAuthenticatedClient();
  if (!auth) return { response: NextResponse.json({ error: "請先登入。" }, { status: 401 }) };
  const { data: profile, error } = await auth.supabase
    .from("profiles")
    .select("role,account_status")
    .eq("id", auth.user.id)
    .maybeSingle();
  if (error) return { response: NextResponse.json({ error: "無法驗證審核權限。" }, { status: 503 }) };
  if (!profile || !["admin", "reviewer"].includes(profile.role) || profile.account_status !== "active") {
    return { response: NextResponse.json({ error: "沒有貢獻任務審核權限。" }, { status: 403 }) };
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return { response: NextResponse.json({ error: "伺服器尚未設定管理端資料庫金鑰。" }, { status: 503 }) };
  }
  return { auth, admin: createAdminClient() };
}

export async function GET() {
  const context = await reviewerContext();
  if ("response" in context) return context.response;
  const { data, error } = await context.admin
    .from("task_submissions")
    .select("id,task_id,contributor_id,content,status,submitted_at,contribution_tasks(title,reward_amount,reward_currency)")
    .in("status", ["submitted", "under_review"])
    .order("submitted_at", { ascending: true })
    .limit(100);
  if (error) return NextResponse.json({ error: "目前無法讀取待審核成果。" }, { status: 503 });
  return NextResponse.json({ submissions: data ?? [], generatedAt: new Date().toISOString() }, {
    headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" },
  });
}

export async function POST(request: NextRequest) {
  const context = await reviewerContext();
  if ("response" in context) return context.response;
  const parsed = await readJsonBody(request, 8192);
  if (!parsed.ok || !parsed.value || typeof parsed.value !== "object" || Array.isArray(parsed.value)) {
    return NextResponse.json({ error: "請提供有效的審核資料。" }, { status: parsed.ok ? 400 : parsed.status });
  }
  const body = parsed.value as { submissionId?: unknown; decision?: unknown; rationale?: unknown };
  const submissionId = typeof body.submissionId === "string" ? body.submissionId : "";
  const decision = body.decision === "accept" || body.decision === "reject" ? body.decision : "";
  const rationale = typeof body.rationale === "string" ? body.rationale.trim() : "";
  const key = request.headers.get("Idempotency-Key") ?? "";
  if (!isUuid(submissionId) || !decision || rationale.length < 10 || rationale.length > 4000 ||
      !/^[A-Za-z0-9._:-]{8,128}$/.test(key)) {
    return NextResponse.json({ error: "請確認提交識別碼、審核決定、至少 10 字的理由及冪等鍵。" }, { status: 400 });
  }

  const { data, error } = await context.admin.rpc("review_task_submission", {
    p_actor_id: context.auth.user.id,
    p_submission_id: submissionId,
    p_decision: decision,
    p_rationale: rationale,
    p_idempotency_key: key,
  });
  if (error) {
    const conflict = /idempotency key payload conflict|not reviewable|already exists/i.test(error.message);
    return NextResponse.json({ error: conflict ? "審核資料衝突，請重新整理後確認任務狀態。" : "審核未完成，請確認 Migration 0008–0011 已套用及資料庫狀態。" }, {
      status: conflict ? 409 : 503,
    });
  }
  return NextResponse.json({ result: data }, { headers: { "Cache-Control": "no-store" } });
}
