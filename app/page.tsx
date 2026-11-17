"use client";

import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  Activity, ArrowDownRight, ArrowUpRight, BrainCircuit, CheckCircle2,
  ChevronRight, CircleDollarSign, Clock3, Cpu, FileSearch, Globe2,
  HandHeart, LayoutDashboard, LockKeyhole, Menu, MessageSquareText,
  Plus, Search, ShieldCheck, Sparkles, Wallet, X
} from "lucide-react";

type Task = { id: number; title: string; category: string; reward: number; time: string; level: string; status: "可參與" | "審核中" };

const initialTasks: Task[] = [
  { id: 1, title: "繁體中文 AI 回答品質評估", category: "模型評估", reward: 35, time: "約 8 分鐘", level: "入門", status: "可參與" },
  { id: 2, title: "公開資料來源查核與標註", category: "事實查核", reward: 60, time: "約 15 分鐘", level: "一般", status: "可參與" },
  { id: 3, title: "英文產品說明在地化校對", category: "翻譯校對", reward: 90, time: "約 20 分鐘", level: "一般", status: "可參與" },
];

const navItems = [
  { id: "overview", label: "總覽", icon: LayoutDashboard },
  { id: "ai", label: "AI 工作空間", icon: BrainCircuit },
  { id: "contribute", label: "全球貢獻中心", icon: HandHeart },
  { id: "ledger", label: "成本與貢獻帳本", icon: Wallet },
];

export default function Home() {
  const [active, setActive] = useState("overview");
  const [mobileMenu, setMobileMenu] = useState(false);
  const [query, setQuery] = useState("");
  const [prompt, setPrompt] = useState("");
  const [messages, setMessages] = useState<{ role: "assistant" | "user"; text: string }[]>([
    { role: "assistant", text: "你好，這裡是全球公民 AI 網路的工作空間原型。你可以先描述想研究的問題，我會在此展示流程介面。目前尚未連接正式 AI 服務，這個版本不會產生 API 費用。" }
  ]);
  const [tasks, setTasks] = useState(initialTasks);
  const [joined, setJoined] = useState<number[]>([]);
  const [showNotice, setShowNotice] = useState(true);

  const filteredTasks = useMemo(() => tasks.filter(t => (t.title + t.category).toLowerCase().includes(query.toLowerCase())), [tasks, query]);

  function sendMessage() {
    const value = prompt.trim();
    if (!value) return;
    setMessages(prev => [...prev, { role: "user", text: value }, { role: "assistant", text: "已收到你的需求。這是前端展示模式，尚未呼叫外部模型或搜尋服務。正式版會在每次請求前檢查使用額度，並記錄模型、token、供應商帳單成本與狀態。" }]);
    setPrompt("");
  }

  function joinTask(id: number) {
    if (joined.includes(id)) return;
    setJoined(prev => [...prev, id]);
    setTasks(prev => prev.map(t => t.id === id ? { ...t, status: "審核中" } : t));
  }

  const title = navItems.find(n => n.id === active)?.label ?? "總覽";

  return (
    <main className="shell">
      <aside className={mobileMenu ? "sidebar sidebar-open" : "sidebar"}>
        <div className="brand">
          <div className="brand-mark"><Globe2 size={22} /></div>
          <div><strong>GLOBAL CITIZEN</strong><span>AI NETWORK</span></div>
          <button className="mobile-close" onClick={() => setMobileMenu(false)} aria-label="關閉選單"><X size={18}/></button>
        </div>
        <div className="workspace-label">工作平台</div>
        <nav>
          {navItems.map(item => {
            const Icon = item.icon;
            return <button key={item.id} className={active === item.id ? "nav-item active" : "nav-item"} onClick={() => { setActive(item.id); setMobileMenu(false); }}>
              <Icon size={18}/><span>{item.label}</span>{active === item.id && <span className="nav-dot"/>}
            </button>;
          })}
        </nav>
        <div className="sidebar-bottom">
          <div className="secure-card"><ShieldCheck size={18}/><div><b>安全優先設計</b><span>透明、可驗證、可退出</span></div></div>
          <div className="profile"><div className="avatar">G</div><div><b>訪客體驗帳戶</b><span>原型展示模式</span></div><span className="online-dot"/></div>
        </div>
      </aside>

      {mobileMenu && <button className="scrim" onClick={() => setMobileMenu(false)} aria-label="關閉選單"/>}
      <section className="main-area">
        <header className="topbar">
          <button className="menu-toggle" onClick={() => setMobileMenu(true)} aria-label="開啟選單"><Menu size={20}/></button>
          <div className="breadcrumb">平台 / <b>{title}</b></div>
          <div className="top-actions"><Link href="/contribute" className="login-link">全球貢獻中心</Link><Link href="/workspace" className="login-link">AI 工作空間</Link><Link href="/login" className="login-link">會員登入</Link><span className="status-pill"><span/> 系統原型運作中</span><button className="icon-button" aria-label="搜尋"><Search size={18}/></button><div className="avatar small">G</div></div>
        </header>

        <div className="content">
          {showNotice && <div className="prototype-notice"><div><Activity size={17}/><span><b>早期原型</b>　目前使用示範資料，尚未連接正式 AI、資料庫、金流或獎勵支付。</span></div><button onClick={() => setShowNotice(false)} aria-label="關閉提示"><X size={16}/></button></div>}

          {active === "overview" && <>
            <div className="page-heading"><div><div className="eyebrow">GLOBAL CITIZEN AI NETWORK</div><h1>讓 AI 成為每個人的共同資產</h1><p>使用 AI，也用你的知識、經驗與專業，參與建設更好的 AI。</p></div><button className="primary-button" onClick={() => setActive("ai")}><Sparkles size={16}/> 開始使用 AI <ChevronRight size={16}/></button></div>
            <div className="metric-grid">
              <Metric icon={<BrainCircuit/>} label="AI 服務請求" value="—" note="正式服務尚未啟用" />
              <Metric icon={<HandHeart/>} label="已驗證貢獻" value="—" note="等待真實任務資料" />
              <Metric icon={<CircleDollarSign/>} label="可結算獎勵" value="NT$ 0" note="目前沒有實際發放" />
              <Metric icon={<Cpu/>} label="運算節點" value="0" note="分散式運算尚未開放" />
            </div>
            <div className="section-heading"><div><h2>平台四大核心</h2><p>先建立可持續的服務，再逐步擴大公民參與網路。</p></div></div>
            <div className="pillar-grid">
              <Pillar icon={<BrainCircuit/>} number="01" title="AI 服務中心" text="研究、搜尋、寫作、分析與個人專案工作區。" tag="第一階段核心"/>
              <Pillar icon={<HandHeart/>} number="02" title="全球貢獻中心" text="知識整理、翻譯、查核、回答評估與工具開發。" tag="第一階段核心"/>
              <Pillar icon={<Wallet/>} number="03" title="貢獻與獎勵帳本" text="每筆貢獻可追蹤、可驗證，獎勵規則公開透明。" tag="第一階段核心"/>
              <Pillar icon={<Cpu/>} number="04" title="分散式運算網路" text="由參與者自主選擇是否分享閒置 CPU/GPU 資源。" tag="後續階段"/>
            </div>
            <div className="bottom-grid">
              <div className="panel"><div className="panel-title"><div><h3>近期開發里程碑</h3><p>以安全與真實營運能力為優先</p></div><span className="subtle-label">路線圖</span></div><div className="milestones"><Milestone done title="核心理念與產品邊界" detail="四大支柱、參與者權益與經濟原則"/><Milestone done title="成本透明規格" detail="API 帳單、內部估算與營運成本分帳"/><Milestone title="MVP 前端與資料模型" detail="工作區、貢獻任務、帳本與管理介面"/><Milestone title="登入、資料庫與權限" detail="建立可驗證的真實使用者流程"/><Milestone title="小規模封閉測試" detail="資安檢查、成本上限與人工覆核"/></div></div>
              <div className="panel principles"><div className="panel-title"><div><h3>平台承諾</h3><p>不是口號，是系統規則</p></div><LockKeyhole size={18}/></div><ul><li><CheckCircle2/> 不會未經同意使用你的裝置資源</li><li><CheckCircle2/> 不承諾不實收益或投資報酬</li><li><CheckCircle2/> 貢獻品質有標準，也有申訴機制</li><li><CheckCircle2/> 成本與獎勵有紀錄可供查驗</li></ul></div>
            </div>
          </>}

          {active === "ai" && <><div className="page-heading"><div><div className="eyebrow">AI SERVICE CENTER</div><h1>AI 工作空間</h1><p>把研究、思考與執行集中在同一個專案空間。</p></div><span className="subtle-label">模擬模式 · 不呼叫 API</span></div><div className="chat-layout"><div className="chat-panel"><div className="chat-header"><div className="ai-orb"><Sparkles size={18}/></div><div><b>Global AI 助手</b><span>目前為前端互動示範</span></div><span className="model-tag">DEMO</span></div><div className="messages">{messages.map((m,i)=><div key={i} className={m.role === "user" ? "message user-message" : "message assistant-message"}><div className="message-avatar">{m.role === "user" ? "你" : <BrainCircuit size={17}/>}</div><div>{m.text}</div></div>)}</div><div className="chat-input"><textarea value={prompt} onChange={e=>setPrompt(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();sendMessage();}}} placeholder="輸入你想研究、分析或規劃的問題…"/><button onClick={sendMessage} disabled={!prompt.trim()}><ArrowUpRight size={17}/></button></div><div className="input-footnote">Enter 傳送 · Shift + Enter 換行 · 示範訊息不會送往外部服務</div></div><div className="side-info"><div className="panel"><h3>工作區能力規劃</h3><InfoRow icon={<FileSearch/>} title="研究與資料查證" text="來源追蹤、交叉比對與研究摘要"/><InfoRow icon={<MessageSquareText/>} title="專案與對話記憶" text="將對話整理成可持續更新的專案"/><InfoRow icon={<Sparkles/>} title="多模型路由" text="依任務品質、延遲與成本選擇模型"/></div><div className="cost-note"><CircleDollarSign size={19}/><div><b>成本保護已列入規格</b><p>正式串接前必須設定每月支出上限、單次請求上限與異常停用機制。</p></div></div></div></div></>}

          {active === "contribute" && <><div className="page-heading"><div><div className="eyebrow">GLOBAL CONTRIBUTION CENTER</div><h1>全球貢獻中心</h1><p>每個人的知識與判斷，都能成為 AI 進步的一部分。</p></div><span className="subtle-label">任務示範資料</span></div><div className="contribution-intro"><div className="contribution-icon"><HandHeart size={25}/></div><div><b>從可驗證的小任務開始</b><p>完成任務不代表立即獲得現金，必須先通過品質驗證，再依公開規則記錄獎勵資格。</p></div></div><div className="task-toolbar"><div><h2>可參與任務</h2><p>以下獎勵金額純屬介面測試範例，不代表平台已承諾付款。</p></div><div className="search-box"><Search size={16}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="搜尋任務"/></div></div><div className="task-list">{filteredTasks.map(task=><div className="task-row" key={task.id}><div className="task-icon"><FileSearch size={20}/></div><div className="task-main"><b>{task.title}</b><div className="task-meta"><span>{task.category}</span><span><Clock3 size={13}/>{task.time}</span><span>{task.level}</span></div></div><div className="task-reward"><b>NT$ {task.reward}</b><span>示範值</span></div><button className={task.status==="可參與"?"outline-button":"muted-button"} disabled={task.status!=="可參與"} onClick={()=>joinTask(task.id)}>{task.status==="可參與"?"查看並參與":"已送出"}</button></div>)}</div><div className="review-note"><ShieldCheck size={18}/><span><b>品質驗證：</b>格式檢查、重複內容偵測、AI 輔助評估與抽樣人工覆核並行，並保留申訴與重新審查流程。</span></div></>}

          {active === "ledger" && <><div className="page-heading"><div><div className="eyebrow">TRANSPARENT ACCOUNTING</div><h1>成本與貢獻帳本</h1><p>讓每一筆 AI 成本、平台支出與參與者獎勵都有跡可循。</p></div><span className="subtle-label">帳務尚未啟用</span></div><div className="ledger-banner"><Wallet size={22}/><div><b>透明帳本是平台核心，不是事後補上的報表</b><p>以下為正式版欄位與計算規則示意，並非真實財務數字。</p></div></div><div className="metric-grid ledger-metrics"><Metric icon={<ArrowDownRight/>} label="AI 直接成本" value="NT$ 0" note="尚未連接供應商"/><Metric icon={<ArrowUpRight/>} label="平台營收" value="NT$ 0" note="尚未啟用收款"/><Metric icon={<HandHeart/>} label="貢獻者結算" value="NT$ 0" note="尚未開放實際支付"/><Metric icon={<Activity/>} label="平台營運結果" value="未計算" note="沒有正式帳務資料"/></div><div className="panel ledger-table-panel"><div className="panel-title"><div><h3>每筆 AI 請求必須記錄</h3><p>不以公開 API 標價冒充供應商實際帳單或內部推論成本</p></div><span className="subtle-label">資料規格</span></div><div className="ledger-table"><div className="ledger-table-head"><span>欄位</span><span>記錄內容</span><span>目的</span></div>{[["請求識別","request_id、時間、匿名使用者 ID","追蹤每次服務"],["模型用量","供應商、模型版本、輸入/輸出/快取 token","計算用量"],["供應商帳單","provider_billed_cost、幣別、帳單週期","對帳實際費用"],["內部成本估算","estimated_internal_cost、計算依據","管理邊際成本"],["工具與人工","搜尋、工具、人工覆核、重試成本","避免漏算服務成本"],["帳本異動","原始交易、沖銷、調整與審計紀錄","確保歷史可追溯"]].map(row=><div className="ledger-table-row" key={row[0]}><b>{row[0]}</b><span>{row[1]}</span><span>{row[2]}</span></div>)}</div></div><div className="formula-grid"><div className="formula-card"><span>服務貢獻毛利</span><b>服務收入 − 可歸屬直接服務成本</b></div><div className="formula-card"><span>平台營運結果</span><b>總收入 − 全部營運費用</b></div><div className="formula-card"><span>可分配盈餘</span><b>依法可分配且經核實的實際盈餘</b></div></div></>}
          <footer><span>© 2026 Global Citizen AI Network</span><span>以透明、尊重與可驗證的方式共同建設 AI</span></footer>
        </div>
      </section>
    </main>
  );
}

function Metric({icon,label,value,note}:{icon:ReactNode;label:string;value:string;note:string}) {
  return <div className="metric-card"><div className="metric-top"><span>{label}</span><div className="metric-icon">{icon}</div></div><strong>{value}</strong><small>{note}</small></div>;
}
function Pillar({icon,number,title,text,tag}:{icon:ReactNode;number:string;title:string;text:string;tag:string}) {
  return <div className="pillar-card"><div className="pillar-top"><div className="pillar-icon">{icon}</div><span>{number}</span></div><h3>{title}</h3><p>{text}</p><div className="pillar-tag">{tag}</div></div>;
}
function Milestone({done=false,title,detail}:{done?:boolean;title:string;detail:string}) {
  return <div className="milestone"><div className={done?"milestone-check done":"milestone-check"}>{done?<CheckCircle2 size={15}/>:<span/>}</div><div><b>{title}</b><p>{detail}</p></div><span className={done?"milestone-state done":"milestone-state"}>{done?"已完成":"待執行"}</span></div>;
}
function InfoRow({icon,title,text}:{icon:ReactNode;title:string;text:string}) {
  return <div className="info-row"><div>{icon}</div><section><b>{title}</b><p>{text}</p></section></div>;
}