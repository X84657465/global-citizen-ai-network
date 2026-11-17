import { NextResponse } from "next/server";
import { getAuthenticatedClient } from "@/lib/supabase/authenticated";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CostRow = {
  cost_category: string; amount: number | string; currency: string;
  amount_kind: string; occurred_at: string; calculation_method: string | null;
};
type RequestRow = {
  provider: string; model: string; status: string;
  input_tokens: number | null; output_tokens: number | null; cached_tokens: number | null;
  provider_billed_cost: number | string | null; provider_billed_currency: string | null;
  estimated_internal_cost: number | string | null; created_at: string;
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
      .select("provider,model,status,input_tokens,output_tokens,cached_tokens,provider_billed_cost,provider_billed_currency,estimated_internal_cost,created_at")
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
  const byKindCurrency = new Map<string, number>();
  const byCategory = new Map<string, number>();
  const byProvider = new Map<string, { requests: number; inputTokens: number; outputTokens: number; estimatedCost: number; currencies: Record<string, number> }>();
  const billed = new Map<string, number>();

  for (const row of costs) {
    const amount = Number(row.amount);
    add(byKindCurrency, row.amount_kind + "|" + row.currency.trim(), amount);
    add(byCategory, row.cost_category + "|" + row.currency.trim(), amount);
  }
  for (const row of requests) {
    const key = row.provider + "|" + row.model;
    const group = byProvider.get(key) ?? { requests: 0, inputTokens: 0, outputTokens: 0, estimatedCost: 0, currencies: {} };
    group.requests += 1;
    group.inputTokens += Number(row.input_tokens ?? 0);
    group.outputTokens += Number(row.output_tokens ?? 0);
    group.estimatedCost += Number(row.estimated_internal_cost ?? 0);
    byProvider.set(key, group);
    if (row.provider_billed_cost !== null && row.provider_billed_currency) {
      add(billed, row.provider_billed_currency.trim(), Number(row.provider_billed_cost));
    }
  }

  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    window: { costLedgerRows: costs.length, requestRows: requests.length, invoiceRows: invoices.length, note: "僅彙總最近 500 筆成本與請求、最近 100 筆帳單匯入，不代表全期間總額。" },
    costByKindCurrency: [...byKindCurrency].map(([key, amount]) => {
      const [kind, currency] = key.split("|"); return { kind, currency, amount: rounded(amount) };
    }),
    costByCategory: [...byCategory].map(([key, amount]) => {
      const [category, currency] = key.split("|"); return { category, currency, amount: rounded(amount) };
    }),
    providerBilledByCurrency: [...billed].map(([currency, amount]) => ({ currency, amount: rounded(amount) })),
    providerModels: [...byProvider].map(([key, group]) => {
      const [provider, model] = key.split("|"); return { provider, model, requests: group.requests, inputTokens: group.inputTokens, outputTokens: group.outputTokens, estimatedCost: rounded(group.estimatedCost) };
    }),
    invoices: invoices.map(row => ({
      provider: row.provider, periodStart: row.billing_period_start, periodEnd: row.billing_period_end,
      currency: row.currency.trim(), total: Number(row.invoice_total), status: row.reconciliation_status, createdAt: row.created_at,
    })),
  }, { headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
}
