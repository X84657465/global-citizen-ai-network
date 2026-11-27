# Factory Local Loop 1.0 — P0 實作規格

> 狀態：IN PROGRESS / 尚未實際端到端驗收。
> DRI：GPT1｜工廠負責人
> 追蹤：Issue #682
> 目標：先完成一筆本機、免費、單 Worker、可恢復且可驗證的自主任務。

## 1. 目標與非目標

第一階段的成功定義不是新增排程文件或呼叫 Ollama，而是本機任務確實完成：

`intake → durable queue → claim → plan → validate → patch proposal → isolated apply → real test → persist evidence → recover/read back`

不依賴 GitHub Actions、Vercel、雲端 Runner 或付費 API。暫不自動建立／合併 PR；不得修改 main 工作樹或正式資料。

## 2. 現有能力盤點（以 main 程式碼為準）

| 現有模組 | 可重用能力 | 尚未證明／缺口 |
|---|---|---|
| `scripts/generate-agent-plan.mjs` | Ollama 本機規劃、JSON schema、計畫驗證、神經決策 gate | 依賴 `artifacts/agent-task.json`，並假設 GitHub preflight task shape |
| `scripts/generate-agent-patch.mjs` | Ollama Patch proposal、允許路徑、來源上下文限制 | 同樣依賴既有 task／plan artifact 契約 |
| `lib/agent-task-validation.mjs` | Issue task body、allowlist、排除路徑驗證 | 需要本機任務 intake adapter，不得偽造 GitHub Issue 身分 |
| `lib/agent-plan-validation.mjs` | 結構化計畫驗證 | 本機 adapter 必須保留同一政策 |
| `lib/agent-patch-validation.mjs` | Patch manifest 與路徑驗證 | 所有本機 Patch 必須重用 |
| `scripts/apply-agent-patch-to-scratch.mjs` | 將 Patch 套用到 disposable scratch copy | 現有腳本明確不執行生成程式碼或測試；需新增獨立、命令 allowlist 的驗證步驟 |
| `lib/agent-factory-state-machine.mjs` | 雲端 Factory 任務狀態、重試、隔離語義 | 不等於本機 SQLite queue；需避免雙重真相來源 |
| Factory Commander v0.1 | 使用者先前回報已有 SQLite task ledger | 尚未在本 Repository 驗證程式碼與 API；先以 adapter 接口盤點，不可宣稱已整合 |

## 3. 第一階段元件

### 3.1 本機持久任務帳本

- 使用本機 SQLite；優先採 Node 內建 `node:sqlite`，避免新增外部 DB 服務與付費依賴。
- 任務表保存 task id、標題、目標、allowlist、驗收條件、狀態、attempt、created/updated timestamps、worker lease、結果摘要。
- 事件表 append-only，保存每次狀態轉移、錯誤分類與證據摘要。
- 任務 claim 使用 SQLite transaction／原子條件更新；同一時間只允許一個 Worker。
- 必須支援程序重啟後查詢；lease 過期可安全恢復，不可重複執行仍有效的 lease。
- 任務失敗最多 3 次，之後 quarantine；system failure 不可誤計為 task failure。

### 3.2 Local Worker

- 預設併發 1；限制 Ollama timeout、輸出大小、每任務總時間及 scratch 空間。
- 只消費已驗證 task schema；Issue／prompt／模型輸出一律視為不可信資料。
- Planner、implementer、tester、reviewer 邏輯職責分離；GPT3 獨立審查不可由 Worker 自評取代。
- Worker 不直接修改 checkout、main 或持久工作目錄。

### 3.3 Ollama adapter

- 預設 `http://127.0.0.1:11434`；本機 model discovery，不得假設指定模型已安裝。
- 記錄實際 model tag、timeout、duration、response size；不得記錄 secrets。
- 使用現有計畫 schema、decision gate 與 patch validation；任何輸出都必須重新驗證。
- Ollama unavailable／timeout 是 BLOCKED 或 system failure，不可偽裝成任務成功。

### 3.4 Scratch 與真實測試

- 先建立 disposable workspace，再套用已驗證 Patch；保留 base SHA 與每個 Patch 檔案 SHA256。
- 現有 scratch apply 腳本不執行生成程式碼；測試執行必須是新增的獨立步驟。
- 第一版只允許預先定義的安全測試命令（例如 repo 已存在的 Node unit test runner），禁止模型提供任意 shell command。
- 禁止網路存取、套件安裝、部署、讀取 secrets、任意程序啟動及對正式資料寫入。
- 測試結果必須記錄命令識別碼、exit code、duration、stdout/stderr 限長摘要；SKIPPED／未執行不是 PASS。
- 測試完成後清除 scratch；若清除失敗，標記 system failure 並保留最小診斷資料。

## 4. CLI 契約

預期提供以下本機操作（實際命令以實作為準）：

- `factory-local task add`：建立一筆受 schema 驗證的任務。
- `factory-local run-once`：領取並執行一筆任務；不啟動常駐 loop。
- `factory-local serve`：在前景持續領取同一個 SQLite 佇列的任務，空閒時每秒檢查一次。收到 SIGINT 或 SIGTERM 後，完成手上任務的入帳再結束。系統故障會留下紀錄，Worker 等到 SQLite 登記的重試時間後繼續領取，期間暫停整個 Worker 的新任務。
- `factory-local run-until-idle [--max-tasks <1-100>]`：按順序執行目前可領取的任務，預設最多 25 次。沒有可領取的任務、達到上限或發生系統錯誤時結束。任務錯誤會依既有規則入帳，批次繼續處理其他可領取任務，並以非零狀態結束。
- Agent 任務入列必須明確提供一個以上操作者選定且已追蹤的 `--oracle-file tests/*.test.mjs`；CLI 會在入列時固定任務 ID、精確 Base SHA、Oracle Git blob SHA／SHA-256、Worker 寫入 allowlist 與完整合約摘要，並將合約持久化於 SQLite payload。執行時必須設定 `GCAN_FACTORY_SANDBOX_TESTS=1` 並備妥 Docker Engine 與固定 image `node@sha256:1314fb30ec37592d5845e5a160d522c0e680972aa534549940b8d73bde88481a`。Worker 在唯讀、無網路容器中分開執行模型生成的測試與 Trusted Oracle；兩組 TAP 都必須有非零測試、零 fail/cancel/skip/todo，且 Oracle 合約在執行前後保持一致，才輸出 `ACCEPTED`。未啟用 sandbox 時 Agent 任務標記 system failure／backoff，不會以 `proposal_ready` 假裝完成。
- `factory-local status`：列出 queued/running/retry_wait/succeeded/failed/quarantined。
- `factory-local logs <task-id>`：讀取任務事件與驗證證據。
- `factory-local recover`：只處理過期 lease，採冪等恢復。

所有命令均不得隱式觸發 GitHub 寫入、PR、部署或外部付費服務。

## 5. 驗收矩陣

| 案例 | 必要結果 |
|---|---|
| 正常任務 | 真實 Ollama plan、合法 Patch、scratch apply、真實測試、SQLite succeeded |
| 測試失敗 | 記錄 exit code／錯誤；任務不得標成功 |
| Ollama 不可用 | 系統阻塞分類；不得產生假成功 |
| 重複 claim | 單 Worker 原子 claim；同一任務不會被雙領 |
| 程序重啟 | 任務與事件可讀回；過期 lease 有界恢復 |
| 非法路徑／symlink | fail closed，不套用 Patch |
| 超時／超輸出 | 中止並留下證據 |
| 第三次任務失敗 | quarantine；不得無限重試 |
| system failure | 不增加 task failure counter |
| scratch cleanup failure | 不得宣稱成功 |

## 6. 交付門檻

1. 所有程式碼位於單一功能分支與單一 Draft PR。
2. 單元測試與整合測試實際執行，記錄 Node 版本、作業系統、命令、exit code。
3. 至少一筆本機真實 Ollama 任務完整成功，SQLite 重啟讀回證據完整。
4. GPT3 提供獨立架構／安全審查。
5. PR CI 必須對應精確 HEAD SHA；PENDING、SKIPPED、0 Job 或未執行均不得視為 PASS。
6. 未達上述條件時維持 IN PROGRESS／BLOCKED，不得標記 ACCEPTED。

## 7. 風險與限制

Node 內建 `node:sqlite` 在目前支援版本仍可能顯示 experimental warning；實作需檢查最低 Node 版本並提供明確錯誤。使用者本機只有有限 RAM，Worker 預設單一併發，禁止為此新增 Runner。第一版只對明確允許的測試命令執行，不把一般 shell agent 偽裝成安全 sandbox。


## 8. 已提交的第一個可執行 Worker 切片（尚未驗收）

分支 `feat/factory-local-loop-v1` 已新增以下有限範圍：

- `scripts/factory-local.mjs`：提供 `task add`、`run-once`、`status`、`logs`、`recover`。
- `npm run factory:local -- task add --title "Queue regression tests"`：建立一筆本機佇列回歸測試任務。
- `npm run factory:local -- run-once`：單 Worker 領取任務，在 disposable scratch 目錄複製固定 allowlist 檔案，使用目前 Node 執行固定的兩組 Queue regression tests，並將 exit code、Node 版本、平台、duration、stdout/stderr 摘要寫回 SQLite。
- Worker 不接受模型或任務 payload 提供的 shell command；只接受固定的 `local-queue-tests` 任務種類。測試失敗計為 task failure；執行環境／scratch 清理問題計為 system failure。
- 新增 Worker allowlist 與真實子程序執行測試。

這是「SQLite → claim → 固定命令執行 → 結果持久化 → logs 讀回」的第一個可執行切片，不是完整 Agent Factory V2，也不是 Ollama 自主改碼閉環。

### 尚未完成的 P0 工作

1. 將既有 Planner / Patch Generator / Patch Validator 轉成明確的 local task adapter，不得偽造 GitHub Issue 身分。
2. 以安全 scratch workspace 套用已驗證 Patch，並只執行明確 allowlist 的測試命令。
3. 加入真實 Ollama plan/patch 執行、逾時／輸出上限與重啟後 evidence read-back。
4. 在 Windows 本機實際執行 CLI 與 Node 測試，保存命令、Node 版本、exit code、task ID、結果 JSON。
5. 精確 HEAD CI 與 GPT3 獨立審查通過後才可解除 Draft。

目前此切片的程式碼已提交，但本 connector 工作階段未執行 Node 測試；不得標記 PASS。


---

## GPT1 implementation delta — local Planner/Patch adapter (2026-11-27)

**Code status: IMPLEMENTED IN BRANCH / NOT TESTED IN THIS connector session.** This is an incremental adapter slice, not completion of the Factory Local Loop.

Added:
- `lib/agent-factory-local-adapter.mjs`: explicit local task schema; no synthetic GitHub Issue number, URL, author, or approval label; strict task keys and size bounds.
- Ollama local model discovery and generation for structured plan and patch JSON; task/plan/patch outputs are independently validated with the existing plan validator, neuro-symbolic decision gate, patch validator, and write policy.
- Exact path allowlist, bounded source context/output, no symlink/path traversal, no control-plane authorization, and no production/deployment scope.
- Disposable scratch-only patch application with SHA-256 file evidence. The checkout is never written.
- `tests/agent-factory-local-adapter.test.mjs`: local task schema, fabricated Issue identity rejection, path traversal/denied roots, unapproved patch rejection, scratch non-write behavior, and symlink-parent rejection.

**Hard execution boundary:** scratch apply returns `APPLIED_TO_SCRATCH_NOT_EXECUTED`; generated code and tests are not executed. OS-level sandbox execution is not implemented or verified. This adapter is not yet connected to the durable SQLite queue/CLI worker, and there is no real Ollama run or post-restart result evidence. These remain NOT RUN / NOT IMPLEMENTED, not PASS.

**Exact branch checkpoint:** PR #683 HEAD `146873f609f1a2bce93ed90a28014d6549b872a4`; main remains `590d132e338dc5bb47243f372a0547c8dfdbfced`. GitHub commit workflow-run lookup returned no PR-triggered runs for this new HEAD at the time of this update. No CI or local test PASS is claimed. Keep PR #683 Draft.


## GPT1 實作增量 — SQLite local-agent-task 接線（2026-11-27）

**狀態：已提交程式碼；尚未執行測試／Ollama／Windows E2E，不代表驗收。**

- local-agent-task 已接入既有 SQLite queue 與單一 Worker；CLI 新增 task add-agent --file <local-task.json>，入列前執行嚴格本機 task schema 驗證。
- Worker 順序執行 Ollama Planner → plan/decision validation → Patch proposal → patch validation → disposable scratch apply。
- SQLite complete() 持久化完整結果 JSON，包含 plan artifact、patch artifact、scratch SHA-256 evidence；可透過既有 status／logs 讀回任務狀態與事件。程序重啟讀回尚待實際執行驗證。
- Agent pipeline 的終態刻意標示 proposal_ready；生成程式碼及生成測試仍不執行，因 OS-level sandbox 尚未完成。
- Ollama endpoint 已收斂為 loopback HTTP origin（127.0.0.1／::1），拒絕外部主機、localhost 名稱、URL path/query/fragment、認證資訊及 HTTP redirect，避免將 source context 傳送到外部服務。
- 仍須處理並驗證固定測試 Worker 的 process-tree timeout containment；直接終止子程序不保證其 descendants 同時終止。未完成平台適配及 Windows 測試前，不得把 timeout 視為完整程序樹隔離。
- 本次 Connector 僅提交 GitHub branch 檔案變更，未在本機執行 Node tests、完整測試套件或 Ollama。


## Process-tree timeout containment implementation — 2026-11-27

- Replaced synchronous child-only spawn timeout with asynchronous fixed-command execution.
- POSIX worker processes are launched in a detached process group; timeout sends SIGKILL to the complete group.
- Windows timeout invokes taskkill.exe /PID <pid> /T /F to terminate the complete descendant tree, then falls back to direct child kill if required.
- Captured stdout/stderr are bounded to 512 KiB each; no shell is used; scratch cleanup remains mandatory.
- Added a descendant-survival regression test. **This code and test are committed but NOT RUN on POSIX or Windows in this connector session.** Platform-specific behavior remains unverified until actual test execution on both platforms.


---

## GPT1｜Trusted Acceptance Oracle 全生命週期接線（2026-11-28）

**狀態：程式碼已提交到 PR #683 同一分支；本 connector 工作階段未執行 Node、Docker、Ollama 或 Windows E2E。未有 exact-HEAD CI PASS／獨立 GPT3 APPROVED，不得標記驗收完成。**

本次實作增量：
- Trusted Oracle 合約升為 schema v2，完整 digest 綁定 task ID、精確 base SHA、Oracle test 檔案 Git blob SHA／SHA-256、Worker write allowlist 與 Oracle aggregate hash；Worker intake、測試前後都重新驗證。
- CLI `task add-agent` 必須明確提供一個以上操作者選定的 `--oracle-file`。入列時擷取 exact HEAD、建立 task ID、產生合約，並將合約與任務一同保存於 SQLite payload。
- Oracle 測試檔案不得與 Worker 寫入 allowlist 重疊；Worker allowlist 在建立與重新驗證合約時必須保持乾淨，避免以未提交程式碼作為可信基準。
- Worker 僅在 `GCAN_FACTORY_SANDBOX_TESTS=1` 時執行 Agent 任務；模型生成測試與 Trusted Oracle 測試在同一 disposable read-only／network-none container workspace 中以兩次獨立執行分開驗證。
- TAP 證據必須包含精確 test file list、非零 tests/pass、零 fail/cancelled/skipped/todo、exit code 0，以及完整有效摘要；Oracle 合約與 scratch 內 Oracle source 在執行前後都必須吻合。
- SQLite `complete()` 增加最後一道 Trusted Acceptance Gate：沒有匹配的 task／contract identity、模型測試證據與 Oracle 獨立證據，不得把 Agent 任務標成 `succeeded`；拒絕後仍保留 running lease，讓 CLI 能以 task failure 正確入帳。
- 新增 Oracle contract、Worker acceptance lifecycle、CLI intake、SQLite 假完成拒絕／有效證據與 TAP summary regression tests。

**尚未證明的項目：**
1. 上述新測試與完整 `npm run test:unit` 尚未由本 connector 實際執行。
2. 真實 Ollama model、Docker image、Windows Runner／本機服務 E2E 尚未執行。
3. 已驗收的 Patch 目前仍只在 disposable scratch 執行並將完整 artifact 持久化於 SQLite；尚未自動寫回工作樹、建立 Draft PR 或提交 Git commit。這是下一個交付階段，不可把 scratch acceptance 說成 PR 已交付。
4. 最新 HEAD 的 GitHub Actions 若無 exact-HEAD run/job 證據，一律為 NOT RUN；Vercel build-rate-limit 不等於 Node 測試結果。
5. 仍需 GPT3 對相同 exact HEAD 進行獨立架構／資安／整合審查。

**目前判斷：** Trusted Acceptance Oracle 已從孤立 helper 接入 CLI intake → SQLite payload → Worker preflight → separate sandbox test execution → pre/post contract verification → SQLite completion gate。這是第一個有可信驗收閘門的 Agent local loop 切片，並非完整 Issue → Draft PR → independent QA → merge 自主交付閉環。


## GPT1 實作增量 — V2 GitHub Issue → SQLite Local Queue（2026-11-28）

**狀態：程式碼已提交到 PR #683；本 connector 工作階段尚未執行 Node 單元測試、Windows Ollama E2E 或真實 GitHub 發布，不代表驗收完成。**

新增：
- `lib/agent-factory-local-issue-intake.mjs`：重用 V2 的 Issue 選擇語義、優先級排序、依賴檢查、既有 task PR 排除、durable Factory state 及原有 `validateAndBuildTask`。
- 自動進件只選一筆符合條件的 owner-authored／planner-generated `[AI Task]` Issue；重新讀取 Issue 並比對 `updated_at`、canonical URL、number、open state，避免選擇與進件間的 TOCTOU 變更。
- 建立獨立 source envelope：repository、Issue number、canonical URL、`updated_at`、Factory state version、穩定 dedupe key、Issue body SHA-256。Issue body 仍是不可信任資料；任務路徑與內容必須通過既有 V2 validator。
- `lib/agent-factory-local-queue.mjs` 新增 SQLite transaction 內的 `addFromSource`：同一 Issue／同一來源版本冪等回傳既有 task；來源版本或 body digest 改變時 fail closed，要求明確 reconciliation，不覆寫舊任務。
- `scripts/factory-local.mjs intake-next`：透過 `GITHUB_TOKEN` 讀取 V2 Issue queue，並要求操作者預先配置 `GCAN_FACTORY_ORACLE_FILES`（分號分隔的 tracked Oracle test paths）及 `GCAN_FACTORY_BASE_BRANCH`。只有本機 HEAD 與指定 base branch SHA 完全一致才允許進件。
- Publisher 驗證持久化 source envelope，並在產生的 Draft PR body 同時保留 local task marker 與 V2 的 `<!-- ai-task:<issue-number> -->` marker，使既有 V2 selector 能識別已建立的任務 PR，避免下一輪重複選取。

執行方式（必須在精確 base branch checkout，且設定可信 Oracle）：
- `GITHUB_TOKEN`：僅用於 GitHub API 讀取及後續已驗收任務的發布。
- `GCAN_FACTORY_BASE_BRANCH=main`：明確指定發布 base branch；不從當前 feature branch 猜測。
- `GCAN_FACTORY_ORACLE_FILES=tests/example.test.mjs`：由操作者選定的可信 Oracle；不可由 Issue body 或模型輸出指定。
- `npm run factory:local -- intake-next`：最多選取並持久化一筆任務；不自動執行任意 shell、不解除 Draft、不自動核准或合併。

新增測試：
- Issue source envelope canonical identity／digest／state version。
- selector 單筆選取、active lease、owner 身分、依賴未解決排除。
- SQLite 相同來源冪等重播、來源變更拒絕。
- Publisher Draft PR 保留 V2 Issue task marker。

**尚未實證：** 新增測試與完整 `npm run test:unit` 尚未在此 connector 工作階段執行；Windows 真實 Ollama → intake → SQLite → Trusted Oracle → publisher → GitHub Draft PR → restart recovery 的同一 task ID E2E 尚未執行。Exact-HEAD CI 若未完成，仍是 NOT RUN／PENDING；不能解除 Draft。
