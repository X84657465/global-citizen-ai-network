"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Submission = {
  id: string;
  task_id: string;
  contributor_id: string;
  content: string;
  status: string;
  submitted_at: string;
  contribution_tasks: { title: string; reward_amount: number | string; reward_currency: string } | { title: string; reward_amount: number | string; reward_currency: string }[] | null;
};
type Payload = { submissions?: Submission[]; error?: string };
const panel: React.CSSProperties = { background: "#fff", border: "1px solid #e1e7ef", borderRadius: 14, padding: 18 };

function taskInfo(task: Submission["contribution_tasks"]) {
  return Array.isArray(task) ? task[0] : task;
}

export default function ContributionReviewClient() {
  const [rows, setRows] = useState<Submission[]>([]);
  const [rationales, setRationales] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function load() {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/contribution/reviews", { cache: "no-store" });
      const data = await response.json() as Payload;
      if (!response.ok) throw new Error(data.error ?? "無法讀取待審核成果。");
      setRows(data.submissions ?? []);
      setError("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "讀取失敗。");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  async function review(row: Submission, decision: "accept" | "reject") {
    const rationale = (rationales[row.id] ?? "").trim();
    if (rationale.length < 10) {
      setError("審核理由至少需要 10 個字元。");
      return;
    }
    setBusy(row.id);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/admin/contribution/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Idempotency-Key": crypto.randomUUID() },
        body: JSON.stringify({ submissionId: row.id, decision, rationale }),
      });
      const data = await response.json() as { result?: { status: string; reward_amount: number; reward_currency: string }; error?: string };
      if (!response.ok) throw new Error(data.error ?? "審核未完成。");
      const amount = Number(data.result?.reward_amount ?? 0);
      setNotice(decision === "accept"
        ? "已通過驗收，貢獻帳本已寫入。" + (amount > 0 ? "待確認獎勵：" + amount + " " + data.result?.reward_currency + "。" : "此任務沒有設定獎勵金額。")
        : "已退回成果，審核理由已記錄。");
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "審核未完成。");
    } finally {
      setBusy("");
    }
  }

  return (
    <main style={{ minHeight: "100vh", background: "#f4f7fb", color: "#17263b", padding: "30px 16px" }}>
      <section style={{ maxWidth: 1100, margin: "0 auto" }}>
        <Link href="/account" style={{ color: "#315d91", textDecoration: "none", fontSize: 13 }}>← 會員帳戶</Link>
        <p style={{ color: "#64748b", fontSize: 11, letterSpacing: 1.5, fontWeight: 700, marginTop: 24 }}>CONTRIBUTION OPERATIONS</p>
        <h1 style={{ fontSize: 29, margin: "8px 0" }}>貢獻成果審核</h1>
        <p style={{ color: "#64748b", fontSize: 13, lineHeight: 1.8 }}>審核通過會在同一筆資料庫交易中更新提交狀態、寫入貢獻帳本及建立待確認獎勵，所有操作均留下稽核紀錄。</p>
        {error && <p role="alert" style={{ color: "#b42318", background: "#fff1f0", borderRadius: 9, padding: 12, fontSize: 12 }}>{error}</p>}
        {notice && <p role="status" style={{ color: "#24724f", background: "#edf8f2", borderRadius: 9, padding: 12, fontSize: 12 }}>{notice}</p>}
        {loading ? <p style={{ color: "#64748b" }}>載入待審核成果…</p> : rows.length === 0 ? <div style={panel}><strong>目前沒有待審核成果。</strong></div> :
          <div style={{ display: "grid", gap: 14 }}>{rows.map(row => {
            const task = taskInfo(row.contribution_tasks);
            return <article key={row.id} style={panel}>
              <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
                <div><span style={{ color: "#5571c7", fontSize: 10 }}>{row.status}</span><h2 style={{ fontSize: 16, margin: "6px 0" }}>{task?.title ?? "貢獻任務"}</h2></div>
                <span style={{ color: "#64748b", fontSize: 11 }}>提交時間：{new Date(row.submitted_at).toLocaleString("zh-TW")}</span>
              </div>
              <p style={{ color: "#8793a5", fontSize: 10, overflowWrap: "anywhere" }}>提交者：{row.contributor_id} · 任務獎勵：{task?.reward_amount ?? 0} {task?.reward_currency ?? "TWD"}</p>
              <div style={{ background: "#f8fafc", borderRadius: 10, padding: 14, whiteSpace: "pre-wrap", overflowWrap: "anywhere", fontSize: 12, lineHeight: 1.8, maxHeight: 280, overflowY: "auto" }}>{row.content}</div>
              <textarea value={rationales[row.id] ?? ""} onChange={event => setRationales(prev => ({ ...prev, [row.id]: event.target.value }))} maxLength={4000} rows={3} placeholder="請寫下具體審核理由（至少 10 字）…" style={{ width: "100%", marginTop: 12, border: "1px solid #dce3ec", borderRadius: 9, padding: 11, resize: "vertical", font: "inherit", fontSize: 12 }} />
              <div style={{ display: "flex", justifyContent: "flex-end", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
                <button type="button" disabled={busy === row.id} onClick={() => void review(row, "reject")} style={{ border: "1px solid #e6c7c7", borderRadius: 8, background: "#fff", color: "#a33c3c", padding: "9px 14px", fontWeight: 700 }}>退回</button>
                <button type="button" disabled={busy === row.id} onClick={() => void review(row, "accept")} style={{ border: 0, borderRadius: 8, background: "#315d91", color: "#fff", padding: "9px 14px", fontWeight: 700 }}>{busy === row.id ? "處理中…" : "通過驗收"}</button>
              </div>
            </article>;
          })}</div>}
      </section>
    </main>
  );
}
