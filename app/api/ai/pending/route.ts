import { NextResponse } from "next/server";
import { getAuthenticatedClient } from "@/lib/supabase/authenticated";
import { createAdminClient } from "@/lib/supabase/admin";
import { findOriginalPendingMessage } from "@/lib/ai/pending-recovery";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Recover the member's own unresolved request after a tab/browser session is lost.
// The idempotency key is returned only to its authenticated owner and is never logged.
export async function GET() {
  const auth = await getAuthenticatedClient();
  if (!auth) return NextResponse.json({ error: "請先登入。" }, { status: 401, headers: { "Cache-Control": "no-store" } });

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: "AI 請求狀態暫時無法讀取。" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }

  const admin = createAdminClient();
  const { data: requests, error: requestError } = await admin
    .from("ai_requests")
    .select("id,conversation_id,status,created_at")
    .eq("owner_id", auth.user.id)
    .in("status", ["queued", "running"])
    .order("created_at", { ascending: true })
    .limit(1);

  if (requestError) {
    return NextResponse.json({ error: "AI 請求狀態暫時無法讀取。" }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }

  const pending = requests?.[0];
  if (!pending) {
    return NextResponse.json({ pending: null, unresolved: false }, { headers: { "Cache-Control": "no-store" } });
  }
  if (!pending.conversation_id) {
    return NextResponse.json({ pending: null, unresolved: true, recoverable: false }, { headers: { "Cache-Control": "no-store" } });
  }

  const [{ data: idempotency, error: idempotencyError }, { data: lastMessages, error: messageError }] = await Promise.all([
    admin.from("ai_request_idempotency")
      .select("idempotency_key,request_hash")
      .eq("owner_id", auth.user.id)
      .eq("request_id", pending.id)
      .eq("state", "processing")
      .maybeSingle(),
    admin.from("messages")
      .select("role,content")
      .eq("conversation_id", pending.conversation_id)
      .eq("owner_id", auth.user.id)
      .eq("role", "user")
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  if (idempotencyError || messageError) {
    return NextResponse.json({ error: "AI 請求狀態暫時無法讀取。" }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }

  const originalMessage = findOriginalPendingMessage(
    lastMessages ?? [],
    pending.conversation_id,
    idempotency?.request_hash,
  );
  if (!idempotency?.idempotency_key || !/^[A-Za-z0-9._:-]{8,128}$/.test(idempotency.idempotency_key)
      || !idempotency.request_hash || !originalMessage) {
    return NextResponse.json({ pending: null, unresolved: true, recoverable: false }, { headers: { "Cache-Control": "no-store" } });
  }

  return NextResponse.json({
    unresolved: true,
    pending: {
      conversationId: pending.conversation_id,
      idempotencyKey: idempotency.idempotency_key,
      content: originalMessage.content,
      status: pending.status,
    },
  }, { headers: { "Cache-Control": "no-store" } });
}
