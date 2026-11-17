import { NextResponse, type NextRequest } from "next/server";
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

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "請提供有效的專案資料。" }, { status: 400 });
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "請提供有效的專案資料。" }, { status: 400 });
  }

  const input = body as { title?: unknown; description?: unknown };
  const updates: { title?: string; description?: string | null } = {};
  if (input.title !== undefined) {
    if (typeof input.title !== "string" || input.title.trim().length < 1 || input.title.trim().length > 160) {
      return NextResponse.json({ error: "專案名稱長度不符合限制。" }, { status: 400 });
    }
    updates.title = input.title.trim();
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
    .select("id,title,description,created_at,updated_at")
    .maybeSingle();

  if (error) return NextResponse.json({ error: "目前無法更新專案。" }, { status: 400 });
  if (!data) return NextResponse.json({ error: "找不到專案。" }, { status: 404 });
  return NextResponse.json({ project: data }, { headers: { "Cache-Control": "no-store" } });
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
    return NextResponse.json({ error: "資料庫尚未設定。" }, { status: 503 });
  }
  const { id } = await context.params;
  if (!isUuid(id)) return NextResponse.json({ error: "專案識別碼格式錯誤。" }, { status: 400 });
  const auth = await getAuthenticatedClient();
  if (!auth) return NextResponse.json({ error: "請先登入。" }, { status: 401 });

  const { error } = await auth.supabase.from("projects").delete().eq("id", id);
  if (error) return NextResponse.json({ error: "目前無法刪除專案。" }, { status: 400 });
  return new NextResponse(null, { status: 204, headers: { "Cache-Control": "no-store" } });
}
