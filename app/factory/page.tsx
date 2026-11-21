import Link from "next/link";
import {
  Activity,
  ArrowUpRight,
  Bot,
  CheckCircle2,
  CircleAlert,
  Clock3,
  GitBranch,
  ShieldCheck,
  Workflow,
} from "lucide-react";
import styles from "./factory.module.css";

const resources = [
  {
    id: "PR #207",
    title: "官網與工廠首頁更新",
    description: "集中檢視 A–O／P 官網內容、Agent Factory 操作入口與本輪候選修改。",
    detail: "候選版本 · 尚未合併",
    tone: "blue",
    href: "https://github.com/X84657465/global-citizen-ai-network/pull/207",
    action: "檢視 Pull Request",
  },
  {
    id: "A · FACTORY",
    title: "Agent Factory V2 工程主線",
    description: "查看工廠控制器、任務生命週期、隔離執行、證據封裝與復原能力。",
    detail: "工程分支 · 版本 2.0.80",
    tone: "green",
    href: "https://github.com/X84657465/global-citizen-ai-network/tree/feat/agent-factory-v2",
    action: "檢視 A 線工程",
  },
  {
    id: "CI / EVIDENCE",
    title: "自動化驗證與交付證據",
    description: "以實際 workflow run 與精確 commit SHA 判斷測試結果；本頁不複製或推測即時狀態。",
    detail: "即時狀態以 GitHub 為準",
    tone: "amber",
    href: "https://github.com/X84657465/global-citizen-ai-network/actions",
    action: "開啟 GitHub Actions",
  },
  {
    id: "REPOSITORY",
    title: "倉庫文件與版本基準",
    description: "查閱 README、版本清單、工程治理、變更紀錄與各工作線責任。",
    detail: "公開文件 · 可追溯",
    tone: "muted",
    href: "https://github.com/X84657465/global-citizen-ai-network",
    action: "開啟 GitHub 倉庫",
  },
];

const gates = [
  {
    title: "程式修改與版本同步",
    description: "首頁程式、樣式、版本檔與變更紀錄已提交至候選分支。",
    state: "已提交",
    tone: "green",
    icon: CheckCircle2,
  },
  {
    title: "精確 SHA CI 驗證",
    description: "必須確認最新提交的測試、型別、Lint、安全檢查與正式建置。",
    state: "待最新 CI 證據",
    tone: "amber",
    icon: Clock3,
  },
  {
    title: "Preview 與裝置驗收",
    description: "需取得對應最新 SHA 的 Preview，完成桌面、平板、手機與導覽檢查。",
    state: "待 Preview",
    tone: "muted",
    icon: Activity,
  },
  {
    title: "正式合併與 Production",
    description: "保留人工核准；未通過前不合併、不發布、不修改正式環境。",
    state: "未授權",
    tone: "muted",
    icon: ShieldCheck,
  },
];

const stages = [
  { title: "需求與影響分析", note: "首頁範圍已確認", done: true },
  { title: "程式與文件修改", note: "候選分支已提交", done: true },
  { title: "精確 SHA 自動測試", note: "等待最新結果", done: false },
  { title: "Preview 視覺驗收", note: "等待部署與檢查", done: false },
  { title: "人工核准", note: "保留人工決策", done: false },
  { title: "正式發布", note: "尚未授權", done: false },
];

export default function FactoryPage() {
  return (
    <main className={styles.page}>
      <aside className={styles.sidebar} aria-label="Agent Factory 導覽">
        <Link href="/" className={styles.brand} aria-label="返回 GCAN 官網首頁">
          <span className={styles.logo}>AF</span>
          <span>
            <b>AGENT FACTORY</b>
            <small>V2 · OPERATIONS</small>
          </span>
        </Link>
        <div className={styles.navLabel}>FACTORY CONTROL</div>
        <a className={styles.active} href="#overview" aria-label="營運總覽">
          <Activity size={17} />
          <span>營運總覽</span>
        </a>
        <a href="#resources" aria-label="工程入口">
          <Workflow size={17} />
          <span>工程入口</span>
        </a>
        <a href="#pipeline" aria-label="交付管線">
          <GitBranch size={17} />
          <span>交付管線</span>
        </a>
        <a href="#quality" aria-label="品質閘門">
          <ShieldCheck size={17} />
          <span>品質閘門</span>
        </a>
        <div className={styles.sidebarFoot}>
          <span className={styles.liveDot} />
          候選版本 · 非即時儀表板
        </div>
      </aside>

      <section className={styles.main}>
        <header className={styles.top}>
          <div><span>WORKSPACE /</span> FACTORY OVERVIEW</div>
          <div className={styles.topActions}>
            <a href="https://github.com/X84657465/global-citizen-ai-network/actions" target="_blank" rel="noreferrer">
              CI 執行紀錄 <ArrowUpRight size={14} />
            </a>
            <Link href="/">返回 GCAN 官網 <ArrowUpRight size={14} /></Link>
          </div>
        </header>

        <div className={styles.content} id="overview">
          <div className={styles.heading}>
            <div>
              <div className={styles.eyebrow}>AUTONOMOUS ENGINEERING SYSTEM · A LINE</div>
              <h1>Agent Factory 控制中心</h1>
              <p>以工程入口、可追溯證據與發布閘門為核心；即時任務與 Runner 遙測尚未接通時，不顯示虛構數字。</p>
            </div>
            <span className={styles.demo}>CANDIDATE · 0.3.119</span>
          </div>

          <section className={styles.releaseNotice} aria-label="候選版本狀態">
            <div className={styles.releaseIcon}><CircleAlert size={20} /></div>
            <div className={styles.releaseCopy}>
              <b>首頁候選更新 · PR #207</b>
              <p>本頁與官網首頁更新位於候選分支。最新 CI、Preview 與正式發布狀態，請以 GitHub 的實際紀錄為準。</p>
            </div>
            <div className={styles.releaseActions}>
              <a href="https://github.com/X84657465/global-citizen-ai-network/pull/207" target="_blank" rel="noreferrer">檢視 PR <ArrowUpRight size={14} /></a>
              <a href="https://github.com/X84657465/global-citizen-ai-network/actions" target="_blank" rel="noreferrer">檢視 CI <ArrowUpRight size={14} /></a>
            </div>
          </section>

          <div className={styles.stats} aria-label="工廠目前狀態">
            <article className={styles.statCard}>
              <span className={styles.statLabel}>工廠主線</span>
              <b className={styles.statValue}>A · Agent Factory V2</b>
              <small className={styles.statDetail}>獨立工程分支與版本管理</small>
            </article>
            <article className={styles.statCard}>
              <span className={styles.statLabel}>目前交付</span>
              <b className={styles.statValue}>PR #207</b>
              <small className={styles.statDetail}>首頁候選更新 · 尚未合併</small>
            </article>
            <article className={styles.statCard}>
              <span className={styles.statLabel}>驗證依據</span>
              <b className={styles.statValue}>Exact SHA CI</b>
              <small className={styles.statDetail}>以 workflow 實際結果為準</small>
            </article>
            <article className={styles.statCard}>
              <span className={styles.statLabel}>正式發布</span>
              <b className={styles.statValue}>受控鎖定</b>
              <small className={styles.statDetail}>未經核准不合併、不部署</small>
            </article>
          </div>

          <div className={styles.grid}>
            <section className={styles.panel} id="resources">
              <div className={styles.panelHead}>
                <div>
                  <h2>工程工作入口</h2>
                  <p>直接前往可查核的程式碼、PR、CI 與治理文件</p>
                </div>
                <span className={styles.pipelineTag}><Bot size={15} /> FACTORY RESOURCES</span>
              </div>
              <div className={styles.resourceList}>
                {resources.map((resource) => (
                  <article className={styles.resourceRow} key={resource.id}>
                    <div className={styles.resourceMain}>
                      <span className={styles.resourceEyebrow}>{resource.id}</span>
                      <b className={styles.resourceTitle}>{resource.title}</b>
                      <p className={styles.resourceDescription}>{resource.description}</p>
                      <span className={styles.resourceMeta}>{resource.detail}</span>
                    </div>
                    <div className={styles.resourceAside}>
                      <span className={styles[resource.tone]}>{resource.detail}</span>
                      <a href={resource.href} target="_blank" rel="noreferrer">
                        {resource.action} <ArrowUpRight size={14} />
                      </a>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <section className={styles.panel} id="quality">
              <div className={styles.panelHead}>
                <div>
                  <h2>品質與發布閘門</h2>
                  <p>各關卡分開驗證，不以示範 PASS 取代證據</p>
                </div>
                <ShieldCheck size={20} />
              </div>
              <div className={styles.gateList}>
                {gates.map(({ title, description, state, tone, icon: Icon }) => (
                  <div className={styles.gateItem} key={title}>
                    <Icon className={styles.gateIcon} size={18} />
                    <div className={styles.gateCopy}>
                      <b>{title}</b>
                      <small>{description}</small>
                    </div>
                    <span className={styles[tone]}>{state}</span>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <section className={styles.panel} id="pipeline">
            <div className={styles.panelHead}>
              <div>
                <h2>自動化交付管線</h2>
                <p>完成修改不等於完成驗收；每一階段都必須有獨立證據</p>
              </div>
              <span className={styles.pipelineTag}><Workflow size={15} /> RELEASE PIPELINE</span>
            </div>
            <div className={styles.stages}>
              {stages.map((stage, index) => (
                <div className={styles.stage} key={stage.title}>
                  <span className={stage.done ? styles.stageDone : styles.stagePending}>{stage.done ? <CheckCircle2 size={15} /> : index + 1}</span>
                  <b>{stage.title}</b>
                  <small>{stage.note}</small>
                </div>
              ))}
            </div>
          </section>

          <footer className={styles.footnote}>
            <Clock3 size={15} />
            本頁是工程交付入口，不是即時 Runner 監控面板。未接通資料來源前，不呈現任務數、完成率、排隊數或虛構時間；所有 CI、Preview 與發布結論均以外部可核對紀錄為準。
          </footer>
        </div>
      </section>
    </main>
  );
}
