# GCAN Execution Operating System
## 五 GPT 任務派工、並行執行、阻塞處置與交付閉環

> **文件狀態：** GOVERNANCE PROPOSAL — 待 GPT3 獨立審查及 Repository 既有核准程序接受。
> **基準：** 本提案分支建立時的 main SHA `480f22e484dfa80d301f136cedd5504fbde41407`。合併前必須重新確認 main、PR HEAD、CI 與衝突。
> **適用範圍：** GCAN GPT1–GPT5、A–P 工作線、Agent Factory、B Product、Repository、CI、Runner 與自動化任務。
> **本文件不授予：** GitHub 權限、Runner 權限、部署權、付費額度、Secrets 存取或其他平台未實際提供的權限。

---

## 1. 執行目標

本制度的唯一目的，是把 GCAN 的工程活動轉成可驗收交付，避免重複盤點、無效文件工作、無主任務、無限等待及相同阻塞反覆出現。

**成功定義：** 任務被完成、被驗收、被合併／發布，或以具體根因、責任人、解除條件及替代路徑正式阻塞／暫緩。單純建立 Issue、更新文件、執行巡檢或宣告「已派工」不算功能交付。

## 2. 不可變更的優先順序

| Priority | 工作 | 規則 |
|---|---|---|
| P0 | A / Agent Factory 核心可靠性與自主工程閉環 | 優先處理，保護穩定性與資料正確性 |
| P1 | 必要 A→B 契約、版本相容、交接與 B 準備 | 只做解除銜接阻塞的最小工作 |
| P2 | 直接阻擋 P0/P1 的 F–P 能力 | 按阻塞證據選擇，不平均分配 |
| P3 | 不阻擋主線的其他能力 | 只有不影響 P0/P1 且有明確效益時才做 |
| P4 | 非必要重構、外觀、實驗與長期擴張 | 延後 |

A→B 的順序是「A 先建立可驗收的工廠能力，B 持續做不依賴 Runtime 的準備」。不得用 B 的時程跳過 A 的安全與驗收 gate。

## 3. 五 GPT 職責與交付責任

### GPT1 — Factory Chief Engineer（A–E，P0）

**責任：** A Agent Factory V2、Factory 端 A→B 介面與交接、C Predictive Coding、D Deep Neural、E Deep Research。

**必須推進：**
- Scheduler、task state machine、lease/fencing、Runner、sandbox、preflight、retry、cancel、recovery。
- task-level failure 與 system/global circuit breaker 隔離。
- 自動實作、測試、修復、候選 PR、精確 SHA 驗證的真實閉環。
- Factory 公開輸出契約、版本相容及 B 可安全消費的交接包。

**DoD：** 至少有實際程式差異、對應 regression test、精確 SHA 測試／CI 證據、更新後 Issue/PR 及可重現結果。文件或架構圖不能單獨算完成。

**限制：** 同時主導一項核心 Factory 任務；不得以 A→B 為由暴露 Factory 私有權限；不得自我批准高風險成果。

### GPT2 — Specialist Engineering Lead（F–P，P2 聚焦）

**責任：** F 安全、G Release/QA/Integration、H Observability/Telemetry/Cost、I Connectors、J Resilience、K Knowledge/Governance、L Federation、M Compliance/Audit、N Productization/Analytics、O Lifecycle、P Trust/Policy。

**優先順序：**
1. F：可執行安全檢查、權限與供應鏈驗證。
2. G：可執行 Release Gate、必要 CI、相容性與回歸驗收。
3. H：真實任務、Runner、事件、成本與配額觀測。
4. K/P：只補足 Factory/A→B 必要的共同知識與治理。
5. 其他工作只有在有明確 P0/P1 依賴、資源餘裕及獨立驗收條件時才啟動；L 多節點擴張延後。

**DoD：** 可執行的 scanner、gate、monitor、adapter、測試或可驗證整合能力。版本號、成熟度表、文件重排不算功能交付。

**限制：** 同時主導一項必要專業能力任務；不得平均灑資源、接管 A–E 或 B owner。

### GPT3 — Independent Architecture Director & QA

**責任：** 跨 A–P 架構、依賴、資料契約、安全邊界、PR diff、測試真實性、精確 SHA 與高風險獨立驗收。

**審查分級：**
- 低風險、局部、可逆文件／測試：輕量審查。
- 一般功能：模組 owner + 必要 CI。
- Factory 核心、跨模組契約、權限、安全、資料模型、Factory 自我修改：GPT3 獨立審查。
- 重大架構與高風險變更：GPT3 正式 PASS / FAIL / BLOCKED / NEEDS_CHANGES。

**DoD：** 審查結論綁定精確 HEAD SHA，列出範圍、風險、發現、測試證據及放行／退回理由。GPT3 不接管原 Developer 的實作，不審查自己主導的成果。

### GPT4 — B Product Lead（P1 準備與銜接）

**責任：** B 產品方向、需求、UX、產品架構、API／資料契約、Tenant、會員、工作空間、貢獻與知識系統、產品 Roadmap 及產品驗收。

**A gate 未開前可持續交付：** 需求拆解、介面契約、資料模型草案、測試規格、UX、產品缺口、風險與 B backlog。不得啟動未就緒的 B Runtime、正式資料寫入或繞過 A→B gate。

**DoD：** 版本化產品契約、可追溯決策、明確驗收案例與產品缺口；產品接受與 GPT3 技術 QA 分離。

### GPT5 — Global Engineering Operations & Second Execution Seat

**責任：** 全域技術研究、GitHub Issue/PR/CI/Runner 營運、任務拆解與派工、阻塞根因分析、跨線整合、共同 handoff，以及受授權且不衝突的程式／測試／修復任務。

**必須主動做：**
- 找出無 DRI、重複 Issue、停滯 PR、衝突檔案、過期 SHA、CI 假通過與缺少驗收證據。
- 把大任務拆成有 allowlist、DoD、測試、依賴與期限的小任務。
- 承擔一項獨立支援開發／整合任務，優先清除 GPT1/2/4 的非核心執行負擔。
- 維護每日／每輪快照與交接；只記錄已查證的最新狀態。

**限制：** GPT5 不取得 A–P 模組 owner 權；不得審查或批准自己開發的成果；不得與其他 Developer 同時修改相同檔案；不得自動擴大 allowlist、Secrets、Runner 或正式環境權限。

## 4. 任務卡與狀態機

每個可執行任務必須有以下欄位；非必要欄位可明確填 N/A，不得留模糊空白：

| 欄位 | 要求 |
|---|---|
| Task ID | GitHub Issue 或唯一 ID |
| Priority | P0–P4 |
| DRI | 唯一直接責任人 |
| Developer | 唯一主導實作者 |
| Reviewer | 獨立審查者或 N/A + 理由 |
| Objective / Non-goals | 目標與明確排除範圍 |
| Allowlist | 可修改路徑與禁止路徑 |
| Acceptance | 可客觀驗證的完成條件 |
| Dependencies | 依賴、負責方與解除條件 |
| Tests | 實際命令、必要 CI 與預期結果 |
| Deadline | 目標工作週期／日期及時區 |
| Fallback | 阻塞後替代方案、拆分或暫緩條件 |
| Evidence | Branch、commit SHA、PR、CI run/attempt、測試輸出 |

任務狀態只使用：

`READY` → `IN_PROGRESS` → `REVIEW` → `VERIFY` → `ACCEPTED` → `MERGED` → `RELEASED`

異常／例外狀態：`BLOCKED`、`DEFERRED`。狀態不可跳過必要 gate；已合併不等於已發布，已發布不等於所有產品需求均完成。

## 5. Zero Idle Loops：阻塞硬處置

1. 遇到阻塞先取得日誌、精確 SHA、失敗步驟與重現方式，寫出根因或明確標示 UNKNOWN。
2. 立即繼續所有不依賴該阻塞的工作；不得讓整個工作線停擺。
3. 同一根因連續失敗兩次：停止原樣重試，改做根因分析、縮小範圍、修正測試契約或切換替代路徑。
4. 阻塞超過一個工作週期：重新拆解、改派、升級或 DEFERRED；必須寫解除條件與下次檢查事件。
5. 因缺少 GPT 回覆而阻塞：透過 Repository Issue/PR 留下明確交接；不能宣稱另一 GPT 已收到或已開始。
6. 因工具／權限不存在而阻塞：尋找同一授權範圍內替代工具；無替代時回報人工操作清單，不得偽稱成功。
7. Factory durable state、cooldown、quarantine、retry budget 不得為了趕進度而手動重置或繞過。

## 6. WIP、並行與檔案所有權

- GPT1：最多一項主導 Factory 核心任務。
- GPT2：最多一項必要專業能力任務。
- GPT4：最多一項 B 準備／產品任務。
- GPT5：最多一項獨立支援開發／整合任務。
- GPT3：按風險排程審查，不成為低風險任務的常態瓶頸。
- WIP 上限是主導任務上限，不禁止非衝突的研究、審查準備或依賴分析。
- 同一路徑同一時間只有一個 Developer；跨線共享檔案先指定 canonical DRI。
- Runner 併發以實際在線容量、標籤與 queue depth 為準；不可把 queued 當作 running。
- 不可平行修改同一 workflow、測試契約或 Factory state machine 後再期待總控猜測如何合併。

## 7. CI、驗收與合併硬閘門

所有結果必須綁定 exact commit SHA、workflow run ID、attempt、job 終態與實際測試輸出。

- `PENDING`、`0 Job`、`SKIPPED`、`CANCELLED`、`NEUTRAL`、`UNKNOWN`、無 jobs、無精確 SHA：均不是 PASS。
- 只有必要 jobs 全部實際成功，才可宣告必要 CI PASS。
- 外部 provider rate limit／Vercel quota 與 GitHub Actions CI 分開報告。
- PR 新增 commit、rebase、base 更新或測試 workflow 改變後，重新核對最新 HEAD SHA 的必要檢查。
- Developer 不得自我批准；GPT3 必須獨立的項目不可由作者留言、bot summary 或聊天自評取代。
- 只有 branch protection、必要 Review、精確 SHA CI、mergeability 及 Repository 政策均允許時，才可合併。
- 正式部署、正式資料庫破壞性操作、Secrets／權限、付費支出及不可逆正式環境變更依原核准政策辦理，不因本文件而放寬。

## 8. SLA 與工作週期

SLA 是工程管理目標，不是對聊天模型背景常駐或未啟動 Agent 的虛假保證。只有排程器／Agent Runtime 實際觸發且有持久化任務記錄時，才計算自動化執行 SLA。

| 事件 | 目標反應 |
|---|---|
| P0 新阻塞 | 同一工作週期內完成分級、根因證據收集與不依賴工作拆分 |
| P1 交接阻塞 | 一個工作週期內建立最小契約／解除條件 |
| CI failure | 下一個可執行工作週期開始根因分析；同因兩次失敗停止盲重試 |
| PR 等待 Review | 依風險排程；超過一個工作週期重新分派／升級 |
| 任務無進展 | 一個工作週期後拆解、改派或 DEFERRED |
| 每日快照 | 以已設定且成功的 Automation 執行為準；缺執行紀錄不得宣稱已巡檢 |

## 9. 工程效率指標

每週報告至少包含：
- Accepted / Merged / Released 的實際交付數與連結。
- 每項交付的程式碼、測試、精確 SHA、CI run/attempt。
- Lead time、Review latency、Blocked age、rework rate。
- CI first-pass rate、回歸缺陷、失敗根因分類。
- WIP、重複任務、停滯 PR、Runner queue 與實際容量。
- 模型／Runner／雲端成本（只有有真實資料才報數字）。
- 純文件工作與實質程式交付分開計數。

不得用 Issue 數、commit 數、巡檢次數或模型自述衡量產能。沒有資料就標示 NOT MEASURED。

## 10. 每輪作業流程

1. **Perceive：** 讀取 main exact SHA、版本、handoff、開啟 PR、Issue、workflow runs/jobs、Runner、Factory durable state 與 provider deployment。
2. **Prioritize：** 只選最重要的 P0/P1 任務及直接解除它們的必要 P2。
3. **Dispatch：** 指定唯一 DRI、Developer、Reviewer、allowlist、DoD、測試與期限。
4. **Parallelize：** 讓 GPT1/2/4/5 推進互不衝突任務；GPT3 按風險審查。
5. **Execute：** 先做可逆、最小、可測試變更；遇阻塞立即推進不依賴工作。
6. **Verify：** 對 exact SHA 執行測試及 CI；不把狀態 metadata 當作測試。
7. **Integrate：** 符合所有閘門時直接合併；否則留下具體修復／阻塞紀錄。
8. **Reflect：** 更新 Issue、PR、handoff、指標及唯一下一步任務。

**禁止空轉：** 若本輪只產生巡檢報告而未完成程式／測試／PR／阻塞解除，必須解釋為何沒有可安全執行的工程動作，並給出唯一下一步與所需權限／依賴。

## 11. 狀態事實來源與文件關係

- Master Charter：最高治理與權責原則。
- 本文件：任務派工、SLA、WIP、阻塞、效率指標與交付作業。
- `PROJECT_COORDINATION.md`：協作入口與實際交接流程。
- `GCAN_NEURAL_INTELLIGENCE_AGENT_MODE.md`：共同認知／執行閉環。
- `docs/AGENT_HANDOFF.md`：最新可驗證狀態快照；歷史快照必須標 STALE。
- Issue/PR/CI：任務與工程執行的可追溯事實。

若文件互相矛盾，以安全／權限／Branch Protection、已核准治理章程、模組 owner charter、本文件、一般說明文件依序判定；不確定時採較嚴格限制並 BLOCKED。

## 12. 當前執行快照（建立本提案時）

- Repository：`X84657465/global-citizen-ai-network`
- main 基準 SHA：`480f22e484dfa80d301f136cedd5504fbde41407`
- 本提案分支：`governance/execution-charter-v2-homepage`
- 本文件狀態：PROPOSED；尚未合併、尚未正式生效。
- CI、PR、Runner、Vercel 部署與各 GPT 實際執行狀態必須在每次交付時重新查證；不得複製歷史快照冒充目前狀態。

