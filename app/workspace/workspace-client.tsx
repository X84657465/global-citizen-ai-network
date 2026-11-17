"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type CSSProperties, type FormEvent } from "react";
import { hasPendingRetryContentMismatch } from "@/lib/ai/pending-retry";

type Conversation = { id: string; title: string; updated_at: string };
type Message = { id?: string; role: "user" | "assistant"; content: string; created_at?: string };
type ApiError = { error?: string; retryWithSameKey?: boolean };

function pendingKeyStorageKey(conversationId: string) {
  return `gcan:pending-ai:${conversationId}`;
}
function readStoredPendingKey(conversationId: string) {
  try { return sessionStorage.getItem(pendingKeyStorageKey(conversationId)) ?? ""; }
  catch { return ""; }
}
function storePendingKey(conversationId: string, key: string) {
  try { sessionStorage.setItem(pendingKeyStorageKey(conversationId), key); }
  catch { /* In-memory idempotency still protects the current page session. */ }
}
function clearStoredPendingKey(conversationId: string) {
  try { sessionStorage.removeItem(pendingKeyStorageKey(conversationId)); }
  catch { /* Storage may be unavailable in restricted browser contexts. */ }
}
function findStoredPendingConversationId(exceptId = "") {
  try {
    for (let index = 0; index < sessionStorage.length; index += 1) {
      const key = sessionStorage.key(index);
      if (!key || !key.startsWith("gcan:pending-ai:")) continue;
      const id = key.slice("gcan:pending-ai:".length);
      if (id && id !== exceptId && sessionStorage.getItem(key)) return id;
    }
  } catch { /* Storage may be unavailable in restricted browser contexts. */ }
  return "";
}

const shell: CSSProperties = { minHeight: "100vh", background: "#f4f7fb", color: "#17263b", padding: "28px 16px" };
const card: CSSProperties = { background: "#fff", border: "1px solid #e1e7ef", borderRadius: 16 };

export default function WorkspaceClient() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [conversationId, setConversationId] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [prompt, setPrompt] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("已連接會員工作區。AI 服務仍須由管理員完成供應商與預算設定後才能啟用。");
  const [pendingKey, setPendingKey] = useState("");
  const [pendingConversationId, setPendingConversationId] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const conversationLoadRef = useRef(0);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/conversations", { cache: "no-store" })
      .then(async response => {
        const data = await response.json() as { conversations?: Conversation[] } & ApiError;
        if (!response.ok) throw new Error(data.error ?? "無法載入對話。");
        if (!cancelled) {
          setConversations(data.conversations ?? []);
          setPendingConversationId(findStoredPendingConversationId());
        }
      })
      .catch(reason => { if (!cancelled) setError(reason instanceof Error ? reason.message : "無法載入對話。"); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  async function openConversation(id: string) {
    if (busy) return;
    const loadId = ++conversationLoadRef.current;
    setError("");
    const response = await fetch("/api/conversations/" + id + "/messages", { cache: "no-store" });
    const data = await response.json() as { messages?: Message[] } & ApiError;
    if (loadId !== conversationLoadRef.current) return;
    if (!response.ok) {
      setError(data.error ?? "無法載入訊息。");
      return;
    }
    const visibleMessages = (data.messages ?? []).filter(message => message.role === "user" || message.role === "assistant");
    setConversationId(id);
    setMessages(visibleMessages);
    const storedKey = readStoredPendingKey(id);
    setPendingKey(storedKey);
    setPendingConversationId(storedKey ? id : findStoredPendingConversationId(id));
    if (storedKey && visibleMessages.length > 0 && visibleMessages[visibleMessages.length - 1].role === "user") {
      setPrompt(visibleMessages[visibleMessages.length - 1].content);
      setNotice("上一個 AI 請求結果尚待確認，重試時會沿用原冪等鍵，避免重複呼叫供應商。");
    } else if (storedKey && visibleMessages.length > 0 && visibleMessages[visibleMessages.length - 1].role === "assistant") {
      // The atomic server transaction committed successfully before the browser lost its response.
      clearStoredPendingKey(id);
      setPendingKey("");
      setPendingConversationId(findStoredPendingConversationId(id));
    }
  }

  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const content = prompt.trim();
    if (!content || busy) return;
    const otherPendingConversationId = findStoredPendingConversationId(conversationId);
    if (otherPendingConversationId) {
      setError("另一個對話的 AI 請求尚未確認，請先開啟該對話，沿用原冪等鍵完成重試或等待管理員核對，避免產生第二筆費用。");
      setNotice("系統已暫停新的 AI 請求，直到上一筆未知結果獲得確認。");
      return;
    }
    const existingPendingKey = pendingKey || (conversationId ? readStoredPendingKey(conversationId) : "");
    if (hasPendingRetryContentMismatch(existingPendingKey, messages[messages.length - 1], content)) {
      setError("上一筆 AI 請求尚未確認，為避免重複計費，請先恢復原始訊息並使用相同冪等鍵重試。");
      return;
    }
    setBusy(true);
    setError("");
    let activeId = conversationId;
    try {
      if (!activeId) {
        const createResponse = await fetch("/api/conversations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: content.slice(0, 60) || "新對話" }),
        });
        const created = await createResponse.json() as { conversation?: Conversation } & ApiError;
        if (!createResponse.ok || !created.conversation) throw new Error(created.error ?? "無法建立對話。");
        activeId = created.conversation.id;
        setConversationId(activeId);
        setConversations(prev => [created.conversation!, ...prev]);
      }

      const key = pendingKey || readStoredPendingKey(activeId) || crypto.randomUUID();
      setPendingKey(key);
      setPendingConversationId(activeId);
      storePendingKey(activeId, key);
      setMessages(prev => prev.length > 0 && prev[prev.length - 1].role === "user" && prev[prev.length - 1].content === content ? prev : [...prev, { role: "user", content }]);
      setPrompt("");

      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Idempotency-Key": key },
        body: JSON.stringify({ conversationId: activeId, content }),
      });
      const data = await response.json() as { answer?: string; requestId?: string; costLabel?: string; usage?: { estimatedCostTwd?: number } } & ApiError;
      if (!response.ok) {
        if (data.retryWithSameKey !== true) {
          setPendingKey("");
          clearStoredPendingKey(activeId);
          setPendingConversationId(findStoredPendingConversationId(activeId));
        }
        throw new Error(data.error ?? "AI 請求未完成。");
      }
      setMessages(prev => [...prev, { role: "assistant", content: data.answer ?? "AI 沒有回傳內容。" }]);
      setNotice(data.costLabel ? data.costLabel + "。每次請求均經過預算與冪等性檢查。" : "AI 回覆完成。");
      setPendingKey("");
      clearStoredPendingKey(activeId);
      setPendingConversationId(findStoredPendingConversationId(activeId));
    } catch (reason) {
      if (activeId && readStoredPendingKey(activeId)) setPendingConversationId(activeId);
      setPrompt(content);
      setError(reason instanceof Error ? reason.message : "請求發生錯誤。");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main style={shell}>
      <section style={{ maxWidth: 1180, margin: "0 auto" }}>
        <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, marginBottom: 22 }}>
          <div>
            <Link href="/" style={{ color: "#315d91", textDecoration: "none", fontSize: 13 }}>← 平台首頁</Link>
            <h1 style={{ fontSize: 28, margin: "12px 0 4px" }}>AI 工作空間</h1>
            <p style={{ margin: 0, color: "#64748b", fontSize: 13 }}>你的研究、問題與對話紀錄由會員帳戶隔離保存。</p>
          </div>
          <button type="button" disabled={busy} onClick={() => { conversationLoadRef.current += 1; setConversationId(""); setMessages([]); setPendingKey(""); setError(""); }} style={{ border: "1px solid #d7e0eb", background: "#fff", color: "#315d91", borderRadius: 10, padding: "10px 14px", fontWeight: 700 }}>＋ 新對話</button>
        </header>

        {pendingConversationId && pendingConversationId !== conversationId && <p role="status" style={{ ...card, borderColor: "#f0d7a6", background: "#fff9ed", color: "#8a5a12", padding: 12, fontSize: 12, lineHeight: 1.7 }}>有一筆其他對話的 AI 請求尚未確認，為避免重複計費，目前暫停新請求，請先回到原對話完成相同冪等鍵重試或等待管理員核對。</p>}

        <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 280px", gap: 16 }}>
          <section style={{ ...card, minHeight: 620, display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <div style={{ padding: "15px 18px", borderBottom: "1px solid #edf1f5", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <strong style={{ fontSize: 14 }}>全球公民 AI 助理</strong>
              <span style={{ color: "#9a6b22", background: "#fff7e8", borderRadius: 20, padding: "5px 9px", fontSize: 10 }}>服務狀態依後端設定</span>
            </div>
            <div ref={scrollRef} style={{ padding: 18, flex: 1, minHeight: 390, maxHeight: 540, overflowY: "auto", display: "flex", flexDirection: "column", gap: 12 }}>
              {messages.length === 0 && <div style={{ margin: "auto", maxWidth: 440, textAlign: "center", color: "#64748b", lineHeight: 1.9 }}>
                <div style={{ fontSize: 30, marginBottom: 12 }}>✦</div>
                <strong style={{ color: "#243247" }}>讓 AI 協助你研究、整理與創作</strong>
                <p style={{ fontSize: 13 }}>輸入問題即可開始。若 AI 供應商尚未設定，系統會安全拒絕請求，不會偷偷呼叫付費 API。</p>
              </div>}
              {messages.map((message, index) => <div key={message.id ?? index} style={{ alignSelf: message.role === "user" ? "flex-end" : "flex-start", maxWidth: "88%", background: message.role === "user" ? "#edf3ff" : "#f5f7fa", borderRadius: 13, padding: "11px 14px", whiteSpace: "pre-wrap", fontSize: 13, lineHeight: 1.8 }}>
                <span style={{ display: "block", fontSize: 10, color: "#8290a4", marginBottom: 4 }}>{message.role === "user" ? "你" : "AI 助理"}</span>
                {message.content}
              </div>)}
              {busy && <div style={{ color: "#64748b", fontSize: 12 }}>正在安全檢查並處理請求…</div>}
            </div>
            <form onSubmit={send} style={{ borderTop: "1px solid #edf1f5", padding: 14 }}>
              {error && <p role="alert" style={{ color: "#b42318", background: "#fff1f0", padding: 10, borderRadius: 8, fontSize: 12 }}>{error}</p>}
              <textarea value={prompt} onChange={event => setPrompt(event.target.value)} maxLength={8000} placeholder="輸入你想研究或處理的問題…" rows={3} style={{ width: "100%", resize: "vertical", border: "1px solid #dce3ec", borderRadius: 10, padding: 12, outlineColor: "#8aa6d4", font: "inherit", fontSize: 13 }} />
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginTop: 9 }}>
                <span style={{ color: "#8995a5", fontSize: 10 }}>最多 8,000 字元 · 每次請求有預算上限</span>
                <button type="submit" disabled={busy || !prompt.trim()} style={{ border: 0, borderRadius: 9, padding: "10px 17px", background: "#315d91", color: "#fff", fontWeight: 700, opacity: busy || !prompt.trim() ? .5 : 1 }}>{busy ? "處理中…" : "送出問題"}</button>
              </div>
            </form>
          </section>

          <aside style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ ...card, padding: 16 }}>
              <strong style={{ fontSize: 13 }}>對話紀錄</strong>
              <div style={{ display: "grid", gap: 6, marginTop: 12 }}>
                {conversations.length === 0 ? <p style={{ color: "#8793a5", fontSize: 12 }}>尚無已保存的對話。</p> : conversations.map(item => <button key={item.id} type="button" disabled={busy} onClick={() => void openConversation(item.id)} style={{ textAlign: "left", border: conversationId === item.id ? "1px solid #9bb4db" : "1px solid #edf1f5", background: conversationId === item.id ? "#f1f6ff" : "#fff", borderRadius: 9, padding: 10, color: "#243247", fontSize: 11 }}>{item.title}<span style={{ display: "block", color: "#98a2b1", marginTop: 4 }}>{new Date(item.updated_at).toLocaleDateString("zh-TW")}</span></button>)}
              </div>
            </div>
            <div style={{ ...card, padding: 16 }}>
              <strong style={{ fontSize: 13 }}>資料與費用保護</strong>
              <ul style={{ paddingLeft: 17, color: "#64748b", fontSize: 11, lineHeight: 1.9 }}>
                <li>會員對話依 RLS 隔離</li>
                <li>伺服器端保存供應商金鑰</li>
                <li>每次請求先預留預算</li>
                <li>重試使用冪等鍵防止重複扣費</li>
                <li>供應商實際帳單與內部估算分開</li>
              </ul>
            </div>
            <div style={{ ...card, padding: 16, color: "#64748b", fontSize: 11, lineHeight: 1.8 }}>
              <strong style={{ color: "#243247", fontSize: 12 }}>系統訊息</strong>
              <p>{notice}</p>
              <Link href="/account" style={{ color: "#315d91" }}>會員帳戶設定 →</Link>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}
