import { NextResponse, type NextRequest } from "next/server";
import { readJsonBody } from "@/lib/http/read-json-body";
import { getAuthenticatedClient, isUuid } from "@/lib/supabase/authenticated";
import { createAdminClient } from "@/lib/supabase/admin";

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
  const body = parsed.value as {
    title?: unknown; description?: unknown; category?: unknown;
    acceptanceCriteria?: unknown; rewardAmount?: unknown; closesAt?: unknown;
  };
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const description = typeof body.description === "string" ? body.description.trim() : "";
  const category = typeof body.category === "string" ? body.category.trim() : "";
  const reward = typeof body.rewardAmount === "number" ? body.rewardAmount : Number.NaN;
  const criteria = Array.isArray(body.acceptanceCriteria) ? body.acceptanceCriteria : [];
  const closesAt = body.closesAt === null || body.closesAt === "" ? null : typeof body.closesAt === "string" ? body.closesAt : "invalid";
  if (title.length < 3 || title.length > 180 || description.length < 20 || description.length > 5000 ||
      category.length < 2 || category.length > 40 || !Number.isFinite(reward) || reward < 0 || reward > 100000 ||
      criteria.length < 1 || criteria.length > 20 ||
      criteria.some(item => typeof item !== "string" || item.trim().length < 3 || item.trim().length > 500) ||
      (closesAt !== null && (closesAt === "invalid" || !Number.isFinite(Date.parse(closesAt)) || Date.parse(closesAt) <= Date.now()))) {
    return NextResponse.json({ error: "請檢查標題、任務說明、分類、驗收條件、報酬金額及截止時間。" }, { status: 400 });
  }

  const { data, error } = await context.admin.from("contribution_tasks").insert({
    created_by: context.auth.user.id,
    title,
    description,
    category,
    acceptance_criteria: criteria.map(item => (item as string).trim()),
    reward_amount: reward,
    reward_currency: "TWD",
    status: "draft",
    closes_at: closesAt,
  }).select("id,title,status,created_at").single();

  if (error) return NextResponse.json({ error: "任務建立失敗，請檢查資料庫 Migration 與欄位設定。" }, { status: 503 });
  await context.admin.from("audit_logs").insert({
    actor_id: context.auth.user.id, action: "contribution_task_created",
    resource_type: "contribution_task", resource_id: data.id, outcome: "allowed",
    metadata: { initial_status: "draft", reward_currency: "TWD" },
  });
  return NextResponse.json({ task: data }, { status: 201, headers: { "Cache-Control": "no-store" } });
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
  if (!isUuid(taskId) || !["publish", "pause", "close"].includes(String(action))) {
    return NextResponse.json({ error: "任務識別碼或操作類型錯誤。" }, { status: 400 });
  }

  const { data: task, error: readError } = await context.admin.from("contribution_tasks")
    .select("id,title,description,category,acceptance_criteria,reward_amount,status,closes_at")
    .eq("id", taskId).maybeSingle();
  if (readError || !task) return NextResponse.json({ error: "找不到這項任務。" }, { status: 404 });

  let nextStatus: "published" | "paused" | "closed";
  if (action === "publish") {
    const criteria = Array.isArray(task.acceptance_criteria) ? task.acceptance_criteria : [];
    if (!["draft", "paused"].includes(task.status) || task.title.trim().length < 3 ||
        task.description.trim().length < 20 || task.category.trim().length < 2 || criteria.length === 0 ||
        (task.closes_at && new Date(task.closes_at).getTime() <= Date.now())) {
      return NextResponse.json({ error: "任務資料不完整、已截止，或目前狀態不可發布。" }, { status: 409 });
    }
    nextStatus = "published";
  } else if (action === "pause") {
    if (task.status !== "published") return NextResponse.json({ error: "只有已發布任務可以暫停。" }, { status: 409 });
    nextStatus = "paused";
  } else {
    if (!["published", "paused", "draft"].includes(task.status)) return NextResponse.json({ error: "目前狀態不可關閉。" }, { status: 409 });
    nextStatus = "closed";
  }

  const { data, error } = await context.admin.from("contribution_tasks").update({
    status: nextStatus,
    ...(action === "publish" ? { published_at: new Date().toISOString() } : {}),
  }).eq("id", taskId).select("id,title,status,published_at").single();

  if (error) return NextResponse.json({ error: "任務狀態更新失敗。" }, { status: 503 });
  await context.admin.from("audit_logs").insert({
    actor_id: context.auth.user.id, action: "contribution_task_" + action,
    resource_type: "contribution_task", resource_id: taskId, outcome: "allowed",
    metadata: { from_status: task.status, to_status: nextStatus },
  });
  return NextResponse.json({ task: data }, { headers: { "Cache-Control": "no-store" } });
}
