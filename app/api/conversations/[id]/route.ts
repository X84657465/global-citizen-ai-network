import { NextResponse, type NextRequest } from "next/server";
import { readJsonBody } from "@/lib/http/read-json-body";
import { getAuthenticatedClient, isUuid } from "@/lib/supabase/authenticated";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, context: RouteContext) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
    return NextResponse.json({ error: "資料庫尚未設定。" }, { status: 503 });
  }

  const { id } = await context.params;
  if (!isUuid(id)) return NextResponse.json({ error: "對話識別碼格式錯誤。" }, { status: 400 });

  const auth = await getAuthenticatedClient();
  if (!auth) return NextResponse.json({ error: "請先登入。" }, { status: 401 });

  const parsed = await readJsonBody(request, 32768);
  if (!parsed.ok) {
    const message = parsed.status === 413 ? "請求內容超過大小限制。" : "請提供有效的對話資料。";
    return NextResponse.json({ error: message }, { status: parsed.status });
  }
  const body = parsed.value;
  if (!body || typeof body !== "object" || Array.isArray(body) ||
      !Object.prototype.hasOwnProperty.call(body, "project_id")) {
    return NextResponse.json({ error: "請指定專案或清除專案歸屬。" }, { status: 400 });
  }

  const projectId = (body as { project_id?: unknown }).project_id;
  if (projectId !== null && (typeof projectId !== "string" || !isUuid(projectId))) {
    return NextResponse.json({ error: "專案識別碼格式錯誤。" }, { status: 400 });
  }

  if (projectId !== null) {
    const { data: project, error: projectError } = await auth.supabase
      .from("projects")
      .select("id")
      .eq("id", projectId)
      .eq("owner_id", auth.user.id)
      .is("archived_at", null)
      .maybeSingle();
    if (projectError || !project) {
      return NextResponse.json({ error: "找不到可使用的專案，或專案已封存。" }, { status: 404 });
    }
  }

  const { data, error } = await auth.supabase
    .from("conversations")
    .update({ project_id: projectId })
    .eq("id", id)
    .eq("owner_id", auth.user.id)
    .select("id,project_id,title,updated_at")
    .maybeSingle();

  if (error) return NextResponse.json({ error: "目前無法更新對話所屬專案。" }, { status: 400 });
  if (!data) return NextResponse.json({ error: "找不到對話。" }, { status: 404 });

  return NextResponse.json({ conversation: data }, { headers: { "Cache-Control": "no-store" } });
}
