import { NextResponse, type NextRequest } from "next/server";
import { readJsonBody } from "@/lib/http/read-json-body";
import { getAuthenticatedClient, isUuid } from "@/lib/supabase/authenticated";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  void _request;
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
    return NextResponse.json({ error: "資料庫尚未設定。" }, { status: 503 });
  }
  const { id } = await context.params;
  if (!isUuid(id)) return NextResponse.json({ error: "對話識別碼格式錯誤。" }, { status: 400 });
  const auth = await getAuthenticatedClient();
  if (!auth) return NextResponse.json({ error: "請先登入。" }, { status: 401 });

  const { data, error } = await auth.supabase
    .from("messages")
    .select("id,role,content,model,created_at")
    .eq("conversation_id", id)
    .eq("owner_id", auth.user.id)
    // Fetch the newest bounded window first; reverse it for chronological display.
    // Ascending + limit(500) would permanently hide messages after the first 500.
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(500);

  if (error) return NextResponse.json({ error: "目前無法讀取訊息。" }, { status: 500 });
  return NextResponse.json({ messages: [...data].reverse() }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: NextRequest, context: RouteContext) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
    return NextResponse.json({ error: "資料庫尚未設定。" }, { status: 503 });
  }
  const { id } = await context.params;
  if (!isUuid(id)) return NextResponse.json({ error: "對話識別碼格式錯誤。" }, { status: 400 });
  const auth = await getAuthenticatedClient();
  if (!auth) return NextResponse.json({ error: "請先登入。" }, { status: 401 });

  const parsed = await readJsonBody(request, 98304);
  if (!parsed.ok) {
    const message = parsed.status === 413 ? "請求內容超過大小限制。" : "請提供有效的訊息內容。";
    return NextResponse.json({ error: message }, { status: parsed.status });
  }
  const body = parsed.value;
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "請提供有效的訊息內容。" }, { status: 400 });
  }
  const input = body as { content?: unknown };
  const content = typeof input.content === "string" ? input.content.trim() : "";
  if (content.length < 1 || content.length > 20000) {
    return NextResponse.json({ error: "訊息長度須介於 1 至 20000 個字元。" }, { status: 400 });
  }

  // Clients can only append user messages. Assistant/system messages are reserved
  // for trusted server-side AI orchestration and are blocked by the database RLS.
  const { data, error } = await auth.supabase
    .from("messages")
    .insert({ conversation_id: id, owner_id: auth.user.id, role: "user", content })
    .select("id,role,content,model,created_at")
    .single();

  if (error) return NextResponse.json({ error: "目前無法儲存訊息。" }, { status: 400 });
  return NextResponse.json({ message: data }, { status: 201, headers: { "Cache-Control": "no-store" } });
}
