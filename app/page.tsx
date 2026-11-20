import Image from "next/image";
import Link from "next/link";
import { Activity, ArrowRight, ArrowUpRight, BookOpen, BrainCircuit, CheckCircle2, ChevronRight, ClipboardCheck, Cpu, GitBranch, Globe2, Layers3, LockKeyhole, Network, ReceiptText, SearchCheck, ShieldCheck, Sparkles, Workflow, type LucideIcon } from "lucide-react";
import styles from "./home.module.css";

type Track = { code: "A" | "B" | "C" | "D" | "E"; title: string; subtitle: string; mission: string; scope: string[]; status: string; href: string; action: string; external?: boolean; icon: LucideIcon };
const tracks: Track[] = [
 { code:"A", title:"Agent Factory V2", subtitle:"AI 自動開發工廠", mission:"讓工程任務從規劃、執行、測試、修復到交付，都有明確狀態與可核對證據。", scope:["任務派送與 Worker Lease","隔離執行、測試與故障修復","精確 SHA 綁定 CI 與候選 PR","重試、復原及交付稽核"], status:"獨立工作台 · 開發候選", href:"/factory", action:"開啟 A 線工廠工作台", icon:Workflow },
 { code:"B", title:"Global Citizen AI Network", subtitle:"全球公民 AI 產品", mission:"面向使用者的產品主線，整合 AI 工作空間、知識貢獻、透明帳本與平台治理。", scope:["AI 工作空間與專案脈絡","任務、提交、審核與複核","成本、貢獻與稽核紀錄","會員體驗與平台流程"], status:"產品入口 · MVP 建置中", href:"/workspace", action:"進入 B 線產品工作區", icon:Globe2 },
 { code:"C", title:"Predictive Coding", subtitle:"預測編碼與誤差學習", mission:"明確提出可驗證預測，再對照觀測結果、計算誤差、檢查校準並提出改進方案。", scope:["預測紀錄與目標期限","實際觀測與來源證據","誤差量測、校準與漂移","附驗證與回復方案的更新提案"], status:"展示工作台 · 示範資料", href:"/predictive-coding", action:"開啟 C 線預測工作台", icon:Activity },
 { code:"D", title:"Deep Neural", subtitle:"深度神經與知識推理", mission:"整理具來源、版本與信心標記的知識記憶，支援推理、評估與跨線學習。", scope:["來源可追溯的知識記憶","證據檢索與脈絡整合","推理品質與不確定性評估","需審核的跨線學習提案"], status:"互動原型 · 持久化待整合", href:"https://global-citizen-ai-network-git-fe-c5aecf-acmes-projects-3dfbdf35.vercel.app/deep-neural", action:"開啟 D 線神經工作台", external:true, icon:BrainCircuit },
 { code:"E", title:"Deep Research", subtitle:"深度研究與證據查核", mission:"把研究問題拆成可追蹤任務，查驗來源、尋找佐證與反證，輸出有引用的研究成果。", scope:["研究任務與問題拆解","來源可信度與出處追蹤","交叉驗證與反證搜尋","引用式綜整與行動建議"], status:"工作台候選 · 外部服務待接", href:"https://global-citizen-ai-network-git-fe-fef10e-acmes-projects-3dfbdf35.vercel.app/deep-research", action:"開啟 E 線研究工作台", external:true, icon:SearchCheck },
];
const pillars = [
 { n:"01", title:"全民 AI 服務", text:"研究、寫作、分析與專案知識整理，讓 AI 成為日常工作中可持續使用的工具。", icon:Sparkles },
 { n:"02", title:"全球知識貢獻", text:"以任務規格、成果提交、品質驗收與複核流程，讓知識協作可以被公平評價。", icon:Network },
 { n:"03", title:"透明成本與貢獻", text:"區分供應商帳單、內部成本估算、審核結果與獎勵紀錄，保留完整稽核脈絡。", icon:ReceiptText },
 { n:"04", title:"自願式分散運算", text:"長期探索由使用者明確授權、可暫停退出且有隔離限制的閒置 CPU／GPU 協作。", icon:Cpu },
];
const loop = ["觀測","提出預測","採取行動","量測結果","計算預測誤差","解釋並保存證據","修正模型／計畫","測試","發布","接收線審核","持續監控"];
const rules = [
 { title:"最小權限與明確授權", text:"各線擁有自己的程式碼、資料與操作邊界；跨線資料必須有用途、權限及來源標記。", icon:LockKeyhole },
 { title:"高風險動作保留人工控制", text:"AI 建議、預測與自動化結果不會自行更改正式帳務、定價、會員權限、資料庫或正式部署。", icon:ShieldCheck },
 { title:"證據先於結論", text:"每項重要成果記錄版本、來源、精確 commit SHA、測試結果、審核決策與回復方式。", icon:SearchCheck },
 { title:"展示資料不冒充真實營運", text:"示範數據、尚未連接的 AI／搜尋服務、尚未啟用的獎勵支付與分散式運算都會清楚標示。", icon:ClipboardCheck },
];
const docs = [
 { title:"五線工程治理規範", text:"責任分工、跨線互助、版本制度、相容性測試與接收線審核。", href:"https://github.com/X84657465/global-citizen-ai-network/blob/feat/agent-factory-v2/docs/engineering-governance.md", icon:GitBranch },
 { title:"版本清單與變更紀錄", text:"查看整體版本、A–E 各線版本、狀態與每次更新內容。", href:"https://github.com/X84657465/global-citizen-ai-network/blob/feat/agent-factory-v2/versions/manifest.json", icon:Layers3 },
 { title:"Predictive Coding 架構", text:"預測、觀測、誤差、校準、漂移與更新提案的資料契約。", href:"https://github.com/X84657465/global-citizen-ai-network/blob/feat/github-project-showcase/docs/predictive-coding-architecture.md", icon:Activity },
 { title:"Deep Neural 架構", text:"知識記憶、證據來源、推理評估與跨線學習邊界。", href:"https://github.com/X84657465/global-citizen-ai-network/blob/feat/deep-neural-core/docs/deep-neural-architecture.md", icon:BrainCircuit },
];
function Heading({ label, title, text }: { label:string; title:string; text:string }) {
 return <div className={styles.sectionHeading}><div className={styles.sectionEyebrow}>{label}</div><h2>{title}</h2><p>{text}</p></div>;
}

export default function HomePage() {
 return <div className={styles.page}>
  <a className={styles.skipLink} href="#main-content">跳至主要內容</a>
  <header className={styles.header}><div className={styles.headerInner}>
   <Link href="/" className={styles.brand} aria-label="Global Citizen AI Network 首頁"><span className={styles.brandMark}><Globe2 size={22}/></span><span className={styles.brandText}><strong>GLOBAL CITIZEN</strong><small>AI NETWORK</small></span></Link>
   <nav className={styles.nav} aria-label="主要導覽"><a href="#pillars">平台價值</a><a href="#workstreams">五線工作台</a><a href="#learning-loop">協作閉環</a><a href="#governance">安全治理</a><a href="#documentation">技術文件</a></nav>
   <div className={styles.headerActions}><Link href="/login" className={styles.loginLink}>會員登入</Link><Link href="/workspace" className={styles.headerCta}>進入平台 <ArrowUpRight size={15}/></Link></div>
  </div></header>
  <main id="main-content" tabIndex={-1}>
   <section className={styles.hero}><div className={styles.heroInner}>
    <div className={styles.heroCopy}><div className={styles.eyebrow}><span/> FIVE WORKSTREAMS · ONE SHARED MISSION</div>
     <h1>讓 AI 成為<br/><em>每個人都能參與</em><br/>的全球協作網路</h1>
     <p className={styles.heroLead}>Global Citizen AI Network（GCAN）不只是一個 AI 聊天介面。我們正在建立結合 AI 服務、全球知識貢獻、預測學習、知識推理與深度研究的協作平台，讓每一項成果都能被追蹤、驗證與持續改善。</p>
     <div className={styles.heroActions}><a href="#workstreams" className={styles.primaryButton}>探索 A–E 五線工作台 <ArrowRight size={17}/></a><a href="#architecture" className={styles.secondaryButton}>查看整體架構 <ChevronRight size={15}/></a></div>
     <div className={styles.heroPrinciples}><span><ShieldCheck size={15}/> 明確授權</span><span><GitBranch size={15}/> 版本可追溯</span><span><CheckCircle2 size={15}/> 結果可驗證</span></div>
    </div>
    <div className={styles.heroVisual}><div className={styles.visualGlow}/><div className={styles.visualFrame}><Image src="/brand/gcan-hero.svg" alt="GCAN 全球 AI 協作網路品牌主視覺" width={1600} height={520} priority className={styles.heroImage} sizes="(max-width: 900px) 100vw, 52vw"/></div><div className={styles.visualTagTop}><span className={styles.liveDot}/> 五線協作架構</div><div className={styles.visualTagBottom}><Network size={15}/> INDEPENDENT · CONNECTED · REVIEWED</div></div>
   </div><div className={styles.heroBottom}><div className={styles.heroBottomLabel}>THE GCAN OPERATING MODEL</div><div className={styles.heroFact}><b>A–E</b><span>五條獨立工作線</span></div><div className={styles.heroFact}><b>01</b><span>共用證據協作閉環</span></div><div className={styles.heroFact}><b>OWNED</b><span>各線自主、明確責任</span></div><div className={styles.heroFact}><b>REVIEWED</b><span>整合前必須審核與測試</span></div></div></section>
   <section className={styles.stageBar} aria-label="專案狀態"><div className={styles.stageLabel}><span/> EARLY DEVELOPMENT / MVP</div><p>目前為早期建置與預覽階段；各工作台成熟度不同，請以每條工作線標示與 GitHub 精確提交紀錄為準。</p><a href="https://github.com/X84657465/global-citizen-ai-network/actions" target="_blank" rel="noreferrer">查看 CI 驗證 <ArrowUpRight size={14}/></a></section>
   <section className={styles.pillarsSection} id="pillars"><Heading label="THE PLATFORM" title="四大平台價值，承載五線協作" text="四大價值描述 GCAN 最終要提供的公共能力；A–E 五線則是實際負責建設、驗證與持續改善的工程分工。兩者互相對應，但不是同一層級。"/><div className={styles.pillarGrid}>{pillars.map(({n,title,text,icon:Icon})=><article className={styles.pillarCard} key={n}><div className={styles.pillarTop}><span>{n}</span><div className={styles.pillarIcon}><Icon size={21}/></div></div><h3>{title}</h3><p>{text}</p></article>)}</div></section>
   <section className={styles.workstreamsSection} id="workstreams"><div className={styles.workstreamsTop}><Heading label="FIVE CONNECTED WORKSTREAMS" title="五條主線，各自負責、互相成就" text="每條線有獨立工作台、責任範圍、版本與驗收證據。工作台預覽不代表正式上線；尚未整合的功能會明確標示。"/><a className={styles.textLink} href="https://github.com/X84657465/global-citizen-ai-network/blob/feat/gcan-product-homepage/docs/engineering-governance.md" target="_blank" rel="noreferrer">閱讀五線治理規範 <ArrowUpRight size={15}/></a></div>
    <div className={styles.trackGrid}>{tracks.map(({code,title,subtitle,mission,scope,status,href,action,external,icon:Icon})=>{const body=<><div className={styles.trackTop}><span className={styles.trackCode}>TRACK {code}</span><span className={styles.trackOrb}><Icon size={21}/></span></div><div className={styles.trackTitleGroup}><h3>{title}</h3><span>{subtitle}</span></div><p className={styles.trackMission}>{mission}</p><ul className={styles.trackScope}>{scope.map(item=><li key={item}><CheckCircle2 size={13}/>{item}</li>)}</ul><div className={styles.trackFooter}><span className={styles.trackStatus}>{status}</span><span className={styles.trackAction}>{action} <ArrowUpRight size={15}/></span></div></>;return external?<a className={styles.trackCard} data-track={code} href={href} key={code} target="_blank" rel="noreferrer" aria-label={action+"（開啟獨立預覽）"}>{body}</a>:<Link className={styles.trackCard} data-track={code} href={href} key={code} aria-label={action+"（需要登入）"}>{body}</Link>;})}</div>
    <div className={styles.trackFootnote}><ShieldCheck size={16}/>A、C 使用本平台內建工作台；D、E 目前仍為獨立預覽環境；B 進入會員工作區。各工作台可能使用示範資料，登入、AI 服務、資料持久化與外部整合仍依各線狀態逐步驗收。</div>
   </section>
   <section className={styles.architectureSection} id="architecture"><div className={styles.architectureIntro}><div><div className={styles.sectionEyebrow}>SYSTEM ARCHITECTURE</div><h2>不是五個孤島，<em>而是一個可驗證的協作系統</em></h2><p>五線保有各自的決策權與交付責任，跨線成果透過版本化文件、來源證據、接收線審核與相容性測試整合。</p></div><div className={styles.architectureLegend}><span><i className={styles.legendBlue}/> 工程執行</span><span><i className={styles.legendTeal}/> 產品流程</span><span><i className={styles.legendViolet}/> 預測學習</span><span><i className={styles.legendPink}/> 知識推理</span><span><i className={styles.legendGold}/> 研究查核</span></div></div><div className={styles.architectureVisual}><Image src="/brand/gcan-five-track-architecture.svg" alt="GCAN A 至 E 五條工作線及共同治理與學習閉環架構圖" width={1500} height={850} className={styles.architectureImage} sizes="(max-width: 1200px) 100vw, 1200px"/></div><div className={styles.architectureNote}><div><Layers3 size={17}/><b>接收線擁有採用決策權</b></div><p>共享成果先成為提案，再由接收線確認相容性、執行測試與決定是否採用；任何 AI 輸出都不能繞過這個流程。</p></div></section>
   <section className={styles.loopSection} id="learning-loop"><Heading label="SHARED LEARNING LOOP" title="讓每次改善都有起點、證據與回饋" text="五線共同使用同一個可稽核閉環。預測誤差是改善訊號，不是自動修改正式系統的授權。"/><div className={styles.loopRail}>{loop.map((step,i)=><div className={styles.loopStep} key={step}><span>{String(i+1).padStart(2,"0")}</span><b>{step}</b>{i<loop.length-1&&<ArrowRight size={14}/>}</div>)}</div><div className={styles.loopPrinciple}><Activity size={18}/><p><b>核心規則：</b>所有跨線改進都要保留來源、數字版本、影響線別、接收線決策、測試結果與回復方式。</p></div></section>
   <section className={styles.productSection} id="product-entry"><Heading label="START WITH THE PLATFORM" title="從真正的產品入口開始" text="工程工作台負責建設平台；使用者入口則聚焦 AI 工作、知識貢獻與可理解的產品規則。"/><div className={styles.productGrid}>
    <Link href="/workspace" className={styles.productCard}><span className={styles.productIcon}><Sparkles size={21}/></span><div><h3>AI 工作空間</h3><p>進入個人工作區，進行 AI 對話與專案知識工作。正式使用需登入並符合環境設定。</p></div><ArrowUpRight size={17}/></Link>
    <Link href="/contribute" className={styles.productCard}><span className={styles.productIcon}><ClipboardCheck size={21}/></span><div><h3>全球貢獻中心</h3><p>了解任務、提交、品質驗收與複核機制；獎勵資格以審核結果及平台規則為準。</p></div><ArrowUpRight size={17}/></Link>
    <a href="https://github.com/X84657465/global-citizen-ai-network" className={styles.productCard} target="_blank" rel="noreferrer"><span className={styles.productIcon}><BookOpen size={21}/></span><div><h3>公開技術與開發紀錄</h3><p>查看版本、工作線責任、工程文件、測試與每次變更的可追溯證據。</p></div><ArrowUpRight size={17}/></a>
   </div></section>
   <section className={styles.governanceSection} id="governance"><div className={styles.governanceHeader}><div className={styles.sectionEyebrow}>TRUST & GOVERNANCE</div><h2>安全與信任，從第一天就寫進架構</h2><p>平台不以尚未完成的功能作承諾，也不把 AI 建議當成正式決策。治理規則必須能被程式、測試與審核紀錄驗證。</p></div><div className={styles.trustGrid}>{rules.map(({title,text,icon:Icon})=><article className={styles.trustCard} key={title}><span><Icon size={20}/></span><div><h3>{title}</h3><p>{text}</p></div></article>)}</div></section>
   <section className={styles.docsSection} id="documentation"><div className={styles.docsHeading}><div><div className={styles.sectionEyebrow}>DOCUMENTATION & EVIDENCE</div><h2>網站說明與 GitHub 文件使用同一套定義</h2><p>架構、工作線責任、版本與技術細節以專案文件為準；首頁只呈現易讀摘要與各線入口。</p></div><a className={styles.textLink} href="https://github.com/X84657465/global-citizen-ai-network" target="_blank" rel="noreferrer">前往 GitHub 專案 <ArrowUpRight size={15}/></a></div><div className={styles.docsGrid}>{docs.map(({title,text,href,icon:Icon})=><a href={href} className={styles.docCard} key={title} target="_blank" rel="noreferrer"><span><Icon size={18}/></span><div><b>{title}</b><p>{text}</p></div><ArrowUpRight size={15}/></a>)}</div></section>
   <section className={styles.finalCta}><div className={styles.finalCtaMark}><Globe2 size={23}/></div><div><div className={styles.sectionEyebrow}>BUILD TOGETHER · LEARN TOGETHER</div><h2>讓每一份貢獻，都成為可驗證的進步</h2><p>GCAN 正在持續建置。歡迎先了解產品、檢視五線架構與追蹤公開開發紀錄。</p></div><a href="https://github.com/X84657465/global-citizen-ai-network" className={styles.finalCtaButton} target="_blank" rel="noreferrer">查看 GitHub <ArrowRight size={16}/></a></section>
  </main>
  <footer className={styles.footer}><div className={styles.footerTop}><Link href="/" className={styles.footerBrand}><span><Globe2 size={18}/></span><b>GLOBAL CITIZEN AI NETWORK</b></Link><p>Build Together. Learn Together. Make AI Useful for Everyone.</p></div><div className={styles.footerBottom}><span>© {new Date().getFullYear()} GCAN · Early Development / MVP</span><div><Link href="/workspace">AI 工作空間</Link><Link href="/contribute">全球貢獻中心</Link><a href="https://github.com/X84657465/global-citizen-ai-network" target="_blank" rel="noreferrer">GitHub</a><a href="https://github.com/X84657465/global-citizen-ai-network/blob/feat/agent-factory-v2/CHANGELOG.md" target="_blank" rel="noreferrer">版本紀錄</a></div></div></footer>
 </div>;
}
