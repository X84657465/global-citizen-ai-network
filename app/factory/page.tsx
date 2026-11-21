import Link from "next/link";
import { Activity, Bot, CheckCircle2, CircleAlert, Clock3, GitBranch, Play, ShieldCheck, Workflow } from "lucide-react";
import styles from "./factory.module.css";

const tasks = [
  { id: "AF-204", name: "Validate pull request changes", track: "A · Factory", status: "示範：執行中", tone: "blue", time: "示範時間" },
  { id: "GC-118", name: "Run product journey regression", track: "B · GCAN", status: "示範：待排程", tone: "amber", time: "示範時間" },
  { id: "PC-042", name: "Recalculate prediction error", track: "C · Predictive", status: "示範：已完成", tone: "green", time: "示範時間" },
  { id: "DN-031", name: "Review evidence package", track: "D · Deep Neural", status: "示範：需覆核", tone: "red", time: "示範時間" },
];

const stages = ["需求解析", "計畫驗證", "程式修改", "自動測試", "人工覆核", "發布交付"];

export default function FactoryPage() {
  return <main className={styles.page}>
    <aside className={styles.sidebar}>
      <Link href="/" className={styles.brand}><span className={styles.logo}>AF</span><span><b>AGENT FACTORY</b><small>V2 · OPERATIONS</small></span></Link>
      <div className={styles.navLabel}>FACTORY CONTROL</div>
      <a className={styles.active} href="#overview"><Activity size={17}/> 營運總覽</a>
      <a href="#tasks"><Workflow size={17}/> 任務佇列</a>
      <a href="#pipeline"><GitBranch size={17}/> 執行管線</a>
      <a href="#quality"><ShieldCheck size={17}/> 品質與安全</a>
      <div className={styles.sidebarFoot}><span className={styles.liveDot}/> 離線示範 · 非即時</div>
    </aside>
    <section className={styles.main}>
      <header className={styles.top}><div><span>WORKSPACE /</span> FACTORY OVERVIEW</div><Link href="/">返回 GCAN 平台 ↗</Link></header>
      <div className={styles.content} id="overview">
        <div className={styles.heading}><div><div className={styles.eyebrow}>AUTONOMOUS ENGINEERING SYSTEM</div><h1>Agent Factory 控制中心</h1><p>A 線 Agent Factory V2 的操作入口示意；任務數字、狀態與管線節點均為靜態展示，尚未連接即時 Runner。</p></div><span className={styles.demo}>● DEMO ENVIRONMENT</span></div>
        <div className={styles.stats}>
          <article><span>任務總數</span><b>128</b><small>示範統計 · 非即時資料</small></article>
          <article><span>成功完成</span><b>96</b><small className={styles.good}>75% 完成率</small></article>
          <article><span>待處理佇列</span><b>08</b><small>等待資源或排程</small></article>
          <article><span>需要人工覆核</span><b>03</b><small className={styles.warn}>發布前必須確認</small></article>
        </div>
        <div className={styles.grid}>
          <section className={styles.panel} id="tasks"><div className={styles.panelHead}><div><h2>跨線任務佇列</h2><p>任務狀態示意（非即時資料）</p></div><a className={styles.panelAction} href="https://github.com/X84657465/global-citizen-ai-network/actions" target="_blank" rel="noreferrer">查看 GitHub Actions ↗</a></div>
            <div className={styles.tableWrap}><table><thead><tr><th>任務 ID</th><th>任務內容</th><th>工作線</th><th>狀態</th><th>更新</th></tr></thead><tbody>{tasks.map(t=><tr key={t.id}><td className={styles.id}>{t.id}</td><td>{t.name}</td><td>{t.track}</td><td><span className={styles[t.tone]}>{t.status}</span></td><td>{t.time}</td></tr>)}</tbody></table></div>
          </section>
          <section className={styles.panel} id="quality"><div className={styles.panelHead}><div><h2>品質閘門</h2><p>發布前的治理閘門示意</p></div><ShieldCheck size={20}/></div>
            <div className={styles.check}><CheckCircle2/><span><b>任務規格驗證示意</b><small>必填欄位與權限檢查</small></span><em>PASS</em></div>
            <div className={styles.check}><CheckCircle2/><span><b>分支隔離策略示意</b><small>禁止未授權寫入正式分支</small></span><em>PASS</em></div>
            <div className={styles.check}><CircleAlert/><span><b>獨立覆核</b><small>此區為靜態示意，非即時計數</small></span><strong>待處理</strong></div>
          </section>
        </div>
        <section className={styles.panel} id="pipeline"><div className={styles.panelHead}><div><h2>自動化交付管線</h2><p>每個任務都必須留下可追溯證據</p></div><span className={styles.pipelineTag}><Bot size={15}/> FACTORY PIPELINE</span></div>
          <div className={styles.stages}>{stages.map((s,i)=><div className={styles.stage} key={s}><span className={i<3?styles.stageDone:styles.stagePending}>{i<3?"✓":i===3?"Ⅱ":"○"}</span><b>{s}</b><small>{i<3?"已完成":i===3?"等待執行":"尚未通過"}</small></div>)}</div>
        </section>
        <footer><Clock3 size={14}/> 本頁為 Agent Factory V2 操作介面原型。所有任務、統計、時間、PASS 與管線狀態均為展示資料；未接通 Runner / GitHub Actions 即時資料前，不代表真實執行或驗收結果。</footer>
      </div>
    </section>
  </main>;
}