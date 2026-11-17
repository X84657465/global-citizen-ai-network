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
  if (!isUuid(id)) return NextResponse.json({ error: "專案識別碼格式錯誤。" }, { status: 400 });
  const auth = await getAuthenticatedClient();
  if (!auth) return NextResponse.json({ error: "請先登入。" }, { status: 401 });

  const parsed = await readJsonBody(request, 32768);
  if (!parsed.ok) {
    const message = parsed.status === 413 ? "請求內容超過大小限制。" : "請提供有效的專案資料。";
    return NextResponse.json({ error: message }, { status: parsed.status });
  }
  const body = parsed.value;
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "請提供有效的專案資料。" }, { status: 400 });
  }

  const input = body as { title?: unknown; description?: unknown; archived?: unknown };
  const updates: { title?: string; description?: string | null; archived_at?: string | null } = {};
  if (input.title !== undefined) {
    if (typeof input.title !== "string" || input.title.trim().length < 1 || input.title.trim().length > 160) {
      return NextResponse.json({ error: "專案名稱長度不符合限制。" }, { status: 400 });
    }
    updates.title = input.title.trim();
  }
  if (input.archived !== undefined) {
    if (typeof input.archived !== "boolean") {
      return NextResponse.json({ error: "封存狀態必須是布林值。" }, { status: 400 });
    }
    updates.archived_at = input.archived ? new Date().toISOString() : null;
  }
  if (input.description !== undefined) {
    if (input.description !== null && (typeof input.description !== "string" || input.description.length > 4000)) {
      return NextResponse.json({ error: "專案說明長度不符合限制。" }, { status: 400 });
    }
    updates.description = typeof input.description === "string" ? input.description.trim() : null;
  }
  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "沒有可更新的欄位。" }, { status: 400 });
  }

  const { data, error } = await auth.supabase
    .from("projects")
    .update(updates)
    .eq("id", id)
    .select("id,title,description,archived_at,created_at,updated_at")
    .maybeSingle();

  if (error) return NextResponse.json({ error: "目前無法更新專案。" }, { status: 400 });
  if (!data) return NextResponse.json({ error: "找不到專案。" }, { status: 404 });
  return NextResponse.json({ project: data }, { headers: { "Cache-Control": "no-store" } });
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  void _request;
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
    return NextResponse.json({ error: "資料庫尚未設定。" }, { status: 503 });
  }
  const { id } = await context.params;
  if (!isUuid(id)) return NextResponse.json({ error: "專案識別碼格式錯誤。" }, { status: 400 });
  const auth = await getAuthenticatedClient();
  if (!auth) return NextResponse.json({ error: "請先登入。" }, { status: 401 });

  const { data, error } = await auth.supabase
    .from("projects")
    .delete()
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (error) return NextResponse.json({ error: "目前無法刪除專案。" }, { status: 400 });
  if (!data) return NextResponse.json({ error: "找不到專案。" }, { status: 404 });
  return new NextResponse(null, { status: 204, headers: { "Cache-Control": "no-store" } });
}
