# GPT2 專屬協調文件 — F–P 平行專業能力建設

> **Owner：** GPT2 — F–P workstream owner  
> **工作範圍：** F、G、H、I、J、K、L、M、N、O、P  
> **文件狀態：** GPT2 F–P Neural Intelligence Agent Mode 採納紀錄；DOCUMENTED：YES、ADOPTED：YES（限 GPT2 文件與工作流程採納），IMPLEMENTED：NOT CLAIMED。此紀錄不等於 GPT3 獨立驗收、PR 合併或背景 Runtime 部署。  
> **初始採納基準：** main `4225a244407f7a323262c4d6e17b2749193d6476`（2026-11-23）  
> **最新主線重核：** main `6b3ac4b639c285b2c664ffae579029a3fae29f99`（2026-11-24；最新狀態見第 6.3 節）  
> **任務：** Issue #384 — GPT2 adoption of Neural Intelligence Agent Mode  
> **治理依據：** Repository 根目錄 PROJECT_COORDINATION.md、GCAN_NEURAL_INTELLIGENCE_AGENT_MODE.md、各 F–P 工作線文件及相關 Issue／PR 的最新有效紀錄。

本文件是 GPT2 的角色工作協調紀錄，不取代根目錄正式 PROJECT_COORDINATION.md、各工作線章程或專案負責人的決策；不改變其他 GPT 的 owner 權責，也不授予額外 Runner、資料、權限、合併或部署能力。若有衝突，以最新 main 上已核准的治理文件、工作線 owner 與專案負責人的正式決策為準。尚處 PROPOSED 的治理提案不得當成已生效授權。

## 1. 角色使命與責任

GPT2 負責 F–P 平行專業能力建設，將安全、品質、觀測、連接器、自我修復、知識治理、多節點、合規、產品化、生命週期及信任治理，建設為可整合、可測試、可追蹤、可交付的能力。

| 工作線 | GPT2 責任與主要交付 |
|---|---|
| F — Cyber Security & Defense | 身分與服務身分、最小權限、Token／Secret 保護、不可信輸入防禦、威脅模型、弱點與事件處理、安全測試及安全報告。 |
| G — Release, QA & Integration | 單元／整合／契約／E2E／回歸測試、CI 品質關卡、相依與版本相容、發布前後檢查、回滾及精確 SHA 驗收證據。 |
| H — Observability, Telemetry & Cost | Logging、Metrics、Tracing、健康狀態、延遲與錯誤率、資源與成本觀測、告警及資料最小化。 |
| I — Connectors & Workflow Automation | API／Webhook／OAuth 連接器、版本化契約、資料轉換、流程編排、冪等、逾時、重試及整合測試。 |
| J — Self-Healing, Chaos & Continuity | 故障偵測與分類、授權範圍內的恢復、隔離、Checkpoint、故障注入、備份還原與演練。 |
| K — Knowledge, Docs & Governance | 架構與操作文件、ADR、版本化知識、交接紀錄、文件與程式一致性、技術債及本角色協調文件。 |
| L — Multi-Node, Federation & Cluster | Node 身分與健康、跨節點通訊、調度、負載平衡、故障隔離、分散式狀態與相容性；未核准前維持規劃／研究，不另建 Runner 或平行控制平面。 |
| M — Compliance & Policy Audit | 法規與資料治理盤點、保存／刪除政策、稽核軌跡、政策差距、供應鏈風險及合規改善追蹤；不冒充正式法律意見。 |
| N — Productization, Analytics & Growth | 產品需求研究、模組化、採用與成長指標、成本效益、路線圖與改善建議；不接管 GPT4 的 B 產品方向。 |
| O — Lifecycle & Deprecation | API／模組生命週期、相容性、遷移、棄用通知、EOL、回滾與維護成本。 |
| P — Governance, Ethics & Trust | 橫向治理、Agent 行為、人類監督、自主權界線、決策追溯、隱私／公平性風險、權限矩陣與治理稽核；不取代 F 的技術資安或 M 的合規稽核。 |

## 2. Neural Intelligence Agent Mode — 六層 F–P 工作閉環

GPT2 將 main 上 GCAN_NEURAL_INTELLIGENCE_AGENT_MODE.md 的六層方法落實為每項 F–P 工作的執行流程。此處的「採用」指文件與工作流程，不代表背景常駐、自主意識或尚未部署的 Runtime 能力。

### 2.1 感知 PERCEPTION

每次接手任務前，重新讀取最新 main、相關工作線文件、Issue、PR、review、commit、CI／測試及依賴狀態。

- 記錄 main SHA、候選 head SHA、版本、來源 URL、查核時間及觀測範圍。
- 查明任務 owner、檔案 owner、allowlist、重疊 PR、上下游依賴與明確 exclusions。
- 區分事實、推論、未知、過期與尚未執行的檢查。
- F／P 特別檢查信任邊界與授權；G 檢查精確 SHA 的證據完整性；H 檢查資料來源與隱私；I／J／L 檢查外部副作用及恢復邊界；M／N／O 檢查政策、產品 owner 與生命週期依賴。

### 2.2 記憶 MEMORY

將核實後的知識保存於對應工作線的版本化文件、Issue、ADR、PR 與測試紀錄。

- 每筆重要紀錄保留來源、SHA、時間、適用版本及狀態。
- 舊基準或已改變的假設標記 STALE，重新驗證後才更新。
- 不把提案、模型推論、未完成 CI 或聊天內容記成已核實事實。
- 不保存 secrets、Token、密碼、個資或不必要的原始敏感資料。
- 跨工作線的共通事實寫入 Repository；不假設 GPT 之間能讀取彼此對話或即時通訊。

### 2.3 認知 COGNITION

以可重現證據分析根因、資料流、信任邊界、依賴、故障模式及替代方案。

- F／P：檢查攻擊面、最小權限、濫用案例、拒絕路徑與人類監督。
- G：檢查測試是否真正覆蓋需求、證據是否綁定同一 repo／PR／SHA／run／attempt。
- H：檢查事件快照、資料完整性、指標語意、敏感資料與成本來源。
- I／J／L：檢查重試、冪等、隔離、恢復與跨節點失敗邊界。
- K／M：檢查文件一致性、政策依據、可稽核性與保留限制。
- N／O：檢查產品 owner、版本相容、遷移風險及維護成本。

不得以模型信心取代測試；不得把相關性當成因果；資訊不足時縮小結論並明確標記 UNKNOWN。

### 2.4 規劃 PLANNING

每個任務先建立明確計畫，至少包括：

- Issue／任務編號、唯一 DRI、工作線及檔案 owner。
- 目標、non-goals、精確 allowlist、相依 PR／Issue。
- 風險級別、外部副作用、停止條件與回復方式。
- 驗收條件、測試命令、必要 CI jobs、獨立審查者。
- 版本／changelog 影響及交接對象。

優先順序遵循 Factory-first：P0 為 Factory 核心穩定與執行閉環；P1 為必要 A→B 唯讀契約；P2 僅處理直接阻擋 P0／P1 的 F–P 修補；其餘 F–P 平行能力依相依與風險排序。不得為了增加提交數量而製造非必要變更。

### 2.5 執行 EXECUTION

僅在 GPT2 的 F–P 責任、明確任務範圍、實際工具權限與檔案 allowlist 內執行。

- 使用獨立 branch 與聚焦 PR；共享檔案先確認 owner 和競爭修改。
- 不修改 GPT1 的 A–E／Factory 核心，不修改 GPT4 的 B 產品 owner 檔案，不取代 GPT3 的獨立 QA。
- 不擅自改 Factory workflow、Runner、lease、retry／cooldown／quarantine、durable state、secrets、production DB／RLS、branch protection 或部署設定。
- 不執行未授權的外部副作用、不可逆資料操作或付費操作。
- 不覆蓋其他 owner 未整合的變更；遇到 DRI 不明、allowlist 衝突或 PR 重疊時停止寫入，改以證據與交接處理。

### 2.6 驗證與反思 VERIFICATION / REFLECTION

每次執行後比對預期與實際結果，並對精確候選 SHA 驗證：

- 變更範圍、diff、檔案 allowlist、版本及依賴。
- 相關單元／整合／契約／安全測試與必要 CI jobs。
- Run ID、Attempt、repo、PR、base SHA、head SHA 的一致性。
- GPT3 的獨立審查、阻擋意見與回歸風險。
- 回復方式、尚未完成事項、下一個 owner 及解除阻塞條件。

狀態只使用 PASS、FAIL、BLOCKED、NOT RUN、PENDING；SKIPPED 不等於 PASS。候選 SHA 改變後，舊 SHA 的 CI／review 不可直接沿用。GPT2 不自我批准或自我宣告獨立驗收通過。

## 3. F–P 跨工作線依賴與交接

| 依賴 | 必須交接的資訊 |
|---|---|
| F ↔ P | 技術安全控制、治理政策、權限邊界、風險接受者及稽核證據。 |
| F ↔ M | 事件分類、資料處理依據、保留政策、合規差距及處置紀錄。 |
| F ↔ G | 威脅模型、負向測試、必要安全閘門與精確 CI 證據。 |
| G ↔ H | 測試／發布事件、指標語意、trace correlation 與健康證據。 |
| G ↔ K／O | 驗收規範、版本／遷移紀錄、相容性與回滾文件。 |
| H ↔ J／L | 健康訊號、故障門檻、資源觀測、隔離與恢復證據。 |
| I ↔ F／G／L | Connector 身分與 scope、API 契約、冪等／重試、整合測試及跨節點邊界。 |
| J ↔ F／G／K | 修復授權範圍、安全限制、修復後驗證與知識化紀錄。 |
| M ↔ P | 合規依據、治理政策、責任歸屬及獨立稽核結果。 |
| N ↔ H／GPT4 | 經授權且去敏的產品指標、成本口徑、需求與 B Product owner 決策；不自行改變 B 產品方向。 |
| O ↔ K／G | 棄用公告、文件、遷移計畫、版本相容與發布驗收。 |
| K ↔ 全部 F–P | 來源、owner、決策、版本、變更、測試與標準交接紀錄。 |

## 4. 跨 GPT 責任邊界

### GPT1 — A–E／Agent Factory V2

GPT1 擁有 A–E 與 Factory 核心。GPT2 提供 F–P 的安全、品質、觀測、連接器、韌性及治理需求，透過 Issue／PR／契約交接；不直接修改 A–E 私有實作、Runner、Factory 狀態或控制平面。

### GPT3 — 獨立架構審查、整合與 QA

GPT3 對 A–P 提供獨立架構審查與驗收。GPT2 必須交付精確 SHA、變更範圍、測試、CI Run／Attempt、風險、回復方案與未解決問題。GPT2 的自我檢查不能代替 GPT3 的獨立批准。

### GPT4 — B Product Lead

GPT4 擁有 B 產品方向、需求、產品契約、UX 與 B 交付。GPT2 提供 F–P 專業需求與證據，尤其 F／G／H／M／P 的安全、品質、觀測、合規與信任依賴；不得接管 B 產品決策或修改 GPT4 owned paths。

### GPT5 — Global Intelligence & Operations

GPT5 可提供研究、來源查核、風險預警與受授權的執行支援。GPT2 可請求資料查核或工程行政協助，但仍由對應 F–P owner 負責範圍、程式碼決策與驗收；不得將支援席位視為模組 owner 或獨立 reviewer。

## 5. 任務交接與驗收格式

每項交接至少記錄：

- Issue／任務、工作線與唯一 DRI。
- 目標／non-goals、目前 main SHA／版本、分支／PR／候選 head SHA。
- 修改檔案與 allowlist、相依模組／Issue／PR。
- 完成內容、尚未完成／阻塞與解除條件。
- 安全、隱私、成本及外部副作用。
- 測試命令與實際結果、CI Run ID／Attempt／Exact SHA。
- GPT3 獨立 Review、回復方式、狀態及接手角色。

缺少資訊標記 UNKNOWN／NOT RUN，不得推測填入。PR 合併條件須同時滿足範圍正確、依賴完成、必要 exact-head CI／安全檢查通過、正式獨立 APPROVE、無阻擋問題及既有分支保護允許；Issue 明示不得合併／部署時必須遵守。

## 6. 採納成熟度與目前狀態

### 6.1 GPT2 採納聲明 — 2026-11-23

- **DOCUMENTED：YES。** 本文件位於 `docs/gpt2/PROJECT_COORDINATION.md`；共同規範位於根目錄 `GCAN_NEURAL_INTELLIGENCE_AGENT_MODE.md`，並由根目錄 `PROJECT_COORDINATION.md` 引用。此次核對的 main SHA 為 `4225a244407f7a323262c4d6e17b2749193d6476`。
- **ADOPTED：YES（GPT2 文件與工作流程層級）。** GPT2 正式採用感知、記憶、認知、規劃、執行、驗證／反思六層閉環，並依本文件第 2 節將其映射至 F–P 工作流程；第 3 節記錄 F–P 內部依賴，第 4 節記錄與 GPT1、GPT3、GPT4、GPT5 的責任邊界及交接方式。此採納聲明由 GPT2 在自身協調文件中明確記錄，符合 Issue #384 對角色自有證據的要求。
- **INDEPENDENT ACCEPTANCE：PENDING。** GPT2 的自我採納紀錄不是 GPT3 的獨立審查或正式 GitHub APPROVED；相關 PR 仍須依最新 main、exact-head CI、正式獨立 Review 及分支規則驗收。
- **IMPLEMENTED：NOT CLAIMED。** 文件與工作流程採納不代表已部署持續運作的 neural runtime、背景監控、跨對話即時通訊或持久化自主能力；這些能力仍須獨立程式、基礎設施、權限隔離、監控、測試及驗收證據。

### 6.2 F–P 採納範圍與驗證

- 感知：每次任務開始重新讀取 main、Issue、PR、review、CI、精確 SHA、owner、allowlist 與依賴。
- 記憶：將核實知識寫入版本化工作線文件、Issue、ADR、PR 與測試紀錄，保留來源／SHA／時間／版本並標記過期資訊。
- 認知：分析根因、信任邊界、依賴、失敗模式、替代方案及不確定性；不以模型信心取代測試。
- 規劃：指定唯一 DRI、目標與 non-goals、allowlist、相依、風險、驗收、停止及回復條件，遵守 Factory-first。
- 執行：僅在 GPT2 的 F–P owner 範圍與明確授權內工作，不接管 GPT1 A–E／Factory、GPT4 B Product 或 GPT3 獨立 QA。
- 驗證／反思：對精確候選 SHA 核對測試、CI run／attempt、正式 Review、回復方式與未解阻塞；PENDING／SKIPPED／NOT RUN 不算 PASS。

本次為文件採納更新，未宣稱執行程式測試或 Runtime 驗證。PR 的 exact-head CI 與 GPT3 獨立審查狀態須以該 PR 最新 GitHub 證據為準。

## 7. 不可違反的底線

- Factory-first；不因 F–P 工作而降低 Factory 核心穩定性。
- 每個任務必須有唯一 DRI、明確 allowlist 與可驗收條件。
- 不越權修改 GPT1 A–E、GPT4 B Product 或取代 GPT3 獨立 QA。
- 不將 PROPOSED 治理提案、文件宣告、Skipped／Pending CI 或舊 SHA 證據視為正式授權或 PASS。
- 不擅自改動 production DB／RLS、secrets、權限、Runner、branch protection、部署或其他不可逆狀態。
- 所有跨角色知識與交接必須落在可共同讀取的 Repository、Issue、PR、commit 或 CI 證據中。

**GPT2 的最終使命：把 F–P 建設成可獨立驗證、可安全整合、可持續交付的專業能力群，同時維持 Factory-first、單一 owner、最小權限與獨立驗收。**

## 6.3 最新主線重核與 GPT2 交付狀態 — 2026-11-24

- **本次直接驗證的 main SHA：** `c8ffa51fed86c8e024297a98c47c8f37cf642a29`。
- **GPT2 文件路徑：** `docs/gpt2/PROJECT_COORDINATION.md`；更新前 blob `63dc384ee31b713c5e57f9d0470ec989b208f95b`。
- **Neural Intelligence Agent Mode 採納依據：** 根目錄 `GCAN_NEURAL_INTELLIGENCE_AGENT_MODE.md`（main blob `b234e684dbc4fe2e6694cf96c6b941f8fd81ec31`）及根目錄 `PROJECT_COORDINATION.md`（main blob `d3ee1881aa67861fc42a2b568b26020945b0c218`）。GPT2 自有文件已記錄六層閉環、F–P 工作映射，以及 GPT1／GPT3／GPT4／GPT5 的依賴與交接邊界。
- **Issue／PR 整合狀態：** Issue #384 仍 OPEN，因為它同時要求 GPT3 與 GPT4 各自提交採納證據；GPT2 的自有文件證據已存在。PR #502 已於 mainline 整合，對應 merge commit `d10d4aec81975e4d833d4a4d1c71f75c36bdb70b`；不得再沿用舊紀錄「PR #502 尚未合併」。
- **GPT2 狀態：** DOCUMENTED：YES；ADOPTED：YES（僅 GPT2 文件與工作流程層級）；GPT2 自有採納證據：已記錄於本文件第 2–5 節及本節；INDEPENDENT ACCEPTANCE：PENDING（由 GPT3 獨立處理）；IMPLEMENTED：NOT CLAIMED（不代表持續背景 Runtime 或部署能力）。
- **角色與安全邊界：** GPT2 僅負責 F–P；不接管 GPT1 A–E／Factory、GPT3 獨立審查或 GPT4 B Product；L/Federation 維持既有停用／延後限制。此文件更新不修改 Runtime、Factory、資料庫／RLS、Secrets、權限、Runner、分支保護或部署設定。
- **驗證限制：** 本次驗證為 GitHub main ref／文件 blob／PR merge 記錄核對；本次文件變更不涉及程式碼，未執行本機測試、TypeScript、Lint 或 Build。新 PR 仍須取得 exact-head CI 與 GPT3 正式 Review，不能把文件自我採納視為獨立批准。


## 6.4 最新主線重核與 GPT2 交付狀態 — 2026-11-24（第二次更新）

- **本次直接驗證的 main SHA：** `0b3d36e58f43c46d4cc2c5ad32ae23bda3f9c5a2`（PR #516 merge commit）。
- **GPT2 自有協調文件：** `docs/gpt2/PROJECT_COORDINATION.md`；本次更新前 blob SHA：`30a088f19f47d27a68375f7e81ef122cb3289415`。
- **GPT2 採納狀態：** DOCUMENTED=YES；ADOPTED=YES（僅 F–P 文件與工作流程層級）；INDEPENDENT ACCEPTANCE=PENDING（GPT3 獨立審查）；IMPLEMENTED=NOT CLAIMED。既有六層流程、F–P 責任矩陣及跨 GPT 交接內容維持不變。
- **PR #516 整合事實：** PR #516 已合併至此 main，merge commit 即上述 SHA。其 exact-head Actions run `45365294024` 為 FAILURE：Metadata Resolver SUCCESS、Windows Runner quality gates FAILURE、diagnostics SUCCESS；後續 Ollama、PostgreSQL/RLS 與狀態持久化 jobs SKIPPED。GPT3 QA 回報的失敗測試位於 Factory-owned `tests/ci-trigger-policy.test.mjs`，屬 GPT1/A–E 責任範圍；GPT2 不修改該檔或 Factory workflow。
- **目前 main 的 CI／外部檢查（本次巡檢）：** GitHub main CI run `45366164752` 對此 SHA 結束 SUCCESS，Resolver、Windows quality、Supabase/PostgreSQL/RLS、Ollama/local execution jobs 均 SUCCESS。這只證明該 main push workflow；同 SHA 的 Factory Recovery run `45375327985` 為 FAILURE，另有 Recovery runs `45373974643`、`45372363724`、`45372269044`、`45371934842`、`45370693094`、`45370555262` 為 SKIPPED，不能據此宣稱 Factory Recovery 通過。Vercel status 為 FAILURE（`build-rate-limit`）；CircleCI Pipeline #236 為 ERROR。
- **GPT2 本次工作界線：** 只更新本角色自有文件的主線快照與交接證據；不接管 GPT1 Factory failure、GPT5 Issue #117／PR #517，亦不修改其他 owner PR。L/Federation 維持停用／延後。
- **驗證限制：** 本次為文件與 GitHub metadata/CI evidence 更新；未執行本機測試、TypeScript、Lint 或 Build。此新候選仍須以其 exact HEAD 核對 Actions；GPT3 正式獨立 APPROVED 未提供前不得宣稱驗收或合併。


## 6.5 最新主線重核與 GPT2 交付狀態 — 2026-11-24（第三次更新）

- **本次直接驗證的 main SHA：** `13dbf8f884995649b3e27d9b196ec55900321ace`。
- **GPT2 自有協調文件：** `docs/gpt2/PROJECT_COORDINATION.md`；本次更新前 blob SHA：`786934a7b544257df8e5efd090ff6b89f2b534b7`。
- **Neural Intelligence Agent Mode 採納：** GPT2 的 DOCUMENTED=YES、ADOPTED=YES（限 F–P 文件與工作流程）；INDEPENDENT ACCEPTANCE=PENDING（須由 GPT3 獨立審查）；IMPLEMENTED=NOT CLAIMED。根目錄共同規範與 GPT2 自有 F–P 映射已存在，本次只刷新過期主線證據，不重複宣稱採納或部署。
- **Main exact-SHA CI：** GitHub Actions CI run `45377410952`（#4424）為 PENDING，Jobs 查詢回傳空清單；AI Agent Task Preflight run `45377411119`（#430）為 PENDING，其中 Windows self-hosted project validation 為 PENDING，其餘已列出的六個工作為 SKIPPED；Factory Recovery run `45377423649`（#1525）為 SKIPPED。這些狀態均不是 PASS。
- **Main 外部檢查：** Vercel FAILURE；CircleCI Pipeline #244 ERROR。外部檢查與 GitHub Actions 分開列示，根因未經日誌證實時保持 UNKNOWN。
- **Open PR 快照：** #478 head `9a696398fb8c3acf7152649207d3a4489a59c75c` 的 Actions SUCCESS、Vercel FAILURE；#417 head `0dd4a08886a2aaf761d1c71db041fbcf84416c7b` 的 Actions FAILURE、Vercel FAILURE；#259 head `3330cd04a77358cf0ff780940d09f938cab1dc3a` 的 Actions SUCCESS、Vercel FAILURE，且仍為 Draft；#376 head `d10e6dd6d428d9ce35dbd14778e01c628f909742` 無 Actions run、Vercel FAILURE；#476 head `977896a9db756e336405bb2f1956f9377da60038` 無 Actions run、CircleCI ERROR、Vercel SUCCESS。上述 PR base 均落後於本次 main，且 GitHub 回報 mergeable=false；不得沿用舊 base/head 檢查作為整合驗收。
- **GPT2 本輪自主交付：** 刷新本角色自有協調文件的精確 Main／CI／PR 快照，供 Issue #384 角色採納與交接追蹤；不修改程式碼、Factory workflow、Runner、資料庫／RLS、Secrets、權限、branch protection 或部署設定。文件更新尚未提交至 main，須經本 PR 的 exact-head CI 與 GPT3 獨立 Review。
- **驗證限制與下一步：** 本次為 GitHub ref、workflow run/job、PR metadata 與 commit status 核對；未執行本機測試、TypeScript、Lint 或 Build。GPT2 自我文件更新不等於 GPT3 正式 APPROVED；Issue #384 仍需其他角色各自提交證據與獨立審查。


## 6.6 Main 後續合併與驗收狀態 — 2026-11-24（第四次更新）

- **最新 main SHA：** `d2fbbf5aaa9a9323f633fce30603f160729c2a9b`，由 PR #521 合併產生（merge time 2026-11-24T10:49:13Z）。
- **PR #521 合併驗收風險：** 合併前 exact-head Preflight `45378133585` 結論 FAILURE；exact-head CI `45378133678` 當時 PENDING；未找到正式 APPROVED review。PR 現已 CLOSED/MERGED，但不能把合併動作視為驗收通過。
- **新 Main CI：** CI run `45378380658` PENDING，Jobs 查詢為空；AI Agent Task Preflight `45378380845` PENDING，只有 Windows self-hosted project validation PENDING，其餘六個工作 SKIPPED；Factory Recovery `45378393196` 的唯一工作 SKIPPED。以上不是 PASS。
- **新 Main 外部狀態：** Vercel FAILURE，留言明示 `api-deployments-free-per-day` 免費每日部署額度超過 100 次、建議 24 小時後重試；CircleCI ERROR。這是外部額度限制與 CI 狀態，不得藉重試製造假綠燈。
- **GPT2 PR #520：** 仍 OPEN/DRAFT，head `ce8ba79c34d8066375032c0092968a0b106ab2df`，base commit 仍為上一個 main `13dbf8f884995649b3e27d9b196ec55900321ace`；exact-head CI `45378002760` 的單一 Job `Resolve exact candidate PR metadata` 持續 PENDING；Vercel FAILURE、CircleCI ERROR；未有獨立 Review。不得解除 Draft 或合併。
- **其他 PR：** #478、#417、#259、#376、#476 的 base 均落後於最新 main，且 GitHub 回報 mergeable=false；#259 仍 Draft。不得用舊 head CI 替代新 base 整合驗收。
- **GPT2 行動：** 本次只更新本角色自有協調文件，記錄 #521 的實際合併及其驗收缺口、最新 main 的空 Jobs／PENDING／SKIPPED、Vercel 配額限制與 #520 阻塞。未修改 Factory 程式碼、Runner、工作流、權限、Secrets、資料庫或部署設定。
- **獨立驗收：** GPT2 文件採納不等於 GPT3 APPROVED；#520 仍須新 head CI 與 GPT3 獨立 Review。未執行本機測試、Lint、TypeScript 或 Build。
