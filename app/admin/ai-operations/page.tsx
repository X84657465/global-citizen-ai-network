import Link from "next/link";
import { Fragment } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import AiReconciliationForm from "./ai-reconciliation-form";

export const dynamic = "force-dynamic";

type StaleRequest = {
  request_id: string;
  provider: string;
  model: string;
  request_status: string;
  request_created_at: string;
  reservation_status: string;
  reserved_amount: number | string;
  actual_cost: number | string | null;
  idempotency_state: string | null;
  provider_request_id: string | null;
};

type ReconciliationEvent = {
  id: string;
  request_id: string;
  actor_id: string;
  decision: "confirmed_billed" | "confirmed_not_billed" | "inconclusive";
  provider: string;
  evidence_reference: string;
  rationale: string;
  provider_billed_cost: number | string | null;
  provider_billed_currency: string | null;
  normalized_cost_twd: number | string | null;
  created_at: string;
};

function money(value: number | string | null) {
  if (value === null) return "尚未結算";
  return new Intl.NumberFormat("zh-TW", { style: "currency", currency: "TWD", maximumFractionDigits: 4 }).format(Number(value));
}

export default async function AiOperationsPage() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
    redirect("/login?setup=required");
  }

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect("/login");

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role, account_status")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError || profile?.role !== "admin" || profile.account_status !== "active") {
    redirect("/");
  }

  let requests: StaleRequest[] = [];
  let loadError = "";
  let reconciliationEvents: ReconciliationEvent[] = [];
  let historyError = "";
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    loadError = "伺服器尚未設定管理端資料庫金鑰。";
  } else {
    const admin = createAdminClient();
    const { data, error } = await admin.rpc("list_stale_ai_requests", { p_older_than_seconds: 900 });
    if (error) {
      loadError = "異常請求查詢尚未就緒，請確認 Migration 0007、0013 已套用。";
    } else {
      requests = (data ?? []) as StaleRequest[];
    }
    const { data: eventData, error: eventError } = await admin
      .from("ai_reconciliation_events")
      .select("id,request_id,actor_id,decision,provider,evidence_reference,rationale,provider_billed_cost,provider_billed_currency,normalized_cost_twd,created_at")
      .order("created_at", { ascending: false })
      .limit(100);
    if (eventError) {
      historyError = "核對歷程目前無法讀取，請確認 Migration 0015 已套用。";
    } else {
      reconciliationEvents = (eventData ?? []) as ReconciliationEvent[];
    }
  }

  return (
    <main style={{ minHeight: "100vh", background: "#f4f7fb", padding: "32px 18px", color: "#17263b" }}>
      <section style={{ maxWidth: 1120, margin: "0 auto" }}>
        <Link href="/" style={{ color: "#315d91", textDecoration: "none", fontSize: 13 }}>← 返回平台</Link>
        <header style={{ margin: "26px 0 22px" }}>
          <p style={{ color: "#64748b", fontSize: 11, letterSpacing: 1.5, fontWeight: 700 }}>PLATFORM OPERATIONS</p>
          <h1 style={{ fontSize: 30, margin: "8px 0" }}>AI 營運安全中心</h1>
          <p style={{ color: "#64748b", lineHeight: 1.7, margin: 0 }}>只顯示超過 15 分鐘且預算仍保留的請求，供管理員核對供應商紀錄與帳單。</p>
        </header>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: 12, marginBottom: 18 }}>
          <div style={{ background: "#fff", border: "1px solid #e1e7ef", borderRadius: 14, padding: 18 }}>
            <span style={{ color: "#64748b", fontSize: 12 }}>待人工核對請求</span>
            <strong style={{ display: "block", fontSize: 30, marginTop: 8 }}>{requests.length}</strong>
          </div>
          <div style={{ background: "#fff", border: "1px solid #e1e7ef", borderRadius: 14, padding: 18 }}>
            <span style={{ color: "#64748b", fontSize: 12 }}>查詢門檻</span>
            <strong style={{ display: "block", fontSize: 24, marginTop: 8 }}>15 分鐘</strong>
          </div>
          <div style={{ background: "#fff", border: "1px solid #e1e7ef", borderRadius: 14, padding: 18 }}>
            <span style={{ color: "#64748b", fontSize: 12 }}>自動重送</span>
            <strong style={{ display: "block", fontSize: 24, marginTop: 8 }}>已停用</strong>
          </div>
        </div>

        {loadError ? (
          <div role="alert" style={{ background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: 12, padding: 16, color: "#9a3412" }}>{loadError}</div>
        ) : requests.length === 0 ? (
          <div style={{ background: "#fff", border: "1px solid #e1e7ef", borderRadius: 14, padding: 24 }}>
            <strong>目前沒有符合條件的異常請求。</strong>
            <p style={{ color: "#64748b", fontSize: 13, marginBottom: 0 }}>這只代表目前查詢結果為零，不代表供應商帳單已完成對帳。</p>
          </div>
        ) : (
          <div style={{ overflowX: "auto", background: "#fff", border: "1px solid #e1e7ef", borderRadius: 14 }}>
            <table style={{ borderCollapse: "collapse", width: "100%", minWidth: 850, fontSize: 12 }}>
              <thead><tr style={{ background: "#f8fafc", textAlign: "left" }}>
                {["請求識別碼","供應商 / 模型","狀態","建立時間","預留金額","實際成本","供應商請求 ID"].map(label => <th key={label} style={{ padding: 13, color: "#64748b", fontWeight: 600 }}>{label}</th>)}
              </tr></thead>
              <tbody>{requests.map(row => <Fragment key={row.request_id}><tr style={{ borderTop: "1px solid #edf1f5" }}>
                <td style={{ padding: 13, maxWidth: 150, overflowWrap: "anywhere" }}>{row.request_id}</td>
                <td style={{ padding: 13 }}>{row.provider}<br/><span style={{ color: "#64748b" }}>{row.model}</span></td>
                <td style={{ padding: 13 }}>{row.request_status}<br/><span style={{ color: "#64748b" }}>{row.idempotency_state ?? "無冪等紀錄"}</span></td>
                <td style={{ padding: 13 }}>{new Date(row.request_created_at).toLocaleString("zh-TW")}</td>
                <td style={{ padding: 13 }}>{money(row.reserved_amount)}</td>
                <td style={{ padding: 13 }}>{money(row.actual_cost)}</td>
                <td style={{ padding: 13, maxWidth: 150, overflowWrap: "anywhere" }}>{row.provider_request_id ?? "尚無"}</td>
              </tr><tr style={{ borderTop: "1px solid #edf1f5" }}><td colSpan={7} style={{ padding: 13 }}><AiReconciliationForm requestId={row.request_id} provider={row.provider} /></td></tr></Fragment>)}</tbody>
            </table>
          </div>
        )}

        <section style={{ marginTop: 22, background: "#fff", border: "1px solid #e1e7ef", borderRadius: 14, padding: 18 }}>
          <header style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
            <div>
              <h2 style={{ fontSize: 18, margin: 0 }}>AI 核對歷程</h2>
              <p style={{ color: "#64748b", fontSize: 11, margin: "5px 0 0" }}>最近 100 筆不可變更的證據審查紀錄，包含已結案與仍待核對的案件。</p>
            </div>
            <span style={{ color: "#64748b", fontSize: 11 }}>{reconciliationEvents.length} 筆紀錄</span>
          </header>
          {historyError ? (
            <p role="alert" style={{ color: "#9a3412", background: "#fff7ed", padding: 10, borderRadius: 8, fontSize: 12 }}>{historyError}</p>
          ) : reconciliationEvents.length === 0 ? (
            <p style={{ color: "#64748b", fontSize: 12, marginBottom: 0 }}>尚無人工核對紀錄。</p>
          ) : (
            <div style={{ display: "grid", gap: 10, marginTop: 14 }}>
              {reconciliationEvents.map(event => <article key={event.id} style={{ border: "1px solid #edf1f5", borderRadius: 10, padding: 13 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  <strong style={{ fontSize: 12 }}>{event.decision === "confirmed_billed" ? "確認已扣款" : event.decision === "confirmed_not_billed" ? "確認未扣款" : "證據不足，維持保留"}</strong>
                  <time dateTime={event.created_at} style={{ color: "#64748b", fontSize: 10 }}>{new Date(event.created_at).toLocaleString("zh-TW")}</time>
                </div>
                <dl style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(210px,1fr))", gap: "7px 16px", margin: "10px 0", fontSize: 11 }}>
                  <div><dt style={{ color: "#64748b" }}>請求 ID</dt><dd style={{ margin: "3px 0", overflowWrap: "anywhere" }}>{event.request_id}</dd></div>
                  <div><dt style={{ color: "#64748b" }}>操作管理員 ID</dt><dd style={{ margin: "3px 0", overflowWrap: "anywhere" }}>{event.actor_id}</dd></div>
                  <div><dt style={{ color: "#64748b" }}>供應商</dt><dd style={{ margin: "3px 0" }}>{event.provider}</dd></div>
                  <div><dt style={{ color: "#64748b" }}>供應商帳單金額</dt><dd style={{ margin: "3px 0" }}>{event.provider_billed_cost === null ? "未提供" : `${event.provider_billed_cost} ${event.provider_billed_currency?.trim() ?? ""}`}</dd></div>
                  <div><dt style={{ color: "#64748b" }}>換算 TWD 成本</dt><dd style={{ margin: "3px 0" }}>{money(event.normalized_cost_twd)}</dd></div>
                  <div><dt style={{ color: "#64748b" }}>證據參照</dt><dd style={{ margin: "3px 0", overflowWrap: "anywhere" }}>{event.evidence_reference}</dd></div>
                </dl>
                <p style={{ margin: 0, color: "#334155", fontSize: 11, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{event.rationale}</p>
                <p style={{ margin: "8px 0 0", color: "#98a2b1", fontSize: 9, overflowWrap: "anywhere" }}>事件 ID：{event.id}</p>
              </article>)}
            </div>
          )}
        </section>

        <aside style={{ marginTop: 18, background: "#eff6ff", border: "1px solid #dbeafe", borderRadius: 12, padding: 16, color: "#1e40af", fontSize: 12, lineHeight: 1.8 }}>
          安全規則：逾時不等於供應商失敗。請先核對供應商請求紀錄及帳單，再由具權限的營運流程處理。此頁面沒有重送、釋放預算或修改帳本的按鈕，避免誤操作與重複計費。
        </aside>
      </section>
    </main>
  );
}
