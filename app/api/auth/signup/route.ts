import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { readJsonBody } from "@/lib/http/read-json-body";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  // Server-side gate. The Supabase dashboard must also keep public sign-ups
  // disabled until legal, abuse-prevention, and support controls are ready.
  if (process.env.ENABLE_PUBLIC_SIGNUP !== "true") {
    return NextResponse.json(
      { error: "公開註冊尚未開放。" },
      { status: 403, headers: { "Cache-Control": "no-store" } }
    );
  }

  const parsed = await readJsonBody(request, 4096);
  if (!parsed.ok) {
    return NextResponse.json(
      { error: parsed.status === 413 ? "註冊資料超過允許大小。" : "請提供有效的註冊資料。" },
      { status: parsed.status, headers: { "Cache-Control": "no-store" } }
    );
  }
  const body = parsed.value;

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "請提供有效的註冊資料。" }, { status: 400 });
  }

  const input = body as { email?: unknown; password?: unknown };
  const email = typeof input.email === "string" ? input.email.trim().toLowerCase() : "";
  const password = typeof input.password === "string" ? input.password : "";

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    return NextResponse.json({ error: "電子郵件格式不正確。" }, { status: 400 });
  }
  if (password.length < 12 || password.length > 128) {
    return NextResponse.json({ error: "密碼長度須介於 12 至 128 個字元。" }, { status: 400 });
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: new URL("/auth/callback", request.url).toString(),
      },
    });

    if (error) {
      return NextResponse.json(
        { error: "目前無法完成註冊，請確認資料或稍後再試。" },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }

    return NextResponse.json(
      { accepted: true, message: "請依照驗證郵件完成電子郵件確認。" },
      { status: 202, headers: { "Cache-Control": "no-store" } }
    );
  } catch {
    return NextResponse.json(
      { error: "會員服務尚未正確設定。" },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }
}
