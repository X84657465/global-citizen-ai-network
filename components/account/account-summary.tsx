import Link from "next/link";
import styles from "./account-summary.module.css";

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
    <div className={styles.infoRow}>
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
    <main className={styles.accountPage}>
      <section className={styles.accountCard} aria-labelledby="account-title">
        <Link className={`${styles.accountLink} ${styles.backLink}`} href="/">← 返回平台</Link>
        <header className={styles.accountHeader}>
          <p className={styles.eyebrow}>MEMBER ACCOUNT</p>
          <h1 id="account-title">會員帳戶</h1>
          <p className={styles.intro}>在這裡查看帳戶基本資料與可使用的平台功能，安全性與登入狀態由伺服器端驗證。</p>
        </header>

        <section aria-labelledby="profile-heading">
          <h2 id="profile-heading" className={styles.sectionTitle}>基本資料</h2>
          <dl className={styles.infoList}>
            <InfoRow label="電子郵件" value={email ?? "未提供"} />
            <InfoRow label="顯示名稱" value={profile?.display_name ?? "尚未設定"} />
            <InfoRow label="偏好語言" value={profile?.preferred_language ?? "zh-TW"} />
            <InfoRow label="帳戶角色" value={roleLabels[role] ?? "一般會員"} />
            <InfoRow label="帳戶狀態" value={statusLabels[status] ?? "待確認"} />
            <InfoRow label="加入日期" value={formatDate(profile?.created_at)} />
          </dl>
        </section>

        <nav className={styles.accountActions} aria-label="帳戶功能">
          <h2 className={styles.sectionTitle}>平台功能</h2>
          <Link className={`${styles.accountLink} ${styles.actionLink}`} href="/contributions">查看我的貢獻與獎勵</Link>
          {isActiveAdmin ? <Link className={`${styles.accountLink} ${styles.actionLink}`} href="/admin/contribution-tasks">管理貢獻任務</Link> : null}
          {canReview ? <Link className={`${styles.accountLink} ${styles.actionLink}`} href="/admin/appeals">處理貢獻申訴</Link> : null}
          {canReview ? <Link className={`${styles.accountLink} ${styles.actionLink}`} href="/admin/contributions">開啟貢獻成果審核</Link> : null}
          {isActiveAdmin ? <Link className={`${styles.accountLink} ${styles.actionLink}`} href="/admin/ai-costs">查看 AI 成本透明中心</Link> : null}
          {isActiveAdmin ? <Link className={`${styles.accountLink} ${styles.actionLink}`} href="/admin/ai-operations">開啟 AI 營運安全中心</Link> : null}
        </nav>

        <form action="/auth/signout" method="post" className={styles.signoutForm}>
          <button className={styles.signoutButton} type="submit" aria-label="安全登出會員帳戶">安全登出</button>
        </form>
      </section>
    </main>
  );
}
