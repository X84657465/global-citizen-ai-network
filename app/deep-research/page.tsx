"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { nextResearchProjectId } from "../../lib/deep-research-ids.mjs";
import { assessClaimEvidence } from "../../lib/deep-research-source-quality.mjs";
import { ArrowUpRight, BookOpen, CheckCircle2, CircleHelp, ClipboardList, FileSearch, FlaskConical, Globe2, Library, Plus, Search, ShieldCheck, Sparkles } from "lucide-react";
import styles from "./research.module.css";

type Study={id:string;title:string;sources:number;status:string;updated:string};
const initial:Study[]=[
{id:"DR-026",title:"Agent Factory 自動化可靠性與故障恢復研究",sources:18,status:"交叉查證中",updated:"11/20"},
{id:"DR-025",title:"Predictive Coding 預測誤差與校準方法比較",sources:12,status:"待覆核",updated:"11/19"},
{id:"DR-024",title:"GCAN 全球協作平台案例分析",sources:26,status:"已完成草稿",updated:"11/18"}];
const stages=["研究問題定義","多來源蒐集","來源可信度查核","交叉比對","反證與不確定性分析","研究報告與行動建議"];

const demoClaimEvidence = assessClaimEvidence("CLM-DEMO-001", [
 {source_id:"SRC-DEMO-001",title:"Synthetic primary study A",url:"https://alpha.example.com/study",publisher:"Example Research A",publisher_key:"example-research-a",source_type:"primary",published_at:"2026-11-01T00:00:00Z",retrieved_at:"2026-11-20T00:00:00Z",claim_ids:["CLM-DEMO-001"],stance:"supports",limitations:["Synthetic demonstration record"]},
 {source_id:"SRC-DEMO-002",title:"Synthetic independent review B",url:"https://beta.example.org/review",publisher:"Example Review B",publisher_key:"example-review-b",source_type:"secondary",published_at:"2026-11-02T00:00:00Z",retrieved_at:"2026-11-20T00:00:00Z",claim_ids:["CLM-DEMO-001"],stance:"supports",limitations:["Synthetic demonstration record"]},
 {source_id:"SRC-DEMO-003",title:"Synthetic counter-analysis C",url:"https://gamma.example.net/counter",publisher:"Example Analysis C",publisher_key:"example-analysis-c",source_type:"secondary",published_at:"2026-11-03T00:00:00Z",retrieved_at:"2026-11-20T00:00:00Z",claim_ids:["CLM-DEMO-001"],stance:"contradicts",limitations:["Synthetic demonstration record"]},
]);

export default function DeepResearchPage(){
 const [studies,setStudies]=useState(initial); const [query,setQuery]=useState(""); const [filter,setFilter]=useState("全部"); const [created,setCreated]=useState(false);
 const visible=useMemo(()=>studies.filter(s=>(filter==="全部"||s.status===filter)&&(!query||s.title.toLowerCase().includes(query.toLowerCase())||s.id.toLowerCase().includes(query.toLowerCase()))),[studies,filter,query]);
 function createStudy(){const title=query.trim();if(!title)return;const id=nextResearchProjectId(studies.map(study=>study.id));setStudies([{id,title,sources:0,status:"待研究",updated:"剛剛"},...studies]);setQuery("");setCreated(true);}
 return <main className={styles.page}>
 <aside className={styles.sidebar}><Link href="/" className={styles.brand}><span><FlaskConical size={21}/></span><b>DEEP RESEARCH</b></Link><div className={styles.label}>RESEARCH WORKSPACE</div><a className={styles.active} href="#overview"><Globe2/>研究總覽</a><a href="#projects"><ClipboardList/>研究專案</a><a href="#sources"><Library/>來源資料庫</a><a href="#method"><ShieldCheck/>研究方法</a><div className={styles.sideFoot}>TRACK E · EVIDENCE FIRST</div></aside>
 <section className={styles.main}><header className={styles.top}><span>WORKSPACE / DEEP RESEARCH</span><Link href="/">返回 GCAN ↗</Link></header><div className={styles.content} id="overview">
 <div className={styles.heading}><div><div className={styles.kicker}>WORKSTREAM E · MULTI-SOURCE INTELLIGENCE</div><h1>Deep Research 深度研究中心</h1><p>多來源蒐集、交叉查證、反證分析，產出可追溯的研究結論與跨線行動建議。</p></div><span className={styles.demo}>● 本機互動示範</span></div>
 <section className={styles.hero}><div className={styles.heroIcon}><Sparkles/></div><div className={styles.heroText}><b>建立新的研究任務</b><small>輸入主題或待驗證假設，建立可追蹤的研究工作項目</small></div><div className={styles.create}><input aria-label="研究主題" value={query} onChange={e=>{setQuery(e.target.value);setCreated(false)}} onKeyDown={e=>{if(e.key==="Enter")createStudy()}} placeholder="例如：如何降低 Agent Factory CI 失敗率？"/><button onClick={createStudy}><Plus size={16}/> 建立研究</button></div></section>
 {created&&<div className={styles.notice}><CheckCircle2 size={16}/> 已加入研究清單。此為目前頁面狀態示範，尚未保存至伺服器。</div>}
 <div className={styles.stats}><article><span>研究專案</span><b>{studies.length}</b><small>本頁工作清單</small></article><article><span>研究階段</span><b>6</b><small>標準研究流程</small></article><article><span>品質原則</span><b>100%</b><small>來源與結論需可追溯</small></article><article><span>跨線協作</span><b>5 線</b><small>A–E 共用研究成果</small></article></div>
 <section className={styles.panel} id="projects"><div className={styles.panelHead}><div><h2>研究專案</h2><p>追蹤研究問題、進度與來源數量</p></div><div className={styles.filters}><label className={styles.search}><Search size={15}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="搜尋專案或 ID"/></label><select aria-label="篩選狀態" value={filter} onChange={e=>setFilter(e.target.value)}><option>全部</option><option>待研究</option><option>交叉查證中</option><option>待覆核</option><option>已完成草稿</option></select></div></div>
 <div className={styles.tableHead}><span>研究項目</span><span>來源</span><span>狀態</span><span>更新</span></div>{visible.length?visible.map(s=><div className={styles.study} key={s.id}><div><b>{s.title}</b><small>{s.id}</small></div><span>{s.sources} 筆</span><span className={styles.status}>{s.status}</span><span>{s.updated}</span></div>):<div className={styles.empty}>沒有符合條件的研究項目</div>}</section>
 <div className={styles.columns}><section className={styles.panel} id="method"><div className={styles.panelHead}><div><h2>標準研究流程</h2><p>每一項結論都必須能回溯證據</p></div><ShieldCheck/></div><ol className={styles.stages}>{stages.map((s,i)=><li key={s}><span>{String(i+1).padStart(2,"0")}</span>{s}</li>)}</ol></section><section className={styles.panel} id="sources"><div className={styles.panelHead}><div><h2>研究品質閘門</h2><p>避免單一來源與未經查證的推論</p></div><BookOpen/></div><ul className={styles.rules}><li><CheckCircle2/> 優先採用一手與權威來源</li><li><CheckCircle2/> 記錄發布日期、擷取日期及引用</li><li><CheckCircle2/> 重要主張至少交叉比對獨立來源</li><li><CheckCircle2/> 同一出版者的多篇資料只計一個獨立出版者</li><li><CircleHelp/> 保留反證、未知與信心程度</li><li><ShieldCheck/> AI 摘要不得取代原始證據</li></ul><div className={styles.notice}><b>合成案例：{demoClaimEvidence.status === "contested" ? "存在獨立反證，需研究者覆核" : demoClaimEvidence.status}</b><small>支持出版者 {demoClaimEvidence.independent_supporting_publishers} · 獨立反證出版者 {demoClaimEvidence.independent_contradicting_publishers} · {demoClaimEvidence.related_source_count} 筆相關來源。此為合成資料，並非實際研究結果。</small></div></section></div>
 <section className={styles.cross}><div><div className={styles.kicker}>FIVE-TRACK LEARNING LOOP</div><h2>研究成果，讓五線一起成長</h2><p>E 線提出可驗證的研究與證據包，由接收線審核採用，不直接改動其他線的正式系統。</p></div><div className={styles.trackGrid}>{[["A","Agent Factory","自動化策略、故障根因、修復手冊"],["B","GCAN Product","使用者研究、產品案例、需求證據"],["C","Predictive Coding","研究方法、預測指標、校準資料"],["D","Deep Neural","知識來源、模型評估、推理證據"],["E","Deep Research","研究設計、來源查核、反證與報告"]].map(t=><div key={t[0]}><b>{t[0]}</b><strong>{t[1]}</strong><small>{t[2]}</small></div>)}</div></section>
 <footer>DEEP RESEARCH · TRACK E · DEMO DATA ONLY · 尚未連接即時搜尋、持久化資料庫或研究代理服務</footer>
 </div></section></main>
}