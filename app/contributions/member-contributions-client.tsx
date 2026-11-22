"use client";

import Link from "next/link";
import SubmissionStatus from "@/components/contributions/submission-status";
import { useEffect, useState, type CSSProperties } from "react";

type Contribution = { id: string; event_type: string; points: number | string; occurred_at: string };
type Reward = { id: string; event_type: string; amount: number | string; currency: string; status: string; reason: string; occurred_at: string };
type Submission = { id: string; task_id: string; status: string; submitted_at: string };
type Appeal = { id: string; submission_id: string; status: string; reason: string; resolution: string | null; created_at: string; resolved_at: string | null };
type Data = {
  summary?: { contributionEvents: number; points: number; pendingRewardTwd: number; confirmedRewardTwd: number; note: string };
  contributions?: Contribution[];
  rewards?: Reward[];
  submissions?: Submission[];
  appeals?: Appeal[];
  error?: string;
};

const panel: CSSProperties = { background: "#fff", border: "1px solid #e1e7ef", borderRadius: 14, padding: 18 };
const money = (amount: number | string, currency: string) => new Intl.NumberFormat("zh-TW", { style: "currency", currency: currency.trim(), maximumFractionDigits: 2 }).format(Number(amount));

export default function MemberContributionsClient() {
  const [data, setData] = useState<Data>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [appealReasons, setAppealReasons] = useState<Record<string, string>>({});
  const [appealBusy, setAppealBusy] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetch("/api/contribution/summary", { cache: "no-store" })
      .then(async response => {
        const payload = await response.json() as Data;
        if (!response.ok) throw new Error(payload.error ?? "無法讀取貢獻紀錄。");
        if (!cancelled) setData(payload);
      })
      .catch(reason => { if (!cancelled) setError(reason instanceof Error ? reason.message : "讀取失敗。"); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  async function submitAppeal(submissionId: string) {
    const reason = (appealReasons[submissionId] ?? "").trim();
    if (reason.length < 10) {
      setError("申訴理由至少需要 10 個字元。");
      return;
    }
    setAppealBusy(submissionId);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/contribution/appeals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ submissionId, reason }),
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "申訴未完成。");
      setNotice("申訴已送出，平台將依程序重新檢視。");
      setAppealReasons(prev => ({ ...prev, [submissionId]: "" }));
      const refreshed = await fetch("/api/contribution/summary", { cache: "no-store" });
      const payload = await refreshed.json() as Data;
      if (refreshed.ok) setData(payload);
    } catch (reasonError) {
      setError(reasonError instanceof Error ? reasonError.message : "申訴未完成。");
    } finally {
      setAppealBusy("");
    }
  }

  const summary = data.summary;
  return (
    <main style={{ minHeight: "100vh", background: "#f4f7fb", color: "#17263b", padding: "30px 16px" }}>
      <section style={{ maxWidth: 1040, margin: "0 auto" }}>
        <Link href="/account" style={{ color: "#315d91", textDecoration: "none", fontSize: 13 }}>← 會員帳戶</Link>
        <h1 style={{ fontSize: 29, margin: "24px 0 6px" }}>我的貢獻與獎勵</h1>
        <p style={{ color: "#64748b", fontSize: 13, lineHeight: 1.8 }}>每筆貢獻與獎勵都來自不可覆寫的帳本紀錄，金額與狀態依平台審核及結算流程更新。</p>
        {notice && <p role="status" style={{ color: "#24724f", background: "#edf8f2", borderRadius: 9, padding: 12, fontSize: 12 }}>{notice}</p>}
        {error && <p role="alert" style={{ color: "#b42318", background: "#fff1f0", borderRadius: 9, padding: 12, fontSize: 12 }}>{error}</p>}
        {loading ? <p style={{ color: "#64748b" }}>載入帳本中…</p> : <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: 12, margin: "20px 0" }}>
            <div style={panel}><span style={{ color: "#64748b", fontSize: 12 }}>貢獻事件</span><strong style={{ display: "block", fontSize: 28, marginTop: 8 }}>{summary?.contributionEvents ?? 0}</strong></div>
            <div style={panel}><span style={{ color: "#64748b", fontSize: 12 }}>貢獻點數（目前載入範圍）</span><strong style={{ display: "block", fontSize: 28, marginTop: 8 }}>{summary?.points ?? 0}</strong></div>
            <div style={panel}><span style={{ color: "#64748b", fontSize: 12 }}>待確認獎勵（TWD）</span><strong style={{ display: "block", fontSize: 28, marginTop: 8 }}>{money(summary?.pendingRewardTwd ?? 0, "TWD")}</strong></div>
            <div style={panel}><span style={{ color: "#64748b", fontSize: 12 }}>已確認獎勵（TWD）</span><strong style={{ display: "block", fontSize: 28, marginTop: 8 }}>{money(summary?.confirmedRewardTwd ?? 0, "TWD")}</strong></div>
          </div>
          <div style={{ ...panel, marginBottom: 14, color: "#64748b", fontSize: 12, lineHeight: 1.8 }}>{summary?.note}</div>
          <section style={{ ...panel, marginBottom: 14 }}>
            <h2 style={{ fontSize: 16, margin: "0 0 14px" }}>獎勵帳本</h2>
            {(data.rewards ?? []).length === 0 ? <p style={{ color: "#8793a5", fontSize: 12 }}>目前尚無獎勵紀錄，完成任務並通過審核後才會新增。</p> :
              <div style={{ display: "grid", gap: 10 }}>{data.rewards!.map(row => <div key={row.id} style={{ borderTop: "1px solid #edf1f5", paddingTop: 10, display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <div><strong style={{ fontSize: 12 }}>{row.reason}</strong><p style={{ margin: "4px 0 0", color: "#8793a5", fontSize: 10 }}>{row.event_type} · {row.status} · {new Date(row.occurred_at).toLocaleString("zh-TW")}</p></div>
                <strong style={{ fontSize: 14 }}>{money(row.amount, row.currency)}</strong>
              </div>)}</div>}
          </section>
          <section style={{ ...panel, marginBottom: 14 }}>
            <h2 style={{ fontSize: 16, margin: "0 0 14px" }}>提交與申訴</h2>
            {(data.submissions ?? []).length === 0 ? <p style={{ color: "#8793a5", fontSize: 12 }}>目前尚無任務提交紀錄。</p> :
              <div style={{ display: "grid", gap: 12 }}>{data.submissions!.map(row => {
                const appeal = (data.appeals ?? []).find(item => item.submission_id === row.id);
                return <div key={row.id} style={{ borderTop: "1px solid #edf1f5", paddingTop: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                    <SubmissionStatus status={row.status} appeal={appeal} />
                    <span style={{ color: "#8793a5", fontSize: 10 }}>{new Date(row.submitted_at).toLocaleString("zh-TW")}</span>
                  </div>
                  {row.status === "rejected" && !appeal ? <div style={{ marginTop: 9 }}>
                    <textarea value={appealReasons[row.id] ?? ""} onChange={event => setAppealReasons(prev => ({ ...prev, [row.id]: event.target.value }))} rows={3} maxLength={4000} placeholder="如認為審核有誤，請說明具體理由（至少 10 字）…" style={{ width: "100%", border: "1px solid #dce3ec", borderRadius: 9, padding: 10, font: "inherit", fontSize: 12 }} />
                    <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 7 }}>
                      <button type="button" disabled={appealBusy === row.id} onClick={() => void submitAppeal(row.id)} style={{ border: 0, borderRadius: 8, background: "#315d91", color: "#fff", padding: "8px 12px", fontWeight: 700 }}>{appealBusy === row.id ? "送出中…" : "提出申訴"}</button>
                    </div>
                  </div> : null}
                  
                </div>;
              })}</div>}
          </section>
          <section style={panel}>
            <h2 style={{ fontSize: 16, margin: "0 0 14px" }}>貢獻歷程</h2>
            {(data.contributions ?? []).length === 0 ? <p style={{ color: "#8793a5", fontSize: 12 }}>目前尚無貢獻事件。</p> :
              <div style={{ display: "grid", gap: 10 }}>{data.contributions!.map(row => <div key={row.id} style={{ borderTop: "1px solid #edf1f5", paddingTop: 10, display: "flex", justifyContent: "space-between", gap: 12 }}>
                <span style={{ fontSize: 12 }}>{row.event_type}<span style={{ display: "block", color: "#8793a5", fontSize: 10, marginTop: 4 }}>{new Date(row.occurred_at).toLocaleString("zh-TW")}</span></span>
                <strong style={{ fontSize: 13 }}>{Number(row.points)} 點</strong>
              </div>)}</div>}
          </section>
        </>}
      </section>
    </main>
  );
}
