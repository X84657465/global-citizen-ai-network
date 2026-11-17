import { NextResponse, type NextRequest } from "next/server";
import { getAuthenticatedClient } from "@/lib/supabase/authenticated";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
    return NextResponse.json({ error: "資料庫尚未設定。" }, { status: 503 });
  }
  const auth = await getAuthenticatedClient();
  if (!auth) return NextResponse.json({ error: "請先登入。" }, { status: 401 });

  const { data, error } = await auth.supabase
    .from("projects")
    .select("id,title,description,created_at,updated_at")
    .order("updated_at", { ascending: false })
    .limit(100);

  if (error) return NextResponse.json({ error: "目前無法讀取專案。" }, { status: 500 });
  return NextResponse.json({ projects: data }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: NextRequest) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
    return NextResponse.json({ error: "資料庫尚未設定。" }, { status: 503 });
  }
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
  const title = typeof input.title === "string" ? input.title.trim() : "";
  const description = typeof input.description === "string" ? input.description.trim() : null;
  if (title.length < 1 || title.length > 160 || (description && description.length > 4000)) {
    return NextResponse.json({ error: "專案名稱或說明長度不符合限制。" }, { status: 400 });
  }

  const { data, error } = await auth.supabase
    .from("projects")
    .insert({ owner_id: auth.user.id, title, description })
    .select("id,title,description,created_at,updated_at")
    .single();

  if (error) return NextResponse.json({ error: "目前無法建立專案。" }, { status: 400 });
  return NextResponse.json({ project: data }, { status: 201, headers: { "Cache-Control": "no-store" } });
}
