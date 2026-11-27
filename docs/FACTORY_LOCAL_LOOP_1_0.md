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
- 模型任務可用 `GCAN_FACTORY_SANDBOX_TESTS=1` 啟用離線驗證。Docker Engine 必須先備妥與 Preflight 相同的 `node@sha256:1314fb30ec37592d5845e5a160d522c0e680972aa534549940b8d73bde88481a`。Worker 在唯讀、無網路的容器中只執行補丁新增的 allowlisted `tests/*.test.mjs`，SQLite 保存實際退出碼與通過數；未啟用時維持 `proposal_ready`。
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
