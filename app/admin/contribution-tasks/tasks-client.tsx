"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";

type Task = {
  id: string; title: string; description: string; category: string;
  acceptance_criteria: string[]; reward_amount: number | string; reward_currency: string;
  status: string; published_at: string | null; closes_at: string | null;
};
type Payload = { tasks?: Task[]; task?: Task; error?: string };

const panel: React.CSSProperties = { background: "#fff", border: "1px solid #e1e7ef", borderRadius: 14, padding: 18 };

export default function ContributionTasksAdminClient() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("資料查核");
  const [criteria, setCriteria] = useState("內容正確，附上可核對來源\n符合任務指定格式\n不得複製他人提交");
  const [reward, setReward] = useState("50");
  const [closesAt, setClosesAt] = useState("");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function load() {
    const response = await fetch("/api/admin/contribution/tasks", { cache: "no-store" });
    const data = await response.json() as Payload;
    if (!response.ok) throw new Error(data.error ?? "無法載入任務。");
    setTasks(data.tasks ?? []);
  }

  useEffect(() => { void load().catch(reason => setError(reason instanceof Error ? reason.message : "載入失敗。")); }, []);

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy("create"); setError(""); setNotice("");
    try {
      const response = await fetch("/api/admin/contribution/tasks", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title, description, category,
          acceptanceCriteria: criteria.split("\n").map(item => item.trim()).filter(Boolean),
          rewardAmount: Number(reward),
          closesAt: closesAt ? new Date(closesAt).toISOString() : null,
        }),
      });
      const data = await response.json() as Payload;
      if (!response.ok) throw new Error(data.error ?? "建立失敗。");
      setTitle(""); setDescription(""); setNotice("任務已建立為草稿，檢查內容後再發布。");
      await load();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "建立失敗。"); }
    finally { setBusy(""); }
  }

  async function act(task: Task, action: "publish" | "pause" | "close") {
    if (action === "close" && !window.confirm("確定要關閉這項任務？")) return;
    setBusy(task.id); setError(""); setNotice("");
    try {
      const response = await fetch("/api/admin/contribution/tasks", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId: task.id, action }),
      });
      const data = await response.json() as Payload;
      if (!response.ok) throw new Error(data.error ?? "任務狀態更新失敗。");
      setNotice("任務狀態已更新：" + data.task?.status);
      await load();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "更新失敗。"); }
    finally { setBusy(""); }
  }

  const field: React.CSSProperties = { width: "100%", border: "1px solid #dce3ec", borderRadius: 9, padding: 11, font: "inherit", fontSize: 12 };
  return (
    <main style={{ minHeight: "100vh", background: "#f4f7fb", color: "#17263b", padding: "30px 16px" }}>
      <section style={{ maxWidth: 1080, margin: "0 auto" }}>
        <Link href="/account" style={{ color: "#315d91", textDecoration: "none", fontSize: 13 }}>← 會員帳戶</Link>
        <p style={{ color: "#64748b", fontSize: 11, letterSpacing: 1.5, fontWeight: 700, marginTop: 24 }}>TASK MANAGEMENT</p>
        <h1 style={{ fontSize: 29, margin: "8px 0" }}>貢獻任務管理</h1>
        <p style={{ color: "#64748b", fontSize: 13, lineHeight: 1.8 }}>建立草稿、確認驗收標準及報酬後再發布。發布任務前請確保報酬來源與交付規則清楚，不以未來分潤代替已承諾報酬。</p>
        {error && <p role="alert" style={{ color: "#b42318", background: "#fff1f0", borderRadius: 9, padding: 12, fontSize: 12 }}>{error}</p>}
        {notice && <p role="status" style={{ color: "#24724f", background: "#edf8f2", borderRadius: 9, padding: 12, fontSize: 12 }}>{notice}</p>}
        <form onSubmit={create} style={{ ...panel, display: "grid", gap: 11, margin: "18px 0" }}>
          <h2 style={{ fontSize: 17, margin: 0 }}>建立新任務</h2>
          <input value={title} onChange={e => setTitle(e.target.value)} maxLength={180} placeholder="任務標題" required style={field}/>
          <textarea value={description} onChange={e => setDescription(e.target.value)} maxLength={5000} rows={4} placeholder="任務內容、工作範圍與交付要求（至少 20 字）" required style={field}/>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 10 }}>
            <input value={category} onChange={e => setCategory(e.target.value)} maxLength={40} placeholder="任務分類" required style={field}/>
            <input type="number" min="0" max="100000" step="0.01" value={reward} onChange={e => setReward(e.target.value)} placeholder="報酬 TWD" required style={field}/>
            <input type="datetime-local" value={closesAt} onChange={e => setClosesAt(e.target.value)} style={field}/>
          </div>
          <textarea value={criteria} onChange={e => setCriteria(e.target.value)} rows={4} maxLength={5000} placeholder="每行一項驗收條件" required style={field}/>
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button disabled={busy === "create"} type="submit" style={{ border: 0, borderRadius: 9, padding: "11px 18px", background: "#315d91", color: "#fff", fontWeight: 700 }}>{busy === "create" ? "建立中…" : "建立草稿"}</button>
          </div>
        </form>
        <section style={{ display: "grid", gap: 12 }}>
          <h2 style={{ fontSize: 17, margin: "8px 0 0" }}>任務清單</h2>
          {tasks.length === 0 ? <div style={panel}><p style={{ color: "#64748b", fontSize: 12 }}>尚未建立任務。</p></div> : tasks.map(task => <article key={task.id} style={panel}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <div><span style={{ color: "#5571c7", fontSize: 10 }}>{task.status}</span><h3 style={{ fontSize: 15, margin: "5px 0" }}>{task.title}</h3><p style={{ color: "#64748b", fontSize: 11, margin: 0 }}>{task.category} · {Number(task.reward_amount).toFixed(2)} {task.reward_currency}</p></div>
              <div style={{ display: "flex", gap: 7, alignItems: "center", flexWrap: "wrap" }}>
                {task.status === "draft" || task.status === "paused" ? <button type="button" disabled={!!busy} onClick={() => void act(task,"publish")} style={{ border: 0, borderRadius: 8, background: "#315d91", color: "#fff", padding: "8px 12px" }}>發布</button> : null}
                {task.status === "published" ? <button type="button" disabled={!!busy} onClick={() => void act(task,"pause")} style={{ border: "1px solid #dce3ec", borderRadius: 8, background: "#fff", color: "#315d91", padding: "8px 12px" }}>暫停</button> : null}
                {["draft","published","paused"].includes(task.status) ? <button type="button" disabled={!!busy} onClick={() => void act(task,"close")} style={{ border: "1px solid #e6c7c7", borderRadius: 8, background: "#fff", color: "#a33c3c", padding: "8px 12px" }}>關閉</button> : null}
              </div>
            </div>
            <p style={{ color: "#64748b", fontSize: 11, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{task.description}</p>
            <ul style={{ color: "#64748b", fontSize: 11, lineHeight: 1.7 }}>{(task.acceptance_criteria ?? []).map((item,index) => <li key={index}>{item}</li>)}</ul>
          </article>)}
        </section>
      </section>
    </main>
  );
}
