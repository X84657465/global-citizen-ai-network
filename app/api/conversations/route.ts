import { NextResponse, type NextRequest } from "next/server";
import { readJsonBody } from "@/lib/http/read-json-body";
import { getAuthenticatedClient, isUuid } from "@/lib/supabase/authenticated";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
    return NextResponse.json({ error: "資料庫尚未設定。" }, { status: 503 });
  }
  const auth = await getAuthenticatedClient();
  if (!auth) return NextResponse.json({ error: "請先登入。" }, { status: 401 });

  const { data, error } = await auth.supabase
    .from("conversations")
    .select("id,project_id,title,created_at,updated_at")
    .order("updated_at", { ascending: false })
    .limit(100);

  if (error) return NextResponse.json({ error: "目前無法讀取對話。" }, { status: 500 });
  return NextResponse.json({ conversations: data }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: NextRequest) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
    return NextResponse.json({ error: "資料庫尚未設定。" }, { status: 503 });
  }
  const auth = await getAuthenticatedClient();
  if (!auth) return NextResponse.json({ error: "請先登入。" }, { status: 401 });

  const parsed = await readJsonBody(request, 32768);
  if (!parsed.ok) {
    const message = parsed.status === 413 ? "請求內容超過大小限制。" : "請提供有效的對話資料。";
    return NextResponse.json({ error: message }, { status: parsed.status });
  }
  const body = parsed.value;
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "請提供有效的對話資料。" }, { status: 400 });
  }

  const input = body as { title?: unknown; project_id?: unknown };
  const title = typeof input.title === "string" ? input.title.trim() : "新對話";
  const projectId = input.project_id === undefined || input.project_id === null ? null : input.project_id;
  if (title.length < 1 || title.length > 160) {
    return NextResponse.json({ error: "對話名稱長度不符合限制。" }, { status: 400 });
  }
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
    .insert({ owner_id: auth.user.id, title, project_id: projectId })
    .select("id,project_id,title,created_at,updated_at")
    .single();

  if (error) return NextResponse.json({ error: "目前無法建立對話。" }, { status: 400 });
  return NextResponse.json({ conversation: data }, { status: 201, headers: { "Cache-Control": "no-store" } });
}
