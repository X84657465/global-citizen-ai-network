import Link from "next/link";
import {
  ArrowRight, BrainCircuit, ClipboardCheck, Cpu, Globe2, HandHeart,
  LockKeyhole, ReceiptText, ShieldCheck, Sparkles
} from "lucide-react";
import styles from "./home.module.css";

const pillars = [
  {
    number: "01",
    title: "全民 AI 服務",
    description: "把研究、寫作、分析與專案知識整理，集中在可持續使用的工作空間。",
    status: "核心應用建置中",
    icon: BrainCircuit,
  },
  {
    number: "02",
    title: "全球知識貢獻",
    description: "讓查核、翻譯、資料整理與模型評估成為有任務規格、可審核的協作工作。",
    status: "流程與資料模型已建立",
    icon: HandHeart,
  },
  {
    number: "03",
    title: "透明成本與貢獻",
    description: "區分供應商帳單、內部估算、待審核貢獻與獎勵紀錄，不把估算包裝成現金。",
    status: "基礎帳本建置中",
    icon: ReceiptText,
  },
  {
    number: "04",
    title: "自願式運算網路",
    description: "長期探索由參與者自主選擇分享閒置運算資源，並保留暫停與退出權。",
    status: "長期研究階段",
    icon: Cpu,
  },
];

const principles = [
  "沒有明確同意，不使用任何人的設備資源。",
  "沒有驗證的任務成果，不自動產生獎勵資格。",
  "沒有預算與權限確認，不送出可能產生成本的 AI 請求。",
  "正式付款、正式資料變更與正式部署保留人工控制。",
];

export default function HomePage() {
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link href="/" className={styles.brand} aria-label="Global Citizen AI Network 首頁">
          <span className={styles.brandMark}><Globe2 size={23} /></span>
          <span className={styles.brandText}>
            <strong>GLOBAL CITIZEN</strong>
            <small>AI NETWORK</small>
          </span>
        </Link>
        <nav className={styles.nav} aria-label="主要導覽">
          <a href="#mission">平台使命</a>
          <a href="#pillars">核心服務</a>
          <a href="#trust">安全原則</a>
        </nav>
        <div className={styles.headerActions}>
          <Link href="/login" className={styles.loginLink}>會員登入</Link>
          <Link href="/login" className={styles.headerCta}>進入平台 <ArrowRight size={16} /></Link>
        </div>
      </header>

      <section className={styles.hero} id="mission">
        <div className={styles.heroCopy}>
          <div className={styles.eyebrow}><span /> BUILD A SHARED AI FUTURE</div>
          <h1>讓 AI 成為<br /><em>每個人的共同資產</em></h1>
          <p className={styles.lead}>
            Global Citizen AI Network 是一個以人為本的 AI 協作平台，
            結合實用 AI 服務、可驗證的知識貢獻，以及透明的成本與治理機制。
          </p>
          <div className={styles.heroActions}>
            <Link href="/login" className={styles.primaryButton}>開始探索平台 <ArrowRight size={17} /></Link>
            <a href="#pillars" className={styles.secondaryButton}>了解平台架構</a>
          </div>
          <div className={styles.heroFootnote}>
            <ShieldCheck size={16} /> 以透明、授權、可驗證與使用者自主為設計原則
          </div>
        </div>
        <div className={styles.heroVisual} aria-label="全球公民共同協作的抽象視覺">
          <div className={styles.orbit orbitOne} />
          <div className={styles.orbit orbitTwo} />
          <div className={styles.orbit orbitThree} />
          <div className={styles.globeCore}><Globe2 size={74} strokeWidth={1.1} /></div>
          <div className={styles.floatCard + " " + styles.floatTop}><Sparkles size={17} /><span><b>AI for Everyone</b><small>讓知識工作更容易取得</small></span></div>
          <div className={styles.floatCard + " " + styles.floatBottom}><HandHeart size={18} /><span><b>Contribution Matters</b><small>每份貢獻都應被公平看待</small></span></div>
          <div className={styles.visualCaption}>SHARED INTELLIGENCE · SHARED PROGRESS</div>
        </div>
      </section>

      <section className={styles.trustStrip} aria-label="平台狀態">
        <div><span className={styles.statusDot} /> <b>早期 MVP 建置階段</b></div>
        <span>核心應用持續開發</span>
        <span>正式 AI 服務依供應商與預算設定啟用</span>
        <span>尚未開放現金獎勵或分散式運算</span>
      </section>

      <section className={styles.pillarsSection} id="pillars">
        <div className={styles.sectionIntro}>
          <div>
            <div className={styles.sectionEyebrow}>THE NETWORK</div>
            <h2>四個核心，建立一個<br /><em>能共同成長的 AI 網路</em></h2>
          </div>
          <p>我們不只打造一個聊天介面，而是逐步建立 AI 使用、知識協作、成本透明與自願運算之間可持續的連結。</p>
        </div>
        <div className={styles.pillarGrid}>
          {pillars.map(({ number, title, description, status, icon: Icon }) => (
            <article className={styles.pillarCard} key={number}>
              <div className={styles.pillarTop}><span>{number}</span><Icon size={23} strokeWidth={1.7} /></div>
              <h3>{title}</h3>
              <p>{description}</p>
              <div className={styles.pillarStatus}>{status}</div>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.workflowSection}>
        <div className={styles.workflowCopy}>
          <div className={styles.sectionEyebrow}>FROM USE TO CONTRIBUTION</div>
          <h2>使用 AI，也能<br /><em>一起建設 AI</em></h2>
          <p>使用者可以先透過 AI 工作空間處理知識工作；未來也能依照公開任務規格參與查核、翻譯、評估與資料整理。所有貢獻都必須有明確驗收條件與人工覆核機制。</p>
          <Link href="/contribute" className={styles.textLink}>了解全球貢獻中心 <ArrowRight size={16} /></Link>
        </div>
        <div className={styles.flowCards}>
          <div className={styles.flowCard}><span>01</span><div><b>提出問題</b><small>在 AI 工作空間整理需求與專案</small></div><BrainCircuit size={20} /></div>
          <div className={styles.flowConnector} />
          <div className={styles.flowCard}><span>02</span><div><b>參與協作</b><small>依任務規格提交可查證成果</small></div><ClipboardCheck size={20} /></div>
          <div className={styles.flowConnector} />
          <div className={styles.flowCard}><span>03</span><div><b>審核與記錄</b><small>通過驗收後才更新貢獻紀錄</small></div><ReceiptText size={20} /></div>
        </div>
      </section>

      <section className={styles.safetySection} id="trust">
        <div className={styles.safetyHeading}>
          <div className={styles.sectionEyebrow}>TRUST BY DESIGN</div>
          <h2>信任不是口號，<em>必須寫進系統規則</em></h2>
          <p>平台的成長不能建立在模糊的承諾、未經同意的資源使用，或無法追溯的帳務上。</p>
        </div>
        <div className={styles.principleList}>
          {principles.map((principle) => (
            <div className={styles.principle} key={principle}><ShieldCheck size={19} /><span>{principle}</span></div>
          ))}
        </div>
      </section>

      <section className={styles.ctaSection}>
        <div className={styles.ctaIcon}><LockKeyhole size={22} /></div>
        <div><div className={styles.sectionEyebrow}>BUILDING IN PUBLIC</div><h2>一起把想法，變成真正可用的平台</h2><p>目前仍在早期建置與驗證階段，功能會依安全、成本與品質條件逐步開放。</p></div>
        <Link href="/login" className={styles.primaryButton}>進入會員入口 <ArrowRight size={17} /></Link>
      </section>

      <footer className={styles.footer}>
        <Link href="/" className={styles.footerBrand}><Globe2 size={18} /> GLOBAL CITIZEN AI NETWORK</Link>
        <span>Build Together. Learn Together. Make AI Useful for Everyone.</span>
        <span>© {new Date().getFullYear()} GCAN · Early MVP</span>
      </footer>
    </main>
  );
}
