import Link from "next/link";
import { BrainCircuit, BookOpenCheck, Database, FileCheck2, GitBranch, Network, Search, ShieldCheck, Sparkles } from "lucide-react";
import styles from "./neural.module.css";

const artifacts = [
 {id:"KA-0081",title:"Agent Factory 任務生命週期",kind:"工程知識",evidence:"4 個來源",confidence:"高",version:"1.2.0"},
 {id:"KA-0082",title:"Predictive Coding 誤差契約",kind:"預測知識",evidence:"3 個來源",confidence:"高",version:"0.3.0"},
 {id:"KA-0083",title:"GCAN 使用者流程限制",kind:"產品知識",evidence:"2 個來源",confidence:"中",version:"0.1.0"},
];

export default function DeepNeuralPage(){
 return <main className={styles.page}>
  <aside className={styles.sidebar}><Link href="/" className={styles.brand}><span><BrainCircuit size={22}/></span><b>DEEP NEURAL</b></Link><div className={styles.label}>KNOWLEDGE SYSTEM</div><a className={styles.selected} href="#overview"><Network/>知識總覽</a><a href="#memory"><Database/>記憶庫</a><a href="#evidence"><FileCheck2/>證據管理</a><a href="#learning"><GitBranch/>跨線學習</a><div className={styles.bottom}><ShieldCheck/> Evidence-first reasoning</div></aside>
  <section className={styles.main}><header className={styles.top}><span>DEEP NEURAL / KNOWLEDGE INTELLIGENCE</span><Link href="/">返回 GCAN ↗</Link></header>
   <div className={styles.content} id="overview"><div className={styles.heading}><div><div className={styles.kicker}>WORKSTREAM D · MEMORY / REASONING / EVALUATION</div><h1>Deep Neural 知識中樞</h1><p>讓知識可追溯、推理可檢查、學習可評估，並安全地支援四條工作線。</p></div><span className={styles.status}>● DEMO WORKSPACE</span></div>
    <section className={styles.metrics}><article><span>知識工件</span><b>126</b><small>版本化知識紀錄</small></article><article><span>證據來源</span><b>348</b><small>可回溯來源索引</small></article><article><span>待審核提案</span><b>07</b><small>尚未自動採納</small></article><article><span>評估通過率</span><b>94.2%</b><small>示範評估資料</small></article></section>
    <div className={styles.grid}>
     <section className={styles.panel} id="memory"><div className={styles.panelHead}><div><h2><BookOpenCheck/> 知識記憶庫</h2><p>按主題、來源與版本管理知識工件</p></div><button type="button"><Search size={14}/> 搜尋知識</button></div>
      <div className={styles.artifacts}>{artifacts.map(a=><article key={a.id}><div className={styles.artifactIcon}><Database size={17}/></div><div className={styles.artifactBody}><b>{a.title}</b><small>{a.id} · {a.kind} · {a.evidence}</small></div><span className={styles.confidence}>{a.confidence}信心</span><em>v{a.version}</em></article>)}</div>
     </section>
     <section className={styles.panel} id="evidence"><div className={styles.panelHead}><div><h2><FileCheck2/> 證據品質</h2><p>推理結果必須能回到來源</p></div></div>
      <div className={styles.evidenceScore}><div><strong>91</strong><small>/ 100</small></div><span>示範證據完整度</span></div><div className={styles.progress}><i style={{width:"91%"}}/></div>
      <ul className={styles.checks}><li><span/>來源識別與版本記錄 <b>通過</b></li><li><span/>證據與主張關聯 <b>通過</b></li><li><span/>過期知識偵測 <b>監控中</b></li></ul>
     </section>
    </div>
    <section className={styles.panel} id="learning"><div className={styles.panelHead}><div><h2><Network/> 四線知識交換</h2><p>跨線共享採版本化工件、接收線審核與回滾機制</p></div><span className={styles.secure}>REVIEW REQUIRED</span></div>
     <div className={styles.tracks}><article><b>A</b><strong>Agent Factory</strong><small>任務、CI、失敗分類與修復證據</small></article><article><b>B</b><strong>GCAN</strong><small>產品流程、授權回饋與營運限制</small></article><article><b>C</b><strong>Predictive Coding</strong><small>預測誤差、校準與漂移指標</small></article><article><b>D</b><strong>Deep Neural</strong><small>記憶、證據、推理與評估整合</small></article></div>
    </section>
    <section className={styles.learning}><Sparkles/><div><b>學習提案工作流程</b><p>來源蒐集 → 證據評分 → 推理整合 → 離線評估 → 接收線覆核 → 版本化採納。未經審核的提案不會修改正式系統。</p></div></section>
    <footer>介面展示資料 · 尚未連接正式向量資料庫或線上推理服務。所有數字均非即時營運數據。</footer>
   </div>
  </section>
 </main>;
}