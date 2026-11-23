"use client";

import Link from "next/link";
import { useEffect, useState, type CSSProperties } from "react";

type CostItem = { kind: string; currency: string; amount: number };
type CategoryItem = { category: string; currency: string; amount: number };
type ProviderModel = { provider: string; model: string; requests: number; inputTokens: number; outputTokens: number; estimatedCost: number; unpricedRequests: number };
type Invoice = { provider: string; periodStart: string; periodEnd: string; currency: string; total: number; status: string; createdAt: string };
type InvoicePreviewRow = { rowNumber: number; provider: string; model: string; sourceReference: string; currency: string; rawAmount: string; disposition: string; match: { requestId: string; evidence: string } | null; normalizedTwd: { amount: number; rate: number; timestamp: string } | null };
type InvoicePreview = { sourceFingerprint: string; rowCount: number; counts: Record<string, number>; rows: InvoicePreviewRow[] };
type StaleRequest = { requestId: string; ownerId: string; provider: string; model: string; status: string; createdAt: string; reservationStatus: string; reservedAmount: number; actualCost: number | null; idempotencyState: string | null; providerRequestId: string | null };
type Data = {
  generatedAt?: string;
  providerBilledByCurrency?: { currency: string; amount: number }[];
  window?: { costLedgerRows: number; requestRows: number; invoiceRows: number; note: string };
  costByKindCurrency?: CostItem[];
  costByCategory?: CategoryItem[];
  providerModels?: ProviderModel[];
  invoices?: Invoice[];
  error?: string;
  reconciliation?: { generatedAt: string; olderThanSeconds: number; requests: StaleRequest[] };
  reconciliationError?: string;
};
const panel: CSSProperties = { background: "#fff", border: "1px solid #e1e7ef", borderRadius: 14, padding: 18 };
function money(value: number, currency: string) { return new Intl.NumberFormat("zh-TW", { style: "currency", currency, maximumFractionDigits: 4 }).format(value); }
const kindLabel: Record<string,string> = { actual_invoice: "已核實發票", estimated_allocation: "分攤估算", internal_estimate: "內部成本估算" };
const statusLabel: Record<string,string> = { pending: "待對帳", matched: "已匹配", variance: "有差異", rejected: "已拒絕" };
const invoiceDispositionLabel: Record<string, string> = { matched_actual: "已匹配", variance: "有差異", unmatched_estimate: "未匹配", duplicate_row: "重複列", duplicate_reference: "重複參照" };

export default function AiCostDashboardClient() {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [invoiceCsv, setInvoiceCsv] = useState("");
  const [invoicePreview, setInvoicePreview] = useState<InvoicePreview | null>(null);
  const [seenInvoiceFingerprints, setSeenInvoiceFingerprints] = useState<string[]>([]);
  const [invoiceDuplicateFile, setInvoiceDuplicateFile] = useState(false);
  const [invoiceError, setInvoiceError] = useState("");
  const [invoiceLoading, setInvoiceLoading] = useState(false);
  const [fxCurrency, setFxCurrency] = useState("USD");
  const [fxRate, setFxRate] = useState("");
  const [fxTimestamp, setFxTimestamp] = useState("");
  async function loadInvoiceFile(file: File | undefined) {
    setInvoiceError(""); setInvoicePreview(null); setInvoiceDuplicateFile(false);
    if (!file) return;
    if (file.size > 1_000_000) { setInvoiceError("CSV 檔案不可超過 1 MB。"); return; }
    if (!file.name.toLowerCase().endsWith(".csv")) { setInvoiceError("請選擇 .csv 檔案。"); return; }
    try { setInvoiceCsv(await file.text()); }
    catch { setInvoiceError("無法讀取 CSV 檔案，請確認檔案編碼為 UTF-8。 "); }
  }
  async function previewInvoice() {
    setInvoiceLoading(true); setInvoiceError(""); setInvoicePreview(null); setInvoiceDuplicateFile(false);
    try {
      const fx = fxRate.trim() && fxTimestamp.trim() ? { fromCurrency: fxCurrency, toCurrency: "TWD", rate: Number(fxRate), timestamp: fxTimestamp } : undefined;
      const response = await fetch("/api/admin/ai-costs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ csv: invoiceCsv, fxConversion: fx }) });
      const result = await response.json() as { preview?: InvoicePreview; error?: string };
      if (!response.ok || !result.preview) throw new Error(result.error ?? "帳單預覽失敗。");
      const duplicateFile = seenInvoiceFingerprints.includes(result.preview.sourceFingerprint);
      setInvoiceDuplicateFile(duplicateFile);
      if (!duplicateFile) setSeenInvoiceFingerprints((previous) => [...previous, result.preview!.sourceFingerprint]);
      setInvoicePreview(result.preview);
    } catch (reason) { setInvoiceError(reason instanceof Error ? reason.message : "帳單預覽失敗。"); }
    finally { setInvoiceLoading(false); }
  }
  async function load() {
    setLoading(true);
    try {
      const [response, reconciliationResponse] = await Promise.all([
        fetch("/api/admin/ai-costs", { cache: "no-store" }),
        fetch("/api/admin/ai-reconciliation", { cache: "no-store" }),
      ]);
      const result = await response.json() as Data;
      if (!response.ok) throw new Error(result.error ?? "成本資料讀取失敗。");
      let reconciliation: Data["reconciliation"];
      let reconciliationError = "";
      if (reconciliationResponse.ok) {
        const reconciliationResult = await reconciliationResponse.json() as NonNullable<Data["reconciliation"]>;
        reconciliation = reconciliationResult;
      } else {
        const reconciliationResult = await reconciliationResponse.json() as { error?: string };
        reconciliationError = reconciliationResult.error ?? "待核對請求讀取失敗。";
      }
      setData({ ...result, reconciliation, reconciliationError }); setError("");
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
          <h2 style={{ fontSize: 16, margin: "0 0 12px" }}>待核對 AI 請求</h2>
          <p style={{ color: "#64748b", fontSize: 11, lineHeight: 1.7 }}>列出超過 15 分鐘仍處於執行中、且預算仍被保留的請求。此清單僅供人工核對，不會自動重送供應商請求、結算或釋放預算。</p>
          {data.reconciliationError ? <p role="alert" style={{ color: "#b42318", fontSize: 12 }}>{data.reconciliationError}</p> :
            (data.reconciliation?.requests ?? []).length === 0 ? <p style={{ color: "#8793a5", fontSize: 12 }}>目前沒有符合條件的待核對請求。</p> :
              <div style={{ display: "grid", gap: 10 }}>
                {data.reconciliation!.requests.map(row => <div key={row.requestId} style={{ borderTop: "1px solid #edf1f5", paddingTop: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                    <strong style={{ fontSize: 12 }}>{row.provider} · {row.model}</strong>
                    <span style={{ color: "#9a6700", fontSize: 11 }}>預算保留中 · {row.status}</span>
                  </div>
                  <p style={{ color: "#64748b", fontSize: 10, lineHeight: 1.7, overflowWrap: "anywhere", margin: "5px 0" }}>請求：{row.requestId} · 會員：{row.ownerId}</p>
                  <p style={{ color: "#64748b", fontSize: 10, lineHeight: 1.7, margin: "4px 0" }}>建立：{new Date(row.createdAt).toLocaleString("zh-TW")} · 預留：{row.reservedAmount.toFixed(6)} TWD · 冪等狀態：{row.idempotencyState ?? "無資料"}</p>
                  <p style={{ color: "#8793a5", fontSize: 10, overflowWrap: "anywhere", margin: "4px 0" }}>供應商請求 ID：{row.providerRequestId ?? "尚未取得"} · 核對狀態：{row.reservationStatus}</p>
                </div>)}
              </div>}
          <p style={{ color: "#8793a5", fontSize: 10, marginBottom: 0 }}>此清單不代表供應商已扣款或已完成請求，實際結果仍須依供應商紀錄核實。</p>
        </section>
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
          <h2 style={{ fontSize: 16, margin: "0 0 8px" }}>供應商帳單 CSV 唯讀預覽</h2>
          <p style={{ color: "#64748b", fontSize: 11, lineHeight: 1.7 }}>上傳 UTF-8 CSV（最大 1 MB、5,000 筆），或直接貼上內容。系統只讀取請求證據並產生預覽，不會保存發票、寫入帳本、調整預算或付款。</p>
          <label style={{ display: "block", fontSize: 12, fontWeight: 700, margin: "12px 0 6px" }} htmlFor="invoice-csv-file">選擇 CSV 檔案</label>
          <input id="invoice-csv-file" type="file" accept=".csv,text/csv" onChange={(event) => void loadInvoiceFile(event.currentTarget.files?.[0])} style={{ display: "block", maxWidth: "100%", fontSize: 12 }} />
          <label style={{ display: "block", fontSize: 12, fontWeight: 700, margin: "12px 0 6px" }} htmlFor="invoice-csv-text">CSV 內容</label>
          <textarea id="invoice-csv-text" value={invoiceCsv} onChange={(event) => { setInvoiceCsv(event.target.value); setInvoicePreview(null); setInvoiceDuplicateFile(false); setInvoiceError(""); }} rows={6} spellCheck={false} placeholder="provider,model,billing_period_start,billing_period_end,source_reference,currency,amount" style={{ width: "100%", boxSizing: "border-box", border: "1px solid #cbd5e1", borderRadius: 8, padding: 10, fontSize: 11, fontFamily: "ui-monospace,monospace" }} />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))", gap: 8, marginTop: 10 }}>
            <label style={{ fontSize: 11, color: "#64748b" }}>匯率來源幣別<select value={fxCurrency} onChange={(event) => setFxCurrency(event.target.value)} style={{ display: "block", width: "100%", padding: 8, border: "1px solid #cbd5e1", borderRadius: 7, marginTop: 4 }}>{["USD","EUR","GBP","JPY","CNY","HKD","TWD"].map(currency => <option key={currency} value={currency}>{currency}</option>)}</select></label>
            <label style={{ fontSize: 11, color: "#64748b" }}>換算 TWD 匯率（選填）<input type="number" min="0" step="any" value={fxRate} onChange={(event) => setFxRate(event.target.value)} placeholder="例如 32.5" style={{ display: "block", width: "100%", boxSizing: "border-box", padding: 8, border: "1px solid #cbd5e1", borderRadius: 7, marginTop: 4 }} /></label>
            <label style={{ fontSize: 11, color: "#64748b" }}>匯率時間（選填）<input type="datetime-local" value={fxTimestamp} onChange={(event) => setFxTimestamp(event.target.value)} style={{ display: "block", width: "100%", boxSizing: "border-box", padding: 8, border: "1px solid #cbd5e1", borderRadius: 7, marginTop: 4 }} /></label>
          </div>
          {invoiceError && <p role="alert" style={{ color: "#b42318", background: "#fff1f0", padding: 10, borderRadius: 8, fontSize: 12 }}>{invoiceError}</p>}
          <button type="button" onClick={() => void previewInvoice()} disabled={invoiceLoading || !invoiceCsv.trim() || (!!fxRate.trim() !== !!fxTimestamp.trim())} style={{ marginTop: 12, border: 0, borderRadius: 9, background: invoiceLoading || !invoiceCsv.trim() ? "#94a3b8" : "#315d91", color: "#fff", padding: "10px 16px", fontWeight: 700 }}>{invoiceLoading ? "產生預覽中…" : "產生唯讀預覽"}</button>
          {!!fxRate.trim() !== !!fxTimestamp.trim() && <p role="alert" style={{ color: "#9a6700", fontSize: 11 }}>匯率與時間必須同時填寫，或同時留白。</p>}
          {invoicePreview && <>
            {invoiceDuplicateFile && <p role="alert" style={{ color: "#9a6700", background: "#fff7e6", padding: 10, borderRadius: 8, fontSize: 12 }}>重複來源檔案：本工作階段已預覽過相同 SHA-256 指紋。本次僅供再次檢視，不會作為新的匯入或新增筆數。</p>}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(120px,1fr))", gap: 8, marginTop: 14 }}>
              <div style={{ background: "#f4f7fb", padding: 10, borderRadius: 8 }}><span style={{ fontSize: 10, color: "#64748b" }}>資料列</span><strong style={{ display: "block", fontSize: 20 }}>{invoicePreview.rowCount}</strong></div>
              {Object.entries(invoicePreview.counts).map(([key,value]) => <div key={key} style={{ background: "#f4f7fb", padding: 10, borderRadius: 8 }}><span style={{ fontSize: 10, color: "#64748b" }}>{invoiceDispositionLabel[key] ?? key}</span><strong style={{ display: "block", fontSize: 20 }}>{value}</strong></div>)}
            </div>
            <p style={{ color: "#8793a5", fontSize: 10, overflowWrap: "anywhere" }}>來源指紋 SHA-256：{invoicePreview.sourceFingerprint}</p>
            <div style={{ overflowX: "auto" }}><table style={{ width: "100%", minWidth: 760, borderCollapse: "collapse", fontSize: 10 }}><thead><tr style={{ textAlign: "left", color: "#64748b" }}>{["列","供應商／模型","參照","金額","判定","對應請求","TWD 換算"].map(label => <th key={label} style={{ padding: 8, borderBottom: "1px solid #e1e7ef" }}>{label}</th>)}</tr></thead><tbody>{invoicePreview.rows.map(row => <tr key={row.rowNumber} style={{ borderBottom: "1px solid #edf1f5" }}><td style={{ padding: 8 }}>{row.rowNumber}</td><td style={{ padding: 8 }}>{row.provider}<br />{row.model}</td><td style={{ padding: 8, overflowWrap: "anywhere" }}>{row.sourceReference}</td><td style={{ padding: 8 }}>{row.rawAmount} {row.currency}</td><td style={{ padding: 8 }}>{invoiceDispositionLabel[row.disposition] ?? row.disposition}</td><td style={{ padding: 8, overflowWrap: "anywhere" }}>{row.match?.requestId ?? "—"}</td><td style={{ padding: 8 }}>{row.normalizedTwd ? row.normalizedTwd.amount.toFixed(4) + " TWD" : "—"}</td></tr>)}</tbody></table></div>
            <p style={{ color: "#8793a5", fontSize: 10 }}>預覽僅供人工核對，不是會計認列或付款授權。來源指紋不會被保存。</p>
          </>}
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
