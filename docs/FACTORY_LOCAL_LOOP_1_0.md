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
