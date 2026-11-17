import { NextResponse, type NextRequest } from "next/server";
import { getAiRuntimeConfig, estimateCostTwd } from "@/lib/ai/config";
import { readJsonBody } from "@/lib/http/read-json-body";
import { getAuthenticatedClient, isUuid } from "@/lib/supabase/authenticated";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ChatBody = { conversationId?: unknown; content?: unknown };
type ProviderResponse = {
  id?: string;
  choices?: Array<{ message?: { content?: string | Array<{ type?: string; text?: string }> } }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    prompt_tokens_details?: { cached_tokens?: number };
  };
};

function safeErrorCode(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9_]/g, "_").slice(0, 80) || "provider_failed";
}

export async function POST(request: NextRequest) {
  const auth = await getAuthenticatedClient();
  if (!auth) return NextResponse.json({ error: "請先登入或完成資料庫設定。" }, { status: 401 });

  const config = getAiRuntimeConfig();
  if (!config) {
    return NextResponse.json(
      { error: "AI 服務尚未完成安全設定，目前不會發出任何付費 AI 請求。" },
      { status: 503 },
    );
  }

  const parsed = await readJsonBody(request, 32768);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.status === 413 ? "請求內容超過大小限制。" : "請提供有效的 JSON。" }, { status: parsed.status });
  }
  if (!parsed.value || typeof parsed.value !== "object" || Array.isArray(parsed.value)) {
    return NextResponse.json({ error: "請提供有效的對話內容。" }, { status: 400 });
  }

  const body = parsed.value as ChatBody;
  const conversationId = typeof body.conversationId === "string" ? body.conversationId : "";
  const content = typeof body.content === "string" ? body.content.trim() : "";
  if (!isUuid(conversationId) || content.length < 1 || content.length > 8000) {
    return NextResponse.json({ error: "對話識別碼或訊息長度不正確。" }, { status: 400 });
  }

  const { data: conversation, error: conversationError } = await auth.supabase
    .from("conversations")
    .select("id")
    .eq("id", conversationId)
    .maybeSingle();
  if (conversationError || !conversation) {
    return NextResponse.json({ error: "找不到這個對話，或你沒有存取權限。" }, { status: 404 });
  }

  const { data: history, error: historyError } = await auth.supabase
    .from("messages")
    .select("role,content")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .limit(20);
  if (historyError) return NextResponse.json({ error: "目前無法讀取對話紀錄。" }, { status: 500 });

  const admin = createAdminClient();
  const requestId = crypto.randomUUID();
  const { data: reservation, error: reserveError } = await admin.rpc("reserve_ai_budget", {
    p_request_id: requestId,
    p_owner_id: auth.user.id,
    p_provider: "openai-compatible",
    p_model: config.model,
    p_feature: "chat",
    p_max_cost_twd: config.maxRequestCostTwd,
  }).single();

  if (reserveError || !reservation?.allowed) {
    return NextResponse.json(
      { error: reservation?.reason === "platform_ai_disabled" ? "平台 AI 服務目前暫停。" : "目前未通過 AI 預算或使用額度檢查。" },
      { status: 429 },
    );
  }

  const { error: linkError } = await admin
    .from("ai_requests")
    .update({ conversation_id: conversationId })
    .eq("id", requestId);
  if (linkError) {
    await admin.rpc("release_ai_budget", { p_request_id: requestId, p_error_code: "request_link_failed" });
    return NextResponse.json({ error: "無法建立 AI 請求紀錄。" }, { status: 500 });
  }

  const { error: userMessageError } = await auth.supabase
    .from("messages")
    .insert({ conversation_id: conversationId, owner_id: auth.user.id, role: "user", content });
  if (userMessageError) {
    await admin.rpc("release_ai_budget", { p_request_id: requestId, p_error_code: "message_persist_failed" });
    return NextResponse.json({ error: "訊息儲存失敗，未呼叫 AI。" }, { status: 500 });
  }

  const messages = [
    ...(history ?? []).reverse().map((item) => ({
      role: item.role === "assistant" ? "assistant" : "user",
      content: item.content,
    })),
    { role: "user", content },
  ];
  const startedAt = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.timeoutMs);

  try {
    const response = await fetch(`${config.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: config.model,
        messages,
        max_tokens: 1200,
        temperature: 0.4,
      }),
      signal: controller.signal,
      cache: "no-store",
    });

    if (!response.ok) {
      const code = `provider_http_${response.status}`;
      await admin.rpc("release_ai_budget", { p_request_id: requestId, p_error_code: code });
      return NextResponse.json({ error: "AI 服務目前無法完成請求，預算保留已釋放。" }, { status: 502 });
    }

    const result = (await response.json()) as ProviderResponse;
    const rawContent = result.choices?.[0]?.message?.content;
    const answer = typeof rawContent === "string"
      ? rawContent
      : Array.isArray(rawContent)
        ? rawContent.map((part) => part.text ?? "").join("")
        : "";
    if (!answer.trim()) {
      await admin.rpc("release_ai_budget", { p_request_id: requestId, p_error_code: "empty_provider_response" });
      return NextResponse.json({ error: "AI 沒有回傳可用內容，預算保留已釋放。" }, { status: 502 });
    }

    const inputTokens = Math.max(0, Math.trunc(result.usage?.prompt_tokens ?? 0));
    const outputTokens = Math.max(0, Math.trunc(result.usage?.completion_tokens ?? 0));
    const cachedTokens = Math.max(0, Math.trunc(result.usage?.prompt_tokens_details?.cached_tokens ?? 0));
    const estimatedActualCost = estimateCostTwd(inputTokens, outputTokens, config);
    const latencyMs = Date.now() - startedAt;

    const { data: finalized, error: finalizeError } = await admin.rpc("finalize_ai_budget", {
      p_request_id: requestId,
      p_actual_cost_twd: estimatedActualCost,
      p_provider_billed_cost: null,
      p_provider_billed_currency: null,
      p_input_tokens: inputTokens,
      p_output_tokens: outputTokens,
      p_cached_tokens: cachedTokens,
      p_provider_request_id: result.id ?? null,
      p_latency_ms: latencyMs,
    });

    if (finalizeError || finalized !== true) {
      return NextResponse.json({ error: "AI 回應已產生，但成本結算未完成，系統已阻止回傳並標記需管理員核對。" }, { status: 503 });
    }

    const { error: assistantMessageError } = await admin.from("messages").insert({
      conversation_id: conversationId,
      owner_id: auth.user.id,
      role: "assistant",
      content: answer,
      model: config.model,
      token_input: inputTokens,
      token_output: outputTokens,
    });
    if (assistantMessageError) {
      return NextResponse.json({ error: "AI 已完成並結算，但訊息保存失敗，請稍後查看請求紀錄。" }, { status: 500 });
    }

    if (estimatedActualCost > 0) {
      await admin.from("ai_cost_ledger").insert({
        request_id: requestId,
        owner_id: auth.user.id,
        cost_category: "model_provider",
        amount: estimatedActualCost,
        currency: "TWD",
        amount_kind: "internal_estimate",
        calculation_method: "configured_twd_per_million_tokens",
      });
    }

    return NextResponse.json({
      requestId,
      answer,
      usage: { inputTokens, outputTokens, cachedTokens, estimatedCostTwd: estimatedActualCost },
      costLabel: "依管理員設定的每百萬 Token 成本估算，非供應商發票金額",
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const code = error instanceof Error && error.name === "AbortError" ? "provider_timeout" : safeErrorCode(error instanceof Error ? error.message : "provider_failed");
    await admin.rpc("release_ai_budget", { p_request_id: requestId, p_error_code: code });
    return NextResponse.json({ error: "AI 服務發生錯誤，預算保留已釋放。" }, { status: 502 });
  } finally {
    clearTimeout(timeout);
  }
}
