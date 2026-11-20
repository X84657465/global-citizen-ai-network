<div align="center">

<img src="docs/assets/gcan-hero.svg" alt="Global Citizen AI Network — 全球公民 AI 網路" width="100%" />

### 把 AI 的力量，變成每個人都能參與的公共能力。

**一個結合 AI 服務、全球知識協作、透明貢獻帳本與自願式運算願景的長期平台。**

[產品網站](https://global-citizen-ai-network.vercel.app) · [GitHub 專案](https://github.com/X84657465/global-citizen-ai-network) · [開發中的 Agent Factory V2](https://github.com/X84657465/global-citizen-ai-network/pull/134) · [CI 工作流程](https://github.com/X84657465/global-citizen-ai-network/actions)

![CI](https://github.com/X84657465/global-citizen-ai-network/actions/workflows/ci.yml/badge.svg?branch=main)
![Next.js](https://img.shields.io/badge/Next.js-App%20Platform-111827?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-Strict%20Engineering-3178C6?logo=typescript&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL%20%7C%20RLS-3FCF8E?logo=supabase&logoColor=white)
![Stage](https://img.shields.io/badge/Stage-Early%20Development-orange)

**Release:** `0.3.21` · [版本紀錄](CHANGELOG.md) · [五線工程治理](docs/engineering-governance.md) · [深度神經架構](https://github.com/X84657465/global-citizen-ai-network/tree/feat/deep-neural-core/docs/deep-neural-architecture.md)

</div>

---

## 🧭 快速導覽

| 了解 GCAN | 深入技術 |
|---|---|
| [專案願景](#-專案願景) · [平台核心](#-平台核心) · [專案現況](#-專案現況) | [Agent Factory V2](#-agent-factory-v2ai-自動開發工廠) · [技術架構](#️-技術架構) · [品質驗證](#-品質驗證) |
| [開發路線圖](#️-開發路線圖) · [參與與貢獻](#-contribution參與與貢獻) | [本機開發](#-local-development本機開發) · [文件導覽](#-文件導覽) · [安全原則](#️-安全隱私與公平原則) |

## 🌐 GCAN 是什麼？

**Global Citizen AI Network（GCAN，全球公民 AI 網路）**，目標是打造一個以人為本、重視透明與安全的 AI 協作生態系。

我們希望讓不同地區、不同專業、不同資源條件的人，都能使用 AI、貢獻知識、參與協作；也讓每一次 AI 使用、每一項任務成果與每一筆成本或貢獻紀錄，都能有清楚的規則與可追蹤的依據。

<div align="center">

| 🤖 全民 AI 服務 | 🌍 全球知識貢獻 | 🧾 透明成本與獎勵 | 🖥️ 自願式運算 |
|:---:|:---:|:---:|:---:|
| 研究、寫作、分析與知識工作 | 任務、提交、審核與複核 | 成本、貢獻與稽核紀錄 | 明確授權、隔離、可暫停 |
| **逐步建置中** | **逐步建置中** | **基礎流程建置中** | **長期研究方向** |

</div>

> **核心信念：AI 不應只是少數人的工具；知識貢獻應該被尊重，成本與規則應該透明，設備資源只能在使用者知情且自願的情況下參與。**

### 專案目前在哪個階段？

<blockquote>
<strong>早期開發／MVP 建置階段。</strong><br/>
核心應用、資料庫流程與 Agent Factory V2 正在持續開發及驗證。網站網址可供查看，但不代表所有功能已正式開放，也不代表已進入正式商業營運。
</blockquote>

- **目前開發主線：** `feat/agent-factory-v2`
- **Agent Factory V2：** [PR #134（Draft）](https://github.com/X84657465/global-citizen-ai-network/pull/134)
- **GCAN 產品線：** [PR #137（Draft）](https://github.com/X84657465/global-citizen-ai-network/pull/137)
- **GitHub 專案展示線：** [PR #139（Draft）](https://github.com/X84657465/global-citizen-ai-network/pull/139)
- **第三線預測編碼：** [架構文件](docs/predictive-coding-architecture.md)
- **第四線深度神經：** [PR #140（Draft）](https://github.com/X84657465/global-citizen-ai-network/pull/140) · [架構分支](https://github.com/X84657465/global-citizen-ai-network/tree/feat/deep-neural-core) · [架構文件](https://github.com/X84657465/global-citizen-ai-network/blob/feat/deep-neural-core/docs/deep-neural-architecture.md)
- **第五線深度研究：** [PR #141（Draft）](https://github.com/X84657465/global-citizen-ai-network/pull/141) · [工作台分支](https://github.com/X84657465/global-citizen-ai-network/tree/feat/deep-research-workbench)
- **五線版本制度：** [VERSION](VERSION) · [版本清單](versions/manifest.json) · [CHANGELOG](CHANGELOG.md)
- **最新 CI：** [查看 GitHub Actions](https://github.com/X84657465/global-citizen-ai-network/actions)
- **正式部署：** 尚未宣告完成；高風險發布與正式資料變更保留人工控制。

---


## ✨ 一句話認識本計畫

**Global Citizen AI Network（GCAN）是一個以人為本的 AI 協作平台。**  
我們希望讓一般使用者能以合理、透明的方式使用 AI，也讓研究、翻譯、資料整理、模型評測、內容查核與工具開發等知識貢獻，成為可驗證、可追蹤、可公平評價的工作。

長期而言，平台將逐步探索使用者自願參與的分散式運算網路，讓閒置 CPU／GPU 資源在明確授權、安全隔離及可退出的前提下，成為公共 AI 基礎設施的一部分。

> **我們不是單純再做一個聊天機器人，也不是以代幣或投資回報為核心的專案。**  
> 我們要建立的是一套結合 AI 服務、真實貢獻、透明帳務、社群治理與自願運算的長期協作系統。

## 🎯 專案願景

AI 的價值不應只集中在少數大型平台。GCAN 希望建立一個開放協作、責任清楚、成本可理解的生態系，讓不同地區、不同專業與不同資源條件的人，都有機會參與 AI 時代的創造。

### 我們想解決的問題

| 現況問題 | GCAN 的設計方向 |
|---|---|
| AI 工具分散，使用成本不易理解 | 建立整合式 AI 工作空間與可追蹤的使用成本 |
| 知識整理、翻譯、查核等工作缺少透明的協作流程 | 建立任務、提交、審核、申訴與貢獻紀錄 |
| AI 服務成本與實際資源消耗不透明 | 區分供應商費用、推估成本、人工審核與營運支出 |
| 社群貢獻難以驗證與公平評價 | 以明確驗收條件、審核紀錄及可稽核帳本管理 |
| 分散式運算容易產生隱私與設備安全疑慮 | 採自願加入、明確授權、隔離執行及可退出原則 |

## 🧭 平台核心

### 1. 🤖 AI Service Center｜全民 AI 服務中心

讓使用者在同一個工作空間完成日常知識工作：

- AI 對話、研究整理、寫作與內容分析。
- 文件與資料工作流程。
- 可持續保存的工作對話與專案脈絡。
- 透過伺服器端 AI Gateway 管理模型呼叫。
- 以使用者與全域預算限制控制 AI 成本。
- 供應商憑證未完成設定或預算條件不符時，採取 fail-closed 保護，不任意送出付費請求。

**目前狀態：** 工作空間與相關 API 已有程式實作；實際 AI 供應商服務仍受憑證、資料庫控制及預算設定限制，不代表正式 AI 服務已全面開放。

### 2. 🌍 Global Contribution Center｜全球知識貢獻中心

讓每一份可驗證的知識工作都有清楚的流程：

- 任務發布、任務條件與驗收標準。
- 研究、翻譯、資料整理、評測、事實查核及工具製作等任務類型。
- 成果提交與審核。
- 退件原因、申訴與複核。
- 個人貢獻紀錄及獎勵帳本。
- 任務獎勵與實際付款分離管理。

**重要原則：** 提交成果不等於自動取得獎勵；必須依任務規則完成驗證。現階段帳本中的待處理獎勵不等於可提領現金，尚未啟用自動付款。

### 3. 🧾 Transparent Cost & Reward Ledger｜透明成本與貢獻帳本

平台需要能回答：資源花在哪裡、貢獻如何被認定、獎勵如何產生。

- 分開記錄 AI 供應商回報費用與內部推估成本。
- 區分已分攤成本、帳單匯入及供應商用量資料。
- 保留貢獻事件、審核結果、待處理獎勵與稽核事件。
- 重要審核與帳本寫入採資料庫交易及冪等控制。
- 不以未實現收益承諾獎勵，也不保證投資報酬。

### 4. 🖥️ Distributed Compute Network｜自願式分散運算網路（長期方向）

未來將研究讓使用者選擇提供閒置 CPU／GPU 資源的方式：

- 使用者必須明確選擇加入，不得暗中使用設備資源。
- 清楚呈現運算工作、資源需求與使用狀態。
- 工作負載隔離、權限最小化與資源限制。
- 可暫停、退出及檢視運算紀錄。
- 在安全模型、威脅分析及獨立審查完成前，不啟用真實分散式運算任務。

**目前狀態：** 屬於長期架構方向，不代表目前已建立可供大眾加入的運算網路。

---

## 🏭 Agent Factory V2｜AI 自動開發工廠

GCAN 不只要提供 AI 服務，也正在建構一套能協助平台本身持續演進的自動化開發流程。

Agent Factory V2 的目標，是把需求整理、任務規劃、程式修改、隔離測試、候選 PR 與結果回報串成可追蹤的工程生命週期。

### 核心工作流程

```text
需求／Issue
    │
    ▼
任務選擇與優先級排序
    │
    ▼
版本化任務狀態與 Worker Lease
    │
    ▼
本機 AI 規劃（唯讀計畫）
    │
    ▼
候選程式碼產生與範圍驗證
    │
    ▼
隔離環境測試
    │
    ▼
候選分支與 Draft Pull Request
    │
    ▼
精確 SHA 綁定的 CI 驗證
    │
    ├── 通過 → 記錄驗證結果，等待人工審查
    │
    └── 失敗 → 分類、有限重試或隔離問題任務
```

### V2 已實作的關鍵能力

- **Durable Task State：** 以版本化狀態保存任務進度，避免只依賴短暫的 Runner 記憶。
- **Single Active Lease：** 同一任務以 Worker Lease 控制有效執行者，降低過期工作者覆寫新狀態的風險。
- **Failure Separation：** 區分任務本身失敗與系統基礎設施失敗，避免單一錯誤錯誤地觸發全域熔斷。
- **Bounded Retry & Quarantine：** 有限重試、退避及隔離機制，避免無限重跑。
- **Exact Candidate CI：** 將驗證結果綁定 PR 編號、候選 SHA、CI Run ID 與 Run Attempt，拒絕過期結果。
- **Deterministic Publisher：** 候選分支與 PR 發布具備可恢復性；遇到模糊 API 結果時先核對遠端狀態。
- **Patch Integrity：** 以雜湊與位元組數綁定測試過的 patch，發布前再次核對內容。
- **Concurrency Control：** 透過共用 Actions concurrency gate 與程序內寫入佇列，降低狀態競爭。
- **API Resilience：** 共用 GitHub API client，依 HTTP 方法與重試安全條件執行有限重試。
- **Isolated Candidate Execution：** 候選依賴安裝與測試使用受限容器；不向不受信任的候選程式碼傳遞 GitHub 寫入憑證，並限制網路、Linux capabilities 與檔案系統權限。

### 安全邊界

Agent Factory 的自動化不等於無限制自主部署：

1. AI 產生的程式碼必須先通過範圍驗證與隔離測試。
2. 候選 PR 必須接受 CI 驗證，且驗證結果必須對應精確 SHA。
3. 不自動核准、不自動合併、不自動關閉原始需求 Issue。
4. 正式環境部署與資料庫正式變更仍須由人類控制。
5. 任務狀態、重試、隔離與錯誤原因必須能追蹤。

### 目前驗證紀錄

- CI 結果必須以最新候選提交 SHA 對應的 GitHub Actions Run 為準；舊提交曾經通過，不代表目前分支已通過。
- Agent Factory V2 的 Patch 分批輸出、決策閘門及測試正在持續修正與重新驗證。
- GCAN 產品線持續驗證單元測試、資料庫整合測試及手機版介面。
- 尚未宣稱完成 24 小時無人值守運行、Runner 重啟復原或完整端到端自動開發生命週期驗收。
- [GitHub Actions 全部工作流程](https://github.com/X84657465/global-citizen-ai-network/actions) 可查詢最新狀態。

---

## 🏗️ 技術架構

GCAN 採用分層設計，將使用者介面、領域邏輯、資料庫權限、AI 呼叫及自動化工作流程分開管理。

| 層級 | 技術／元件 | 職責 |
|---|---|---|
| Web 前端 | Next.js、React、TypeScript | 網站介面、頁面路由與互動 |
| 應用服務 | Next.js API Routes、共享 domain logic | 驗證請求、執行業務規則 |
| 資料庫 | PostgreSQL、Supabase | 帳戶資料、任務、審核、帳本及持久化狀態 |
| 資料安全 | Supabase RLS、資料庫 RPC | 使用者資料隔離、權限檢查及原子化操作 |
| AI 整合 | Server-side AI Gateway、Ollama 開發測試 | 模型呼叫、預算限制及本機推論測試 |
| 工程自動化 | GitHub Actions、Windows Self-hosted Runner、Docker | CI、隔離測試及 Agent Factory 任務流程 |
| 部署目標 | Vercel Preview／Production | 網站建置與部署；正式上線仍需完成發布條件 |

### 系統設計原則

- **Security by Design：** 權限、資料隔離及憑證管理納入架構，而不是上線後才補救。
- **Fail Closed：** 權限或預算條件無法確認時，拒絕執行敏感操作。
- **Idempotency：** 對重要寫入與重試建立冪等條件，避免重複入帳或重複處理。
- **Auditability：** 重要狀態變化保留可追蹤的事件與驗證證據。
- **Cost Awareness：** AI 用量與營運成本必須可計量、可限制。
- **Human Accountability：** 自動化負責提高效率，正式發布與高風險決策仍保留人工責任。

## 🛡️ 安全、隱私與公平原則

- 不得未經同意使用使用者設備的 CPU、GPU、頻寬或儲存空間。
- 不把使用者 API Key 或 GitHub 寫入憑證交給不受信任的候選程式碼。
- 不允許一般使用者讀取其他使用者的私人工作資料。
- 重要審核操作須在伺服器與資料庫層再次驗證權限。
- 不以 AI 自我評分作為唯一的貢獻驗收依據。
- 不保證收益、不要求投資、不以拉人頭或推薦層級作為獎勵核心。
- 志願貢獻必須明確揭露性質、授權條款與獎勵條件，不得以志願者永久取代應付薪酬的工作。
- 使用者資料的檢視、匯出與刪除，依產品功能及適用法令逐步實作。

## 🚦 專案現況

**目前定位：早期開發／MVP 建置階段，尚非正式商業營運服務。**

| 項目 | 現況 |
|---|---|
| Next.js 應用與主要頁面 | 已有程式實作 |
| 登入與帳戶介面 | 已有實作；正式公開註冊仍受設定限制 |
| AI 工作空間與伺服器端 API | 已有實作；供應商正式服務需完成設定 |
| 貢獻任務、提交與審核流程 | 已有資料庫與 API 實作 |
| 申訴與貢獻獎勵帳本 | 已有資料庫流程與介面實作 |
| AI 成本透明度管理 | 已有管理介面與資料分類 |
| Agent Factory V2 | 狀態機、任務執行、候選 PR 與 CI 整合持續開發；端到端驗收尚未完成 |
| Windows Runner／Docker／Ollama | 曾有工具鏈與有界推論通過紀錄；最新任務仍需重新驗證 |
| 24 小時無人值守實測 | 尚待真實長時間驗收 |
| Runner 重啟與中斷復原演練 | 尚待完成 |
| 分散式運算網路 | 長期規劃，尚未對外開放 |
| 自動獎勵付款 | 尚未啟用 |
| 正式公開上線 | 尚未宣告 |

> **透明聲明：** GitHub Actions 通過、程式碼存在或頁面可建置，不等於所有外部服務已完成設定，也不等於正式環境已上線。

## 🗺️ 開發路線圖

### Phase 1 — Foundation｜基礎平台
- [x] Next.js 應用骨架與核心路由
- [x] PostgreSQL／Supabase 資料結構與 RLS 基礎
- [x] AI 工作空間與伺服器端呼叫架構
- [x] 貢獻任務、提交、審核與申訴資料流程
- [x] 成本與貢獻帳本基礎
- [ ] 完成正式環境設定與發布驗收

### Phase 2 — Agent Factory V2｜自動開發工廠
- [x] 版本化任務狀態與 Worker Lease
- [x] 有限重試、退避、隔離與事件冪等
- [x] 候選 PR 精確 SHA 綁定與 CI 回報
- [x] Patch 雜湊完整性與發布復原邏輯
- [x] Windows Runner、Docker、Ollama 基礎檢查（歷史 CI 紀錄）
- [ ] Patch 產生與隔離測試端到端通過
- [ ] 真實長時間無人值守運行
- [ ] Runner 重啟／中斷復原演練
- [ ] 完整端到端任務生命週期驗收
- [ ] 更細緻的 GitHub Token 權限拆分與驗證

### Phase 3 — Public Beta｜公開測試
- [ ] 完成正式 AI 供應商與成本控管設定
- [ ] 完成使用者註冊、資料權限及隱私流程驗收
- [ ] 建立清楚的貢獻者規範與審核標準
- [ ] 小規模邀請測試與使用者回饋
- [ ] 監控、備份、復原及事故處理演練

### Phase 4 — Global Network｜全球協作網路
- [ ] 多語系與跨區域協作
- [ ] 更完整的任務市場與貢獻者聲譽機制
- [ ] 社群治理與透明財務報告
- [ ] 分散式運算威脅模型與獨立安全審查
- [ ] 在完成安全驗收後，才評估自願式運算節點試驗

## 📁 Repository Structure｜專案目錄

```text
.
├── app/                  # Next.js 頁面、路由與 API
├── lib/                  # 共用邏輯、領域服務與型別
├── components/           # 可重用 UI 元件
├── supabase/
│   └── migrations/       # PostgreSQL schema 與 RLS migrations
├── docs/                 # 產品、架構、安全與操作文件
├── tests/                # 單元、整合與政策回歸測試
└── .github/
    └── workflows/        # CI、Runner 與 Agent Factory 自動化
```

## 🚀 Local Development｜本機開發

### 環境需求

- Node.js 22.13 或更新版本
- npm
- Git
- 若要執行完整資料庫整合測試，需依測試文件準備 Docker 與 Supabase CLI

### 啟動專案

```bash
git clone https://github.com/X84657465/global-citizen-ai-network.git
cd global-citizen-ai-network
npm ci
cp .env.example .env.local
npm run dev
```

開啟瀏覽器前往：

```text
http://localhost:3000
```

請依照 `.env.example` 與相關文件設定環境變數。不要將真實 API Key、資料庫密碼或服務角色金鑰提交到 Git。

## 🧪 品質驗證

專案使用自動化檢查保護主要開發流程，依目前 CI 設定涵蓋：

- Unit Tests
- TypeScript Type Check
- ESLint
- Production Build
- Dependency Security Audit
- Migration Filename／Schema Safety Guards
- Supabase Migrations
- PostgreSQL Tests
- Row Level Security Tests
- Windows Self-hosted Runner Toolchain Checks
- Docker／Ollama Availability 與有界結構化推論

最新驗證原則：只採用各分支最新候選 SHA 對應的 Actions Run；舊 SHA 曾通過不代表目前候選通過。請以 [GitHub Actions 即時狀態](https://github.com/X84657465/global-citizen-ai-network/actions) 核對各線最新 SHA、工作項目與結果。

## 📚 文件導覽

| 文件 | 說明 |
|---|---|
| [產品範圍與分階段路線圖](docs/product-scope.md) | 產品目標、範圍與階段規劃 |
| [系統架構](docs/architecture.md) | 系統元件與架構設計 |
| [安全與隱私基線](docs/security-baseline.md) | 權限、資料與安全原則 |
| [資料模型與透明成本帳本](docs/data-model.md) | 核心資料結構與成本記錄 |
| [資料庫安全與上線前檢查](docs/database-safety.md) | 資料庫安全與驗收要求 |
| [資料庫設定](docs/database.md) | 資料庫相關說明 |
| [後端環境建置清單](docs/backend-setup.md) | 後端服務準備 |
| [API 文件](docs/api.md) | 應用 API 說明 |
| [AI 預算超額保護](docs/ai-budget-overrun-hard-stop.md) | AI 預算硬性停止機制 |
| [AI Agent Scheduler](docs/ai-agent-scheduler.md) | 自動開發工廠、Runner 與故障處理 |
| [Claude 獨立審查簡報](docs/claude-review-brief.md) | 架構與安全審查清單 |


## 🎬 圖片與影片介紹｜Visual & Video Tour

### GCAN 五線總覽

<p align="center">
  <img src="docs/assets/gcan-five-track-architecture.svg" alt="GCAN 五線架構圖" width="100%" />
</p>

五條開發線各自擁有獨立工作台，透過來源追蹤、版本管理、測試與接收線審核互相協作。

### 影片導覽

**GCAN 平台介紹影片：製作規劃中。** 分鏡與旁白稿已列入專案文件；正式影片必須以真實工作台操作畫面錄製，不會使用虛構影片連結或把示範畫面冒充正式功能。

- [影片分鏡與旁白稿](docs/media/gcan-introduction-storyboard.md)
- [即時 CI 與開發紀錄](https://github.com/X84657465/global-citizen-ai-network/actions)

### 五線工作台與進度

> D、E 兩線以五線整合分支作為暫時整合基底；CI 已納入此基底分支的 PR 觸發條件，待整合分支合併 main 後再重新核對並調整 base。

| 線別 | 工作台 | 最新已知狀態 | 入口 |
|---|---|---|---|
| A｜Agent Factory V2 | 工廠控制台 | 已修正 DB-backed RLS 測試分流與失敗分類；新 exact-head CI 待驗證 | [PR #134](https://github.com/X84657465/global-citizen-ai-network/pull/134) |
| B｜GCAN Product | 全球產品平台 | 首頁字體與響應式可讀性已更新；最新 exact-head CI 待驗證 | [PR #137](https://github.com/X84657465/global-citizen-ai-network/pull/137) |
| C｜Predictive Coding | 預測分析工作台 | 已加入可測試的殘差、MAE、Brier 指標核心；未連接即時遙測或模型訓練 | [PR #139](https://github.com/X84657465/global-citizen-ai-network/pull/139) |
| D｜Deep Neural | 深度神經工作台 | 互動功能候選；待 exact-head CI | [PR #140](https://github.com/X84657465/global-citizen-ai-network/pull/140) |
| E｜Deep Research | 深度研究工作台 | 介面候選；待 CI 確認 | [PR #141](https://github.com/X84657465/global-citizen-ai-network/pull/141) |

> CI 通過不等於正式上線；示範資料、未連接的外部服務與開發中功能都必須清楚標示。

## 🧠 五線協作與持續學習

本專案採五線並行：A Agent Factory V2、B Global Citizen AI Network、C 預測編碼（Predictive Coding）、D 深度神經（Deep Neural）、E 深度研究（Deep Research）。各線獨立開發與驗收，透過經審核、具版本及來源證據的知識成果互相支援。深度神經負責整理可重用記憶、推理策略與評估方法；不直接取得其他線的寫入權限，也不以模型信心取代測試。

所有重大及小幅改進都必須更新純數字版本 `MAJOR.MINOR.PATCH`，並記錄變更、受影響線別、測試結果、精確 commit SHA 與回復方式。細節見 [五線工程治理規範](docs/engineering-governance.md)。

## 🔄 五線互輔互成｜Predict → Learn → Build → Validate

五線不是五個互不相干的專案，而是彼此提供輸入、回饋與驗證的協作系統：

| 線別 | 核心責任 | 支援其他線的方式 |
|---|---|---|
| A｜Agent Factory V2 | 自動化工程執行、測試、修復與交付 | 提供可重現的執行能力、CI 證據、故障分類與修復手冊 |
| B｜Global Citizen AI Network | 真實產品、使用者流程與全球協作場景 | 提供需求、使用回饋、營運限制與真實成效資料 |
| C｜預測編碼（Predictive Coding） | 預測、觀測、預測誤差、校準與模型更新 | 提供可量測的預測誤差、漂移訊號與改進依據 |
| D｜深度神經（Deep Neural） | 記憶、推理、知識整合與評估 | 將跨線證據整理為可追溯知識、推理策略及評估建議 |
| E｜深度研究（Deep Research） | 多來源研究、來源查核、反證與引用報告 | 提供可追溯的研究證據、方法、來源可信度與可執行建議 |

共同閉環：**觀測 → 預測 → 行動 → 結果量測 → 預測誤差分析 → 記憶與推理 → 修正方案 → 測試 → 回饋五線**。任何跨線改進都必須經版本管理、來源追蹤、接收線審核與相容性測試；預測或 AI 建議不得直接改寫正式環境。

### 第三線架構

[預測編碼架構文件](docs/predictive-coding-architecture.md)

## 🤝 Contribution｜參與與貢獻

我們歡迎具備不同專業的人參與未來建置，例如：

- AI 應用、前端與後端工程。
- PostgreSQL、資料安全與系統架構。
- 翻譯、研究、資料整理與事實查核。
- UI／UX、可用性與無障礙設計。
- 測試、自動化、文件與社群治理。

任何任務在開始前，都應清楚說明工作範圍、驗收條件、成果授權、是否有報酬，以及是否符合獎勵資格。請勿假設所有貢獻任務都會獲得報酬。

## 📜 License｜授權

目前尚未選定開源授權。正式加入 LICENSE 文件前，專案內容預設保留所有權利；未經授權請勿將其視為可自由再利用的開源程式碼。

---

<p align="center">
  <strong>Build Together. Learn Together. Make AI Useful for Everyone.</strong>
  <br />
  <sub>Global Citizen AI Network — A long-term project for shared intelligence and transparent collaboration.</sub>
</p>
