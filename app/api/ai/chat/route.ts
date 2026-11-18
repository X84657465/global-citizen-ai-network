import { NextResponse, type NextRequest } from "next/server";
import { getAiRuntimeConfig, estimateCostTwd } from "@/lib/ai/config";
import {
  isKnownProviderRejection,
  parseProviderResponse,
  ProviderResponseError,
  readProviderJson,
  safeProviderRequestId,
} from "@/lib/ai/provider-response";
import { shouldPreservePendingRequestKey } from "@/lib/ai/pending-retry";
import { hashPendingPrompt } from "@/lib/ai/pending-recovery";
import { isValidIdempotencyKey } from "@/lib/ai/idempotency";
import { buildAiProviderMessages } from "@/lib/ai/history";
import { readJsonBody } from "@/lib/http/read-json-body";
import { getAuthenticatedClient, isUuid } from "@/lib/supabase/authenticated";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ChatBody = { conversationId?: unknown; content?: unknown };

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

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: "AI 服務尚未完成伺服器端安全設定。" }, { status: 503 });
  }

  const admin = createAdminClient();
  const idempotencyKey = request.headers.get("Idempotency-Key")?.trim() ?? "";
  if (!isValidIdempotencyKey(idempotencyKey)) {
    return NextResponse.json({ error: "請提供有效的 Idempotency-Key（8–128 個英數字或 . _ : -）。" }, { status: 400 });
  }

  const { messages, totalCharacters: historyCharacters } = buildAiProviderMessages(
    (history ?? []) as Array<{ role: unknown; content: unknown }>,
    content,
  );

  // Calculate preflight before side effects. The RPC checks this only after
  // returning any existing completed/processing idempotency record, so safe
  // replays remain available even if pricing configuration later changes.
  const worstCaseCost = estimateCostTwd(historyCharacters + 1200, 1200, config);
  if (!Number.isFinite(worstCaseCost) || worstCaseCost < 0) {
    return NextResponse.json({ error: "無法安全估算本次請求成本，請稍後再試。", retryWithSameKey: false }, { status: 400 });
  }

  const requestHash = hashPendingPrompt(conversationId, content);
  const requestId = crypto.randomUUID();
  const { data: claimData, error: claimError } = await admin.rpc("claim_ai_request", {
    p_owner_id: auth.user.id,
    p_conversation_id: conversationId,
    p_prompt: content,
    p_idempotency_key: idempotencyKey,
    p_request_hash: requestHash,
    p_request_id: requestId,
    p_provider: "openai-compatible",
    p_model: config.model,
    p_feature: "chat",
    p_max_cost_twd: config.maxRequestCostTwd,
    p_preflight_cost_twd: worstCaseCost,
  }).single();
  const claim = claimData as {
    disposition: string;
    reason: string;
    claimed_request_id: string | null;
    cached_response: Record<string, unknown> | null;
  } | null;

  if (claimError || !claim) {
    return NextResponse.json({ error: "無法確認請求狀態，請使用相同 Idempotency-Key 重試。", retryWithSameKey: true }, { status: 503 });
  }
  if (claim.disposition === "completed" && claim.cached_response) {
    return NextResponse.json(claim.cached_response, { headers: { "Cache-Control": "no-store", "Idempotency-Replayed": "true" } });
  }
  if (claim.disposition === "processing") {
    const blockedByAnotherRequest = claim.reason === "member_has_unresolved_request";
    return NextResponse.json({
      error: blockedByAnotherRequest
        ? "你有另一個對話的 AI 請求尚未確認，為避免重複計費，請先回到原對話完成相同冪等鍵重試或等待管理員核對。"
        : "相同請求仍在處理或等待成本核對，請稍後使用相同 Idempotency-Key 查詢狀態；系統不會重複呼叫供應商。",
      retryWithSameKey: blockedByAnotherRequest ? false : shouldPreservePendingRequestKey(claim.disposition),
    }, { status: 409, headers: { "Retry-After": "2", "Cache-Control": "no-store" } });
  }
  if (claim.disposition !== "claimed" || claim.claimed_request_id !== requestId) {
    const status = claim.reason === "preflight_cost_exceeds_reservation"
      ? 413
      : claim.disposition === "conflict" ? 409 : claim.disposition === "failed" ? 502 : 429;
    const error = claim.reason === "preflight_cost_exceeds_reservation"
      ? "本次內容超過單次預算上限，請縮短內容後再試。"
      : claim.disposition === "conflict"
        ? "此冪等鍵已綁定不同內容，原請求狀態尚未確認。請恢復原始訊息並沿用原鍵，不要改用新鍵重送。"
        : claim.reason === "platform_ai_disabled"
          ? "平台 AI 服務目前暫停。"
          : "請求未通過預算、額度或冪等性檢查。";
    return NextResponse.json({
      error,
      retryWithSameKey: claim.reason === "preflight_cost_exceeds_reservation"
        ? false
        : shouldPreservePendingRequestKey(claim.disposition),
    }, { status });
  }

  const failRequest = async (code: string) => {
    const { data, error } = await admin.rpc("fail_ai_chat_request", {
      p_owner_id: auth.user.id,
      p_request_id: requestId,
      p_error_code: safeErrorCode(code),
    });
    return !error && data === true;
  };
  const markForReconciliation = async (code: string, providerRequestId: string | null = null) => {
    try {
      const { data, error } = await admin.rpc("mark_ai_request_reconciliation_required", {
        p_owner_id: auth.user.id,
        p_request_id: requestId,
        p_error_code: safeErrorCode(code),
        p_provider_request_id: providerRequestId,
      });
      return !error && data === true;
    } catch {
      return false;
    }
  };
  const failKnownOutcome = async (code: string) => {
    if (await failRequest(code)) return true;
    await markForReconciliation(`${code}_cleanup_pending`);
    return false;
  };

  const { data: startedRequest, error: startError } = await admin
    .from("ai_requests")
    .update({
      conversation_id: conversationId,
      status: "running",
      started_at: new Date().toISOString(),
      error_code: null,
    })
    .eq("id", requestId)
    .eq("owner_id", auth.user.id)
    .eq("status", "queued")
    .select("id")
    .maybeSingle();

  if (startError || !startedRequest) {
    const failed = await failKnownOutcome("request_start_failed");
    return NextResponse.json({ error: "無法啟動 AI 請求，預算保留已安全處理。", retryWithSameKey: !failed }, { status: 503 });
  }

  const startedAt = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.timeoutMs);
  let providerRequestId: string | null = null;

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
      redirect: "error",
    });

    providerRequestId = safeProviderRequestId(
      response.headers.get("x-request-id") ?? response.headers.get("request-id"),
    );

    if (!response.ok) {
      try {
        await response.body?.cancel();
      } catch {
        // Best-effort cleanup; the HTTP status still determines the outcome classification.
      }
      const code = `provider_http_${response.status}`;
      if (!isKnownProviderRejection(response.status)) {
        await markForReconciliation(code, providerRequestId);
        return NextResponse.json({ error: "AI 供應商回應不確定，預算暫時保留，請稍後查看營運核對狀態。", retryWithSameKey: true }, { status: 502 });
      }
      const failed = await failKnownOutcome(code);
      return NextResponse.json({ error: "AI 服務拒絕本次請求，預算保留已釋放。", retryWithSameKey: !failed }, { status: 502 });
    }

    const providerPayload = await readProviderJson(response);
    const providerResult = parseProviderResponse(providerPayload, historyCharacters);
    providerRequestId = providerResult.providerRequestId ?? providerRequestId;

    const estimatedActualCost = estimateCostTwd(
      providerResult.inputTokens,
      providerResult.outputTokens,
      config,
    );
    if (!Number.isFinite(estimatedActualCost) || estimatedActualCost < 0) {
      throw new ProviderResponseError("invalid_estimated_cost");
    }

    const latencyMs = Date.now() - startedAt;
    const costMethod = providerResult.usageSource === "provider"
      ? "configured_token_rates_provider_usage_internal_estimate"
      : providerResult.usageSource === "provider_partial_with_fallback"
        ? "configured_token_rates_partial_provider_usage_internal_estimate"
        : "configured_token_rates_conservative_character_fallback_internal_estimate";

    const payload = {
      requestId,
      answer: providerResult.answer,
      usage: {
        inputTokens: providerResult.inputTokens,
        outputTokens: providerResult.outputTokens,
        cachedTokens: providerResult.cachedTokens,
        estimatedCostTwd: estimatedActualCost,
      },
      costLabel: "依管理員設定的每百萬 Token 成本估算，非供應商發票金額",
    };

    const { data: completed, error: completionError } = await admin.rpc("complete_ai_chat_request", {
      p_owner_id: auth.user.id,
      p_request_id: requestId,
      p_conversation_id: conversationId,
      p_answer: providerResult.answer,
      p_model: config.model,
      p_input_tokens: providerResult.inputTokens,
      p_output_tokens: providerResult.outputTokens,
      p_cached_tokens: providerResult.cachedTokens,
      p_estimated_cost_twd: estimatedActualCost,
      p_provider_request_id: providerRequestId,
      p_latency_ms: latencyMs,
      p_cost_method: costMethod,
      p_response: payload,
    });

    if (completionError || completed !== true) {
      await markForReconciliation("provider_succeeded_finalize_pending", providerRequestId);
      return NextResponse.json({ error: "AI 已產生回應，但資料庫尚未完成原子結算，預算已保留並列入管理員核對。", retryWithSameKey: true }, { status: 503 });
    }

    return NextResponse.json(payload, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const code = error instanceof ProviderResponseError
      ? error.code
      : error instanceof Error && error.name === "AbortError"
        ? "provider_timeout_outcome_unknown"
        : "provider_transport_or_response_unknown";
    await markForReconciliation(code, providerRequestId);
    return NextResponse.json({ error: "AI 請求結果尚未能安全確認，預算暫時保留並列入管理員核對，請勿更換 Idempotency-Key 重送。", retryWithSameKey: true }, { status: 502 });
  } finally {
    clearTimeout(timeout);
  }
}
