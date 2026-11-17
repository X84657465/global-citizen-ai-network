"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type FormEvent } from "react";

type Project = {
  id: string;
  title: string;
  description: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
};

export default function ProjectsClient() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [includeArchived, setIncludeArchived] = useState(true);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [editingProjectId, setEditingProjectId] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/projects?includeArchived=true", { cache: "no-store" });
      const data = await response.json() as { projects?: Project[]; error?: string };
      if (!response.ok) throw new Error(data.error ?? "無法載入專案。");
      setProjects(data.projects ?? []);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "無法載入專案。");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function createProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusyId("create");
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ title, description: description.trim() || null }),
      });
      const data = await response.json() as { project?: Project; error?: string };
      if (!response.ok) throw new Error(data.error ?? "建立專案失敗。");
      setTitle("");
      setDescription("");
      setNotice("專案已建立。");
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "建立專案失敗。");
    } finally {
      setBusyId("");
    }
  }

  function beginEdit(project: Project) {
    setEditingProjectId(project.id);
    setEditTitle(project.title);
    setEditDescription(project.description ?? "");
    setError("");
    setNotice("");
  }

  async function saveProject(project: Project) {
    setBusyId(project.id);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/projects/" + project.id, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ title: editTitle, description: editDescription.trim() || null }),
      });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "更新專案資料失敗。");
      setEditingProjectId("");
      setNotice("專案資料已更新。");
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "更新專案資料失敗。");
    } finally {
      setBusyId("");
    }
  }

  async function setArchived(project: Project, archived: boolean) {
    setBusyId(project.id);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/projects/" + project.id, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ archived }),
      });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "更新專案狀態失敗。");
      setNotice(archived ? "專案已封存，可隨時還原。" : "專案已還原。");
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "更新專案狀態失敗。");
    } finally {
      setBusyId("");
    }
  }

  const visibleProjects = projects.filter(project => includeArchived || !project.archived_at);
  const activeCount = projects.filter(project => !project.archived_at).length;
  const archivedCount = projects.length - activeCount;

  return (
    <main style={{ minHeight: "100vh", background: "#f4f7fb", color: "#17263b", padding: "30px 16px" }}>
      <section style={{ maxWidth: 1000, margin: "0 auto" }}>
        <nav style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          <Link href="/workspace" style={{ color: "#315d91", textDecoration: "none", fontSize: 13 }}>← 返回 AI 工作空間</Link>
          <Link href="/account" style={{ color: "#315d91", textDecoration: "none", fontSize: 13 }}>會員帳戶</Link>
        </nav>
        <header style={{ margin: "26px 0 22px" }}>
          <p style={{ color: "#64748b", fontSize: 11, letterSpacing: 1.5, fontWeight: 700 }}>PROJECT MANAGEMENT</p>
          <h1 style={{ fontSize: 30, margin: "8px 0" }}>我的專案</h1>
          <p style={{ color: "#64748b", fontSize: 13, lineHeight: 1.8, margin: 0 }}>把研究、工作與長期目標整理成獨立專案，封存不再使用的專案，也能隨時還原。</p>
        </header>

        <form onSubmit={createProject} style={{ display: "grid", gap: 10, background: "#fff", border: "1px solid #e1e7ef", borderRadius: 14, padding: 18, marginBottom: 16 }}>
          <strong style={{ fontSize: 14 }}>建立新專案</strong>
          <label style={{ display: "grid", gap: 5, fontSize: 12 }}>專案名稱
            <input required minLength={1} maxLength={160} value={title} onChange={e => setTitle(e.target.value)} placeholder="例如：市場研究、產品開發、學習計畫" style={{ padding: 10, border: "1px solid #cbd5e1", borderRadius: 8 }} />
          </label>
          <label style={{ display: "grid", gap: 5, fontSize: 12 }}>專案說明（選填）
            <textarea maxLength={4000} rows={3} value={description} onChange={e => setDescription(e.target.value)} placeholder="簡述這個專案的目標與範圍" style={{ padding: 10, border: "1px solid #cbd5e1", borderRadius: 8, resize: "vertical" }} />
          </label>
          <button type="submit" disabled={busyId === "create" || !title.trim()} style={{ justifySelf: "start", border: 0, borderRadius: 8, background: "#315d91", color: "#fff", padding: "10px 15px", fontWeight: 700 }}>
            {busyId === "create" ? "建立中…" : "建立專案"}
          </button>
        </form>

        <section style={{ background: "#fff", border: "1px solid #e1e7ef", borderRadius: 14, padding: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 14 }}>
            <div><h2 style={{ fontSize: 16, margin: 0 }}>專案清單</h2><p style={{ color: "#64748b", fontSize: 11, margin: "5px 0 0" }}>進行中 {activeCount} 個 · 已封存 {archivedCount} 個</p></div>
            <label style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 11, color: "#64748b" }}>
              <input type="checkbox" checked={includeArchived} onChange={e => setIncludeArchived(e.target.checked)} />
              顯示已封存專案
            </label>
          </div>
          {error && <p role="alert" style={{ color: "#b42318", background: "#fff1f0", padding: 10, borderRadius: 7, fontSize: 12 }}>{error}</p>}
          {notice && <p role="status" style={{ color: "#166534", background: "#f0fdf4", padding: 10, borderRadius: 7, fontSize: 12 }}>{notice}</p>}
          {loading ? <p style={{ color: "#64748b", fontSize: 12 }}>載入專案中…</p> :
            visibleProjects.length === 0 ? <p style={{ color: "#64748b", fontSize: 12 }}>目前沒有符合條件的專案。</p> :
              <div style={{ display: "grid", gap: 10 }}>
                {visibleProjects.map(project => <article key={project.id} style={{ border: "1px solid #edf1f5", borderRadius: 10, padding: 14, display: "flex", justifyContent: "space-between", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
                  <div style={{ minWidth: 220, flex: 1 }}>
                    {editingProjectId === project.id ? (
                      <div style={{ display: "grid", gap: 8 }}>
                        <label style={{ display: "grid", gap: 4, fontSize: 11 }}>專案名稱
                          <input value={editTitle} onChange={event => setEditTitle(event.target.value)} maxLength={160} required style={{ padding: 8, border: "1px solid #cbd5e1", borderRadius: 7 }} />
                        </label>
                        <label style={{ display: "grid", gap: 4, fontSize: 11 }}>專案說明
                          <textarea value={editDescription} onChange={event => setEditDescription(event.target.value)} maxLength={4000} rows={2} style={{ padding: 8, border: "1px solid #cbd5e1", borderRadius: 7, resize: "vertical" }} />
                        </label>
                      </div>
                    ) : (
                      <>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                          <strong style={{ fontSize: 13 }}>{project.title}</strong>
                          <span style={{ fontSize: 10, borderRadius: 20, padding: "4px 7px", background: project.archived_at ? "#f1f5f9" : "#ecfdf5", color: project.archived_at ? "#64748b" : "#047857" }}>{project.archived_at ? "已封存" : "進行中"}</span>
                        </div>
                        {project.description && <p style={{ color: "#64748b", fontSize: 11, lineHeight: 1.7, margin: "6px 0" }}>{project.description}</p>}
                        <p style={{ color: "#94a3b8", fontSize: 10, margin: "6px 0 0" }}>最後更新：{new Date(project.updated_at).toLocaleString("zh-TW")}</p>
                      </>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
                    {editingProjectId === project.id ? (
                      <>
                        <button type="button" onClick={() => void saveProject(project)} disabled={busyId === project.id || !editTitle.trim()} style={{ border: 0, borderRadius: 7, background: "#315d91", color: "#fff", padding: "8px 12px", fontSize: 11 }}>{busyId === project.id ? "儲存中…" : "儲存"}</button>
                        <button type="button" onClick={() => setEditingProjectId("")} disabled={busyId === project.id} style={{ border: "1px solid #cbd5e1", borderRadius: 7, background: "#fff", color: "#334155", padding: "8px 12px", fontSize: 11 }}>取消</button>
                      </>
                    ) : (
                      <>
                        <button type="button" onClick={() => beginEdit(project)} disabled={Boolean(busyId)} style={{ border: "1px solid #cbd5e1", borderRadius: 7, background: "#fff", color: "#334155", padding: "8px 12px", fontSize: 11 }}>編輯</button>
                        <button type="button" onClick={() => void setArchived(project, !project.archived_at)} disabled={Boolean(busyId)} style={{ border: "1px solid #cbd5e1", borderRadius: 7, background: "#fff", color: "#334155", padding: "8px 12px", fontSize: 11 }}>
                          {busyId === project.id ? "更新中…" : project.archived_at ? "還原專案" : "封存專案"}
                        </button>
                      </>
                    )}
                  </div>
                </article>)}
              </div>}
        </section>
      </section>
    </main>
  );
}
