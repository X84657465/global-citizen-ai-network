import Image from "next/image";
import Link from "next/link";
import { Activity, ArrowRight, ArrowUpRight, BookOpen, BrainCircuit, CheckCircle2, ChevronRight, ClipboardCheck, Cpu, GitBranch, Globe2, Layers3, LockKeyhole, Network, ReceiptText, SearchCheck, ShieldCheck, Sparkles, Workflow, type LucideIcon } from "lucide-react";
import styles from "./home.module.css";

type Track = { code: "A" | "B" | "C" | "D" | "E" | "F" | "G" | "H" | "I" | "J" | "K" | "L" | "M" | "N" | "O" | "P"; title: string; subtitle: string; mission: string; scope: string[]; status: string; href: string; action: string; external?: boolean; icon: LucideIcon };
const tracks: Track[] = [
 { code:"A", title:"Agent Factory V2", subtitle:"AI 自動開發工廠", mission:"讓工程任務從規劃、執行、測試、修復到交付，都有明確狀態與可核對證據。", scope:["任務派送與 Worker Lease","隔離執行、測試與故障修復","精確 SHA 綁定 CI 與候選 PR","重試、復原及交付稽核"], status:"獨立工作台 · 開發候選", href:"/factory", action:"開啟 A 線工廠工作台", icon:Workflow },
 { code:"B", title:"Global Citizen AI Network", subtitle:"全球公民 AI 產品", mission:"面向使用者的產品主線，整合 AI 工作空間、知識貢獻、透明帳本與平台治理。", scope:["AI 工作空間與專案脈絡","任務、提交、審核與複核","成本、貢獻與稽核紀錄","會員體驗與平台流程"], status:"產品入口 · MVP 建置中", href:"/workspace", action:"進入 B 線產品工作區", icon:Globe2 },
 { code:"C", title:"Predictive Coding", subtitle:"預測編碼與誤差學習", mission:"明確提出可驗證預測，再對照觀測結果、計算誤差、檢查校準並提出改進方案。", scope:["預測紀錄與目標期限","實際觀測與來源證據","誤差量測、校準與漂移","附驗證與回復方案的更新提案"], status:"展示工作台 · 示範資料", href:"/predictive-coding", action:"開啟 C 線預測工作台", icon:Activity },
 { code:"D", title:"Deep Neural", subtitle:"深度神經與知識推理", mission:"整理具來源、版本與信心標記的知識記憶，支援推理、評估與跨線學習。", scope:["來源可追溯的知識記憶","證據檢索與脈絡整合","推理品質與不確定性評估","需審核的跨線學習提案"], status:"整合候選 · 查看工程分支", href:"https://github.com/X84657465/global-citizen-ai-network/tree/feat/deep-neural-core", action:"查看 D 線神經工作台工程分支", external:true, icon:BrainCircuit },
 { code:"E", title:"Deep Research", subtitle:"深度研究與證據查核", mission:"把研究問題拆成可追蹤任務，查驗來源、尋找佐證與反證，輸出有引用的研究成果。", scope:["研究任務與問題拆解","來源可信度與出處追蹤","交叉驗證與反證搜尋","引用式綜整與行動建議"], status:"整合候選 · 查看工程分支", href:"https://github.com/X84657465/global-citizen-ai-network/tree/feat/deep-research-workbench", action:"查看 E 線研究工作台工程分支", external:true, icon:SearchCheck },

 { code:"F", title:"Cyber Security & Defense", subtitle:"網路安全與主動防禦", mission:"建立涵蓋預防、偵測、應變與復原的共同安全防線，保護程式碼、資料、帳號、供應鏈與執行環境。", scope:["威脅模型、攻擊面與弱點管理","身分驗證、最小權限與秘密資訊保護","安全監控、事件分級與應變演練","供應鏈安全、隔離測試與修補驗證"], status:"安全基線與防禦能力逐步建置", href:"#architecture", action:"查看安全與整合架構", icon:ShieldCheck },
 { code:"G", title:"Release, QA & Integration", subtitle:"發布、品質保證與跨線整合", mission:"建立所有工作線共同遵循的品質與發布閘門，確保跨線變更相容、可測試、可回復且有明確驗收證據。", scope:["版本與變更影響分析","單元、整合、回歸及相容性測試","精確 SHA 綁定 CI 與發布候選","發布核准、回滾計畫與驗收紀錄"], status:"整合品質關卡 · 持續建置", href:"#architecture", action:"查看品質與整合架構", icon:CheckCircle2 },
 { code:"H", title:"Observability, Telemetry & Cost/Quota Governance", subtitle:"可觀測性、遙測、成本與配額治理", mission:"讓平台與各工作線的健康、效能、資源消耗及成本可量測、可追蹤、可告警，並以預算與配額避免失控。", scope:["Logs、Metrics、Traces 與健康狀態","Runner、服務與工作流效能監控","AI 用量、供應商成本與資源配額","告警門檻、預算硬停止與成本稽核"], status:"監控與成本治理逐步建置", href:"#architecture", action:"查看監控與成本架構", icon:Activity },
 { code:"I", title:"Ecosystem, Connectors & Workflow Automation", subtitle:"生態系串接與工作流自動化", mission:"把 GCAN 與外部工具、資料來源及合作服務安全連接，讓跨系統工作流可編排、可追蹤並能在失敗時恢復。", scope:["標準化 API、Webhook 與 Connector","外部帳號授權、Token 範圍與撤銷","跨平台工作流編排、排程與事件觸發","重試、冪等、錯誤隔離與整合測試"], status:"路線規劃 · 依產品需求分階段建置", href:"#architecture", action:"查看串接與工作流架構", icon:Workflow },
 { code:"J", title:"Self-Healing, Chaos & Continuity", subtitle:"自我修復、混沌工程與服務持續性", mission:"驗證系統面對程序崩潰、依賴失效、網路中斷及資料異常時，能否安全偵測、隔離、復原並維持核心服務。", scope:["故障分類、健康檢查與自動復原策略","受控故障注入與混沌測試","備份、復原、重啟與災難復原演練","RTO／RPO、降級模式與持續營運驗證"], status:"研究與設計 · 需受控環境驗證", href:"#architecture", action:"查看韌性與復原架構", icon:Activity },
 { code:"K", title:"Knowledge Base, Docs & Governance Playbooks", subtitle:"知識庫、文件與治理作業手冊", mission:"把工程決策、架構知識、操作程序與故障處理經驗轉成有版本、來源、責任人及更新週期的可重用知識。", scope:["架構決策紀錄與知識來源追蹤","操作手冊、Runbook 與標準流程","版本、文件責任人及過期檢查","跨線交接、經驗回饋與知識檢索"], status:"文件與治理知識持續整理", href:"#documentation", action:"查看文件與知識入口", icon:BookOpen },
 { code:"L", title:"Multi-Node, Federation & Edge/Cluster Coordination", subtitle:"多節點、聯邦與邊緣／叢集協調", mission:"研究多節點環境下的工作分配、節點身分、協作通訊、資源調度與故障隔離，支援未來跨區域擴展。", scope:["節點註冊、身分、信任與健康狀態","工作排程、資源協調與負載分配","聯邦協定、跨節點通訊與資料邊界","Edge／Cluster 故障隔離與一致性策略"], status:"長期研究方向 · 尚非公開運算服務", href:"#architecture", action:"查看多節點架構方向", icon:Network },
 { code:"M", title:"Compliance, Policy Audit & Risk Governance", subtitle:"法遵、政策稽核與風險治理", mission:"把適用法規、平台政策、資料生命週期及營運風險轉成可追蹤的控制要求、稽核證據與改善流程。", scope:["隱私、資料保護與跨境要求盤點","政策控制、責任矩陣與稽核軌跡","風險登錄、評估、緩解與例外管理","法務／稅務／資安專業審查關卡"], status:"政策設計與風險盤點 · 待專業審查", href:"#p-governance", action:"查看合規與治理原則", icon:LockKeyhole },
 { code:"N", title:"Productization, Analytics & Growth/Ecosystem Ops", subtitle:"產品化、分析、成長與生態系營運", mission:"將已驗證的技術能力轉成可理解、可持續營運的產品與服務，以真實使用、留存、成本及付費證據驅動成長。", scope:["產品包裝、方案與使用者旅程","產品分析、漏斗、留存與品質指標","市場驗證、付費試點與單位經濟","合作夥伴、社群與生態系營運"], status:"商業驗證與產品化分階段進行", href:"#product-entry", action:"查看產品入口與成長方向", icon:Globe2 },
 { code:"O", title:"Lifecycle, Deprecation & Legacy Retirement", subtitle:"生命週期、淘汰與舊系統退役", mission:"管理功能、API、資料結構、模型與基礎設施從建立、維護、遷移到退役的完整生命週期，避免舊系統成為安全與維護負擔。", scope:["版本支援週期與相容性政策","棄用公告、遷移工具與使用者通知","資料封存、搬遷、驗證與回復方案","舊 API、服務、依賴及基礎設施退役"], status:"治理規劃 · 隨系統成熟逐步啟用", href:"#architecture", action:"查看生命週期治理方向", icon:Layers3 },
 { code:"P", title:"Governance, Ethics & Trust / Policy Evolution", subtitle:"治理、倫理、信任與政策演進", mission:"作為 A–O 全部工作線及 GCAN 產品的橫向治理層，確保權限、隱私、倫理、公平、透明、人工責任與政策演進有共同底線。", scope:["人類責任、授權與高風險人工審核","安全、隱私、資料權利與最小權限","倫理、公平、透明度與可申訴機制","政策版本、稽核證據與持續改進"], status:"橫向治理規範 · 不代表各模組已上線", href:"#p-governance", action:"查看 P 線治理細節", icon:ShieldCheck },
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
 { title:"A–P 工程治理規範", text:"A–O 工作線責任、P 橫向治理、版本制度、相容性測試與接收線審核。", href:"https://github.com/X84657465/global-citizen-ai-network/blob/main/docs/engineering-governance.md", icon:GitBranch },
 { title:"版本清單與變更紀錄", text:"查看平台版本、各主線版本、治理狀態與可追溯變更。", href:"https://github.com/X84657465/global-citizen-ai-network/blob/main/versions/manifest.json", icon:Layers3 },
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
   <nav className={styles.nav} aria-label="主要導覽"><Link href="/workspace">AI 工作空間</Link><Link href="/factory">A 線工廠</Link><a href="#pillars">平台價值</a><a href="#workstreams">A–O 工作線</a><a href="#learning-loop">協作閉環</a><a href="#p-governance">P 治理</a><a href="#documentation">技術文件</a></nav>
   <div className={styles.headerActions}><Link href="/login" className={styles.loginLink}>會員登入</Link><Link href="/workspace" className={styles.headerCta}>進入平台 <ArrowUpRight size={15}/></Link></div>
  </div></header>
  <main id="main-content" tabIndex={-1}>
   <section className={styles.hero}><div className={styles.heroInner}>
    <div className={styles.heroCopy}><div className={styles.eyebrow}><span/> 15 WORKSTREAMS · ONE GOVERNANCE LAYER</div>
     <h1>讓 AI 成為<br/><em>每個人都能參與</em><br/>的全球協作網路</h1>
     <p className={styles.heroLead}>Global Citizen AI Network（GCAN）不只是一個 AI 聊天介面。我們正在建立結合 AI 服務、全球知識貢獻、預測學習、知識推理與深度研究的協作平台，讓每一項成果都能被追蹤、驗證與持續改善。</p>
     <div className={styles.heroActions}><Link href="/workspace" className={styles.primaryButton}>進入 AI 工作空間 <ArrowRight size={17}/></Link><Link href="/factory" className={styles.secondaryButton}>查看 Agent Factory 工廠 <ChevronRight size={15}/></Link></div>
     <a href="#workstreams" className={styles.heroExplore}>或先探索 A–O 十五條工作線與 P 治理層 <ArrowRight size={14}/></a>
     <div className={styles.heroPrinciples}><span><ShieldCheck size={15}/> 明確授權</span><span><GitBranch size={15}/> 版本可追溯</span><span><CheckCircle2 size={15}/> 結果可驗證</span></div>
    </div>
    <div className={styles.heroVisual}><div className={styles.visualGlow}/><div className={styles.visualFrame}><Image src="/brand/gcan-hero.svg" alt="GCAN 全球 AI 協作網路品牌主視覺" width={1600} height={520} priority className={styles.heroImage} sizes="(max-width: 900px) 100vw, 52vw"/></div><div className={styles.visualTagTop}><span className={styles.liveDot}/> A–O 十五條工作線 + P 治理層</div><div className={styles.visualTagBottom}><Network size={15}/> INDEPENDENT · CONNECTED · REVIEWED</div></div>
   </div><div className={styles.heroBottom}><div className={styles.heroBottomLabel}>THE GCAN OPERATING MODEL</div><div className={styles.heroFact}><b>15 + 1</b><span>十五條工作線 + 一個治理層</span></div><div className={styles.heroFact}><b>01</b><span>共用證據協作閉環</span></div><div className={styles.heroFact}><b>A–O OWNED</b><span>十五條工作線獨立負責與版本管理</span></div><div className={styles.heroFact}><b>P GOVERNANCE</b><span>整合前審核、測試與治理</span></div></div></section>
   <section className={styles.stageBar} aria-label="專案狀態"><div className={styles.stageLabel}><span/> EARLY DEVELOPMENT / MVP · 早期建置與預覽階段 · PR #207 CANDIDATE</div><p>目前為候選更新，尚未合併或正式發布；最新候選 SHA 尚無可用 Preview，舊版 Preview 不作為本版驗收證據。各工作台成熟度不同，請以工作線標示及精確 SHA 的 CI 結果為準。</p><div className={styles.stageLinks}><a href="https://github.com/X84657465/global-citizen-ai-network/pull/207" target="_blank" rel="noreferrer">查看首頁更新 PR #207 <ArrowUpRight size={14}/></a><a href="https://github.com/X84657465/global-citizen-ai-network/actions" target="_blank" rel="noreferrer">查看 CI 執行紀錄 <ArrowUpRight size={14}/></a></div></section>
   <section className={styles.pillarsSection} id="pillars"><Heading label="THE PLATFORM" title="四大平台價值，承載 A–O 十五條工作線與 P 治理" text="四大價值描述 GCAN 最終要提供的公共能力；A–O 十五條工作線各自負責建設、驗證與持續改善；P 是適用於 A–O 與整體產品的橫向治理層。"/><div className={styles.pillarGrid}>{pillars.map(({n,title,text,icon:Icon})=><article className={styles.pillarCard} key={n}><div className={styles.pillarTop}><span>{n}</span><div className={styles.pillarIcon}><Icon size={21}/></div></div><h3>{title}</h3><p>{text}</p></article>)}</div></section>
   <section className={styles.workstreamsSection} id="workstreams"><div className={styles.workstreamsTop}><Heading label="15 ENGINEERING WORKSTREAMS + P GOVERNANCE" title="A–O 十五條工作線，P 橫向治理、協同整合" text="A–O 各線都有獨立使命、職責、功能範圍、版本與驗收證據；P 提供共同治理底線。I–O 依路線圖分階段建置，規劃或研究中的能力不代表已正式上線。"/><a className={styles.textLink} href="https://github.com/X84657465/global-citizen-ai-network/blob/main/docs/engineering-governance.md" target="_blank" rel="noreferrer">閱讀 A–P 治理規範 <ArrowUpRight size={15}/></a></div>
    <div className={styles.trackGrid}>{tracks.map(({code,title,subtitle,mission,scope,status,href,action,external,icon:Icon})=>{const body=<><div className={styles.trackTop}><span className={styles.trackCode}>{code === "P" ? "GOVERNANCE LAYER · P" : `WORKSTREAM · ${code}`}</span><span className={styles.trackOrb}><Icon size={21}/></span></div><div className={styles.trackTitleGroup}><h3>{title}</h3><span>{subtitle}</span></div><p className={styles.trackMission}>{mission}</p><ul className={styles.trackScope}>{scope.map(item=><li key={item}><CheckCircle2 size={13}/>{item}</li>)}</ul><div className={styles.trackFooter}><span className={styles.trackStatus}>{status}</span><span className={styles.trackAction}>{action} <ArrowUpRight size={15}/></span></div></>;return external?<a className={styles.trackCard} data-track={code} href={href} key={code} target="_blank" rel="noreferrer" aria-label={action+"（開啟 GitHub 工程分支）"}>{body}</a>:<Link className={styles.trackCard} data-track={code} href={href} key={code} aria-label={action}>{body}</Link>;})}</div>
    <div className={styles.trackFootnote}><ShieldCheck size={16}/>A、C 使用本平台內建工作台；D、E 目前仍為獨立預覽環境；B 進入會員工作區；F–P 依各線成熟度逐步建置；部分工作線尚未整合至正式產品流程。各工作台可能使用示範資料，登入、AI 服務、資料持久化與外部整合仍依各線狀態逐步驗收。</div>
   </section>
   <section className={styles.architectureSection} id="architecture"><div className={styles.architectureIntro}><div><div className={styles.sectionEyebrow}>SYSTEM ARCHITECTURE</div><h2>十五條工作線，<em>由一個共同治理層守住整合品質</em></h2><p>A–O 各工作線保有自己的決策權與交付責任，P 治理層橫向適用 A–O 全部十五條工作線與整體產品；跨線成果透過版本化文件、來源證據、接收線審核與相容性測試整合。</p></div><div className={styles.architectureLegend}><span><i className={styles.legendBlue}/> 工程執行</span><span><i className={styles.legendTeal}/> 產品流程</span><span><i className={styles.legendViolet}/> 預測學習</span><span><i className={styles.legendPink}/> 知識推理</span><span><i className={styles.legendGold}/> 研究查核</span></div></div><div className={styles.architectureVisual}><Image src="/brand/gcan-five-track-architecture.svg" alt="GCAN A–O 十五條工作線與 P 橫向治理層架構示意圖" width={1500} height={900} className={styles.architectureImage} sizes="(max-width: 1200px) 100vw, 1200px"/></div><div className={styles.architectureNote}><div><Layers3 size={17}/><b>接收線擁有採用決策權</b></div><p>共享成果先成為提案，再由接收線確認相容性、執行測試與決定是否採用；任何 AI 輸出都不能繞過這個流程。</p></div></section>
   <section className={styles.loopSection} id="learning-loop"><Heading label="SHARED LEARNING LOOP" title="讓每次改善都有起點、證據與回饋" text="A–O 十五條工作線共同使用同一個可稽核閉環，並受 P 治理原則約束。預測誤差是改善訊號，不是自動修改正式系統的授權。"/><div className={styles.loopRail}>{loop.map((step,i)=><div className={styles.loopStep} key={step}><span>{String(i+1).padStart(2,"0")}</span><b>{step}</b>{i<loop.length-1&&<ArrowRight size={14}/>}</div>)}</div><div className={styles.loopPrinciple}><Activity size={18}/><p><b>核心規則：</b>所有跨線改進都要保留來源、數字版本、影響線別、接收線決策、測試結果與回復方式。</p></div></section>
   <section className={styles.productSection} id="product-entry"><Heading label="START WITH THE PLATFORM" title="從真正的產品入口開始" text="工程工作台負責建設平台；使用者入口則聚焦 AI 工作、知識貢獻與可理解的產品規則。"/><div className={styles.productGrid}>
    <Link href="/workspace" className={styles.productCard}><span className={styles.productIcon}><Sparkles size={21}/></span><div><h3>AI 工作空間</h3><p>進入個人工作區，進行 AI 對話與專案知識工作。正式使用需登入並符合環境設定。</p></div><ArrowUpRight size={17}/></Link>
    <Link href="/factory" className={styles.productCard}><span className={styles.productIcon}><Workflow size={21}/></span><div><h3>Agent Factory 工廠</h3><p>查看 A 線任務執行、品質閘門、候選交付與工程治理狀態。</p></div><ArrowUpRight size={17}/></Link>
    <Link href="/contribute" className={styles.productCard}><span className={styles.productIcon}><ClipboardCheck size={21}/></span><div><h3>全球貢獻中心</h3><p>了解任務、提交、品質驗收與複核機制；獎勵資格以審核結果及平台規則為準。</p></div><ArrowUpRight size={17}/></Link>
    <a href="https://github.com/X84657465/global-citizen-ai-network" className={styles.productCard} target="_blank" rel="noreferrer"><span className={styles.productIcon}><BookOpen size={21}/></span><div><h3>公開技術與開發紀錄</h3><p>查看版本、工作線責任、工程文件、測試與每次變更的可追溯證據。</p></div><ArrowUpRight size={17}/></a>
   </div></section>
   <section className={styles.governanceSection} id="governance"><div className={styles.governanceHeader}><div className={styles.sectionEyebrow}>TRUST & GOVERNANCE</div><h2>安全與信任，從第一天就寫進架構</h2><p>平台不以尚未完成的功能作承諾，也不把 AI 建議當成正式決策。治理規則必須能被程式、測試與審核紀錄驗證。</p></div><div className={styles.trustGrid}>{rules.map(({title,text,icon:Icon})=><article className={styles.trustCard} key={title}><span><Icon size={20}/></span><div><h3>{title}</h3><p>{text}</p></div></article>)}</div></section>
   <section className={styles.governanceSection} id="p-governance">
    <div className={styles.governanceHeader}>
     <div className={styles.sectionEyebrow}>P · GOVERNANCE, ETHICS & TRUST</div>
     <h2>P 治理層：讓 A–O 工作線可被信任</h2>
     <p>P 是橫向治理層，適用於 A–O 所有工作線及整體產品。它不是另一條功能線，也不表示尚未完成的模組已經上線；它定義所有研發、資料處理、AI 行為與正式發布必須遵守的共同底線。</p>
    </div>
    <div className={styles.trustGrid}>
     {[
      {title:"Human Accountability｜人類責任",text:"正式合併、正式部署、正式資料變更與高風險決策必須有明確授權，不由 AI 自行核准。",icon:ShieldCheck},
      {title:"Security & Privacy｜安全與隱私",text:"落實最小權限、資料隔離、秘密資訊保護、資料最小化與可追溯存取。",icon:LockKeyhole},
      {title:"Ethics & Fairness｜倫理與公平",text:"揭露示範資料與模型限制；不以未驗證的 AI 評分作為唯一貢獻或獎勵依據。",icon:CheckCircle2},
      {title:"Transparency & Audit｜透明與稽核",text:"重要變更保留版本、精確 SHA、測試結果、審核決策、責任歸屬與回復方式。",icon:ReceiptText},
      {title:"Risk & Resilience｜風險與韌性",text:"採 fail-closed、有限重試、隔離、監控、事故通報與可驗證復原程序。",icon:Activity},
      {title:"Consent & Trust｜同意與信任",text:"任何使用者設備資源必須明確自願授權，並提供可暫停、可退出的控制。",icon:Globe2}
     ].map(({title,text,icon:Icon})=><article className={styles.trustCard} key={title}><span><Icon size={20}/></span><div><h3>{title}</h3><p>{text}</p></div></article>)}
    </div>
   </section>
   <section className={styles.docsSection} id="documentation"><div className={styles.docsHeading}><div><div className={styles.sectionEyebrow}>DOCUMENTATION & EVIDENCE</div><h2>網站說明與 GitHub 文件使用同一套定義</h2><p>架構、工作線責任、版本與技術細節以專案文件為準；首頁只呈現易讀摘要與各線入口。</p></div><a className={styles.textLink} href="https://github.com/X84657465/global-citizen-ai-network" target="_blank" rel="noreferrer">前往 GitHub 專案 <ArrowUpRight size={15}/></a></div><div className={styles.docsGrid}>{docs.map(({title,text,href,icon:Icon})=><a href={href} className={styles.docCard} key={title} target="_blank" rel="noreferrer"><span><Icon size={18}/></span><div><b>{title}</b><p>{text}</p></div><ArrowUpRight size={15}/></a>)}</div></section>
   <section className={styles.finalCta}><div className={styles.finalCtaMark}><Globe2 size={23}/></div><div><div className={styles.sectionEyebrow}>BUILD TOGETHER · LEARN TOGETHER</div><h2>讓每一份貢獻，都成為可驗證的進步</h2><p>GCAN 正在持續建置。歡迎先了解產品、檢視 A–O 工作線、P 治理與公開開發紀錄。</p></div><a href="https://github.com/X84657465/global-citizen-ai-network" className={styles.finalCtaButton} target="_blank" rel="noreferrer">查看 GitHub <ArrowRight size={16}/></a></section>
  </main>
  <footer className={styles.footer}><div className={styles.footerTop}><Link href="/" className={styles.footerBrand}><span><Globe2 size={18}/></span><b>GLOBAL CITIZEN AI NETWORK</b></Link><p>Build Together. Learn Together. Make AI Useful for Everyone.</p></div><div className={styles.footerBottom}><span>© {new Date().getFullYear()} GCAN · Early Development / MVP</span><div><Link href="/workspace">AI 工作空間</Link><Link href="/factory">A 線工廠</Link><Link href="/contribute">全球貢獻中心</Link><a href="https://github.com/X84657465/global-citizen-ai-network" target="_blank" rel="noreferrer">GitHub</a><a href="https://github.com/X84657465/global-citizen-ai-network/blob/feat/agent-factory-v2/CHANGELOG.md" target="_blank" rel="noreferrer">版本紀錄</a></div></div></footer>
 </div>;
}
