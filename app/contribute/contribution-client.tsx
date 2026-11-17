"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";

type Task = {
  id: string;
  title: string;
  description: string;
  category: string;
  acceptance_criteria: unknown;
  reward_amount: number | string;
  reward_currency: string;
  closes_at: string | null;
};
type Submission = { id: string; task_id: string; status: string; submitted_at: string };
type Payload = { tasks?: Task[]; submissions?: Submission[]; error?: string };

export default function ContributionClient() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/contribution/tasks", { cache: "no-store" });
      const data = await response.json() as Payload;
      if (!response.ok) throw new Error(data.error ?? "無法載入任務。");
      setTasks(data.tasks ?? []);
      setSubmissions(data.submissions ?? []);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "無法載入任務。");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  async function submit(event: FormEvent<HTMLFormElement>, taskId: string) {
    event.preventDefault();
    const content = (drafts[taskId] ?? "").trim();
    if (content.length < 10) {
      setError("提交內容至少需要 10 個字元。");
      return;
    }
    setBusy(taskId);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/contribution/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId, content }),
      });
      const data = await response.json() as { submission?: Submission; error?: string };
      if (!response.ok || !data.submission) throw new Error(data.error ?? "提交未完成。");
      setSubmissions(prev => [data.submission!, ...prev]);
      setDrafts(prev => ({ ...prev, [taskId]: "" }));
      setNotice("已收到提交，任務進入審核流程。獎勵僅會在驗證通過後依任務規則記錄。");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "提交未完成。");
    } finally {
      setBusy("");
    }
  }

  function existing(taskId: string) {
    return submissions.find(item => item.task_id === taskId && ["submitted", "under_review", "accepted", "appealed"].includes(item.status));
  }

  return (
    <main style={{ minHeight: "100vh", background: "#f4f7fb", color: "#17263b", padding: "30px 16px" }}>
      <section style={{ maxWidth: 1040, margin: "0 auto" }}>
        <Link href="/" style={{ color: "#315d91", textDecoration: "none", fontSize: 13 }}>← 平台首頁</Link>
        <header style={{ margin: "24px 0" }}>
          <p style={{ color: "#64748b", fontSize: 11, letterSpacing: 1.5, fontWeight: 700 }}>GLOBAL CONTRIBUTION CENTER</p>
          <h1 style={{ fontSize: 29, margin: "8px 0" }}>全球貢獻中心</h1>
          <p style={{ color: "#64748b", fontSize: 13, lineHeight: 1.8, maxWidth: 700 }}>透過回答評估、資料查核、翻譯校對與知識整理參與 AI 建設。每項任務的報酬、驗收標準與審核狀態以平台實際發布內容為準。</p>
        </header>

        <div style={{ background: "#eff6ff", border: "1px solid #dbeafe", color: "#315d91", borderRadius: 12, padding: 15, fontSize: 12, lineHeight: 1.8, marginBottom: 18 }}>
          提交不代表已獲得獎勵。平台會先檢查重複提交與任務條件，通過審核後才會產生貢獻及獎勵帳本紀錄。此階段不提供即時現金提領。
        </div>

        {error && <p role="alert" style={{ background: "#fff1f0", color: "#b42318", padding: 12, borderRadius: 9, fontSize: 12 }}>{error}</p>}
        {notice && <p role="status" style={{ background: "#edf8f2", color: "#24724f", padding: 12, borderRadius: 9, fontSize: 12 }}>{notice}</p>}

        {loading ? <p style={{ color: "#64748b" }}>正在載入已發布任務…</p> : tasks.length === 0 ? (
          <section style={{ background: "#fff", border: "1px solid #e1e7ef", borderRadius: 14, padding: 25 }}>
            <strong>目前沒有開放中的貢獻任務。</strong>
            <p style={{ color: "#64748b", fontSize: 12, marginBottom: 0 }}>管理端發布任務後，這裡會顯示正式任務與驗收條件。此頁不會用示範任務冒充可領取的工作。</p>
          </section>
        ) : <div style={{ display: "grid", gap: 14 }}>
          {tasks.map(task => {
            const submitted = existing(task.id);
            const criteria = Array.isArray(task.acceptance_criteria) ? task.acceptance_criteria : [];
            return <article key={task.id} style={{ background: "#fff", border: "1px solid #e1e7ef", borderRadius: 14, padding: 19 }}>
              <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: 12 }}>
                <div style={{ flex: "1 1 440px" }}>
                  <span style={{ color: "#5571c7", background: "#eef3ff", borderRadius: 20, padding: "5px 9px", fontSize: 10 }}>{task.category}</span>
                  <h2 style={{ fontSize: 17, margin: "12px 0 7px" }}>{task.title}</h2>
                  <p style={{ color: "#64748b", fontSize: 12, lineHeight: 1.8, whiteSpace: "pre-wrap" }}>{task.description}</p>
                </div>
                <div style={{ minWidth: 110, textAlign: "right" }}>
                  <strong style={{ display: "block", fontSize: 21 }}>{new Intl.NumberFormat("zh-TW", { maximumFractionDigits: 2 }).format(Number(task.reward_amount))}</strong>
                  <span style={{ color: "#64748b", fontSize: 11 }}>{task.reward_currency} · 通過驗收後</span>
                </div>
              </div>
              {criteria.length > 0 && <div style={{ background: "#f8fafc", borderRadius: 9, padding: 12, margin: "12px 0", fontSize: 11, lineHeight: 1.8 }}>
                <strong>驗收條件</strong>
                <ul style={{ margin: "6px 0 0", paddingLeft: 18 }}>{criteria.map((item, index) => <li key={index}>{typeof item === "string" ? item : JSON.stringify(item)}</li>)}</ul>
              </div>}
              {task.closes_at && <p style={{ color: "#8793a5", fontSize: 10 }}>截止時間：{new Date(task.closes_at).toLocaleString("zh-TW")}</p>}
              {submitted ? <p style={{ color: "#24724f", fontSize: 12 }}>已提交 · {submitted.status} · {new Date(submitted.submitted_at).toLocaleString("zh-TW")}</p> : <form onSubmit={event => void submit(event, task.id)}>
                <textarea value={drafts[task.id] ?? ""} onChange={event => setDrafts(prev => ({ ...prev, [task.id]: event.target.value }))} maxLength={16000} rows={4} placeholder="依照任務驗收條件填寫你的成果…" style={{ width: "100%", border: "1px solid #dce3ec", borderRadius: 9, padding: 11, resize: "vertical", font: "inherit", fontSize: 12 }} />
                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 9 }}>
                  <button type="submit" disabled={busy === task.id || (drafts[task.id] ?? "").trim().length < 10} style={{ border: 0, borderRadius: 8, background: "#315d91", color: "#fff", padding: "10px 15px", fontWeight: 700, opacity: busy === task.id || (drafts[task.id] ?? "").trim().length < 10 ? .5 : 1 }}>{busy === task.id ? "提交中…" : "提交成果"}</button>
                </div>
              </form>}
            </article>;
          })}
        </div>}
      </section>
    </main>
  );
}
