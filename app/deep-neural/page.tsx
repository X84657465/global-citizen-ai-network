"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { BrainCircuit, BookOpenCheck, Database, FileCheck2, GitBranch, Network, Search, ShieldCheck, Sparkles, X, ArrowUpRight } from "lucide-react";
import styles from "./neural.module.css";

type Artifact = {
  id: string;
  title: string;
  kind: string;
  evidence: string;
  confidence: "高" | "中";
  version: string;
  summary: string;
  sources: string[];
};

const artifacts: Artifact[] = [
  { id: "KA-0081", title: "Agent Factory 任務生命週期", kind: "工程知識", evidence: "4 個來源", confidence: "高", version: "1.2.0", summary: "整理任務狀態、Worker Lease、重試、隔離與 exact-head CI 的可驗證規則。", sources: ["Agent Factory V2 狀態機契約", "CI exact-head 驗證流程", "任務復原操作手冊", "Patch 安全檢查"] },
  { id: "KA-0082", title: "Predictive Coding 誤差契約", kind: "預測知識", evidence: "3 個來源", confidence: "高", version: "0.3.0", summary: "定義預測、觀測、誤差量測、不確定性校準及模型更新提案的證據欄位。", sources: ["預測紀錄 schema", "誤差量測規範", "漂移監控設計"] },
  { id: "KA-0083", title: "GCAN 使用者流程限制", kind: "產品知識", evidence: "2 個來源", confidence: "中", version: "0.1.0", summary: "彙整產品入口、示範資料標示、使用者授權與外部服務未連線時的介面限制。", sources: ["GCAN 產品範圍", "使用者流程與安全基線"] },
  { id: "KA-0084", title: "Deep Research 來源品質閘門", kind: "研究知識", evidence: "3 個來源", confidence: "中", version: "0.1.0", summary: "記錄來源日期、作者、原始出處、交叉佐證、反證與引用完整性檢查。", sources: ["研究工作台流程", "來源品質檢查清單", "反證與引用規範"] },
];

export default function DeepNeuralPage() {
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState("全部類型");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [proposalCreated, setProposalCreated] = useState(false);

  const filteredArtifacts = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    return artifacts.filter((artifact) => {
      const matchesQuery = !normalized || [artifact.id, artifact.title, artifact.kind, artifact.summary].some((value) => value.toLocaleLowerCase().includes(normalized));
      const matchesKind = kind === "全部類型" || artifact.kind === kind;
      return matchesQuery && matchesKind;
    });
  }, [query, kind]);

  const selectedArtifact = artifacts.find((artifact) => artifact.id === selectedId);

  return <main className={styles.page}>
    <aside className={styles.sidebar}>
      <Link href="/" className={styles.brand}><span><BrainCircuit size={22}/></span><b>DEEP NEURAL</b></Link>
      <div className={styles.label}>KNOWLEDGE SYSTEM</div>
      <a className={styles.selected} href="#overview"><Network/>知識總覽</a>
      <a href="#memory"><Database/>記憶庫</a>
      <a href="#evidence"><FileCheck2/>證據管理</a>
      <a href="#learning"><GitBranch/>跨線學習</a>
      <div className={styles.bottom}><ShieldCheck/> Evidence-first reasoning</div>
    </aside>
    <section className={styles.main}>
      <header className={styles.top}><span>DEEP NEURAL / KNOWLEDGE INTELLIGENCE</span><Link href="/">返回 GCAN ↗</Link></header>
      <div className={styles.content} id="overview">
        <div className={styles.heading}>
          <div><div className={styles.kicker}>WORKSTREAM D · MEMORY / REASONING / EVALUATION</div><h1>Deep Neural 知識中樞</h1><p>讓知識可追溯、推理可檢查、學習可評估，安全支援五條工作線。</p></div>
          <span className={styles.status}>● DEMO WORKSPACE</span>
        </div>
        <section className={styles.metrics}>
          <article><span>知識工件</span><b>04</b><small>本頁可操作示範紀錄</small></article>
          <article><span>證據來源</span><b>12</b><small>四筆示範工件所列來源</small></article>
          <article><span>待審核提案</span><b>01</b><small>尚未自動採納</small></article>
          <article><span>評估通過率</span><b>—</b><small>尚無即時評估管線</small></article>
        </section>
        <div className={styles.grid}>
          <section className={styles.panel} id="memory">
            <div className={styles.panelHead}>
              <div><h2><BookOpenCheck/> 知識記憶庫</h2><p>搜尋、篩選並檢視示範知識工件</p></div>
              <span className={styles.secure}>LOCAL DEMO DATA</span>
            </div>
            <div className={styles.toolbar}>
              <label className={styles.searchBox}><Search size={15}/><input aria-label="搜尋知識工件" type="search" placeholder="搜尋標題、ID 或內容…" value={query} onChange={(event) => setQuery(event.target.value)}/></label>
              <select aria-label="知識類型篩選" value={kind} onChange={(event) => setKind(event.target.value)}>
                <option>全部類型</option><option>工程知識</option><option>預測知識</option><option>產品知識</option><option>研究知識</option>
              </select>
            </div>
            <div className={styles.artifacts} aria-live="polite">
              {filteredArtifacts.length ? filteredArtifacts.map((artifact) => <button className={styles.artifactRow} key={artifact.id} type="button" onClick={() => setSelectedId(artifact.id)} aria-pressed={selectedId === artifact.id}>
                <span className={styles.artifactIcon}><Database size={17}/></span>
                <span className={styles.artifactBody}><b>{artifact.title}</b><small>{artifact.id} · {artifact.kind} · {artifact.evidence}</small></span>
                <span className={styles.confidence}>{artifact.confidence}信心</span><em>v{artifact.version}</em><ArrowUpRight size={14}/>
              </button>) : <div className={styles.empty}>沒有符合條件的知識工件，請調整搜尋文字或類型。</div>}
            </div>
            {selectedArtifact && <section className={styles.detailPanel} aria-label="知識工件詳細資料">
              <div className={styles.detailHead}><div><span>ARTIFACT DETAIL · {selectedArtifact.id}</span><h3>{selectedArtifact.title}</h3></div><button type="button" onClick={() => setSelectedId(null)} aria-label="關閉詳細資料"><X size={16}/></button></div>
              <p>{selectedArtifact.summary}</p><b>來源依據</b><ul>{selectedArtifact.sources.map((source) => <li key={source}>{source}</li>)}</ul>
              <small>版本 v{selectedArtifact.version} · {selectedArtifact.confidence}信心 · 示範資料，尚未寫入正式知識庫</small>
            </section>}
          </section>
          <section className={styles.panel} id="evidence">
            <div className={styles.panelHead}><div><h2><FileCheck2/> 證據品質</h2><p>推理結果必須能回到來源</p></div></div>
            <div className={styles.evidenceScore}><div><strong>—</strong><small>/ 100</small></div><span>尚未連接即時證據評分服務</span></div>
            <div className={styles.progress}><i style={{width:"0%"}}/></div>
            <ul className={styles.checks}><li><span/>來源識別與版本記錄 <b>規格已定義</b></li><li><span/>證據與主張關聯 <b>規格已定義</b></li><li><span/>過期知識偵測 <b>待實作</b></li></ul>
          </section>
        </div>
        <section className={styles.panel} id="learning">
          <div className={styles.panelHead}><div><h2><Network/> 五線知識交換</h2><p>跨線共享採版本化工件、接收線審核與回滾機制</p></div><span className={styles.secure}>REVIEW REQUIRED</span></div>
          <div className={styles.tracks}>
            <article><b>A</b><strong>Agent Factory</strong><small>任務、CI、失敗分類與修復證據</small></article>
            <article><b>B</b><strong>GCAN</strong><small>產品流程、授權回饋與營運限制</small></article>
            <article><b>C</b><strong>Predictive Coding</strong><small>預測誤差、校準與漂移指標</small></article>
            <article><b>D</b><strong>Deep Neural</strong><small>記憶、證據、推理與評估整合</small></article>
            <article><b>E</b><strong>Deep Research</strong><small>來源查核、反證與研究報告</small></article>
          </div>
        </section>
        <section className={styles.learning}>
          <Sparkles/><div><b>學習提案工作流程</b><p>來源蒐集 → 證據評分 → 推理整合 → 離線評估 → 接收線覆核 → 版本化採納。未經審核的提案不會修改正式系統。</p>
          <button type="button" onClick={() => setProposalCreated(true)} disabled={proposalCreated}>{proposalCreated ? "已建立本機示範提案" : "建立示範學習提案"}</button>
          {proposalCreated && <small className={styles.proposalNotice}>提案僅存在目前頁面狀態，未寫入資料庫，也未通知其他工作線。</small>}</div>
        </section>
        <footer>介面展示資料 · 尚未連接正式向量資料庫、持久化知識庫或線上推理服務。所有內容均為示範資料。</footer>
      </div>
    </section>
  </main>;
}
