import Link from "next/link";
import { Activity, AlertTriangle, ArrowDownRight, ArrowUpRight, BrainCircuit, Crosshair, Gauge, LineChart, ShieldCheck, Target } from "lucide-react";
import styles from "./predictive.module.css";

const predictions = [
  { id: "P-2026-041", target: "CI 任務成功率", predicted: "92%", observed: "88%", error: "−4 pp", state: "已觀測" },
  { id: "P-2026-042", target: "工作佇列完成時間", predicted: "14 min", observed: "18 min", error: "+4 min", state: "偏差超標" },
  { id: "P-2026-043", target: "回歸測試通過率", predicted: "98%", observed: "—", error: "待計算", state: "等待觀測" },
];

export default function PredictiveCodingPage() {
 return <main className={styles.page}>
  <header className={styles.header}><Link href="/" className={styles.brand}><span><BrainCircuit size={20}/></span><b>PREDICTIVE CODING</b></Link><nav><a href="#overview">總覽</a><a href="#predictions">預測紀錄</a><a href="#calibration">校準監控</a></nav><Link href="/">返回 GCAN ↗</Link></header>
  <section className={styles.hero} id="overview"><div><div className={styles.kicker}>WORKSTREAM C · EVIDENCE-DRIVEN INTELLIGENCE</div><h1>讓每一次預測，<br/><em>都能被結果驗證。</em></h1><p>建立預測、觀測、誤差量測與校準的閉環。模型建議必須有證據、版本與人工審核，不直接改動正式環境。</p></div><div className={styles.heroMark}><Crosshair size={82} strokeWidth={1}/><span>MEASURE<br/>WHAT MATTERS</span></div></section>
  <section className={styles.notice}><ShieldCheck size={17}/> 展示儀表板：以下數值為介面示範資料，尚未連接正式預測資料管線。</section>
  <section className={styles.metrics}>
   <article><span><Target/> 已登錄預測</span><b>43</b><small>版本化預測紀錄</small></article>
   <article><span><Gauge/> 平均絕對誤差</span><b>4.2%</b><small>示範計算值 · MAE</small></article>
   <article><span><Activity/> 校準狀態</span><b>0.91</b><small>示範校準分數</small></article>
   <article><span><AlertTriangle/> 漂移警示</span><b>02</b><small className={styles.warning}>需要人工調查</small></article>
  </section>
  <section className={styles.columns}>
   <div className={styles.panel} id="predictions"><div className={styles.panelTitle}><div><h2>預測與實際觀測</h2><p>每筆預測都保留目標、期限、觀測值與誤差</p></div><span>REGISTRY</span></div>
    <div className={styles.tableScroll}><table><thead><tr><th>預測 ID</th><th>預測目標</th><th>預測值</th><th>觀測值</th><th>誤差</th><th>狀態</th></tr></thead><tbody>{predictions.map(p=><tr key={p.id}><td>{p.id}</td><td>{p.target}</td><td>{p.predicted}</td><td>{p.observed}</td><td>{p.error}</td><td><i>{p.state}</i></td></tr>)}</tbody></table></div>
   </div>
   <div className={styles.panel} id="calibration"><div className={styles.panelTitle}><div><h2>校準與漂移監控</h2><p>示範監控窗口</p></div><LineChart size={20}/></div>
    <div className={styles.chart}><div className={styles.chartLabels}><span>100%</span><span>75%</span><span>50%</span><span>25%</span><span>0%</span></div><div className={styles.bars}>{[72,83,78,91,86,94,88,96,90,82,89,93].map((v,i)=><div key={i} style={{height:v+"%"}}><span>{v}</span></div>)}</div></div><div className={styles.chartLegend}><span/> 校準觀測值 <small>近 12 個示範窗口</small></div>
   </div>
  </section>
  <section className={styles.panel}><div className={styles.panelTitle}><div><h2>誤差處理閉環</h2><p>預測不等於事實；更新必須經過證據與覆核</p></div></div><div className={styles.loop}>{["登錄預測","收集觀測","計算誤差","分析漂移","提出更新","人工審核"].map((x,i)=><div key={x}><b>0{i+1}</b><strong>{x}</strong></div>)}</div></section>
  <footer><ArrowUpRight size={15}/> C 線介面入口 · Predictive Coding <span>模型更新提案不得自動套用至正式系統</span></footer>
 </main>;
}