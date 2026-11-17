import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, preferred_language, role, account_status, created_at")
    .eq("id", user.id)
    .maybeSingle();

  return (
    <main style={{ minHeight: "100vh", background: "#f3f6fa", padding: 24, color: "#17263b" }}>
      <section style={{ maxWidth: 760, margin: "40px auto", background: "#fff", border: "1px solid #e1e7ef", borderRadius: 20, padding: 28 }}>
        <Link href="/" style={{ color: "#315d91", textDecoration: "none" }}>← 返回平台</Link>
        <p style={{ margin: "28px 0 8px", color: "#64748b", fontSize: 12, letterSpacing: 1 }}>MEMBER ACCOUNT</p>
        <h1 style={{ margin: "0 0 8px", fontSize: 28 }}>會員帳戶</h1>
        <p style={{ color: "#64748b", lineHeight: 1.7 }}>這是登入後的私人帳戶頁面，資料由伺服器端驗證登入狀態後讀取。</p>
        <div style={{ display: "grid", gap: 12, marginTop: 24 }}>
          <Info label="電子郵件" value={user.email ?? "未提供"} />
          <Info label="顯示名稱" value={profile?.display_name ?? "尚未設定"} />
          <Info label="語言" value={profile?.preferred_language ?? "zh-TW"} />
          <Info label="帳戶角色" value={profile?.role ?? "member"} />
          <Info label="帳戶狀態" value={profile?.account_status ?? "待確認"} />
          <Info label="會員識別碼" value={user.id} />
        </div>
        <form action="/auth/signout" method="post" style={{ marginTop: 26 }}>
          <button type="submit" style={{ border: 0, borderRadius: 10, padding: "12px 18px", background: "#244f83", color: "#fff", fontWeight: 700, cursor: "pointer" }}>安全登出</button>
        </form>
      </section>
    </main>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 18, padding: "13px 14px", borderRadius: 10, background: "#f6f8fb" }}>
      <span style={{ color: "#64748b", fontSize: 13 }}>{label}</span>
      <strong style={{ fontSize: 13, fontWeight: 600, overflowWrap: "anywhere", textAlign: "right" }}>{value}</strong>
    </div>
  );
}
