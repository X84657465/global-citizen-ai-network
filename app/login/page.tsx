"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type Mode = "signin" | "signup";

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const configured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  );
  const signupEnabled = process.env.NEXT_PUBLIC_ENABLE_PUBLIC_SIGNUP === "true";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    if (!configured) {
      setMessage("會員系統尚未完成後端設定，目前不能登入或建立帳戶。");
      return;
    }
    if (mode === "signup" && !signupEnabled) {
      setMessage("公開註冊尚未開放，平台完成隱私權與服務條款審查後才會啟用。");
      return;
    }

    setBusy(true);
    try {
      const supabase = createClient();
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        window.location.assign("/");
      } else {
        const response = await fetch("/api/auth/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error ?? "目前無法建立帳戶。");
        setMessage("註冊資料已送出，請依照驗證郵件完成電子郵件確認。");
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "目前無法完成要求，請稍後再試。");
    } finally {
      setBusy(false);
    }
  }

  const inputStyle = {
    width: "100%",
    boxSizing: "border-box" as const,
    border: "1px solid #d8dee8",
    borderRadius: 12,
    padding: "13px 14px",
    fontSize: 15,
    background: "#fff",
    color: "#152238",
  };

  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24, background: "linear-gradient(135deg,#f4f7fb,#eaf0f8)", color: "#152238" }}>
      <section style={{ width: "100%", maxWidth: 440, background: "#fff", border: "1px solid #e1e7ef", borderRadius: 22, padding: 30, boxShadow: "0 18px 60px rgba(24,45,78,.08)" }}>
        <Link href="/" style={{ color: "#315d91", textDecoration: "none", fontSize: 13 }}>← 返回平台首頁</Link>
        <div style={{ marginTop: 26, marginBottom: 24 }}>
          <div style={{ width: 48, height: 48, display: "grid", placeItems: "center", borderRadius: 15, background: "#eaf2fc", color: "#315d91", fontSize: 23 }}>◎</div>
          <h1 style={{ fontSize: 27, margin: "18px 0 8px", letterSpacing: "-.6px" }}>全球公民 AI 網路</h1>
          <p style={{ margin: 0, color: "#64748b", lineHeight: 1.7 }}>讓每個人都能使用 AI，也能透過知識與貢獻共同建設 AI。</p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", padding: 4, borderRadius: 12, background: "#f1f4f8", marginBottom: 22 }}>
          <button type="button" onClick={() => { setMode("signin"); setMessage(""); }} style={{ border: 0, borderRadius: 9, padding: 10, background: mode === "signin" ? "#fff" : "transparent", color: "#152238", fontWeight: 700 }}>登入</button>
          <button type="button" onClick={() => { setMode("signup"); setMessage(""); }} disabled={!signupEnabled} style={{ border: 0, borderRadius: 9, padding: 10, background: mode === "signup" ? "#fff" : "transparent", color: signupEnabled ? "#152238" : "#9aa6b5", fontWeight: 700, cursor: signupEnabled ? "pointer" : "not-allowed" }}>建立帳戶</button>
        </div>

        <form onSubmit={submit} style={{ display: "grid", gap: 14 }}>
          <label style={{ display: "grid", gap: 7, fontSize: 13, fontWeight: 700 }}>電子郵件
            <input type="email" autoComplete="email" required value={email} onChange={event => setEmail(event.target.value)} placeholder="name@example.com" style={inputStyle} />
          </label>
          <label style={{ display: "grid", gap: 7, fontSize: 13, fontWeight: 700 }}>密碼
            <input type="password" autoComplete={mode === "signin" ? "current-password" : "new-password"} minLength={12} required value={password} onChange={event => setPassword(event.target.value)} placeholder="至少 12 個字元" style={inputStyle} />
          </label>
          <button type="submit" disabled={busy || !configured || (mode === "signup" && !signupEnabled)} style={{ border: 0, borderRadius: 12, padding: 14, marginTop: 4, background: "#244f83", color: "#fff", fontSize: 15, fontWeight: 700, opacity: busy || !configured || (mode === "signup" && !signupEnabled) ? .55 : 1 }}>
            {busy ? "處理中…" : mode === "signin" ? "登入平台" : "建立帳戶"}
          </button>
        </form>

        {!configured && <p style={{ marginTop: 18, padding: 12, borderRadius: 10, background: "#fff7e8", color: "#805b1b", fontSize: 13, lineHeight: 1.6 }}>目前是開發原型，尚未連接會員資料庫。完成 Supabase 專案設定後即可啟用登入。</p>}
        {configured && !signupEnabled && <p style={{ marginTop: 18, padding: 12, borderRadius: 10, background: "#f4f6f9", color: "#526174", fontSize: 13, lineHeight: 1.6 }}>公開註冊預設關閉，避免在服務條款、隱私權及客服流程尚未完成前收集真實會員資料。</p>}
        {message && <p role="status" style={{ marginTop: 16, padding: 12, borderRadius: 10, background: "#edf5ff", color: "#244f83", fontSize: 13, lineHeight: 1.6 }}>{message}</p>}
        <p style={{ marginTop: 24, fontSize: 11, color: "#8995a5", lineHeight: 1.6 }}>請勿在測試階段輸入其他服務使用中的重要密碼。平台尚未正式開放註冊。</p>
      </section>
    </main>
  );
}
