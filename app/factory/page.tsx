import Link from "next/link";
import { Activity, Bot, CheckCircle2, CircleAlert, Clock3, GitBranch, Play, ShieldCheck, Workflow } from "lucide-react";
import styles from "./factory.module.css";

const tasks = [
  { id: "AF-204", name: "Validate pull request changes", track: "A · Factory", status: "執行中", tone: "blue", time: "2 分鐘前" },
  { id: "GC-118", name: "Run product journey regression", track: "B · GCAN", status: "待排程", tone: "amber", time: "8 分鐘前" },
  { id: "PC-042", name: "Recalculate prediction error", track: "C · Predictive", status: "已完成", tone: "green", time: "14 分鐘前" },
  { id: "DN-031", name: "Review evidence package", track: "D · Deep Neural", status: "需覆核", tone: "red", time: "21 分鐘前" },
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
      <div className={styles.sidebarFoot}><span className={styles.liveDot}/> 示範資料模式</div>
    </aside>
    <section className={styles.main}>
      <header className={styles.top}><div><span>WORKSPACE /</span> FACTORY OVERVIEW</div><Link href="/">返回 GCAN 平台 ↗</Link></header>
      <div className={styles.content} id="overview">
        <div className={styles.heading}><div><div className={styles.eyebrow}>AUTONOMOUS ENGINEERING SYSTEM</div><h1>Agent Factory 控制中心</h1><p>統一監控任務規劃、程式執行、測試驗證與安全交付。</p></div><span className={styles.demo}>● DEMO ENVIRONMENT</span></div>
        <div className={styles.stats}>
          <article><span>任務總數</span><b>128</b><small>示範統計 · 非即時資料</small></article>
          <article><span>成功完成</span><b>96</b><small className={styles.good}>75% 完成率</small></article>
          <article><span>待處理佇列</span><b>08</b><small>等待資源或排程</small></article>
          <article><span>需要人工覆核</span><b>03</b><small className={styles.warn}>發布前必須確認</small></article>
        </div>
        <div className={styles.grid}>
          <section className={styles.panel} id="tasks"><div className={styles.panelHead}><div><h2>跨線任務佇列</h2><p>任務狀態與最近活動（示範資料）</p></div><button type="button">查看全部任務</button></div>
            <div className={styles.tableWrap}><table><thead><tr><th>任務 ID</th><th>任務內容</th><th>工作線</th><th>狀態</th><th>更新</th></tr></thead><tbody>{tasks.map(t=><tr key={t.id}><td className={styles.id}>{t.id}</td><td>{t.name}</td><td>{t.track}</td><td><span className={styles[t.tone]}>{t.status}</span></td><td>{t.time}</td></tr>)}</tbody></table></div>
          </section>
          <section className={styles.panel} id="quality"><div className={styles.panelHead}><div><h2>品質閘門</h2><p>發布前的必要條件</p></div><ShieldCheck size={20}/></div>
            <div className={styles.check}><CheckCircle2/><span><b>任務規格驗證</b><small>必填欄位與權限檢查</small></span><em>PASS</em></div>
            <div className={styles.check}><CheckCircle2/><span><b>分支隔離策略</b><small>禁止未授權寫入正式分支</small></span><em>PASS</em></div>
            <div className={styles.check}><CircleAlert/><span><b>獨立覆核</b><small>仍有 3 個項目等待確認</small></span><strong>待處理</strong></div>
          </section>
        </div>
        <section className={styles.panel} id="pipeline"><div className={styles.panelHead}><div><h2>自動化交付管線</h2><p>每個任務都必須留下可追溯證據</p></div><span className={styles.pipelineTag}><Bot size={15}/> FACTORY PIPELINE</span></div>
          <div className={styles.stages}>{stages.map((s,i)=><div className={styles.stage} key={s}><span className={i<3?styles.stageDone:styles.stagePending}>{i<3?"✓":i===3?"Ⅱ":"○"}</span><b>{s}</b><small>{i<3?"已完成":i===3?"等待執行":"尚未通過"}</small></div>)}</div>
        </section>
        <footer><Clock3 size={14}/> 介面已建立；數字與狀態目前為展示資料，接上 Runner / GitHub Actions 後才會顯示真實執行結果。</footer>
      </div>
    </section>
  </main>;
}