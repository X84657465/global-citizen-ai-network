import { NextResponse, type NextRequest } from "next/server";
import { readJsonBody } from "@/lib/http/read-json-body";
import { getAuthenticatedClient, isUuid } from "@/lib/supabase/authenticated";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await getAuthenticatedClient();
  if (!auth) return NextResponse.json({ error: "請先登入。" }, { status: 401 });

  const [{ data: tasks, error: taskError }, { data: submissions, error: submissionError }] = await Promise.all([
    auth.supabase
      .from("contribution_tasks")
      .select("id,title,description,category,acceptance_criteria,reward_amount,reward_currency,closes_at,created_at")
      .eq("status", "published")
      .or("closes_at.is.null,closes_at.gt." + new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(100),
    auth.supabase
      .from("task_submissions")
      .select("id,task_id,status,submitted_at")
      .order("submitted_at", { ascending: false })
      .limit(200),
  ]);

  if (taskError || submissionError) {
    return NextResponse.json({ error: "目前無法讀取貢獻任務。" }, { status: 500 });
  }

  return NextResponse.json(
    { tasks: tasks ?? [], submissions: submissions ?? [] },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(request: NextRequest) {
  const auth = await getAuthenticatedClient();
  if (!auth) return NextResponse.json({ error: "請先登入。" }, { status: 401 });

  const parsed = await readJsonBody(request, 32768);
  if (!parsed.ok) {
    return NextResponse.json(
      { error: parsed.status === 413 ? "提交內容超過大小限制。" : "請提供有效的提交資料。" },
      { status: parsed.status },
    );
  }
  if (!parsed.value || typeof parsed.value !== "object" || Array.isArray(parsed.value)) {
    return NextResponse.json({ error: "請提供有效的提交資料。" }, { status: 400 });
  }

  const body = parsed.value as { taskId?: unknown; content?: unknown };
  const taskId = typeof body.taskId === "string" ? body.taskId : "";
  const content = typeof body.content === "string" ? body.content.trim() : "";
  if (!isUuid(taskId) || content.length < 10 || content.length > 16000) {
    return NextResponse.json({ error: "任務識別碼錯誤，或提交內容須介於 10 至 16,000 字元。" }, { status: 400 });
  }

  const { data: task, error: taskError } = await auth.supabase
    .from("contribution_tasks")
    .select("id,closes_at")
    .eq("id", taskId)
    .eq("status", "published")
    .maybeSingle();
  if (taskError || !task || (task.closes_at && new Date(task.closes_at).getTime() <= Date.now())) {
    return NextResponse.json({ error: "任務不存在、已截止或已停止接受提交。" }, { status: 404 });
  }

  const { data, error } = await auth.supabase
    .from("task_submissions")
    .insert({ task_id: taskId, contributor_id: auth.user.id, content })
    .select("id,task_id,status,submitted_at")
    .single();

  if (error) {
    return NextResponse.json(
      { error: "提交未完成，可能是任務已截止、同一任務已有尚未結案的提交或申訴，或帳戶目前沒有提交權限。" },
      { status: 409 },
    );
  }

  return NextResponse.json({ submission: data }, { status: 201, headers: { "Cache-Control": "no-store" } });
}
