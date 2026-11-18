import Link from "next/link";

type AccountProfile = {
  display_name: string | null;
  preferred_language: string | null;
  role: string | null;
  account_status: string | null;
  created_at: string | null;
};

type AccountSummaryProps = {
  email: string | null;
  profile: AccountProfile | null;
};

const roleLabels: Record<string, string> = {
  admin: "管理員",
  reviewer: "審核人員",
  member: "一般會員",
};

const statusLabels: Record<string, string> = {
  active: "正常使用",
  inactive: "尚未啟用",
  suspended: "暫停使用",
  closed: "已關閉",
};

function formatDate(value: string | null | undefined) {
  if (!value) return "尚未提供";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "尚未提供";
  return new Intl.DateTimeFormat("zh-TW", { dateStyle: "medium" }).format(date);
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="info-row">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

export default function AccountSummary({ email, profile }: AccountSummaryProps) {
  const role = profile?.role ?? "member";
  const status = profile?.account_status ?? "unknown";
  const isActiveAdmin = role === "admin" && status === "active";
  const canReview = ["admin", "reviewer"].includes(role) && status === "active";

  return (
    <main className="account-page">
      <section className="account-card" aria-labelledby="account-title">
        <Link className="account-link back-link" href="/">← 返回平台</Link>
        <header className="account-header">
          <p className="eyebrow">MEMBER ACCOUNT</p>
          <h1 id="account-title">會員帳戶</h1>
          <p className="intro">在這裡查看帳戶基本資料與可使用的平台功能，安全性與登入狀態由伺服器端驗證。</p>
        </header>

        <section aria-labelledby="profile-heading">
          <h2 id="profile-heading" className="section-title">基本資料</h2>
          <dl className="info-list">
            <InfoRow label="電子郵件" value={email ?? "未提供"} />
            <InfoRow label="顯示名稱" value={profile?.display_name ?? "尚未設定"} />
            <InfoRow label="偏好語言" value={profile?.preferred_language ?? "zh-TW"} />
            <InfoRow label="帳戶角色" value={roleLabels[role] ?? "一般會員"} />
            <InfoRow label="帳戶狀態" value={statusLabels[status] ?? "待確認"} />
            <InfoRow label="加入日期" value={formatDate(profile?.created_at)} />
          </dl>
        </section>

        <nav className="account-actions" aria-label="帳戶功能">
          <h2 className="section-title">平台功能</h2>
          <Link className="account-link action-link" href="/contributions">查看我的貢獻與獎勵</Link>
          {isActiveAdmin ? <Link className="account-link action-link" href="/admin/contribution-tasks">管理貢獻任務</Link> : null}
          {canReview ? <Link className="account-link action-link" href="/admin/appeals">處理貢獻申訴</Link> : null}
          {canReview ? <Link className="account-link action-link" href="/admin/contributions">開啟貢獻成果審核</Link> : null}
          {isActiveAdmin ? <Link className="account-link action-link" href="/admin/ai-costs">查看 AI 成本透明中心</Link> : null}
          {isActiveAdmin ? <Link className="account-link action-link" href="/admin/ai-operations">開啟 AI 營運安全中心</Link> : null}
        </nav>

        <form action="/auth/signout" method="post" className="signout-form">
          <button className="signout-button" type="submit" aria-label="安全登出會員帳戶">安全登出</button>
        </form>
      </section>

      <style jsx global>{`
        .account-page { min-height: 100vh; background: #f3f6fa; padding: 24px 16px; color: #17263b; }
        .account-card { box-sizing: border-box; max-width: 760px; margin: 24px auto; padding: clamp(20px, 4vw, 32px); background: #fff; border: 1px solid #e1e7ef; border-radius: 20px; }
        .account-header { margin: 28px 0 24px; }
        .eyebrow { margin: 0 0 8px; color: #64748b; font-size: 12px; letter-spacing: 1px; }
        .account-header h1 { margin: 0 0 8px; font-size: clamp(24px, 5vw, 30px); }
        .intro { margin: 0; color: #64748b; line-height: 1.75; font-size: 14px; }
        .section-title { margin: 22px 0 12px; font-size: 16px; }
        .info-list { display: grid; gap: 9px; margin: 0; }
        .info-row { display: grid; grid-template-columns: minmax(90px, 1fr) minmax(0, 2fr); gap: 16px; align-items: start; padding: 13px 14px; border-radius: 10px; background: #f6f8fb; }
        .info-row dt { color: #64748b; font-size: 13px; }
        .info-row dd { margin: 0; font-size: 13px; font-weight: 600; text-align: right; overflow-wrap: anywhere; }
        .account-actions { display: grid; gap: 9px; margin-top: 20px; }
        .account-actions .section-title { margin-bottom: 3px; }
        .account-link { color: #315d91; text-decoration: none; border-radius: 9px; }
        .back-link { display: inline-block; font-size: 13px; }
        .action-link { display: block; padding: 13px 15px; background: #f1f6fc; font-size: 13px; font-weight: 650; }
        .signout-form { margin-top: 24px; }
        .signout-button { border: 0; border-radius: 10px; padding: 12px 18px; background: #244f83; color: #fff; font-weight: 700; cursor: pointer; }
        .account-link:focus-visible, .signout-button:focus-visible { outline: 3px solid #e09b26; outline-offset: 3px; }
        .account-link:hover { text-decoration: underline; }
        @media (max-width: 420px) { .info-row { grid-template-columns: 1fr; gap: 5px; } .info-row dd { text-align: left; } }
      `}</style>
    </main>
  );
}
