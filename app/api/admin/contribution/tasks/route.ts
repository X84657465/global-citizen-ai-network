import { NextResponse, type NextRequest } from "next/server";
import { readJsonBody } from "@/lib/http/read-json-body";
import { getAuthenticatedClient, isUuid } from "@/lib/supabase/authenticated";
import { createAdminClient } from "@/lib/supabase/admin";
import { parseCreateContributionTaskInput } from "@/lib/contribution-tasks/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function getOperator(allowReviewer = false) {
  const auth = await getAuthenticatedClient();
  if (!auth) return { response: NextResponse.json({ error: "請先登入。" }, { status: 401 }) };
  const { data: profile, error } = await auth.supabase.from("profiles")
    .select("role,account_status").eq("id", auth.user.id).maybeSingle();
  if (error) return { response: NextResponse.json({ error: "無法驗證管理權限。" }, { status: 503 }) };
  const roles = allowReviewer ? ["admin", "reviewer"] : ["admin"];
  if (!profile || !roles.includes(profile.role) || profile.account_status !== "active") {
    return { response: NextResponse.json({ error: "沒有此項貢獻任務管理權限。" }, { status: 403 }) };
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return { response: NextResponse.json({ error: "伺服器尚未設定管理端資料庫金鑰。" }, { status: 503 }) };
  }
  return { auth, admin: createAdminClient(), role: profile.role };
}

export async function GET() {
  const context = await getOperator(true);
  if ("response" in context) return context.response;
  const { data, error } = await context.admin.from("contribution_tasks")
    .select("id,title,description,category,acceptance_criteria,reward_amount,reward_currency,status,published_at,closes_at,created_at")
    .order("created_at", { ascending: false }).limit(100);
  if (error) return NextResponse.json({ error: "目前無法讀取任務清單。" }, { status: 503 });
  return NextResponse.json({ tasks: data ?? [] }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: NextRequest) {
  const context = await getOperator(false);
  if ("response" in context) return context.response;
  const parsed = await readJsonBody(request, 16384);
  if (!parsed.ok || !parsed.value || typeof parsed.value !== "object" || Array.isArray(parsed.value)) {
    return NextResponse.json({ error: "請提供有效的任務資料。" }, { status: parsed.ok ? 400 : parsed.status });
  }
  const validated = parseCreateContributionTaskInput(parsed.value);
  if (!validated.ok) {
    return NextResponse.json({ error: "請檢查標題、任務說明、分類、驗收條件、報酬金額及截止時間。" }, { status: 400 });
  }
  const { title, description, category, acceptanceCriteria, rewardAmount, closesAt } = validated.value;

  const { data, error } = await context.admin.rpc("manage_contribution_task", {
    p_actor_id: context.auth.user.id,
    p_action: "create",
    p_task_id: null,
    p_title: title,
    p_description: description,
    p_category: category,
    p_acceptance_criteria: acceptanceCriteria,
    p_reward_amount: rewardAmount,
    p_closes_at: closesAt,
  });
  if (error) {
    const status = error.code === "42501" ? 403 : error.code === "22023" ? 400 : 503;
    return NextResponse.json({ error: "任務建立失敗，請確認管理員權限及任務欄位。" }, { status });
  }
  const task = Array.isArray(data) ? data[0] : null;
  if (!task) return NextResponse.json({ error: "資料庫未回傳建立結果。" }, { status: 503 });
  return NextResponse.json({
    task: { id: task.task_id, title: task.title, status: task.status, created_at: task.created_at },
  }, { status: 201, headers: { "Cache-Control": "no-store" } });
}

export async function PATCH(request: NextRequest) {
  const context = await getOperator(false);
  if ("response" in context) return context.response;
  const parsed = await readJsonBody(request, 4096);
  if (!parsed.ok || !parsed.value || typeof parsed.value !== "object" || Array.isArray(parsed.value)) {
    return NextResponse.json({ error: "請提供有效的任務操作資料。" }, { status: parsed.ok ? 400 : parsed.status });
  }
  const body = parsed.value as { taskId?: unknown; action?: unknown };
  const taskId = typeof body.taskId === "string" ? body.taskId : "";
  const action = body.action;
  if (!isUuid(taskId) || (action !== "publish" && action !== "pause" && action !== "close")) {
    return NextResponse.json({ error: "任務識別碼或操作類型錯誤。" }, { status: 400 });
  }

  const { data, error } = await context.admin.rpc("manage_contribution_task", {
    p_actor_id: context.auth.user.id,
    p_action: action,
    p_task_id: taskId,
    p_title: null,
    p_description: null,
    p_category: null,
    p_acceptance_criteria: null,
    p_reward_amount: null,
    p_closes_at: null,
  });
  if (error) {
    const status = error.code === "42501" ? 403 : error.code === "P0002" ? 404 : error.code === "22023" ? 409 : 503;
    return NextResponse.json({ error: "任務狀態更新失敗，請重新整理確認目前狀態。" }, { status });
  }
  const task = Array.isArray(data) ? data[0] : null;
  if (!task) return NextResponse.json({ error: "資料庫未回傳更新結果。" }, { status: 503 });
  return NextResponse.json({
    task: { id: task.task_id, title: task.title, status: task.status, published_at: task.published_at },
  }, { headers: { "Cache-Control": "no-store" } });
}
