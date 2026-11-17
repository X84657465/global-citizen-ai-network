"use client";

import Link from "next/link";
import { useEffect, useState, type CSSProperties } from "react";

type Appeal = {
  id: string; submission_id: string; appellant_id: string; reason: string;
  status: string; created_at: string;
  task_submissions: {
    id: string; content: string; status: string; submitted_at: string;
    contribution_tasks: { title: string; reward_amount: number | string; reward_currency: string } |
      { title: string; reward_amount: number | string; reward_currency: string }[] | null;
  } | {
    id: string; content: string; status: string; submitted_at: string;
    contribution_tasks: { title: string; reward_amount: number | string; reward_currency: string } |
      { title: string; reward_amount: number | string; reward_currency: string }[] | null;
  }[] | null;
};
type Payload = { appeals?: Appeal[]; error?: string };
const panel: CSSProperties = { background: "#fff", border: "1px solid #e1e7ef", borderRadius: 14, padding: 18 };
function submissionOf(value: Appeal["task_submissions"]) { return Array.isArray(value) ? value[0] : value; }
function taskOf(value: NonNullable<ReturnType<typeof submissionOf>>["contribution_tasks"]) { return Array.isArray(value) ? value[0] : value; }

export default function AppealReviewClient() {
  const [rows, setRows] = useState<Appeal[]>([]);
  const [rationales, setRationales] = useState<Record<string, string>>({});
  const [keys, setKeys] = useState<Record<string, { signature: string; key: string }>>({});
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/contribution/appeals", { cache: "no-store" });
      const data = await response.json() as Payload;
      if (!response.ok) throw new Error(data.error ?? "無法讀取申訴。");
      setRows(data.appeals ?? []); setError("");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "讀取失敗。"); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);

  async function decide(row: Appeal, decision: "overturn" | "uphold") {
    const rationale = (rationales[row.id] ?? "").trim();
    if (rationale.length < 10) { setError("複核理由至少需要 10 個字元。"); return; }
    const signature = JSON.stringify({ appealId: row.id, decision, rationale });
    const key = keys[row.id]?.signature === signature ? keys[row.id].key : crypto.randomUUID();
    setKeys(prev => ({ ...prev, [row.id]: { signature, key } }));
    setBusy(row.id); setError(""); setNotice("");
    try {
      const response = await fetch("/api/admin/contribution/appeals", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Idempotency-Key": key },
        body: JSON.stringify({ appealId: row.id, decision, rationale }),
      });
      const data = await response.json() as { result?: { reward_amount: number; reward_currency: string }; error?: string };
      if (!response.ok) throw new Error(data.error ?? "複核未完成。");
      const amount = Number(data.result?.reward_amount ?? 0);
      setNotice(decision === "overturn"
        ? "申訴成立，原退回決定已撤銷，成果改為通過。" + (amount > 0 ? "已建立待確認獎勵：" + amount + " " + data.result?.reward_currency : "")
        : "申訴不成立，原退回決定維持。");
      setKeys(prev => { const next = { ...prev }; delete next[row.id]; return next; });
      await load();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "複核未完成。"); }
    finally { setBusy(""); }
  }

  return <main style={{ minHeight: "100vh", background: "#f4f7fb", color: "#17263b", padding: "30px 16px" }}>
    <section style={{ maxWidth: 1080, margin: "0 auto" }}>
      <Link href="/account" style={{ color: "#315d91", textDecoration: "none", fontSize: 13 }}>← 會員帳戶</Link>
      <p style={{ color: "#64748b", fontSize: 11, letterSpacing: 1.5, fontWeight: 700, marginTop: 24 }}>APPEAL OPERATIONS</p>
      <h1 style={{ fontSize: 29, margin: "8px 0" }}>貢獻申訴複核</h1>
      <p style={{ color: "#64748b", fontSize: 13, lineHeight: 1.8 }}>申訴成立會撤銷原退回結果，恢復成果通過狀態，並在同一筆資料庫交易中建立貢獻紀錄與待確認獎勵。</p>
      {error && <p role="alert" style={{ color: "#b42318", background: "#fff1f0", borderRadius: 9, padding: 12, fontSize: 12 }}>{error}</p>}
      {notice && <p role="status" style={{ color: "#24724f", background: "#edf8f2", borderRadius: 9, padding: 12, fontSize: 12 }}>{notice}</p>}
      {loading ? <p style={{ color: "#64748b" }}>載入申訴案件…</p> : rows.length === 0 ? <div style={panel}><strong>目前沒有待複核申訴。</strong></div> :
        <div style={{ display: "grid", gap: 14 }}>{rows.map(row => {
          const submission = submissionOf(row.task_submissions);
          const task = submission ? taskOf(submission.contribution_tasks) : null;
          return <article key={row.id} style={panel}>
            <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
              <div><span style={{ color: "#5571c7", fontSize: 10 }}>{row.status}</span><h2 style={{ fontSize: 16, margin: "6px 0" }}>{task?.title ?? "貢獻任務申訴"}</h2></div>
              <span style={{ color: "#64748b", fontSize: 11 }}>{new Date(row.created_at).toLocaleString("zh-TW")}</span>
            </div>
            <p style={{ color: "#8793a5", fontSize: 10, overflowWrap: "anywhere" }}>申訴者：{row.appellant_id}</p>
            <h3 style={{ fontSize: 12 }}>申訴理由</h3>
            <p style={{ background: "#f8fafc", borderRadius: 10, padding: 12, fontSize: 12, lineHeight: 1.8, whiteSpace: "pre-wrap" }}>{row.reason}</p>
            <h3 style={{ fontSize: 12 }}>原始提交內容</h3>
            <div style={{ background: "#f8fafc", borderRadius: 10, padding: 12, fontSize: 12, lineHeight: 1.8, whiteSpace: "pre-wrap", maxHeight: 220, overflowY: "auto" }}>{submission?.content ?? "無法讀取原始提交內容。"}</div>
            <textarea value={rationales[row.id] ?? ""} onChange={event => setRationales(prev => ({ ...prev, [row.id]: event.target.value }))} maxLength={4000} rows={3} placeholder="請寫下複核理由（至少 10 字）…" style={{ width: "100%", marginTop: 12, border: "1px solid #dce3ec", borderRadius: 9, padding: 11, resize: "vertical", font: "inherit", fontSize: 12 }}/>
            <div style={{ display: "flex", justifyContent: "flex-end", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
              <button type="button" disabled={!!busy} onClick={() => void decide(row,"uphold")} style={{ border: "1px solid #e6c7c7", borderRadius: 8, background: "#fff", color: "#a33c3c", padding: "9px 14px", fontWeight: 700 }}>維持退回</button>
              <button type="button" disabled={!!busy} onClick={() => void decide(row,"overturn")} style={{ border: 0, borderRadius: 8, background: "#315d91", color: "#fff", padding: "9px 14px", fontWeight: 700 }}>{busy === row.id ? "處理中…" : "申訴成立，撤銷退回"}</button>
            </div>
          </article>;
        })}</div>}
    </section>
  </main>;
}
