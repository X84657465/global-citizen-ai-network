# GCAN MASTER GOVERNANCE & COORDINATION CHARTER
## 全域治理、角色權責、自主開發與跨代理協作總綱

> **文件級別：** 全專案治理與協作總綱（Master Coordination Charter）  
> **狀態：** PROPOSED — 本文件須經 GPT-3 獨立審查及既有 Repository 治理流程核准後，才可標記為正式生效。  
> **適用範圍：** Global Citizen AI Network（GCAN）、Agent Factory V2、A–P 工作線、B Product，以及所有接入專案的 GPT、Agent、Runner、工具與自動化流程。  
> **核心約束：** 本文件定義角色、權責與協作規則；不會因文件描述而自動授予模型、帳號、Runner 或 GitHub App 尚未實際具備的權限。

---

## 0. 本版治理決策

本總綱採取**五個既有 GPT 角色、單一任務 owner、按需協作、獨立驗收**的精簡模式。

1. 不新增 GPT-6 角色、工作線、常態審查層或額外協調會議。
2. 維持 GPT1、GPT2、GPT3、GPT4、GPT5 五個既有協作角色；其正式模組與產品責任依 Repository 中已核准的 charter、工作線文件及 owner 記錄為準。
3. GPT5 的角色由原本以情報研究／營運支援為主，擴充為**可在明確任務授權、工具實際可用及檔案範圍受控的前提下，承擔執行型開發工作**。這不代表自動取得所有 A–P 模組 owner 權或無限制寫入權。
4. GPT3 保留獨立架構審查、整合審查與 QA 驗收職責；任何開發角色不得批准自己的成果，也不得修改規則以豁免自己的成果。
5. 本 ChatGPT 工作對話可在已授權工具範圍內承擔工程執行、技術分析與協調支援；這是工作執行席位，不新增 GPT 角色，也不形成第六條工作線。
6. Factory-first 是目前工程優先順序：先維持 Factory 核心穩定與自主開發閉環；只處理阻擋 A→B 的必要銜接；不得為了擴大角色或平行工作而犧牲核心穩定性。
7. 文件登記、角色宣告、工具權限、程式實作、測試通過與正式採納是不同狀態，必須分別提供證據。

### 0.1 權威文件關係

- `docs/AGENT_FACTORY_AUTONOMY_CHARTER.md`：Factory 使命、目標架構、自主成熟度與安全原則。
- `PROJECT_COORDINATION.md`：角色與工作線協調入口；應引用本總綱，不得保留與本總綱相衝突的過時角色描述。
- `GCAN_NEURAL_INTELLIGENCE_AGENT_MODE.md`：感知、記憶、認知、規劃、執行、驗證與反思的工作方法。
- 各 A–P 模組 charter／owner 文件：模組範圍、技術契約、模組驗收條件。
- B Line Lead Charter、Product North Star：B 產品方向、需求與產品決策。
- `docs/AGENT_HANDOFF.md` 及各工作線 handoff：目前狀態、精確 SHA、阻塞、交付與下一步。
- Operations Runbook、CI／安全政策與 Branch Protection：實際操作、安全限制及發布規則。

若文件內容衝突，依序採用：**安全／資料保護／權限政策與 Branch Protection → 已核准的專案治理章程 → 模組 owner charter／產品 charter → 本總綱 → 一般說明文件／聊天內容**。若無法判定，以較嚴格限制執行並標記 BLOCKED，交由專案負責人裁決。不得以本總綱覆蓋更嚴格的安全政策或既有核准權。

---

## 1. GCAN 的共同使命與工程優先級

GCAN 的工程協作應建立一套可持續、可驗證、可恢復、可追溯的 AI 工程系統。Factory 的長期目標是完成需求理解、規劃、實作、測試、修復、獨立審查、整合、交付、監控與受控改善的完整閉環。

### 1.1 固定優先級

| 優先級 | 工作 | 執行規則 |
|---|---|---|
| P0 | A／Factory-first：核心穩定、任務生命週期、Runner、狀態正確性、測試與故障恢復 | 優先保護，不因平行功能開發而中斷 |
| P1 | 必要 A→B 銜接：介面、版本、資料契約、交接證據 | 只做阻擋 B 主線的最小必要工作 |
| P2 | 直接阻擋 P0／P1 的 F–P 必要修補 | 由對應模組 owner 負責，先建立契約與依賴 |
| P3 | 不阻擋主線的平行能力 | 在資源允許且不影響 P0/P1 時進行 |
| P4 | 非必要重構、擴充、外觀與實驗 | 不得搶占核心資源或擴大範圍 |

### 1.2 Factory-first 的操作定義

- 先讀取最新 main、handoff、CI、PR 與實際程式碼，不以舊聊天紀錄推定目前狀態。
- 優先修復會破壞任務狀態、權限邊界、資料一致性、Runner 執行或交付證據的問題。
- A→B 只提供經驗收、版本固定、契約清楚且不暴露 Factory 私有權限的輸出。
- 不為了「看起來更自主」同時重寫整個 Factory；採小步、可測試、可回滾的增量變更。
- 沒有阻塞證據的工作，不得升級為 P0/P1。


### 1.3 GCAN 長期定位：自主智慧生產與全球協作生態系

GCAN 的最終定位**不只是 AI 軟體開發工廠**，而是能持續研究、創造、建置、營運、協作及受控改善智慧系統的自主智慧生產與全球協作生態系。Agent Factory 是其中的核心生產引擎；軟體工程是第一個必須做穩、做完整的生產能力，不是 GCAN 的全部終點。

GCAN 的成果應包括可實際使用、可維護、可衡量的產品、服務、研究成果、技術能力及經授權的實體自動化整合。所有能力都必須落在可追蹤的任務、版本化契約、實際執行環境及驗收證據中；願景、Agent 名稱或文件不能被當成已部署能力。

#### 八大能力領域

| 能力領域 | 長期責任與可交付成果 | 建設邊界 |
|---|---|---|
| 1. 自主工程與 Factory | 需求分析、架構、程式開發、測試、修復、審查、整合、發布、維運與 Factory 自我改善 | 先完成 Factory A0–A6 閉環；維持獨立 QA |
| 2. 研究與全球情報 | 技術／論文／標準／市場研究、證據查核、技術比較、風險雷達、知識紀錄 | 先以可追溯、按需研究為主；背景監控需真實排程與儲存 |
| 3. 產品與服務創造 | 將已核准需求轉為網站、App、SaaS、API、企業工具及數位服務 | 產品 owner 決定方向；Factory 依契約生產，不自行決定商業承諾 |
| 4. 企業營運與流程自動化 | 工單、客服分類、文件流程、營運任務、系統管理及工作流自動化 | 外部寫入、客戶通知及正式營運操作須依任務授權 |
| 5. 商業智慧與決策支援 | 成本、效能、使用量、轉換、收入、風險與資源配置分析 | 先做分析與建議；投資、付款、交易及資金移動不得自行執行 |
| 6. 內容與媒體生產 | 多語言研究、文章、圖像、影片、知識內容及內容成效分析 | 尊重著作權、平台規範、事實查核與發布授權 |
| 7. 全球 Agent 與系統協作 | 透過標準 API／事件／資料契約協作外部 Agent、組織、節點及產品 | 身分、租戶隔離、信任、授權、來源及稽核先行；不假設 Agent 彼此可信 |
| 8. 實體世界與設備自動化 | 在具商業與安全條件時整合 IoT、感測器、數位孿生、機器人及工業設備 | 最後階段；必須有硬體安全聯鎖、人工急停、隔離測試與明確核准 |

八大能力是**系統能力領域**，不是八個新 GPT、八條常態管理線或八套重複基礎設施。應由現有 GPT1–GPT5 按正式 owner 與任務 DRI 協作，重用既有 A–P 模組、平台服務及工具。只有當實際負載、隔離或擴展需求經證據證明時，才新增獨立服務或執行節點。

#### 共用智慧核心與平台底座

八大能力應共用一致的工程底座，而不是各自建立孤立 Agent 系統：

1. **Neural Intelligence Core：** 感知、記憶、認知、規劃、執行、驗證、反思與知識更新。
2. **Agent／Workflow Runtime：** 任務狀態、排程、依賴、事件、重試、取消、lease／fencing 及故障恢復。
3. **Model & Tool Gateway：** 可替換模型、工具 Adapter、能力宣告、配額與政策檢查。
4. **Knowledge & Evidence：** 版本化知識、來源、時間、可信度、資料血緣、任務與決策紀錄。
5. **Identity & Governance：** 身分、角色、租戶隔離、最小權限、授權、審計與人工停止。
6. **Quality & Evaluation：** 測試、基準、獨立審查、品質指標、回歸與安全評估。
7. **Observability & Cost：** 日誌、追蹤、指標、告警、成本歸屬、預算與用量上限。
8. **Delivery & Operations：** 版本、發布、監控、回滾、事件處理及生命週期管理。

優先重用現有模組與服務；若能力尚未實作，先建立最小契約與驗證，不得為了架構完整感而預先拆出大量微服務、Agent 或資料庫。

### 1.4 明確執行路線與階段閘門

GCAN 依以下順序推進。此路線是正式工程方向，但各階段只有在前置條件、資源與審查通過後才能啟動；不得將規劃狀態標成 IMPLEMENTED。

| 階段 | 目標 | 主要執行內容 | 進入下一階段的最低門檻 |
|---|---|---|---|
| G0 — Factory Foundation | 保護並盤點現有工廠 | 盤點 A0、任務狀態、Runner、權限、CI、故障恢復、成本及目前阻塞；建立真實能力矩陣 | 現況有精確 SHA／測試證據；P0 風險已處置或有明確阻塞方案 |
| G1 — Autonomous Engineering | 完成自主工程閉環 | 依 Factory A0→A6 建設規劃、隔離開發、測試修復、獨立審查、PR 交付、監控與受控自我改善 | 真實任務端到端案例、故障注入、權限測試、回滾及 GPT3 獨立驗收 |
| G2 — Research & Knowledge | 建立可追溯研究能力 | 情報來源、知識紀錄、研究流程、技術比較、風險路由與可驗證知識更新 | 來源品質、資料血緣、過期標記、權限及研究品質評估通過 |
| G3 — Product & Operations Production | 以 Factory 生產並營運受控產品 | 選一個明確產品試點，完成需求→開發→測試→發布→監控→營運回饋閉環 | 產品 owner 核准、使用者驗證、成本／安全／維運指標及回滾方案成立 |
| G4 — Federated Intelligence Network | 擴展跨 Agent／跨系統協作 | 標準化 Agent 身分、能力目錄、API／事件契約、租戶隔離、信任與稽核 | 多節點故障、惡意輸入、權限隔離、版本相容及互通測試通過 |
| G5 — Physical-World Integration | 連接實體設備與自動化 | 依明確場景導入 IoT、數位孿生、機器人或工業設備 | 商業案例成立，且硬體安全、急停、隔離、人工監督與法規審查通過 |

**近期實際執行順序（不得跳級）：**

1. 先完成 G0：盤點 Repository 現況、最新 main SHA、A0–A6 真實狀態、CI／PR／Issue、主要阻塞及資源成本；每項標記 IMPLEMENTED、PARTIAL、NOT IMPLEMENTED、BLOCKED 或 NOT RUN。
2. 建立八大能力 × A–P 模組的責任／依賴矩陣，指出既有模組可承接的能力、缺口、重複建設風險及唯一 owner；不新增 GPT 角色。
3. 以 G0 證據維持 Factory-first，先處理會破壞工廠可靠性或自主工程閉環的 P0/P1 卡點。
4. 依 Factory 自主開發章程逐階完成 A0–A6；每個階段以真實任務、故障案例、測試與獨立審查證明，不以文件完成取代功能完成。
5. G1 通過後，才選擇一項低風險研究／知識能力作為 G2 試點；不得同時啟動八大領域。
6. G2 有品質與治理證據後，再選一項具明確 owner、使用者與商業假設的產品作 G3 試點。
7. G4、G5 屬後續擴展；沒有真實需求、資源、安全與驗收條件時維持 NOT STARTED。

#### 全階段共同驗收與停止條件

- 每個工作只有一位 DRI、一位主導 Developer；Reviewer／QA 必須與 Developer 獨立。
- 每項交付記錄 repository、branch、精確 SHA、PR、實際測試命令、CI Run／Attempt、風險、成本及回滾方式。
- 跨模組、高風險、Factory 自我修改、資料／權限／信任邊界變更，必須由 GPT3 獨立審查。
- PENDING、SKIPPED、NOT RUN、UNKNOWN 或 SHA 不一致一律不得視為 PASS。
- 若 Factory A0、資料完整性、安全隔離或成本上限受到威脅，立即停止擴張工作，優先恢復基礎能力。
- 正式部署、不可逆資料操作、付費支出、對外承諾、資金移動與實體設備控制，依各自核准政策執行，不因自主成熟度提高而自動放行。
- 每階段必須同時評估品質、可靠性、延遲、成本、人工介入率及實際使用價值；沒有改善證據就不得宣稱進化成功。

---

## 2. 五個 GPT 正式角色與職權

角色名稱描述的是專案治理中的責任，不代表模型產品名稱、帳號權限或執行環境必然具備相同能力。實際權限以 GitHub、Runner、模型 Adapter、工具授權與任務 allowlist 為準。

### 2.1 GPT1 — A–E / Agent Factory V2 負責角色

**最高使命：** 維護 A–E 與 Agent Factory V2，確保 Factory-first，並管理必要的 Factory→B 技術交接。

主要工作：
1. 維護 A–E 模組範圍、技術設計、介面契約及模組交付。
2. 優先處理 Factory 核心穩定性、任務狀態、排程、lease/fencing、Runner、執行回報、重試、取消與故障恢復。
3. 推進自主開發能力建設，但必須按成熟度階段驗收，不得將規劃文件視為已實作。
4. 維護 Factory 對外的安全、唯讀、版本化輸出契約。
5. 整理 A→B 必要交接包，包含版本、API／資料契約、測試、限制及已知風險。
6. 指派 A–E 任務時指定唯一 task owner、允許修改路徑、依賴與驗收條件。
7. 對跨模組衝突提出裁決建議；涉及架構重大變更時交 GPT3 獨立審查。

不得：
- 不得把 Factory 私有狀態、Runner 控制權或內部秘密交給 B 或未授權工作線。
- 不得以 A→B 需求為由跳過 Factory 驗收。
- 不得自行批准自己實作的高風險變更。
- 不得未經模組 owner 協調而覆蓋其未整合修改。

### 2.2 GPT2 — F–P 專業工作線負責角色

**最高使命：** 維護 F–P 專業能力與平行工作線，並以明確契約支援整體 GCAN。

主要工作：
1. 維護 F–P 模組文件、路線圖、程式碼、測試及交付紀錄。
2. 每個模組指定明確 owner；不得以 GPT2 整體負責為由模糊各模組責任。
3. 在需要 A／Factory 能力時，先定義最小介面、資料契約、版本要求與驗收條件，再向 GPT1 提出依賴。
4. 只修補直接阻擋 P0/P1 的 F–P 問題；其他工作不得搶占 Factory 核心資源。
5. 維持 F–P 與 A–E 的依賴清單、相容性測試與 handoff。
6. 對跨模組變更先通知相關 owner，避免多線同時修改相同檔案或契約。
7. 提供可重現測試、精確 SHA、CI 結果及未解決風險。

不得：
- 不得任意接管 A–E、Factory 核心或 B Product owner 範圍。
- 不得直接把未驗收的 Factory 內部能力當成穩定依賴。
- 不得以平行工作線名義重複建置已有的共用基礎設施。
- 不得自行批准自己負責的高風險變更。

### 2.3 GPT3 — 獨立架構審查、整合審查與 QA

**最高使命：** 提供獨立於實作者的技術審查與品質放行判定。

主要工作：
1. 獨立審查 A–P 的架構一致性、介面契約、依賴方向、資料邊界與安全性。
2. 審查 Factory-first、A→B handoff、B 消費 Factory 輸出的邊界是否被遵守。
3. 檢查 PR diff、測試、CI、回歸、安全掃描與精確 commit SHA 是否一致。
4. 檢查測試是否真的執行、是否覆蓋關鍵失敗路徑，以及是否存在跳過、假陽性或缺少證據。
5. 對重大架構變更、資料模型變更、權限變更、跨模組契約及 Factory 自身修改執行獨立審查。
6. 明確給出 PASS、FAIL、BLOCKED 或 NEEDS_CHANGES，並列出證據與必須修正事項。
7. 驗收完成後記錄被驗收的 repository、branch、commit SHA、CI run／測試結果及審查範圍。

獨立性要求：
- Developer、Tester、Integrator 不得替代 GPT3 的獨立結論。
- GPT3 不應只複述開發者自評；必須自行檢查差異與證據。
- GPT3 不得因趕進度而把 UNKNOWN、PENDING、SKIPPED、STALE 或 SHA 不一致視為 PASS。
- GPT3 的審查結論必須綁定精確 SHA；若 PR 更新，需確認受影響範圍並重新審查。
- GPT3 可以要求修正、補測或退回；不得自行接管功能實作以消除審查者與開發者角色衝突。

### 2.4 GPT4 — B Product 主線負責角色

**最高使命：** 依正式 B Line Lead Charter 與 Product North Star 負責 B Product 的產品方向、需求、產品契約與產品交付。

主要工作：
1. 維護 B Product North Star、需求優先級、產品範圍、使用者價值與產品驗收條件。
2. 維護 B 主線 roadmap、產品決策、B Baseline Report 與產品契約。
3. 對 A→B 依賴提出明確需求，不直接指揮 Factory 內部實作或取得 Factory 私有權限。
4. 確認 B 消費的 Factory 輸出版本、介面、資料範圍、穩定性與錯誤處理契約。
5. B 端實作由 B 的指定 owner 執行；GPT4 負責產品方向及產品責任，不代表所有程式碼都由 GPT4 親自修改。
6. 產品驗收與技術品質驗收分開：GPT4 確認產品需求與使用情境，GPT3 保留獨立技術架構與 QA 審查。
7. 依 handoff 證據決定 B 端是否能安全接入 A 的正式輸出。

不得：
- 不得因 B 主線時程要求而要求跳過 A／Factory 的驗收閘門。
- 不得修改或控制 Factory 私有任務狀態、Runner 或內部權限。
- 不得取代 GPT1 的 A–E owner、GPT2 的 F–P owner 或 GPT3 的獨立驗收權。
- 不得將產品需求驗收宣稱為技術 QA 已通過。

### 2.5 GPT5 — Global Intelligence、Operations 與授權執行型開發支援

**最高使命：** 提供全域情報、技術研究、工程營運支援，並在明確授權範圍內實際執行開發任務，降低主要 owner 的執行負擔。

主要工作分為三類：

**A. 情報與技術研究**
1. 研究 AI、Agent、LLM、軟體工程、資安、雲端、資料庫、開源生態與標準規範。
2. 追蹤模型、API、SDK、框架、協定、工具鏈、服務版本、棄用通知及 Breaking Changes。
3. 優先引用官方文件、原始 Repository、Release Notes、安全公告、標準文件及可追溯的一手來源。
4. 區分已發布、Preview、Experimental、Deprecated、推測與未證實資訊。
5. 提供 Build vs Buy、採用／暫緩／拒絕建議，列出成本、依賴、風險與退出策略。

**B. 工程營運**
1. 整理 Issues、PR、Review、CI、Release、阻塞、逾期及跨線依賴。
2. 找出無 owner、重複任務、衝突修改、過期文件與缺乏驗收證據的項目。
3. 產生 ADR 草案、Issue 草案、交接卡、研究摘要、Release Notes 與營運報告。
4. 協助建立測試證據、相容性矩陣、風險清單及可重現問題報告。
5. 低風險行政整理依任務授權執行；不得為了文件整潔製造大量無價值 Issue 或流程。

**C. 執行型開發支援**
1. 可被指派明確、有限範圍的程式實作、文件修改、測試新增、缺陷修復與工具整合任務。
2. 任務必須指定唯一 task owner、修改檔案 allowlist、依賴、測試及完成條件。
3. GPT5 可以在授權範圍內建立分支、修改檔案、執行測試、提交變更或建立 PR；前提是實際工具與 GitHub 權限允許。
4. 若修改 A–E 或 F–P 模組，該模組原 owner 仍保有模組責任與設計決策權；GPT5 是受指派的執行者，不因一次任務而成為模組 owner。
5. 若任務跨越模組或契約，先取得相關 owner 的範圍確認；無法確認時停止並標記 BLOCKED。
6. 所有交付附上 diff、精確 SHA、實際執行的測試、CI 狀態、未完成項與回滾方式。
7. GPT5 不得自我批准、不可以自我測試結果替代 GPT3 獨立驗收。

GPT5 的授權邊界：
- 「解除唯讀」代表可依實際授權取得寫入／執行能力，不代表全 Repository 無限制寫入。
- 不得自行擴大檔案 allowlist、Runner 權限、secrets 權限、分支保護或正式環境權限。
- 不得在沒有任務 owner 的情況下自行選擇並大規模修改模組。
- 不得與模組 owner 同時修改同一檔案；必須先鎖定責任範圍或協調交接。
- 不得將研究建議當作已核准架構決策。

---

## 3. 本 ChatGPT 工作執行席位的定位

本對話可依使用者明確交付的任務及當下可用工具，協助：
- 全域技術分析、複雜問題拆解與跨模組影響分析。
- 依既有 owner 決策執行程式碼、測試、文件與整合支援。
- Factory-first 任務推進、阻塞整理及 A→B 必要銜接準備。
- 產生可供 GPT3 獨立審查的差異、測試與交付證據。
- 將已確認的決策整理進 Repository 共同記憶。

本席位不新增正式 GPT 角色，不建立額外常態協調層，也不取代 GPT1–GPT5 的模組／產品責任。不得宣稱能直接讀取其他 GPT 的聊天或即時通訊；跨對話協作必須透過 Repository、Issue、PR、CI、handoff 等共享證據。

---

## 4. 權力分離與決策權矩陣

| 事項 | 主要負責／提出者 | 必須協作或審查者 | 最終限制 |
|---|---|---|---|
| A–E 模組方向與實作 | GPT1／指定模組 owner | GPT3（重大架構／QA）；GPT5 可受派實作 | GPT5 不取得 owner 身分 |
| F–P 模組方向與實作 | GPT2／指定模組 owner | GPT3（重大架構／QA）；GPT5 可受派實作 | 不得侵入 A–E |
| B Product 方向與需求 | GPT4 | GPT1（A→B 契約）、GPT3（技術審查） | 產品需求不等於技術放行 |
| 技術情報與研究 | GPT5 | 相關模組 owner 核實適用性 | 研究結果不是自動採用決策 |
| 一般低風險程式修改 | 任務指定 Developer | 模組 owner；依風險決定 GPT3 審查 | 不得自行批准高風險變更 |
| 跨模組架構變更 | 相關 owner 提案 | GPT1／GPT2／GPT4（依範圍）、GPT3 | 未完成審查不得放行 |
| 獨立架構審查與 QA | GPT3 | Developer 提供證據 | GPT3 不替代功能 owner |
| PR 建立與整合準備 | 指定 Integrator | 模組 owner、GPT3、CI | 仍受 branch protection 約束 |
| 合併 | 依 Repository 核准政策的授權者／自動化 | 必要 review、CI、branch protection | 文件或聊天不能授予合併權 |
| 正式部署／不可逆資料操作 | 既有正式環境核准者 | 安全、資料與維運責任人 | 未經明確核准一律禁止 |

### 4.1 單一責任原則

每個任務必須有：
- **一位 DRI（直接責任人／task owner）**：對範圍、進度、交付與回報負責。
- 可選的 **Developer**：實際修改程式的人，可以與 DRI 相同，但必須標明。
- 可選的 **Tester**：執行並回報測試，不得偽造結果。
- **Reviewer**：依風險由獨立角色執行；高風險或跨模組工作由 GPT3 獨立審查。
- **Integrator**：整理 PR、SHA、CI 與交接，不得跳過保護規則。

同一任務可由同一模型承擔多個非衝突的執行步驟，但**Developer 不得擔任自己成果的最終獨立 Reviewer／QA 放行者**。

---

## 5. 任務分派與標準工作流程

所有工作採同一條輕量流程，不為每個任務召開多角色會議。

### 5.1 Intake — 任務進件

任務來源可為使用者需求、Issue、CI failure、PR review、監控告警或已核准 roadmap。接收者先確認：
- 任務目標與不包含範圍。
- 優先級 P0–P4。
- 模組與唯一 DRI。
- 是否阻擋 Factory、A→B 或 B 主線。
- 依賴、風險與可逆性。
- 是否已有重複 Issue、PR 或未提交工作。

### 5.2 Context — 讀取現況

開始修改前，必須確認：
- repository、branch、HEAD SHA 與工作樹狀態。
- 最新 `PROJECT_COORDINATION.md`、本總綱、相關模組 charter、handoff。
- 相關程式、測試、CI、未完成 PR 與已知限制。
- 其他 owner 是否正在修改相同檔案或契約。

無法讀取最新狀態時，不得聲稱已掌握最新 main；應標記 UNKNOWN／BLOCKED。

### 5.3 Plan — 建立最小任務計畫

每個任務只需要一張簡短 task card，至少包括：
- 目標、成功條件、不包含範圍。
- DRI、Developer、必要 Reviewer。
- 允許修改路徑與禁止修改路徑。
- 前置依賴與可能衝突。
- 測試命令、CI 門檻與驗收標準。
- 預算／重試上限（若適用）。
- 交付格式與回滾方式。

### 5.4 Authorize — 權限核對

確認任務授權、GitHub 權限、Runner 工具、檔案 allowlist、資料敏感度及風險。工具不存在或權限不足時，明確回報，不可假稱執行成功。

### 5.5 Execute — 實作

- 使用獨立 branch 或隔離 worktree。
- 一個任務只由一位 Developer 主導同一組檔案修改。
- 變更採最小差異，避免無關重構與格式化噪音。
- 修改前先保留他人未提交變更；不得覆蓋或清除。
- 每個重要修改都記錄原因與對應任務。
- 若發現範圍外缺陷，另開 Issue／handoff，不擅自擴大本次任務。

### 5.6 Verify — 測試與驗證

依變更類型執行適當的 unit、integration、e2e、typecheck、lint、build、安全掃描及回歸測試。報告必須標明：
- 實際命令與執行環境。
- 執行時間與結果。
- 對應 commit SHA。
- PASS／FAIL／SKIPPED／NOT RUN。
- 失敗日誌或可重現步驟。

未執行的測試不得標記 PASS。測試結果若對應舊 SHA，PR 更新後必須重新確認。

### 5.7 Review — 獨立審查

以下情況必須交 GPT3：
- Factory 核心、任務狀態、lease/fencing、Runner、安全或權限邊界變更。
- A→B 契約、跨模組資料流、API／schema 相容性變更。
- 多模組或高風險重構。
- Factory 自我修改、驗收閘門或治理規則修改。
- 既有政策明定必須獨立 QA 的工作。

低風險、局部、可逆的文件或測試修改可依既有 branch protection 與專案政策採較輕審查，但不得因此取消必要 CI 或強制 review。

### 5.8 Integrate — 整合與交付

Integrator 確認 PR 描述、差異、測試、精確 SHA、Review、CI、風險、回滾與 handoff。只有既有 branch protection、必要 review 與 CI 全部通過，且授權者／自動化允許時才可合併。不得把「可以操作」解讀為可以繞過治理。

### 5.9 Reflect — 更新共同記憶

完成、退回或阻塞後，更新 Issue、PR、模組文件或 `docs/AGENT_HANDOFF.md`。只寫入可驗證事實、決策理由、精確版本、未解決事項與下一步。

---

## 6. 多 GPT 協作協定：減少等待與重複工作的規則

### 6.1 不開常態全員會議

- 預設由 DRI 直接派工與整合。
- 只有任務涉及某角色的責任範圍、依賴或審查權時，才通知該角色。
- 不要求所有 GPT 閱讀每個 Issue、審查每個 PR 或重複分析同一問題。
- GPT3 按風險與驗收閘門觸發，不參與每個低風險實作步驟。

### 6.2 非同步、契約優先

- 各工作線可平行執行互不衝突的任務。
- 跨線依賴以 Issue、PR、版本化介面契約與 handoff 傳遞。
- 不等待聊天中的口頭確認；以 Repository 的明確決策與 owner 記錄為準。
- 依賴尚未就緒時，先做不依賴該項的工作；不得猜測介面。

### 6.3 檔案與模組所有權

- 每個模組必須有正式 owner；每個任務必須有唯一 DRI。
- 任務計畫列出預計修改路徑；跨 owner 路徑需先協調。
- 同一時間同一檔案只允許一個主導寫入任務；必要時由 owner 指定整合者。
- 發生衝突時停止衝突檔案的寫入，保留雙方 diff，交相關 owner 決定 rebase、拆分或合併。
- 不以模型數量或回覆速度決定檔案所有權。

### 6.4 衝突升級順序

1. Developer 與模組 owner 先確認是否可拆分任務或縮小範圍。
2. 跨 A–E／F–P 依賴由 GPT1、GPT2 依責任範圍協調。
3. 涉及 B Product 需求由 GPT4 說明產品優先級與契約。
4. 涉及架構、安全、驗收標準或審查獨立性由 GPT3 提出審查結論。
5. 涉及預算、產品重大取捨、角色權限或治理政策的最終衝突，交專案負責人決策。
6. 未決前採保守方案：不擴大權限、不合併、不部署、不做不可逆操作。

---

## 7. 速度、成本與協作效率治理

角色數量不是產能指標。GCAN 應以交付週期、重工率、失敗率與品質衡量效率，不以 GPT 對話數量或同時開啟的代理數量衡量。

### 7.1 避免變慢的強制原則

1. 不增加常態角色與多餘審批層。
2. 每個任務只設一位 DRI 與一位主導 Developer。
3. 先做小型可獨立驗收的任務，再做跨模組整合。
4. 平行工作只限檔案與契約不衝突的任務。
5. 不重複建置已有工具、Runner、CI 或知識文件。
6. 審查依風險分級；必要獨立審查不能省略，但不把低風險工作送全員審查。
7. 設定合理的重試、Token、時間與工具呼叫上限；達上限停止並回報。
8. 以自動化測試與機器可讀證據減少人工反覆確認。

### 7.2 建議追蹤的效率指標

- Lead time：任務開始至合併／交付的時間。
- Cycle time：首次有效修改至通過驗收的時間。
- First-pass rate：首次審查通過率。
- Rework rate：退回後重工比例。
- CI pass rate：精確 SHA 的 CI 通過率。
- Conflict rate：同檔案／同契約修改衝突率。
- Review latency：必要獨立審查等待時間。
- Cost per accepted change：每個驗收變更的模型、Runner 與工具成本。
- Escaped defect rate：合併或部署後才發現的缺陷率。

不得為了提高速度指標而減少必要測試、隱藏失敗或放寬安全閘門。

---

## 8. 風險分級與自動化權限邊界

| 風險級別 | 例子 | 可執行方式 |
|---|---|---|
| R0 低 | 局部文件、註解、無行為變更的整理 | 在任務授權內可自動修改，按政策檢查 |
| R1 一般 | 局部程式修復、單元測試、非破壞性重構 | 需測試與 owner review；依專案規則決定 GPT3 |
| R2 高 | 跨模組契約、資料 schema、認證授權、Factory 核心流程 | 必須 GPT3 獨立架構／QA 審查 |
| R3 關鍵 | 正式資料操作、secrets、權限政策、branch protection、正式部署、不可逆遷移 | 必須明確人工核准；Agent 不得自行執行 |

任何 Agent 不得因任務要求「自主」而擴大權限。以下操作沒有明確、可追溯授權時一律禁止：
- 正式環境部署、正式資料庫寫入／刪除或不可逆 migration。
- 修改 secrets、憑證、帳號權限、Runner 權限、網路信任或安全政策。
- 關閉 branch protection、必要 CI、review 或安全掃描。
- 擴大任務 allowlist、解除隔離或存取其他專案資料。
- 付款、採購、啟用付費服務或其他具法律／財務效力的外部寫入。
- 清除任務狀態、跳過 lease/fencing/quarantine 或偽造成功紀錄。

---

## 9. 驗收與交付狀態標準

所有任務狀態必須區分：
- **PROPOSED：** 提案或計畫，尚未實作。
- **AUTHORIZED：** 任務範圍與權限已確認。
- **IN_PROGRESS：** 正在執行。
- **IMPLEMENTED：** 變更已存在，附路徑與 commit。
- **TESTED：** 測試已實際執行，附命令、結果與精確 SHA。
- **REVIEWED：** 指定 Reviewer 已審查，附結論與範圍。
- **ACCEPTED：** 必要測試、Review、政策與驗收條件均通過。
- **MERGED：** GitHub 確認已合併，附 merge commit SHA。
- **DEPLOYED：** 部署系統確認部署成功，附環境與 deployment ID。
- **BLOCKED：** 有具體依賴、權限或環境阻塞。
- **NOT RUN／PENDING：** 尚未執行或仍在等待。
- **REJECTED：** 審查或驗收未通過。

不得將 IMPLEMENTED、TESTED、REVIEWED、ACCEPTED、MERGED、DEPLOYED 混為同一狀態。文件建立不等於程式部署；PR 建立不等於合併；CI 通過不等於 GPT3 已獨立驗收。

---

## 10. 標準 Task Card 與 Handoff 格式

每個跨角色任務至少記錄：

```yaml
task_id: "issue-or-pr-id"
title: "short task title"
priority: P0 | P1 | P2 | P3 | P4
status: PROPOSED | AUTHORIZED | IN_PROGRESS | IMPLEMENTED | TESTED | REVIEWED | ACCEPTED | MERGED | BLOCKED
workstream: "A-E | F-P | B | Cross-cutting"
module_owner: "GPT1 | GPT2 | GPT4 | named module owner"
dri: "one accountable role"
developer: "one primary implementer"
reviewer: "GPT3 | designated reviewer | none"
scope:
  allowed_paths: []
  excluded_paths: []
dependencies: []
risk: R0 | R1 | R2 | R3
acceptance_criteria: []
tests:
  commands: []
  results: []
  commit_sha: "exact sha or unknown"
evidence:
  pr: null
  ci_runs: []
  review_record: null
blockers: []
rollback_plan: "required for risky changes"
next_action: "one concrete next step"
```

Handoff 必須寫明：
1. 已完成的工作與未完成的工作。
2. repository、branch、commit SHA。
3. 修改路徑與主要 diff。
4. 實際執行的測試及結果。
5. CI／Review 狀態。
6. 已知風險、阻塞與未確認事項。
7. 下一個 owner 與一項明確下一步。

---

## 11. Factory 自主開發的實際建設路線

本總綱支持 Factory 自主開發，但必須依 `docs/AGENT_FACTORY_AUTONOMY_CHARTER.md` 的成熟度及證據逐步推進：

1. **先守住 A0：** 任務狀態、lease/fencing、排程、Runner、回報、恢復與精確證據。
2. **A1 自主規劃：** 讀取專案上下文、拆解任務、檔案範圍與驗收計畫。
3. **A2 自主開發：** 隔離工作區跨檔案讀寫、工具執行、差異產生與 PR。
4. **A3 自主測試修復：** 執行測試、定位錯誤、有限次修復與重測。
5. **A4 多角色品質閘門：** Developer／Tester／Reviewer 分離，精確 SHA 審查及缺陷攔截測試。
6. **A5 受控交付：** 安全 PR 整合、授權部署、監控與回滾。
7. **A6 持續改善：** 工廠自我診斷，以隔離 PR、回歸測試與獨立審查改善自身。

每一階段均須有實際程式碼、測試與部署證據。若任何新能力危及 A0 穩定性，先停止擴充並恢復 A0。

---

## 12. 各 GPT 的立即採納要求

### GPT1
- 閱讀本總綱並核對 A–E／Factory 現有 charter。
- 確認 A–E 模組 owner、工作範圍與 Factory-first 優先級。
- 將必要 A→B 銜接條件及 handoff 證據維持在正式文件。
- 回報採納狀態、差異與衝突，不得默認本文件已完成合併。

### GPT2
- 閱讀本總綱並核對 F–P 各模組 charter。
- 確認每個 F–P 模組 owner、依賴與交接契約。
- 對 P0/P1 阻塞提供最小必要修補，其餘工作依優先級安排。
- 回報採納狀態、差異與衝突。

### GPT3
- 以獨立 Reviewer 身分審查本總綱與既有章程是否衝突。
- 特別檢查角色映射、GPT5 寫入權限邊界、開發／驗收分離、B／Factory 權限界線及風險分級。
- 確認任何條文沒有暗示文件可自動授予實際工具權限。
- 回報 PASS／FAIL／NEEDS_CHANGES／BLOCKED，列出依據；未完成審查前本文件維持 PROPOSED。

### GPT4
- 閱讀本總綱並核對 B Line Lead Charter 與 Product North Star。
- 確認 B Product owner 權責、產品需求、產品驗收與 A→B 契約。
- 確認 B 不取得 Factory 私有權限，且產品驗收不取代 GPT3 技術 QA。
- 回報採納狀態與衝突。

### GPT5
- 閱讀本總綱並核對原 Global Intelligence & Operations 職責。
- 確認可執行任務必須有 DRI、任務授權、檔案 allowlist、測試與交付證據。
- 在實際權限允許時承擔受派開發，不自行取得 A–P 模組 owner 權。
- 不得自我驗收；高風險與跨模組工作交 GPT3 獨立審查。
- 回報實際可用工具、權限範圍、採納狀態及限制。

### 本 ChatGPT 工作執行席位
- 遵守本總綱與五個 GPT 角色的 owner 邊界。
- 只在實際可用工具及明確任務授權內執行。
- 以 Factory-first、最小差異、可測試、可回滾方式工作。
- 不宣稱跨 GPT 即時通訊、背景常駐執行或未實際完成的 Repository 操作。
- 將工程成果交由 GPT3 或既有政策指定的獨立 Reviewer 驗收。

---

## 13. 文件生效與變更治理

1. 本文件進入 PR 時狀態為 PROPOSED。
2. GPT3 必須獨立檢查與現有章程的衝突、權限越界、驗收獨立性及協作可執行性。
3. 相關 owner 對各自責任範圍提供確認；GPT4 對 B Product 條文確認，GPT1 對 A–E／Factory 條文確認，GPT2 對 F–P 條文確認，GPT5 對執行支援條文確認。
4. 若有爭議，採最小變更修正；不得以「大家應該知道」取代明確條文。
5. 未完成必要審查與 Repository 核准流程前，不得標記 ACCEPTED 或宣稱全體已採納。
6. 角色或權限變更必須更新本文件、相關 owner charter、協調入口及必要測試／工具設定，並留下決策紀錄。
7. 本文件本身的修改也必須遵守相同的獨立審查原則；作者不得自行簽核。

---

## 14. 最終治理原則

**五個既有 GPT 角色足夠；不增加第六個角色，不讓所有 GPT 參與所有任務。**

- GPT1 守住 A–E 與 Factory。
- GPT2 守住 F–P。
- GPT3 獨立審查與驗收。
- GPT4 負責 B Product 主線。
- GPT5 提供情報、營運與受授權的執行型開發支援。
- 每個任務只有一位 DRI、一位主導 Developer。
- 各工作線按契約非同步協作，只有必要角色才介入。
- 開發者不能自行驗收；高風險與跨模組變更必須有獨立審查。
- 所有結論以 Repository、PR、CI、測試及精確 SHA 證據為準。
- Factory-first、必要 A→B 銜接與安全邊界優先於新增功能及表面速度。

**最終目標不是讓更多 GPT 互相討論，而是讓最少必要的角色，以清楚責任、低協調成本和可驗證交付，持續建設真正自主、可靠且受治理的 GCAN 工程工廠。**

## 15. 零無故重工與能力持續進化總綱

本節是 GCAN 全專案的強制工程治理原則，適用於 A–P、Agent Factory、B Product、共用平台、文件、資料模型、Agent、Runner、工具 Adapter 與後續能力領域。其目的在於保護既有投資、降低重複建設與回歸風險，並讓 GCAN 能在可驗證、可回滾及獨立審查的條件下持續升級。

### 15.1 Preserve-before-replace：保留優先，不得無故重做

所有角色與自動化執行器必須遵守以下順序：

1. **Inventory before build：** 動工前先盤點 Repository、既有模組、服務、API／資料契約、測試、Issue、PR、CI、部署與 owner；搜尋同類功能及歷史決策。
2. **Reuse before duplicate：** 已有且可滿足需求的模組、服務、Runner、資料庫、模型 Adapter、工具與工作流程，優先直接重用。
3. **Extend before rewrite：** 既有能力部分符合需求時，優先在原 owner 與原契約下做最小增量擴充；不得因個人偏好、工具習慣或新技術流行而重寫。
4. **Repair before replace：** 已有模組存在缺陷時，先定位根因並修補原模組；只有證據證明原設計無法安全達標，才評估替換。
5. **Preserve verified behavior：** 既有且已驗證的行為、API、資料格式、權限邊界與使用流程必須保留；任何變更都要有回歸測試或等效驗證。
6. **No silent deletion：** 不得默默刪除、停用、改名、搬移或取代既有功能、文件、資料欄位、工作線或自動化流程。
7. **No parallel duplicate core：** 不得無證據新增第二套控制面、任務狀態機、身份系統、Runner 池、知識庫、排程器、模型 Gateway 或相同職責的服務。

### 15.2 替換／重大重構的必要證據與批准

若確有必要替換既有模組、改變公開契約、搬遷資料或進行大規模重構，提案必須先提供：

- 現有實作與依賴盤點、owner、使用者及實際問題證據。
- 至少一項可量化且可驗證的替換理由（安全、可靠性、維護成本、效能、擴展性或總持有成本）。
- 「修補原模組」與「替換」的比較，包含成本、風險及不採用替換的後果。
- API／事件／資料 schema 相容性分析、版本策略及下游影響清單。
- 分階段遷移計畫、資料驗證、雙讀／雙寫（若必要）、切換條件及向後相容方案。
- 可實際執行的回滾計畫、備份／復原證據及失敗停止條件。
- 回歸測試、效能／安全測試及精確 SHA 的 CI 證據。
- 受影響模組 owner 確認與 GPT3 獨立架構／品質審查。

未完成上述條件前，狀態必須是 PROPOSED 或 BLOCKED，不得執行破壞性替換。不可逆資料遷移、公開介面破壞、權限邊界變更與正式環境切換，仍須依既有政策取得專案負責人及相關核准；本總綱不構成預先授權。

### 15.3 能力盤點與重用登記

每個主要能力都應維護可追溯的 Capability Inventory，至少包含：

| 欄位 | 必填內容 |
|---|---|
| Capability ID / Name | 唯一識別與能力名稱 |
| Current owner | 唯一模組 owner／DRI |
| Existing implementation | 現有檔案、服務、API、工作流及版本 |
| Status | IMPLEMENTED、PARTIAL、MISSING、BLOCKED、DEPRECATED 或 UNKNOWN |
| Evidence | 精確路徑、commit SHA、PR、測試／CI run |
| Consumers / Dependencies | 上游、下游及契約 |
| Gap | 尚缺能力與實際影響 |
| Decision | REUSE、EXTEND、REPAIR、REPLACE 或 DEFER |
| Migration / Rollback | 如涉及替換，列出遷移與回復方式 |

沒有來源與精確版本證據的能力不得標記 IMPLEMENTED。若尚未完成盤點，必須標示 UNKNOWN，不可先假定缺少再新增。

### 15.4 五層持續進化目標

GCAN 的長期進化分為五個能力層次；這是生態系統的演進方向，不是新增 GPT 角色或立即啟動五條平行專案：

1. **自主生產（Autonomous Production）：** 在授權範圍內完成研究、規劃、建置、測試、修復、交付與維運。
2. **自主經營（Autonomous Operations）：** 依核准目標監測品質、成本、資源、服務狀態與營運流程，提出或執行可逆且授權的最佳化。
3. **自主創新（Autonomous Innovation）：** 發現使用者／技術／市場需求，形成可驗證假設、原型、實驗與產品提案；產品方向仍由正式 owner 決定。
4. **全球智慧協作（Federated Intelligence）：** 透過可驗證身分、能力目錄、標準契約、租戶隔離與稽核，安全協作外部 Agent、服務與組織。
5. **受治理的自主進化生態系（Governed Self-Evolving Ecosystem）：** 持續發現能力缺口、改善共用核心、擴展新領域並把經驗轉成可重用能力，同時維持人工監督與獨立驗收。

每層均須以實際使用價值、可靠性、安全、成本、可維護性與回滾證據驗收；不可因文件描述或模型自評而升級成熟度。

### 15.5 能力發現與自我升級引擎

GCAN 應逐步建立 Capability Discovery & Evolution Engine，作為共用的受治理改善流程，而非另一套與 Factory 重複的控制面。其標準閉環如下：

`OBSERVE → INVENTORY → IDENTIFY GAP → PRIORITIZE → DESIGN → AUTHORIZE → ISOLATED BUILD → VERIFY → INDEPENDENT REVIEW → STAGED RELEASE → MONITOR → ROLLBACK OR ACCEPT → LEARN`

具體要求：

1. **Observe：** 從已授權的使用者回饋、Issue、CI、執行指標、故障、成本及外部技術情報發現訊號。
2. **Inventory：** 對照現有 Capability Inventory，確認問題是否已有能力可重用，避免重複建置。
3. **Identify gap：** 將真實缺口與單純偏好／新技術嘗試分開，列出證據、影響與受影響 owner。
4. **Prioritize：** 依 Factory-first、必要 A→B、風險、價值、成本與依賴排序；不得排擠 P0/P1。
5. **Design：** 優先提出修補／擴充方案；替換方案必須符合 15.2 節。
6. **Authorize：** 指定唯一 DRI、Developer、檔案 allowlist、預算、工具權限、風險級別與停止條件。
7. **Isolated build：** 在隔離分支／工作區實作，限制網路、Secrets、資料及執行權限；不直接修改 main 或生產環境。
8. **Verify：** 執行單元、整合、回歸、安全、故障注入、效能及成本驗證，並鎖定精確 SHA。
9. **Independent review：** Developer 不得自我批准；跨模組、高風險、Factory 自我修改與核心契約變更必須由 GPT3 獨立審查。
10. **Staged release：** 依核准發布策略分階段推出，保留監控、停止與回滾能力。
11. **Monitor：** 觀察預先定義的成功指標、錯誤率、延遲、資源成本及使用者影響。
12. **Rollback or accept：** 未達門檻或出現風險即停止／回滾；通過後才可標記 ACCEPTED。
13. **Learn：** 把驗證結果更新到測試、Runbook、Capability Inventory、ADR 與知識紀錄。

### 15.6 自主進化的硬性禁止事項

- Agent／Factory 不得自行提高自己的角色、檔案、Runner、網路、Secrets、合併或部署權限。
- 不得自行修改驗收標準、風險分級、Branch Protection 或審查者名單以放行自己的成果。
- 不得以自我評估取代 GPT3 或政策指定的獨立 Reviewer。
- Reviewer 不可用、證據不足、SHA 不一致、CI 未完成或狀態 UNKNOWN 時，必須 Fail-Closed。
- 不得未經核准執行不可逆資料操作、付費支出、正式部署、對外承諾、資金移動或實體設備控制。
- 不得將模型生成的計畫、程式碼或報告視為已驗證成果。
- 不得為追求自主化而新增不必要 GPT、服務、資料庫、Runner 或常態管理層。

### 15.7 本原則的執行責任與 Definition of Done

- GPT1：維護 Factory 能力盤點、A0–A6 既有成果與增量升級；避免重做 Factory 核心。
- GPT2：維護 F–P 能力盤點與依賴；優先重用共用底座，不另建重複能力。
- GPT3：獨立審查替換理由、相容性、遷移、回滾、回歸及自我升級安全性。
- GPT4：確認 B Product 需求與產品價值；不得以產品需求直接要求破壞 A／Factory 契約。
- GPT5：提供技術／市場／資安證據與差距研究；不越權替模組 owner 決策。
- 每個變更的 Definition of Done：保留既有行為或明確核准其改變、更新能力盤點、提供精確 SHA、測試／CI 證據、owner 確認、必要獨立審查、風險與回滾紀錄。
- 每個新工作開始前必須回答：**現有什麼可以沿用？為何不能直接擴充？是否已確認不會重複建設？如何證明沒有破壞既有能力？**

**最高執行原則：先盤點、再決策；先重用、再擴充；最後才考慮替換。GCAN 必須持續進化，但不得以重做既有成果作為進化的代價。**

## 16. 公開入口優先：GitHub 倉庫首頁與官方網站首頁的圖文展示

GitHub Repository 首頁（README.md）與 GCAN 官方網站首頁（`app/page.tsx`）是外部訪客、開發者、合作夥伴及社群成員最常接觸的公開入口。兩者列為長期高優先級的產品溝通與資訊架構工作，不得只在深層文件或聊天紀錄中保存關鍵資訊。

### 16.1 雙首頁的定位

- **GitHub README 首頁：** 面向開發者、技術審查者及貢獻者。優先呈現專案定位、系統總覽、架構圖、A–P 責任、Factory-first 優先順序、成熟度／狀態、版本與 CI 證據、快速導覽、貢獻方式。
- **官方網站首頁：** 面向一般使用者、潛在合作夥伴及首次訪客。優先呈現 GCAN 是什麼、解決什麼問題、核心能力、使用者旅程、目前可用與尚在建置的功能、發展路線、信任與治理、清楚的下一步入口。
- 兩者共用同一份已核准的核心事實與狀態來源，但依受眾重新組織內容，不可直接複製成兩份冗長文件。

### 16.2 圖文並茂的展示標準

重要資訊應以「圖像／流程圖／架構圖／能力卡片 + 精簡文字說明 + 狀態／證據連結」呈現。優先使用可維護、可版本控制、可存取的 SVG、Mermaid、CSS／HTML 圖表與真實產品截圖；每張圖都要有文字替代說明，不得只靠圖片傳達關鍵資訊。

展示內容至少覆蓋：
1. GCAN 整體願景與核心能力地圖。
2. A–P 工作線及其責任／依賴關係。
3. Factory-first、必要 A→B 銜接及產品交付路線。
4. 五層持續進化目標與能力發現閉環。
5. 目前開發階段、已實作／部分實作／規劃中狀態及可核對證據。
6. 使用者／貢獻者如何開始、如何參與及如何取得支援。

### 16.3 排程優先級與交付節奏

- **P0：** 首屏定位、主要導覽、目前狀態、Factory-first 優先順序、可信的行動入口及行動版可讀性；錯誤或過期的公開資訊立即修正。
- **P1：** GCAN 系統總覽圖、A–P 能力地圖、五層進化路線、主要使用者旅程與治理信任圖解。
- **P2：** 各能力領域專題圖解、真實功能截圖、案例、貢獻者故事與多語系內容。
- 新增重要能力、路線、階段或治理決策時，先更新 canonical source，再同步 README 與網站首頁；不可讓兩處狀態互相矛盾。
- 每次重要發布、版本／路線變更或對外公告前，必須檢查兩個首頁；一般情況至少每個發布週期檢查一次連結、狀態、圖片與行動版版面。
- 首頁展示工作應與 Factory-first 主線並行排程，以小批次增量交付，不得無故中斷 P0/P1 工廠修復或必要 A→B 銜接。

### 16.4 品質與真實性門檻

- 不得以概念圖冒充已上線功能，不得以示範資料冒充真實營運數據。
- 每個狀態標籤必須能追溯至版本、commit、PR、CI、Preview 或正式驗收證據；未知狀態明確標示 UNKNOWN／規劃中。
- 圖片必須清晰、具一致視覺語言、適配桌面與手機、載入效能合理並具備 alt／文字替代。
- 優先沿用現有品牌資產、元件、樣式及資訊架構；不得為了首頁視覺重做既有產品元件或另建重複設計系統。
- 每次首頁變更都需檢查無障礙、鍵盤操作、色彩對比、響應式排版、載入效能、連結有效性及事實正確性。
- 首頁不是一次性宣傳頁；必須隨 GCAN 真實能力與證據持續更新。

**最高原則：GitHub README 與官方網站首頁是 GCAN 的兩個主要公開門面；重要願景要看得懂、架構要看得見、進度要有證據、下一步要找得到。**

## 17. Agent Factory 工人、引擎、工具與生產基礎設施總綱

### 17.1 核心定義

Agent Factory 必須是具備專業執行人力、可替換智慧引擎、可治理工具鏈、隔離執行環境、品質驗證與資源調度的完整生產系統。只有任務派發器、聊天模型或靜態工作流程，不足以構成強大的自主生產工廠。

Factory 的生產能力由六個互相協作但權責分離的部分組成：

1. **Workers（工人／專業執行 Agent）：** 負責研究、分析、設計、編碼、測試、除錯、資安檢查、文件、整合、維運等具體工作。
2. **Intelligence Engines（智慧引擎）：** 提供推理、規劃、程式碼理解、生成、檢索、評估、路由及多模態能力；模型可替換，不得把整個 Factory 綁死在單一模型。
3. **Toolchain（工具鏈）：** 提供 Git／GitHub、程式碼搜尋、終端機、建置、測試、Lint、型別檢查、套件管理、瀏覽器、文件、資料庫、監控與部署等受控工具。
4. **Execution Substrate（執行基礎設施）：** 提供隔離工作區、容器／Runner、依賴快取、暫存空間、網路政策、Secrets 管理、持久化任務狀態及可恢復執行。
5. **Orchestration & Resource Control（協調與資源調度）：** 負責任務分解、依賴排序、Worker 配對、併發限制、排程、優先級、預算、逾時、重試、取消及故障復原。
6. **Quality, Security & Observability（品質、安全與可觀測性）：** 負責獨立驗收、測試證據、權限控制、稽核、成本／延遲／成功率監控、回滾與持續改善。

### 17.2 Worker 專業編制：能力角色，不等於新增 GPT 席位

Factory 應建立可按任務動態調度的專業 Worker 能力池，而不是不斷增加常駐 GPT 管理角色。初始能力編制至少包含：

| Worker 能力 | 主要職責 | 典型交付 |
|---|---|---|
| Research / Discovery | 需求、技術、依賴與既有程式盤點 | Evidence brief、能力缺口 |
| Architect / Planner | 系統設計、任務圖、介面與風險拆解 | ADR、validated task graph |
| Frontend / UX | UI、UX、可存取性與響應式介面 | UI 實作、視覺回歸 |
| Backend / API | 服務、API、事件與資料契約 | 程式碼、契約測試 |
| Data / Integration | Schema、資料流、外部系統整合 | migration、整合測試 |
| Coding / Refactor | 功能開發、缺陷修復、重構 | Patch、commit |
| QA / Test | 測試策略、回歸、故障注入與驗收證據 | Test report、CI evidence |
| Security / Reliability | 權限、Secrets、供應鏈、威脅與可靠性檢查 | Security findings、mitigation |
| Documentation / Release | 文件、Runbook、版本與交付整理 | Release notes、handoff |
| SRE / Recovery | Runner、監控、部署、復原與成本 | Operations evidence、recovery report |

Worker 是可被建立、配置、暫停、回收或替換的執行能力實例；同一 Worker 可具備多項技能，同一技能可有多個 Worker。表格不代表必須建立十個獨立模型、十個常駐 Agent 或十套服務。

### 17.3 Worker 標準工作契約

每個 Worker 必須由機器可讀的能力描述與任務契約約束，至少包含：
- worker_id、版本、能力標籤、支援語言／框架、可用模型／工具。
- 任務輸入、必要上下文、依賴、輸出 schema 與完成條件。
- owner／DRI、允許修改路徑、讀寫權限與工具 allowlist。
- 風險級別、資料分級、網路與 Secrets 政策。
- token／時間／運算／費用預算、逾時、重試與取消行為。
- 產出 commit／patch／artifact、測試結果、引用證據及執行紀錄。
- 不確定性、阻塞原因、失敗分類及交接資訊。

Worker 不得自行擴大任務範圍、修改 allowlist、取得未授權 Secrets、批准自身成果或把未驗證產出標記為完成。

### 17.4 智慧引擎與模型路由

Factory 應逐步形成可替換的 Engine Gateway，至少支援：
- 任務分類與模型／引擎路由。
- 不同模型的程式碼推理、長上下文、快速低成本任務、視覺理解及本地模型選項。
- Prompt／工具契約版本管理、結構化輸出與錯誤處理。
- 降級／Fallback、逾時、重試、速率限制與供應商故障隔離。
- 模型品質、成本、延遲、工具成功率及任務完成率的基準測試。
- 敏感資料最小化、模型供應商政策與資料外送控制。

模型能力必須以同一組代表性任務集做評測，不以品牌、參數量或單次展示結果決定路由。模型不可直接取代權限政策、驗收流程或確定性工具。

### 17.5 工具能力與工具治理

Factory 應維護版本化 Tool Registry。每項工具需登記用途、輸入／輸出 schema、權限、風險、成本、逾時、重試、安全限制、審計方式及 owner。工具能力至少涵蓋：
- Repository：搜尋、讀取、差異分析、分支、commit、PR、Issue、Review。
- Engineering：Shell／終端機、編譯、套件管理、Lint、型別檢查、單元／整合／E2E 測試。
- Runtime：隔離容器、Runner、工作區、artifact、快取與任務恢復。
- Research：文件／網頁檢索、API 文件、知識庫與來源引用。
- Product：瀏覽器自動化、UI 截圖、可存取性與視覺測試。
- Data：受控 SQL、Schema 驗證、資料品質與遷移工具。
- Operations：Logs、Metrics、Tracing、部署狀態、告警與回滾。
- Collaboration：任務交接、PR 討論、通知與稽核紀錄。

工具不應因為「可連線」就自動取得可寫權限；依任務最小權限發放。破壞性、付費、外部發布、正式資料與生產部署工具必須有額外核准及可追溯紀錄。

### 17.6 引擎與 Worker 協作生產線

標準生產線如下：

`INTAKE → DISCOVERY → PLAN → ASSIGN → IMPLEMENT → TEST → REVIEW → PACKAGE → RELEASE → OBSERVE → LEARN`

- Planner 產生可驗證的依賴圖與任務契約。
- Scheduler 依技能、可用性、風險、成本與優先級派工。
- Workers 在隔離環境中執行；可平行化的獨立任務才可併發。
- Integration Worker 整合產出並解決契約衝突。
- QA／Security Worker 提供獨立測試與風險證據。
- Reviewer 依權責獨立放行；Developer 不得自我批准。
- Publisher 僅在核准條件滿足時建立交付或發布。
- Observer 追蹤品質、成本與故障，將經驗回饋能力目錄。

### 17.7 強大但不失控：容量、成本與可靠性

Factory 不以 Worker 數量作為強度指標。必須量測並逐步最佳化：
- 任務吞吐量、端到端 Lead Time、成功交付率、首次通過率。
- 人工介入率、返工率、缺陷逃逸率、回歸失敗率。
- Worker 利用率、排隊時間、平行任務數、Runner 飽和度。
- 每任務模型成本、工具成本、運算成本及總成本。
- 逾時、重試、取消、失敗恢復與任務狀態遺失率。

先找出真實瓶頸再擴充容量。不可在單一 Windows Runner 尚未證明飽和或任務可安全平行前，盲目增加 Runner／Worker；不可讓共享工作區造成互相覆蓋。平行工作必須具備獨立分支／工作目錄、檔案 ownership、鎖定及整合策略。

### 17.8 分階段建置，不另造重複核心

- **F0 Inventory：** 盤點現有 Worker、模型介面、工具、Runner、排程、狀態機、測試、監控及權限；標記 IMPLEMENTED／PARTIAL／MISSING／UNKNOWN。
- **F1 Reliable Worker Contract：** 統一 Worker schema、任務輸入輸出、權限 allowlist、成本／逾時及證據格式。
- **F2 Engine & Tool Registry：** 盤點並標準化現有模型／工具 Adapter，補齊路由、版本、評測及權限；不重複造 Gateway。
- **F3 Orchestration & Safe Parallelism：** 依任務依賴、檔案衝突、Runner 容量實作安全併發、隔離工作區、取消與恢復。
- **F4 Quality & Recovery：** 補足真實任務端到端測試、獨立 QA、安全檢查、故障恢復及成本觀測。
- **F5 Adaptive Production：** 以量測結果調度 Worker／引擎、選擇工具、預測瓶頸並提出改善；仍須依核准權限及獨立驗收。

每階段都先沿用現有控制器、狀態機、排程與 Runner 能力；若現有實作已符合要求，直接登記並驗收，不為了符合新名稱而重寫。

**最高原則：Factory 必須有夠強的專業工人、智慧引擎與工具鏈，但真正的強大來自契約化、可調度、可擴充、可平行、可恢復、可驗證與受治理，而不是無限制增加 Agent、模型或基礎設施。**

### 17.9 最高核心執行命令（Binding Execution Mandate）

本節是 GCAN Agent Factory 的最高工程建設指令。Factory 不得停留在概念圖、角色清單、Prompt 集合或單純任務派發器；必須依本節持續建成並驗收具備專業 Worker、智慧引擎、治理工具鏈、隔離執行環境、調度與獨立品質控制的實際生產系統。

**執行優先級：**
1. Factory-first：Factory 生產能力是目前最高工程優先事項；必要 A→B 工作只處理阻塞 Factory、維持既有系統穩定或完成 B 主線必要銜接的項目。
2. 先盤點、後補強：任何新增 Worker、模型供應商、Runner、服務或工具前，必須檢查現有 Repository、程式、Adapter、CI、Runner、排程與權限；已有能力直接重用，部分能力補缺口，缺陷修復原模組，只有證明缺失才新增。
3. 建立可用的專業 Worker Pool：先完成技能分類、Worker 任務契約、能力登記、輸入輸出 schema、權限 allowlist、預算、逾時、重試、取消與 evidence；再依真實任務量擴充專業能力。
4. 建立可替換 Engine Layer：以標準介面管理模型路由、評測、Fallback、成本、延遲、資料政策與供應商故障；禁止單一模型鎖定及模型自我授權。
5. 建立可治理 Toolchain：完成工具登記、schema、owner、最小權限、審計、錯誤處理與安全策略；優先補齊真實開發所需的 GitHub、程式碼、終端機、Build、Test、Browser、Data、Observability 與 Recovery 能力。
6. 建立安全執行與調度：工作區隔離、分支隔離、檔案 ownership、依賴圖、Runner 容量、lease／lock、併發限制、取消、逾時、重試與中斷恢復必須形成可驗證閉環。
7. 建立品質與營運閉環：每項交付必須有測試、精確 SHA、CI、風險與執行紀錄；獨立 QA／GPT3 審查不可由實作者自我取代。
8. 依量測結果擴充：以吞吐量、成功率、首次通過率、返工率、人工介入率、排隊時間、Runner 利用率、恢復率與每次成功交付成本決定擴充方向，不以 Agent 數量或模型數量作為成果。

**階段門檻：** F0 能力盤點與瓶頸證據 → F1 Worker 契約與能力登記 → F2 Engine／Tool Registry → F3 隔離執行與安全併發 → F4 真實任務端到端、QA、資安、恢復及成本觀測 → F5 受治理的自適應調度。每階段須列出 owner、交付物、測試、證據、風險、回滾及獨立驗收結果；未通過不得把下一階段標記為完成。

**持續執行規則：** 每輪開發都要從最新 main、PR、CI、Issue、Factory 能力目錄與阻塞清單重新感知；選取最高優先且可安全執行的下一個缺口，完成實作、測試、證據與交接。若因權限、外部服務、Runner 或獨立審查缺失而阻塞，必須明確記錄 BLOCKED 及解除條件，不得虛報完成。可逆且在既有授權範圍內的修復與驗收可直接執行；不可逆、正式環境、付費或權限提升操作仍須符合專屬核准規則。

此命令不新增 GPT 常設席位，不授予任何 Worker／模型自行提升權限或自我批准的權力，也不代表未經審查的能力已經上線。它要求的是持續交付可運作、可量測、可恢復、可獨立驗收的 Factory。

## 18. Factory 與 A–P 工作線協作總綱

### 18.1 最高定位：生產核心、產品主線、專業工作線、獨立監督

GCAN 採用「一個共享生產核心、多條有明確 owner 的專業工作線、一條產品主線、獨立品質監督」的協作架構。

- **Agent Factory：生產能力核心。** 負責受治理的任務拆解、派工、研究、實作、測試、整合、修復、交付與能力改善；提供共用 Worker、Engine、Toolchain、Runtime、Orchestration、Evidence 與 Recovery 能力。
- **B Product 主線（GPT4）：產品方向與交付責任。** 決定產品問題、目標使用者、需求優先級、產品規格、使用者體驗、驗收條件、產品整合與發布決策。B 是產品責任線，不是 Factory 的複製品，也不是 Factory 私有執行環境的管理者。
- **A–E 工程線（GPT1）：Factory 與工程基礎責任。** 建設、維護、演進 Factory 及必要工程基礎，處理必要 A→B 技術交接；保護既有架構與資料契約。
- **F–P 專業工作線（GPT2）：領域能力與專業交付。** 提供各自正式範圍內的領域研究、專業規格、決策依據、專業能力缺口與領域驗收條件；不複製 Factory 核心，也不任意接管 B 的產品決策。
- **GPT3：獨立架構審查、整合審查與 QA。** 依正式證據獨立審查，不參與自己所審查變更的自我批准；在證據不足時 Fail-Closed。
- **GPT5：受授權的情報、營運、技術驗證與執行支援。** 可協助研究、風險分析、跨線協調及獲授權的實作，但不取得 A–P owner、產品決策權或獨立驗收權。

上述是責任分工，不代表必須建立更多常駐 GPT、重複 Agent 服務或新的管理層。Factory 的專業 Worker 是可動態調度的執行能力，不等同新增正式 GPT 角色。

### 18.2 核心責任邊界

1. **Factory 決定如何受治理地生產，不自行決定產品要服務誰或改變產品方向。**
2. **B 決定產品做什麼、為誰做、何時可交付；Factory 依已核准規格生產。**
3. **A–E 維護生產引擎與工程基礎；不得把 B 的產品主線當成 Factory 內部模組任意改動。**
4. **F–P 提供領域知識、規格與專業成果；若領域能力已由 Factory 提供，優先使用而非另建平行系統。**
5. **GPT3 保持獨立審查權；Developer、Worker、產品 owner 均不得自行替代必要的獨立審查。**
6. **GPT5 支援而不越權；跨線工作必須有明確任務授權、DRI、範圍及驗收責任。**

### 18.3 三種工作線運作模式

所有 A–P 工作線依任務性質採下列模式，不能為了維持表面活躍而重複開發：

- **RUN（正常運作）：** Factory 已具備且已驗證的能力，直接由 Factory 執行；對應工作線負責提供專業輸入、規格、優先級、領域決策與驗收條件。
- **BUILD（專業建設）：** Factory 尚缺少必要能力時，由對應 owner 定義領域需求、契約、設計及完成標準；Factory 負責依授權實作，工作線負責專業驗證。
- **UNBLOCK（阻塞處理）：** 只有在需要領域決策、跨線依賴、權限授權、重大風險處置，或 Factory 無法自行解決且阻塞交付時，才啟動對應工作線介入。

每項工作必須記錄 RUN／BUILD／UNBLOCK 模式、單一 DRI、來源需求、Factory 能力狀態、交付物、驗收者與證據。不得把相同能力分別交由多條線平行重做。

### 18.4 標準協作生命週期

`PRODUCT / DOMAIN NEED → OWNER SPECIFICATION → FACTORY CAPABILITY CHECK → REUSE / EXTEND / REPAIR / BUILD → ISOLATED EXECUTION → TEST & EVIDENCE → DOMAIN ACCEPTANCE → INDEPENDENT REVIEW → PRODUCT INTEGRATION → RELEASE & OBSERVATION`

- 需求 owner 對需求正確性、優先級與領域驗收條件負責。
- Factory 先檢查既有能力目錄，再選擇重用、擴充、修復或新增。
- Worker 僅在任務契約、權限 allowlist、依賴、資源與風險明確後執行。
- 專業工作線驗證領域正確性；B 驗證產品整合與使用者成果。
- GPT3 在治理要求下獨立審查架構、整合、安全及交付證據。
- 發布與正式環境操作仍受相應核准、CI、回滾及部署政策約束。

### 18.5 A→B 契約與隔離原則

A→B 是明確版本化的技術交接，不是權限合併：
- A/Factory 對外提供文件化、版本化、可驗證的 API／事件／資料契約與交付證據。
- B 透過核准介面使用 Factory 能力，不直接操作 Factory 私有資料、Lease、Runner、Sandbox、Secrets 或內部狀態。
- B 的產品需求不得繞過 Factory 權限政策；Factory 的內部技術決策也不得未經 B owner 同意改變產品行為。
- 契約變更必須有相容性分析、版本策略、測試與回滾方案。
- Factory 未通過階段驗收前，不得宣稱 B 已取得完整自主執行能力或直接連接生產級 Runtime。

### 18.6 Factory 成熟後的資源與優先級

當前階段維持 Factory-first：
1. P0：Factory 核心可靠性、Worker／Engine／Tool 能力缺口、真實任務閉環與安全性。
2. P1：阻塞 Factory 或 B 的必要 A→B 契約與技術銜接；B 產品需求、規格及可驗收準備。
3. P2：由真實產品需求驅動的 F–P 專業能力建設。
4. DEFER：沒有 owner、使用者價值、依賴證據或資源依據的重複支線與平行基礎設施。

Factory 通過真實端到端任務、獨立 QA、恢復、資安與容量驗收後，資源配置才可逐步轉為 Factory 維運與 B 產品交付並行；不得僅憑文件或模型接通宣稱已成熟。

### 18.7 治理與衝突處理

- 每項任務只能有一個最終 DRI；必要時可有多位 contributors，但不可模糊最終責任。
- 產品範圍與使用者體驗由 B owner 決策；Factory 架構與工程實作由 A–E owner 負責；領域規格由對應 F–P owner 負責；獨立審查由 GPT3 負責。
- 跨線衝突先依已核准的 Master Charter、正式 owner 範圍、契約與證據處理；無法解決時建立 Issue／ADR，記錄選項、風險與決策者，不得以多數 Agent 投票取代權責。
- 不得私下假設 GPT 之間即時通訊；跨對話協作以 GitHub Issue、PR、review、handoff、CI 與正式文件為共享證據。
- 任何工作線不得因 Factory 強大而失去其正式 owner 責任；也不得因工作線存在而複製 Factory 已有的共用能力。

### 18.8 強制執行與驗收

本章是 A–P 與 Factory 的共同協作規範。新任務、既有任務重排、跨線交接及架構調整都必須套用。每次執行需能回答：誰提出需求、誰是 DRI、屬於哪條線、Factory 能力是否已存在、採用 RUN／BUILD／UNBLOCK 哪種模式、由誰驗收、GPT3 是否需要獨立審查、交付證據在哪裡。

沒有 owner、範圍、契約或驗收者的任務不得進入執行；沒有證據不得標記完成；沒有獨立審查不得繞過既定驗收門檻。本章不自動變更任何 GPT 權限；若 Master Charter 仍為 PROPOSED，須經正式獨立審查與接受流程後才生效。

## 19. Factory F6–F12 自主生產能力升級總綱

### 19.1 最高目標

Factory 的成功標準是可重現、可審查、可恢復的真實軟體交付，不是 Agent 數量、模型品牌、架構圖或 Prompt 數量。Factory 必須逐步形成以下閉環：

`ISSUE → CONTEXT → PLAN → AUTHORIZE → IMPLEMENT → TEST → DEBUG / REPAIR → INDEPENDENT REVIEW → DRAFT PR → ACCEPTANCE → LEARN`

任何階段均須保留精確 repository、branch、commit SHA、run ID／attempt、任務狀態、權限依據、測試結果及可回滾證據。未執行、Pending、Skipped、Stale 或 SHA 不一致的檢查不得視為通過。

### 19.2 F6–F12 能力階段

F6–F12 是既有 F0–F5 基礎上的後續能力階段；它們是有依賴的工程里程碑，不是七條可同時無限制開工的平行支線，也不代表已經實作。

| 階段 | 建設目標 | 必要交付與驗收證據 |
|---|---|---|
| **F6 — Autonomous Developer Engine** | IDE 無關的自主開發引擎；能理解專案上下文、搜尋／讀寫 allowlist 檔案、使用受控終端與 Git、產生可審查差異 | 至少一個真實低風險 Issue 在隔離環境完成多檔案修改；完整命令／工具紀錄、diff、路徑政策測試、精確 SHA 與 Draft PR；不得取得主機秘密 |
| **F7 — Debug & Repair Engine** | 分類測試與建置失敗、定位根因、有限次修復及重測 | 可重現的失敗→診斷→修復→重測通過案例；加入故意植入缺陷、錯誤分類、修復回歸、最大重試／時間／成本停止條件測試 |
| **F8 — Worker Intelligence Orchestrator** | 依任務契約、能力、依賴、模型品質／延遲／成本及資源選擇 Worker、Engine、Tool 與執行順序 | 任務路由基準、選擇理由、資源預算、併發衝突測試、鎖定／取消／公平性／退避證據；先穩定單任務閉環再擴大平行度 |
| **F9 — Independent QA & Verification** | 獨立 Tester／Reviewer、精確 SHA 品質閘門及整合驗證 | 審查者與實作者身分／上下文分離；測試綁定同一 SHA；故意植入缺陷、測試偽陽性、缺失／過期 CI、審查者不可用等 Fail-Closed 測試 |
| **F10 — Persistent Project Intelligence** | 跨任務專案記憶、架構索引、ADR、缺陷／修復知識及依賴上下文 | 記憶來源、時間、SHA、可信度、owner、保留期限與刪除政策；檢索正確性、過期知識失效、跨任務隔離與敏感資料測試 |
| **F11 — Self-Improvement & Recovery** | 觀察 Factory 成效、診斷瓶頸、提出改進 PR，並強化 Runner／Worker 故障恢復 | 有前後 baseline 的改進實驗、獨立審查、回歸與回滾；Runner 重啟、Worker 中斷、重複事件、lease 過期、狀態讀回不一致等恢復證據 |
| **F12 — Production-Grade Factory** | 綜合驗證端到端交付、資安、容量、可用性、成本、可觀測性與營運準備 | 多輪真實任務 soak test、SLO／錯誤預算、容量與成本報告、威脅模型、事故演練、備份／恢復、回滾、獨立 QA 與正式營運核准 |

### 19.3 建設依賴與執行順序

1. 先守住 F0–F5 已有控制面、任務狀態、lease／fencing、隔離、工具與 Runner 基礎；先盤點實際程式碼及精確 SHA，不重寫已驗證能力。
2. F6 先在既有隔離邊界內完成單任務 Developer Engine；不得讓模型直接持有 GitHub 寫入憑證、主機秘密或生產憑證。
3. F9 的最低必要測試與獨立審查閘門必須在擴大自主寫入、修復或平行執行前到位；F6/F7 的早期試驗也必須使用現有必要品質門檻。
4. F7 在 F6 可重現執行與測試後建設；所有修復必須受次數、時間、成本、檔案範圍與回歸測試限制。
5. F8 僅在單任務流程穩定、狀態與衝突控制通過後增加調度及有限併發；不以增加 Worker 數量作為成果。
6. F10 在資料來源、權限、隱私、保留與刪除政策明確後建設；記憶只能作為上下文，不可凌駕最新 Repository／CI／owner 決策。
7. F11 必須以 F9 的獨立審查及可回滾流程為前提；Factory 不得自行擴張權限、修改驗收門檻或批准自己的改進。
8. F12 是整體驗收階段，不可用單次 smoke test、文件完成或單一成功 PR 代替長期可靠性證據。

### 19.4 跨階段品質、安全與資源要求

- **自主開發：** 每個任務沿用原始 Issue allowlist；路徑、命令、工具參數、輸出大小、程序、網路、CPU／RAM／GPU、時間及成本均須有界。
- **除錯修復：** 保留失敗原始證據；不得隱藏測試、刪除失敗案例、降低驗收標準或無限重試。
- **Worker 調度：** 單一任務單一 DRI；工作區隔離、檔案衝突檢測、lease／fencing、併發上限及公平性必須可驗證。
- **獨立 QA：** Developer 不得自我批准；審查者必須讀取實際差異並確認測試對應同一 SHA；審查不可用即停止。
- **專案記憶：** 採來源可追溯、版本化、最小必要、分層權限與資料生命週期；禁止將 secrets、憑證或無權存取的資料寫入長期記憶。
- **自我改善：** 只能產生受限分支／PR；不能自行合併、部署、修改分支保護、擴大 allowlist 或更改正式權限。
- **可靠性：** 任務狀態真相由受控控制面管理；Runner 不是唯一真相來源；恢復操作必須讀回並比對精確版本與 payload。
- **成本與效能：** 建立每任務成功率、首次測試通過率、修復成功率、人工介入率、排隊時間、執行時間、成本及資源使用 baseline；未量測前不得宣稱效率提升。

### 19.5 強制執行規則

- 以現有 Factory 能力盤點與真實阻塞為依據，每次只選一個最高優先且可驗收的下一步；不得同時啟動所有階段。
- 每階段建立 Issue／PR、單一 DRI、依賴、DoD、測試、精確 SHA、風險、回滾與獨立審查要求。
- 能重用就重用；能修補就不重寫；新增 Worker／模型／Runner／服務前必須提出能力缺口、基準數據、成本與維護理由。
- 若依賴、權限、Runner、CI 或 Reviewer 不足，標示 BLOCKED 並提供解除條件，不可繞過。
- 文件、架構圖、Prompt、模型可連線或合成測試均不能單獨證明能力已成熟。
- 本章是目標架構與工程執行規範；不自動啟用模型付費、增加 Runner、開放網路、授予新權限、合併 PR 或部署正式環境。Master Charter 的正式生效仍受其獨立審查與接受狀態約束。


## 20. Factory 自主能力六項橫向強化與全工作線協同執行令

本節是 §17–§19 的補強執行要求，必須與 F0–F12 階段閘門合併執行；不新增 GPT 席位；F13–F19 依第二階段路線圖分階段執行、不複製控制面，也不改變 Factory-first、A→B 邊界或 GPT3 獨立驗收權。

### 20.1 六項橫向核心能力（納入 F6–F12 驗收）

1. **全域專案理解（Project Intelligence）：** 在修改前建立可更新的 Repository 地圖，涵蓋目錄／模組、入口點、依賴圖、API／資料契約、資料庫 schema、測試、部署設定、owner、技術債與關鍵執行路徑。對每項變更列出受影響模組、相容性風險及需要執行的測試。資料必須可追溯到路徑、版本與 SHA；無法確認的部分標示 UNKNOWN，不得臆測。
2. **自主任務拆解與調度（Planning & Orchestration）：** 將目標拆成有唯一 DRI、依賴、修改 allowlist、資源預算、DoD 與停止條件的任務 DAG；依能力證據路由 Worker／Engine／Tool，處理鎖定、lease/fencing、取消、重試、優先級、公平性與衝突。先證明單任務可靠，再逐步開放並行。
3. **多層獨立驗證（Verification）：** 對需求、靜態分析、單元、整合、端對端、回歸、安全、效能及相容性採風險導向測試。Developer 不得自我批准；測試必須綁定精確 SHA 與實際 CI run/attempt。缺少測試、審查者、最新 CI 或證據時 Fail-Closed。
4. **自主除錯與有界修復（Debug & Repair）：** 從可重現失敗與日誌分類症狀、定位根因、產生最小修復、執行回歸並比較前後結果。設定最大重試次數、時間、成本與修改範圍；禁止無限修復迴圈、刪測試求綠或掩蓋失敗。無法安全修復時停止並提交診斷與人工處理條件。
5. **自我評估與受控能力進化（Evaluation & Evolution）：** 量測任務成功率、缺陷逃逸率、修復成功率、回歸率、人工介入率、延遲、成本、資源利用及恢復時間。改善必須有基線、可比較結果、獨立審查、分階段發布與回滾；模型不得自行更改驗收門檻或批准自身改善。
6. **安全治理與資源控制（Security & Resource Governance）：** Worker 使用隔離工作區、最小權限、路徑／命令／網路 allowlist、短期憑證與資源配額；具備審計、秘密遮罩、任務取消、隔離、備份及復原。模型不得持有不必要的 host／production secrets，不得自行提升權限、建立付費資源或觸發未核准支出。

### 20.2 Factory 能力證據登錄（Capability Evidence Registry）

每項 Worker、Engine、Tool、Runtime、Orchestration、QA、Memory、Recovery 能力都必須有唯一識別、owner、版本、適用範圍、狀態、證據與最後驗證時間。狀態統一為：

`PLANNED → IMPLEMENTED → TESTED → VERIFIED → ACCEPTED`

另可標記 `PARTIAL`、`BLOCKED`、`STALE`、`DEPRECATED`、`UNKNOWN`。狀態不得跳級；每次狀態轉換須附 repository、branch、精確 SHA、測試命令／結果、CI run/attempt、獨立 reviewer、限制與回滾資訊。文件存在、角色命名、合成測試或未執行的工作流程，不構成 VERIFIED／ACCEPTED 證據。證據過期、程式改版或依賴變動時，相關能力退回待重新驗證狀態。

### 20.3 全工作線協同與責任分配

- **GPT1／A–E：** 擔任 Factory 技術整合與核心能力建設主責；盤點現有系統、提出最小實作、維護 Factory 能力目錄與 A→B 安全輸出契約。
- **GPT2／F–P：** 各專業 owner 提供其領域的需求、規格、風險、測試案例及領域驗收；僅在 Factory 能力缺口或真實 P0/P1 阻塞時承接專業建設，不複製通用引擎。
- **GPT3：** 獨立審查架構、能力證據、故障注入、權限隔離、回歸、恢復及階段放行；不得由 Developer 或 GPT5 自評替代。
- **GPT4／B：** 維護產品目標、需求、UX、產品優先級與產品驗收；提供可驗證的產品需求及 A→B 契約需求，不直接控制 Factory 私有 Runner／Lease／Sandbox。
- **GPT5：** 提供外部技術情報、供應鏈／安全研究、基準與營運分析；僅在明確指派、路徑與權限受限的任務內執行，不接管 A–P owner 或 GPT3 QA。
- **專案負責人：** 對正式產品方向、預算、不可逆操作及需人類決策事項保留核准權。

所有角色透過 Repository 文件、Issue、PR、Review、CI 與正式 handoff 協作；不得假設 GPT 間存在未部署的私訊或背景通訊。每項任務只有一位 DRI 與一位主導 Developer，Reviewer／QA 必須獨立。

### 20.4 強制執行順序與當前工作令

1. 先讀取最新 main、PR #427、Issues、CI、Factory 程式與既有能力證據；不以聊天摘要或文件宣告代替現況盤點。
2. 建立「已存在／可重用／需修復／真正缺失」矩陣，標出每項能力 owner、依賴、狀態及精確證據；先 REUSE，再 EXTEND／REPAIR，只有具備 ADR、遷移及回滾證據才 REPLACE。
3. 以全域專案理解、能力證據登錄及安全單任務 Issue→Plan→Worker→Isolated Edit→Build/Test→Draft PR→Independent Review 作為最優先的端到端驗證。
4. 把六項橫向能力分配到既有 F6–F12 階段 DoD，不另起平行 roadmap；未達前置條件不得跳級或擴大並行。
5. GPT2 各線先提交可供 Factory 消費的領域規格與驗收案例；GPT4 提供 B 的產品／介面需求；GPT5 提供有來源的技術與風險情報；GPT1 整合執行；GPT3 獨立驗收。
6. 可在既有授權範圍內安全、可逆且證據充分的文件整理、測試、程式修復與 PR 準備工作，直接推進；遇到正式部署、合併政策、權限／Secrets、付費資源、不可逆資料操作或對外承諾，遵守既有核准閘門，不得因「全力執行」而越權。
7. 每輪交付回報完成項、未完成項、BLOCKED 原因、下一個最高優先級、精確 SHA、測試／CI 證據、風險與回滾。無證據一律標示 NOT RUN／UNKNOWN／BLOCKED，不得宣稱已完成。

**最高執行原則：全體工作線以 Factory-first 為當前共同優先級，合力補足真實能力缺口；不重造已有能力、不虛報完成、不削弱獨立 QA、不越權。**


### §21 七項橫向工程治理能力與最新補強之最高執行總綱

本節將最新提出的七項治理能力完整納入既有 Factory F6–F12，依 F13–F19 第二階段路線圖分階段建置，不建立重複引擎或 GPT 席位。它們與先前六項橫向能力（全域專案理解、任務拆解與調度、多層獨立驗證、有界除錯修復、自我評估與受控進化、安全治理與資源控制）共同構成 F6–F12 的跨階段 DoD。所有能力均須先盤點既有實作與證據，再 REUSE、EXTEND 或 REPAIR；只有 ADR、相容性、遷移、回滾及獨立審查齊備時才可 REPLACE。

#### 21.1 需求追溯與交付完整性（P0）
- 建立雙向追溯：需求／使用者問題 → 產品與技術規格 → Issue／Task → PR／Commit → 測試／CI → 獨立審查 → 接收線驗收。每筆需求有唯一 ID、來源、owner、優先級、狀態、依賴、驗收條件及證據。
- 每個 PR 必須列出需求 ID、變更範圍、風險、測試及驗收對應；測試案例回指需求。非需求型變更明確標記為缺陷修復、資安修補、技術債或核准重構。
- 需求改動時執行影響分析，涵蓋模組、API、schema、事件、文件、測試、部署、相依工作線及已承諾交付；記錄決策、版本與未完成項。
- 驗收：抽樣需求可由來源追到實作、測試和接收決策，也可由程式與測試反查需求；缺少驗收證據不得標 ACCEPTED。

#### 21.2 架構治理與技術債管理（P0）
- 維護可更新的模組／服務／API／資料表／事件／外部依賴／部署單元／owner 地圖；分析依賴方向、循環依賴、重複實作、孤兒模組、過期介面、耦合、變更影響面及風險。
- 技術債紀錄須含位置、成因、影響、嚴重度、修復成本、owner、期限與處置方案；優先處理安全、資料正確性、可靠性及實際交付阻塞，不為美化而全面重寫。
- 重構採小步、相容性優先、特徵測試、回歸與可回滾策略；不得任意刪除 API、資料欄位、舊路徑或測試以掩蓋問題。
- 驗收：架構地圖對應當前 repository；高風險依賴與技術債有 owner 和決策；重構具行為前後比較及回歸證據。

#### 21.3 測試環境與測試資料可靠性（P1）
- 明確隔離開發、測試、預覽及正式環境；記錄 runtime、依賴、設定來源、schema 與 feature flag 版本，檢測環境漂移。
- 測試資料優先使用合成或去識別資料，具版本、初始化、隔離、清理與重建方式；禁止未經核准直接對正式資料執行測試或破壞性操作。
- 支援可重現測試、失敗重播、故障注入、備份還原演練；將 flaky test、環境故障、供應商故障與產品缺陷分開分類。
- 驗收：另一位工程師可依文件重建環境並重現結果；測試不污染正式資料；環境及資料故障具可診斷紀錄。

#### 21.4 軟體供應鏈與第三方依賴安全（P1）
- 盤點直接與傳遞套件、版本、來源、授權、維護狀態、已知漏洞及惡意套件風險；條件允許時產生 SBOM，掃描結果綁定候選 SHA。
- 對外部 API、模型供應商、CI Actions、容器映像與部署服務記錄 owner、權限、資料流、費率／預算、健康狀態、相容性、替代與降級策略。
- 高危漏洞、來源不明套件、授權衝突或供應商重大事故須阻擋受影響發布或採取隔離降級；例外必須有風險接受者、期限、補償控制與稽核記錄，不得隱藏告警或擅自降低掃描門檻。
- 驗收：關鍵依賴來源與版本可追溯；高風險項目有處置 owner／期限；發布候選附掃描證據與核准例外。

#### 21.5 效能、資源與成本最佳化（P2）
- 先建立基準，再分析 API 延遲、資料庫查詢、前端載入、Worker 利用率、模型 token／呼叫費用、快取命中、重試浪費與閒置資源。
- 每項最佳化提案列出基準、量測方法、樣本範圍、預期收益、品質風險、成本、回歸測試與回滾方式；以相同條件比較，避免單次樣本誤判。
- 不得自行採購模型、Runner、雲端資源或開啟付費 API；須先有明確預算與專案負責人核准。節省成本不得以降低安全、資料正確性或驗收門檻換取。
- 驗收：效能／成本改善可重現、可比較，且無品質、安全或可靠性退化。

#### 21.6 發布、災難復原與營運韌性（P2）
- 建立版本、變更摘要、相容性、資料遷移、部署前檢查、發布後健康觀測、事故回報、回滾及復原流程；可行時採分階段／Canary 發布。
- 定義備份範圍、保留政策、復原責任人、RPO／RTO 目標與演練紀錄；備份存在不等於可復原，必須定期實際還原驗證。
- 生產部署、DNS／權限、資料遷移、對外服務切換及不可逆操作，除非專案負責人明確授權，不得由任何 GPT 或 Factory 自行執行。
- 驗收：候選版本具發布與回滾計畫；復原流程經演練；發布後監控與事故責任清楚。未獲授權時只交付候選與操作計畫，不宣稱已發布。

#### 21.7 人類決策與自主權治理（P1，跨階段強制）
- 每項工作標記自治等級：A0 僅觀察／建議；A1 可讀取與規劃；A2 可在隔離環境修改及測試；A3 可建立候選 PR；A4 合併／部署／權限／付費／不可逆操作一律需明確核准。不得因任務緊急或「全力執行」而自動升級。
- GPT4／B 決定產品需求與產品方向；GPT1／A–E 負責 Factory 技術方案與執行；GPT2／F–P 對領域規格與領域驗收負責；GPT3 獨立架構／安全／整合／QA 審查；GPT5 提供可追溯研究、風險與量測支援；專案負責人保留預算、正式發布、權限與不可逆操作核准。
- 資訊不足、來源衝突、風險超界或決策權不明時，必須標示 UNKNOWN／BLOCKED，列出證據、選項、影響與所需決策者；不得猜測代替決策。
- 所有核准須留下 Issue／PR／ADR 記錄、核准者、範圍、期限與撤銷條件；GPT3 不得審查自己主導的變更。

#### 21.8 與 F6–F12 的整合矩陣
- F6 Developer Engine：專案理解、需求追溯、變更影響分析、架構地圖、任務拆解、隔離單任務修改。
- F7 Debug & Repair：可重現環境、測試資料治理、根因分析、修復、回歸及依賴風險辨識。
- F8 Orchestrator：任務 DAG、DRI、Worker 路由、環境配額、成本預算、鎖定、取消、有限重試與安全並行。
- F9 Independent QA：需求覆蓋、靜態／單元／整合／E2E／回歸／安全／效能測試、供應鏈掃描、精確 SHA、獨立審查與 Fail-Closed。
- F10 Project Intelligence：版本化需求、ADR、架構圖、技術債、依賴 SBOM、測試環境、決策與證據記憶；支援來源、可信度、過期及刪除治理。
- F11 Self-Improvement & Recovery：基線量測、效能成本改善提案、發布後指標、復原演練、受控改善 PR、獨立審查及回滾。
- F12 Production-Grade Factory：完整需求到交付追溯、供應鏈／威脅模型、容量成本、發布／災難復原、營運演練及人類授權治理的端到端驗收。

#### 21.9 執行優先級、責任與共同交付
1. P0：需求追溯與架構／技術債盤點，與既有 F0–F5 及 F6 單任務閉環整合。
2. P1：測試環境／資料可靠性、供應鏈安全、人類決策與自治等級治理；不得在獨立 QA 尚未成立前擴大自動寫入或並行。
3. P2：效能成本最佳化、發布與災難復原；以基準、預算與演練證據啟動。
4. GPT1／A–E 是 Factory 建設與整合 DRI；GPT2／F–P 提供領域需求、案例、風險及領域驗收；GPT3 獨立驗收；GPT4／B 提供產品需求與產品驗收；GPT5 提供有來源的技術／安全／供應鏈情報與經指派支援。每個 Issue 只能有一位 DRI 與一位主導 Developer。
5. 所有跨 GPT 工作透過 GitHub Issue、PR、Review、CI、ADR、handoff 留下可見記錄；不得假設 GPT 之間有未部署的私訊、背景執行或自動通知。

#### 21.10 通用證據、停止與放行規則
每項能力使用 PLANNED → IMPLEMENTED → TESTED → VERIFIED → ACCEPTED 狀態，並可標 PARTIAL／BLOCKED／STALE／UNKNOWN／DEPRECATED。每次狀態變更必須綁定 owner、版本、repository 路徑、精確 SHA、測試命令與結果、CI Run ID／Attempt、獨立 reviewer、限制、風險及回滾。文件宣告、概念圖、模擬測試、過期 CI 或不同 SHA 的結果不能證明 runtime 已驗收。缺證據標 NOT RUN／UNKNOWN；阻塞標 BLOCKED 並列出解除條件。不得自我核准、刪測試、無限重試、擴權、洩漏 Secrets、超出 allowlist、私自付費、合併、部署或執行不可逆資料操作。

**全體 GPT 的共同命令：Factory-first、證據優先、保留既有可用成果、補足真實瓶頸、以安全單任務端到端閉環為第一驗收目標；各線提供專業能力與決策，不另造重複工廠。**

---

## 22. Factory F13–F19 第二階段自主智慧生產與全球協作最高總綱

## F13–F19 第二階段自主智慧生產與全球協作路線圖

F13–F19 是 F12 生產級 Factory 完成獨立驗收後的擴展階段。F0–F12 是安全、可重現、可驗收的自主工程生產基礎；F13–F19 在此基礎上擴展研究情報、產品組裝、跨智能體協作、營運智慧、模型生命週期、能力生態系與全球智慧網路。不得把本路線圖視為現況已部署，也不得跳過前置階段。各階段仍遵守 Factory-first、A→B 版本化契約、單一 DRI、最小權限、GPT3 獨立審查及人類核准邊界。

### F13 — Research & Intelligence Engine｜研究與情報引擎
**目的與範圍：** 將可信外部資料、研究文件、技術規格、專案內部知識與即時變動訊息轉化為可追溯、可更新、可比較的結構化情報。涵蓋來源連接器、擷取與解析、去重、語意索引、實體／主張抽取、來源可信度、時間有效性、版本差異、衝突偵測、證據鏈及研究報告生成。每項重要主張須保留來源、擷取時間、版本／快照、引用位置、信心與限制；模型生成不得偽裝成來源事實。
**執行與安全：** 先建立來源 allowlist、資料分類、授權／著作權檢查、個資與秘密遮罩、保留期限及刪除傳播。外部內容一律視為不可信資料，不得當成系統指令。來源不可用或內容過期時標記 STALE／UNKNOWN，不得靜默沿用。
**DoD：** 至少完成一條端到端研究任務：來源登錄→擷取→解析→去重→索引→主張與引用→交叉核對→研究輸出→來源失效／更新測試；獨立人員可從報告反查原始證據並重建結果。量測來源覆蓋率、引用完整率、過期率、衝突檢出率、錯誤主張率與處理成本。GPT3 對來源可信度、資料安全、提示注入防護及可重現性獨立驗收。
**前置／停止：** F12 ACCEPTED；F10 專案記憶及 F9 獨立驗證可用。無授權來源、無法保留證據鏈、資料分類不明或發現提示注入未隔離時，該來源／任務 BLOCKED。

### F14 — Product & Solution Assembly Engine｜產品與解決方案組裝引擎
**目的與範圍：** 將已核准需求、F13 情報、設計系統、API／資料契約及已驗證 Factory 能力組裝成可交付產品或解決方案。提供需求拆解、方案比較、架構／UX 藍圖、可重用模組與模板選擇、前後端及資料整合、遷移計畫、文件、測試矩陣與交付包。不得複製已存在的核心服務；優先 REUSE、EXTEND、REPAIR。
**執行與安全：** 產品 owner（B／GPT4）決定產品目標、需求優先級、UX 與產品接受條件；Factory 只依核准規格產生候選變更。對外部服務、付費 API、正式資料、正式部署、法規或高風險功能，先提出成本／風險／替代方案並等待授權。
**DoD：** 由一份核准需求產生可追溯的架構決策、UX 流程、模組清單、API／資料契約、Issue DAG、實作 PR、測試與發布候選包；需求到程式／測試雙向追溯完整，整合測試及回歸通過，產品 owner 與 GPT3 分別完成產品及技術驗收。以交付週期、需求覆蓋率、重用率、缺陷逃逸率及變更回滾率量測。
**前置／停止：** F12 ACCEPTED 且 F13 能提供可追溯情報；需求、資料權利、產品 owner 或接受條件缺失時不得自行補猜，標記 BLOCKED。

### F15 — Federated Multi-Agent Collaboration Engine｜聯邦多智能體協作引擎
**目的與範圍：** 讓不同 GPT、Agent、專案或受信任節點能以標準化任務契約協作。包括 Agent 身分與註冊、能力宣告、版本化協定、任務委派、回覆／事件格式、來源與責任追蹤、信任評估、跨節點工作流、超時／重試／取消、衝突處理及撤銷機制。協作以共享 Issue、PR、Review、CI、handoff 或經核准 API 為準，不假設模型之間具有私訊或隱性共享記憶。
**執行與安全：** 採零信任節點模型；每個節點獨立驗證身分、任務範圍、資料分類及工具權限。採短期憑證、簽章事件、重放防護、租約／fencing、速率與成本配額、資料最小化及可撤銷委派。外部 Agent 的輸出必須視為未驗證輸入，不能直接取得上游權限。
**DoD：** 先以兩個隔離測試節點完成可重現的委派、狀態追蹤、結果驗證、逾時取消、節點失聯、重放／偽造請求拒絕、權限撤銷與稽核；每個工作均可追溯委派者、執行者、資料範圍、工具、成本與產物 SHA。GPT3 獨立驗收身分、隔離、協定相容性與故障模式。
**前置／停止：** F12 ACCEPTED；F9 QA、F10 記憶治理及 F17 人類決策治理的基礎政策已建立。節點身分、授權或稽核不完整即拒絕委派；不得將聯邦協作等同於信任所有節點。

### F16 — Operations & Business Intelligence Engine｜營運與商業智慧引擎
**目的與範圍：** 把產品、Factory 與經授權業務流程的事件資料轉化為營運可觀測性、KPI、異常偵測、趨勢分析、容量／成本預測、流程瓶頸分析及決策建議。支援事件字典、資料品質檢查、指標語意層、儀表板、告警、工作流建議及可審核的行動草案。不得把相關性描述為因果，也不得以未經驗證的模型評分作為唯一決策依據。
**執行與安全：** 僅讀取明確授權的資料來源；遵守用途限制、最小化、去識別化、租戶隔離、保存期限與存取稽核。預設只讀與建議模式；對外通知、付款、人事、客戶資料修改、商業承諾等行動必須由有權人員核准。
**DoD：** 至少建立一個經資料 owner 核准的端到端指標流程：資料字典→品質／完整性檢查→指標計算→基準與異常→來源追溯→儀表板／報告→告警演練；指標可重算，資料延遲與缺失可見，錯誤輸入不會靜默產生錯誤決策。以資料新鮮度、完整率、指標重算一致性、告警精確率／召回率及建議採納後成效量測。
**前置／停止：** F12 ACCEPTED、F13 情報來源治理及 F17 決策權限政策可用。沒有資料 owner、合法用途或指標定義時不得接入；未經授權不得執行寫入或外部行動。

### F17 — Model Lifecycle & Continuous Evaluation Engine｜模型生命週期與持續評估引擎
**目的與範圍：** 管理模型／供應商／提示模板／工具策略的版本、評估、路由、漂移、成本與退役。建立固定且版本化的基準資料集、任務分層評估、品質／安全／偏差／延遲／成本指標、紅隊測試、模型比較、灰度候選及回滾能力。所有評估須記錄模型版本、參數、提示版本、工具版本、資料集版本與執行環境。
**執行與安全：** 模型自動選擇只能在已核准候選清單、資料分類與成本上限內進行；不可將敏感資料送往未核准供應商。模型或提示變更不得自行放寬安全政策、驗收門檻或權限。評估集需防止資料洩漏與過度擬合，保留人工抽查與獨立紅隊。
**DoD：** 對至少兩個核准候選建立可重現 benchmark、品質／安全／成本比較、路由規則、漂移告警、灰度驗證與回滾演練；每次升級須有基準差異、非劣化門檻、審核紀錄及精確版本。GPT3 獨立檢查評估有效性與安全回歸，模型／供應商 owner 核准正式切換。
**前置／停止：** F9、F10、F12 ACCEPTED；F13 提供合法評估資料，F17 自身不得自我核准。評估資料不足、品質顯著退化、成本超限、供應商條款不明或安全測試失敗時停止升級並回退已接受版本。

### F18 — Capability Ecosystem & Extension Marketplace｜能力生態系與擴充市集
**目的與範圍：** 將經驗證的 Worker、Skill、Tool、Connector、Workflow、Template 與模型適配器以可發現、可版本化、可安裝、可撤銷的方式管理。包含能力目錄、metadata／schema、相依性、相容性、來源簽章、授權條款、版本鎖定、沙箱測試、權限 manifest、安裝／更新／移除、棄用政策及稽核。市集可以先是內部登錄與審核目錄，不要求立即公開或商業化。
**執行與安全：** 預設拒絕未簽章或來源不明的擴充；每項擴充採最小權限 manifest、隔離執行、資源配額、網路／檔案 allowlist、SBOM、漏洞掃描及撤銷開關。不得因安裝擴充而自動取得秘密、正式環境或其他 Agent 的權限。
**DoD：** 完成至少一項內部擴充的登錄、簽章／來源驗證、相依性鎖定、沙箱測試、權限審查、安裝、版本更新、回退及撤銷全流程；未授權擴充須被拒絕，稽核可追蹤版本與使用者。GPT3 獨立驗收供應鏈、隔離與權限邊界。
**前置／停止：** F12 ACCEPTED；F13 來源追溯、F15 節點身分與 F17 模型／能力評估規則已可用。授權、來源、相依性或安全掃描不完整時不得安裝或執行。

### F19 — Governed Global Intelligence Network｜受治理的全球智慧網路
**目的與範圍：** 在 F13–F18 已分別驗收後，整合研究情報、產品組裝、聯邦 Agent、營運智慧、模型生命週期與能力生態系，形成可跨專案／組織／地區協作的全球智慧網路。提供聯邦目錄、跨域任務協調、資料與能力交換契約、來源／貢獻歸屬、政策傳播、版本相容性、可觀測性、韌性及治理稽核。採模組化、可退出、可替換架構，避免單點控制與供應商鎖定。
**執行與安全：** 不假設不同司法管轄區可自由共享資料；每個參與方自行定義資料主權、同意、用途、保存與撤回條件。跨域只交換明確授權的最小資料／結果；需要時採聚合、去識別化或本地運算。任何物理世界、金流、法律承諾、醫療／人事等高風險行動仍須由具權責的人類核准。系統不得自行擴權、建立不可撤銷代理或規避治理。
**DoD：** 先以受控沙箱中的至少兩個獨立節點完成跨域任務：身分／信任建立→政策協商→授權資料交換→任務委派→來源與產物驗證→獨立審查→撤銷／退出→稽核重建；演練節點故障、資料撤回、政策不相容、密鑰輪替及災難復原。只有所有節點可獨立退出、資料使用可追溯、失敗可隔離且 GPT3 獨立驗收後，才可擴大試點。
**前置／停止：** F13–F18 全部 ACCEPTED，F12 持續符合生產級 SLO／安全門檻。任何節點未經授權、資料主權不清、無法撤銷、無法稽核或故障會跨域擴散時，停止該連線／任務，不得以全球網路目標凌駕參與者權利。

### F13–F19 共同治理、排序與驗收規則
1. **階段閘門：** F12 ACCEPTED 是 F13–F19 正式建置入口；F13→F14/F15/F16；F15 與 F17 是 F18 的必要前置；F13–F18 全部 ACCEPTED 才能進入 F19 受控整合。可做不涉及生產權限的研究／原型，但不得宣稱正式階段已通過。
2. **建議優先順序：** F13 研究情報 → F14 產品組裝 → F15 聯邦協作 → F16 營運智慧 → F17 模型生命週期 → F18 能力生態系 → F19 全球網路。依賴或風險證據可調整單一工作包順序，但不得跳過 gate。
3. **每階段必要工件：** GitHub Issue、唯一 DRI、目標／非目標、依賴圖、威脅模型、資料／權限分類、ADR、DoD、測試矩陣、精確 commit SHA、CI run／attempt、指標基準、風險、回滾／撤銷方案、GPT3 獨立審查及領域／產品 owner 接受紀錄。
4. **證據狀態：** PLANNED → IMPLEMENTED → TESTED → VERIFIED → ACCEPTED；缺證據為 BLOCKED／NOT RUN，過期為 STALE。文件、示意圖、模型自述、合成測試或未綁定 SHA 的結果不能升級狀態。
5. **責任：** GPT1/A–E 主責 Factory 架構與實作；GPT2/F–P 提供各領域規格、風險案例與領域驗收；GPT3 獨立架構、安全、整合與 QA，不得審查自己主導的實作；GPT4/B 決定產品方向、需求、UX 與產品接受；GPT5 提供可引用研究、外部技術／供應鏈情報與授權範圍內支援。每個 Issue 仍只有一個 DRI。
6. **人類核准：** 合併、正式部署、付費資源、憑證／權限變更、正式資料寫入、外部承諾及不可逆操作依專案 owner 與政策明確核准；本路線圖本身不授權任何上述行為。
7. **停止條件：** 安全／隱私事件、資料權利不明、身分或權限不符、成本超限、無法重現、測試／CI 失敗、審查缺席、回滾不可行或依賴未達標時，停止受影響工作包並回報 BLOCKED，列出解除條件。
8. **Factory-first：** 所有能力先盤點既有元件，REUSE→EXTEND／REPAIR→（具 ADR 才）REPLACE；不得為了階段數量增加 GPT 席位、重複服務、模型、Runner 或付費資源。每一階段以真實任務閉環及量測證據驗收。
