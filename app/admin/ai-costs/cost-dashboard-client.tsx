"use client";

import Link from "next/link";
import { useEffect, useState, type CSSProperties } from "react";

type CostItem = { kind: string; currency: string; amount: number };
type CategoryItem = { category: string; currency: string; amount: number };
type ProviderModel = { provider: string; model: string; requests: number; inputTokens: number; outputTokens: number; estimatedCost: number; unpricedRequests: number };
type Invoice = { provider: string; periodStart: string; periodEnd: string; currency: string; total: number; status: string; createdAt: string };
type Data = {
  generatedAt?: string;
  providerBilledByCurrency?: { currency: string; amount: number }[];
  window?: { costLedgerRows: number; requestRows: number; invoiceRows: number; note: string };
  costByKindCurrency?: CostItem[];
  costByCategory?: CategoryItem[];
  providerModels?: ProviderModel[];
  invoices?: Invoice[];
  error?: string;
};
const panel: CSSProperties = { background: "#fff", border: "1px solid #e1e7ef", borderRadius: 14, padding: 18 };
function money(value: number, currency: string) { return new Intl.NumberFormat("zh-TW", { style: "currency", currency, maximumFractionDigits: 4 }).format(value); }
const kindLabel: Record<string,string> = { actual_invoice: "已核實發票", estimated_allocation: "分攤估算", internal_estimate: "內部成本估算" };
const statusLabel: Record<string,string> = { pending: "待對帳", matched: "已匹配", variance: "有差異", rejected: "已拒絕" };

export default function AiCostDashboardClient() {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  async function load() {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/ai-costs", { cache: "no-store" });
      const result = await response.json() as Data;
      if (!response.ok) throw new Error(result.error ?? "成本資料讀取失敗。");
      setData(result); setError("");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "讀取失敗。"); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);

  return <main style={{ minHeight: "100vh", background: "#f4f7fb", color: "#17263b", padding: "30px 16px" }}>
    <section style={{ maxWidth: 1120, margin: "0 auto" }}>
      <Link href="/account" style={{ color: "#315d91", textDecoration: "none", fontSize: 13 }}>← 會員帳戶</Link>
      <p style={{ color: "#64748b", fontSize: 11, letterSpacing: 1.5, fontWeight: 700, marginTop: 24 }}>COST TRANSPARENCY</p>
      <h1 style={{ fontSize: 29, margin: "8px 0" }}>AI 成本透明中心</h1>
      <p style={{ color: "#64748b", fontSize: 13, lineHeight: 1.8 }}>分開呈現供應商帳單金額、內部成本估算及成本分攤，不將不同幣別直接相加，也不把估算誤稱為實際發票。</p>
      {error && <p role="alert" style={{ color: "#b42318", background: "#fff1f0", borderRadius: 9, padding: 12, fontSize: 12 }}>{error}</p>}
      {loading ? <p style={{ color: "#64748b" }}>載入成本資料…</p> : data && <>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(210px,1fr))", gap: 12, margin: "18px 0" }}>
          <div style={panel}><span style={{ color: "#64748b", fontSize: 12 }}>成本帳本筆數</span><strong style={{ display: "block", fontSize: 28, marginTop: 8 }}>{data.window?.costLedgerRows ?? 0}</strong></div>
          <div style={panel}><span style={{ color: "#64748b", fontSize: 12 }}>AI 請求筆數</span><strong style={{ display: "block", fontSize: 28, marginTop: 8 }}>{data.window?.requestRows ?? 0}</strong></div>
          <div style={panel}><span style={{ color: "#64748b", fontSize: 12 }}>供應商帳單匯入</span><strong style={{ display: "block", fontSize: 28, marginTop: 8 }}>{data.window?.invoiceRows ?? 0}</strong></div>
        </div>
        <section style={{ ...panel, marginBottom: 14 }}>
          <h2 style={{ fontSize: 16, margin: "0 0 12px" }}>成本性質（依幣別分開）</h2>
          {(data.costByKindCurrency ?? []).length === 0 ? <p style={{ color: "#8793a5", fontSize: 12 }}>目前尚無成本紀錄。</p> :
            <div style={{ display: "grid", gap: 9 }}>{data.costByKindCurrency!.map(item => <div key={item.kind+item.currency} style={{ display: "flex", justifyContent: "space-between", gap: 10, borderTop: "1px solid #edf1f5", paddingTop: 9 }}><span style={{ fontSize: 12 }}>{kindLabel[item.kind] ?? item.kind} · {item.currency}</span><strong style={{ fontSize: 13 }}>{money(item.amount,item.currency)}</strong></div>)}</div>}
          <p style={{ color: "#8793a5", fontSize: 10, lineHeight: 1.7, marginBottom: 0 }}>供應商帳單實際金額以發票匯入與對帳結果為準，內部估算不代表供應商請款金額。</p>
        </section>
        <section style={{ ...panel, marginBottom: 14 }}>
          <h2 style={{ fontSize: 16, margin: "0 0 12px" }}>供應商回報成本（依幣別）</h2>
          {(data.providerBilledByCurrency ?? []).length === 0 ? <p style={{ color: "#8793a5", fontSize: 12 }}>目前沒有供應商回報的實際成本數據。</p> :
            <div style={{ display: "grid", gap: 8 }}>{data.providerBilledByCurrency!.map(item => <div key={item.currency} style={{ display: "flex", justifyContent: "space-between", gap: 10, borderTop: "1px solid #edf1f5", paddingTop: 8 }}><span style={{ fontSize: 12 }}>供應商回報 · {item.currency}</span><strong style={{ fontSize: 12 }}>{money(item.amount,item.currency)}</strong></div>)}</div>}
          <p style={{ color: "#8793a5", fontSize: 10, marginBottom: 0 }}>此數據來自 API 使用量回報，不一定等於供應商最終發票金額。</p>
        </section>
        <section style={{ ...panel, marginBottom: 14 }}>
          <h2 style={{ fontSize: 16, margin: "0 0 12px" }}>成本分類</h2>
          {(data.costByCategory ?? []).length === 0 ? <p style={{ color: "#8793a5", fontSize: 12 }}>目前尚無分類成本。</p> :
            <div style={{ display: "grid", gap: 8 }}>{data.costByCategory!.map(item => <div key={item.category+item.currency} style={{ display: "flex", justifyContent: "space-between", gap: 10, borderTop: "1px solid #edf1f5", paddingTop: 8 }}><span style={{ fontSize: 12 }}>{item.category} · {item.currency}</span><strong style={{ fontSize: 12 }}>{money(item.amount,item.currency)}</strong></div>)}</div>}
        </section>
        <section style={{ ...panel, marginBottom: 14 }}>
          <h2 style={{ fontSize: 16, margin: "0 0 12px" }}>模型使用情況</h2>
          {(data.providerModels ?? []).length === 0 ? <p style={{ color: "#8793a5", fontSize: 12 }}>目前尚無 AI 請求紀錄。</p> :
            <div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse", minWidth: 650, fontSize: 11 }}><thead><tr style={{ textAlign: "left", color: "#64748b" }}>{["供應商","模型","請求","輸入 Token","輸出 Token","內部估算成本","成功但未有成本帳本"].map(x=><th key={x} style={{ padding: 9 }}>{x}</th>)}</tr></thead><tbody>{data.providerModels!.map(row=><tr key={row.provider+row.model} style={{ borderTop: "1px solid #edf1f5" }}><td style={{ padding: 9 }}>{row.provider}</td><td style={{ padding: 9 }}>{row.model}</td><td style={{ padding: 9 }}>{row.requests}</td><td style={{ padding: 9 }}>{row.inputTokens.toLocaleString("en-US")}</td><td style={{ padding: 9 }}>{row.outputTokens.toLocaleString("en-US")}</td><td style={{ padding: 9 }}>{row.estimatedCost.toFixed(6)} TWD*</td><td style={{ padding: 9 }}>{row.unpricedRequests}</td></tr>)}</tbody></table></div>}
        </section>
        <section style={{ ...panel, marginBottom: 14 }}>
          <h2 style={{ fontSize: 16, margin: "0 0 12px" }}>供應商帳單紀錄</h2>
          {(data.invoices ?? []).length === 0 ? <p style={{ color: "#8793a5", fontSize: 12 }}>尚未匯入供應商發票。</p> :
            <div style={{ display: "grid", gap: 9 }}>{data.invoices!.map((row,i)=><div key={row.provider+row.periodStart+i} style={{ borderTop: "1px solid #edf1f5", paddingTop: 9, display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}><div><strong style={{ fontSize: 12 }}>{row.provider}</strong><p style={{ color: "#64748b", fontSize: 10, margin: "4px 0" }}>{row.periodStart} – {row.periodEnd} · {statusLabel[row.status] ?? row.status}</p></div><strong style={{ fontSize: 12 }}>{money(row.total,row.currency)}</strong></div>)}</div>}
        </section>
        <p style={{ color: "#8793a5", fontSize: 10, lineHeight: 1.7 }}>{data.window?.note} · 舊版成功請求若缺少成本帳本，會列入「成功但未有成本帳本」，不會將預算預留上限當作實際成本估算。 · 資料更新：{data.generatedAt ? new Date(data.generatedAt).toLocaleString("zh-TW") : "—"}</p>
        <button type="button" onClick={() => void load()} disabled={loading} style={{ border: 0, borderRadius: 9, background: "#315d91", color: "#fff", padding: "10px 16px", fontWeight: 700 }}>{loading ? "更新中…" : "重新整理"}</button>
      </>}
    </section>
  </main>;
}
