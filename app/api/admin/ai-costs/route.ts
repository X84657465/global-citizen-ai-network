import { NextResponse } from "next/server";
import { getAuthenticatedClient } from "@/lib/supabase/authenticated";
import { createAdminClient } from "@/lib/supabase/admin";
import { parseProviderInvoiceCsv, parseProviderInvoicePreviewPayload, previewProviderInvoiceReconciliation } from "@/lib/ai-cost-reconciliation.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CostRow = {
  cost_category: string; amount: number | string; currency: string;
  amount_kind: string; occurred_at: string; calculation_method: string | null;
};
type RequestRow = {
  id: string; provider: string; model: string; status: string;
  input_tokens: number | null; output_tokens: number | null; cached_tokens: number | null;
  provider_billed_cost: number | string | null; provider_billed_currency: string | null;
  created_at: string;
};
type InvoiceRow = {
  provider: string; billing_period_start: string; billing_period_end: string;
  currency: string; invoice_total: number | string; reconciliation_status: string; created_at: string;
};

function add(map: Map<string, number>, key: string, value: number) {
  map.set(key, (map.get(key) ?? 0) + value);
}
function rounded(value: number) { return Number(value.toFixed(8)); }

export async function GET() {
  const auth = await getAuthenticatedClient();
  if (!auth) return NextResponse.json({ error: "請先登入。" }, { status: 401 });
  const { data: profile, error: profileError } = await auth.supabase.from("profiles")
    .select("role,account_status").eq("id", auth.user.id).maybeSingle();
  if (profileError) return NextResponse.json({ error: "無法驗證管理員權限。" }, { status: 503 });
  if (!profile || profile.role !== "admin" || profile.account_status !== "active") {
    return NextResponse.json({ error: "只有有效管理員可以查看平台成本。" }, { status: 403 });
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: "伺服器尚未設定管理端資料庫金鑰。" }, { status: 503 });
  }

  const admin = createAdminClient();
  const [costResult, requestResult, invoiceResult] = await Promise.all([
    admin.from("ai_cost_ledger")
      .select("cost_category,amount,currency,amount_kind,occurred_at,calculation_method")
      .order("occurred_at", { ascending: false }).limit(500),
    admin.from("ai_requests")
      .select("id,provider,model,status,input_tokens,output_tokens,cached_tokens,provider_billed_cost,provider_billed_currency,created_at")
      .order("created_at", { ascending: false }).limit(500),
    admin.from("provider_invoice_imports")
      .select("provider,billing_period_start,billing_period_end,currency,invoice_total,reconciliation_status,created_at")
      .order("created_at", { ascending: false }).limit(100),
  ]);
  if (costResult.error || requestResult.error || invoiceResult.error) {
    return NextResponse.json({ error: "成本資料讀取失敗，請確認資料庫 Migration 與權限。" }, { status: 503 });
  }

  const costs = (costResult.data ?? []) as CostRow[];
  const requests = (requestResult.data ?? []) as RequestRow[];
  const invoices = (invoiceResult.data ?? []) as InvoiceRow[];
  const requestIds = requests.map(row => row.id);
  const requestCostResult = requestIds.length > 0
    ? await admin.from("ai_cost_ledger")
        .select("request_id,amount")
        .in("request_id", requestIds)
        .eq("cost_category", "model_provider")
        .eq("amount_kind", "internal_estimate")
        .limit(500)
    : { data: [], error: null };
  if (requestCostResult.error) {
    return NextResponse.json({ error: "AI 請求成本帳本讀取失敗。" }, { status: 503 });
  }

  const estimateByRequest = new Map<string, number>();
  for (const row of requestCostResult.data ?? []) {
    if (row.request_id) add(estimateByRequest, row.request_id, Number(row.amount));
  }

  const byKindCurrency = new Map<string, number>();
  const byCategory = new Map<string, number>();
  const byProvider = new Map<string, { requests: number; inputTokens: number; outputTokens: number; estimatedCost: number; unpricedRequests: number }>();
  const billed = new Map<string, number>();

  for (const row of costs) {
    const amount = Number(row.amount);
    add(byKindCurrency, row.amount_kind + "|" + row.currency.trim(), amount);
    add(byCategory, row.cost_category + "|" + row.currency.trim(), amount);
  }
  for (const row of requests) {
    const key = row.provider + "|" + row.model;
    const group = byProvider.get(key) ?? { requests: 0, inputTokens: 0, outputTokens: 0, estimatedCost: 0, unpricedRequests: 0 };
    group.requests += 1;
    group.inputTokens += Number(row.input_tokens ?? 0);
    group.outputTokens += Number(row.output_tokens ?? 0);
    const ledgerEstimate = estimateByRequest.get(row.id);
    if (ledgerEstimate === undefined) {
      if (row.status === "succeeded") group.unpricedRequests += 1;
    } else {
      group.estimatedCost += ledgerEstimate;
    }
    byProvider.set(key, group);
    if (row.provider_billed_cost !== null && row.provider_billed_currency) {
      add(billed, row.provider_billed_currency.trim(), Number(row.provider_billed_cost));
    }
  }

  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    window: { costLedgerRows: costs.length, requestRows: requests.length, invoiceRows: invoices.length, note: "僅彙總最近 500 筆成本與請求、最近 100 筆帳單匯入，不代表全期間總額；模型成本只採用有對應 internal_estimate 帳本的請求，成功但沒有帳本的舊請求不以預留上限冒充成本。" },
    costByKindCurrency: [...byKindCurrency].map(([key, amount]) => {
      const [kind, currency] = key.split("|"); return { kind, currency, amount: rounded(amount) };
    }),
    costByCategory: [...byCategory].map(([key, amount]) => {
      const [category, currency] = key.split("|"); return { category, currency, amount: rounded(amount) };
    }),
    providerBilledByCurrency: [...billed].map(([currency, amount]) => ({ currency, amount: rounded(amount) })),
    providerModels: [...byProvider].map(([key, group]) => {
      const [provider, model] = key.split("|"); return { provider, model, requests: group.requests, inputTokens: group.inputTokens, outputTokens: group.outputTokens, estimatedCost: rounded(group.estimatedCost), unpricedRequests: group.unpricedRequests };
    }),
    invoices: invoices.map(row => ({
      provider: row.provider, periodStart: row.billing_period_start, periodEnd: row.billing_period_end,
      currency: row.currency.trim(), total: Number(row.invoice_total), status: row.reconciliation_status, createdAt: row.created_at,
    })),
  }, { headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
}


export async function POST(request: Request) {
  const auth = await getAuthenticatedClient();
  if (!auth) return NextResponse.json({ error: "請先登入。" }, { status: 401 });
  const { data: profile, error: profileError } = await auth.supabase.from("profiles")
    .select("role,account_status").eq("id", auth.user.id).maybeSingle();
  if (profileError) return NextResponse.json({ error: "無法驗證管理員權限。" }, { status: 503 });
  if (!profile || profile.role !== "admin" || profile.account_status !== "active") {
    return NextResponse.json({ error: "只有有效管理員可以預覽供應商帳單。" }, { status: 403 });
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: "伺服器尚未設定管理端資料庫金鑰。" }, { status: 503 });
  }

  const declaredLength = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(declaredLength) && declaredLength > 1_100_000) {
    return NextResponse.json({ error: "上傳內容不可超過 1 MB。" }, { status: 413 });
  }
  let payload: unknown;
  try {
    const reader = request.body?.getReader();
    if (!reader) return NextResponse.json({ error: "缺少上傳內容。" }, { status: 400 });
    const chunks: Uint8Array[] = [];
    let total = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > 1_100_000) {
        await reader.cancel();
        return NextResponse.json({ error: "上傳內容不可超過 1 MB。" }, { status: 413 });
      }
      chunks.push(value);
    }
    const bytes = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    payload = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  } catch {
    return NextResponse.json({ error: "請提供有效的 UTF-8 JSON 與 CSV 文字。" }, { status: 400 });
  }
  let invoicePayload;
  try {
    invoicePayload = parseProviderInvoicePreviewPayload(payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : "預覽內容格式錯誤。";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  let parsed;
  let preview;
  try {
    parsed = parseProviderInvoiceCsv(invoicePayload.csv);
    const starts = parsed.rows.map((row) => row.billingPeriodStart).sort();
    const ends = parsed.rows.map((row) => row.billingPeriodEnd).sort();
    const startAt = starts[0] + "T00:00:00.000Z";
    const endAt = ends[ends.length - 1] + "T23:59:59.999Z";
    const admin = createAdminClient();
    const { data: requests, error } = await admin.from("ai_requests")
      .select("id,provider,model,provider_request_id,created_at,provider_billed_cost,provider_billed_currency")
      .gte("created_at", startAt).lte("created_at", endAt)
      .not("provider_request_id", "is", null)
      .order("created_at", { ascending: true }).limit(5001);
    if (error) return NextResponse.json({ error: "AI 請求證據讀取失敗，無法安全產生預覽。" }, { status: 503 });
    if ((requests ?? []).length > 5000) {
      return NextResponse.json({ error: "指定帳單期間涵蓋超過 5,000 筆請求；請縮小期間後重新預覽。" }, { status: 413 });
    }
    const fx = invoicePayload.fxConversion && typeof invoicePayload.fxConversion === "object"
      ? invoicePayload.fxConversion as { fromCurrency?: string; toCurrency?: string; rate?: number; timestamp?: string }
      : null;
    preview = previewProviderInvoiceReconciliation(parsed, requests ?? [], fx);
  } catch (error) {
    const message = error instanceof Error ? error.message : "CSV 預覽失敗。";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  return NextResponse.json(
    { preview, note: "唯讀預覽；不會寫入帳本、保存發票、調整預算或執行付款。" },
    { headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } },
  );
}
