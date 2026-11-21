# GCAN F–P Master Report

**盤點日期：** 2026-11-21（Asia/Taipei）  
**盤點基準：** `main` 已整合 A 2.0.71 的提交 `5b274eed904e40159c8ab8c13bba68fbc83c1370`  
**本報告工作分支：** `audit/f-p-engineering-handover-20261121`  
**本分支父提交：** `6e76272623333201228d4ed82f63141f56dcb868`（PR #185 A–P governance candidate）  
**狀態：** GitHub 遠端唯讀盤點完成第一輪；未執行本機 checkout / build / test；未修改任何 runtime source。

> 本報告以目前可讀取的 GitHub 檔案、PR diff、分支與 exact-head CI 證據為準。PR 存在、版本號存在或架構文件定義，不代表功能已完成或已正式驗收。

## 1. 執行摘要

1. GCAN 的 A–P 十六線架構確實存在於候選治理分支與相關 PR；目前 `main` 的預設分支內容仍呈現 A–E 五線基準。A–P 治理候選 PR #185 尚未合併。
2. 本次 F–P 共 11 條線的正式定義：F 資安；G 發布/QA/整合；H 可觀測性/遙測/成本配額；I 生態系連接器/工作流程；J 自我修復/混沌/持續性；K 知識庫/文件/操作手冊；L 多節點/聯邦/邊緣協調；M 合規/政策稽核/風險；N 產品化/分析/成長營運；O 生命週期/棄用/舊系統退場；P 治理/倫理/信任。
3. F 有資安治理候選與少量 runtime hardening；G 有 release evidence contract 候選；H 有 Runner observability contract 候選；L 有雲端成本路由及裝置/工作負載安全契約候選。這些候選均未形成可宣稱正式上線的完整功能。
4. I、J、K、M、N、O、P 在 A–P manifest 中仍標示 planned（K 有版本及既有文件資產，但未找到已驗收的獨立 K 執行模組）。P 另有治理/安全文件候選，但尚未併入正式主線。
5. G/H 的候選分支存在 CI failure；F 沒有查到其 PR head 的 workflow run；L 的 PR #66 有 CI failure，PR #67 僅有作者聲明的 9/9 isolated mirror tests，並非 repository full suite 或 Actions exact-head 驗收。
6. F PR #145 的 head 分支是 `feat/cyber-security-defense-integration`，但 G–P 架構 PR #146 的 base 是另一條 `feat/cyber-security-defense`。這是必須先解決的 ancestry/stacking 差異，不可假設 F→G 依賴已接通。
7. B 主線有多條候選堆疊，不能混合不同 A/Governance/Migration 父提交。PR #187 是 integrated-main → governance #185 → migration #186 → B 的堆疊；PR #201 是另一條 A 2.0.84 → B 候選堆疊。
8. Agent Factory A 的既有 main 整合基線為 2.0.71；A 2.0.84 候選 PR #200 有 exact-head CI 成功證據。PR #208 仍 pending，且僅限兩個 A controller/test 檔案。F–P 本次沒有修改 A runtime。
9. 本次只建立本分支的五份交接文件；未改 main、未合併 PR、未部署、未改 DB/schema、未操作 secrets/Runner/production。

## 2. 專案與基準狀態

### 2.1 Repository

- Repository：`X84657465/global-citizen-ai-network`（Private）
- Default branch：`main`
- 技術棧（main package.json）：Next.js 15.5.29、React 19.3.1、TypeScript 5.8.3、Supabase SSR/JS、ESLint 9。
- scripts：`dev`、`build`、`start`、`lint`、`test:unit`。
- Unit runner：`scripts/run-unit-tests.mjs`；自動收集 `tests/**/*.test.(mjs|js|ts)`，將 `tests/security/two-member-rls.test.mjs` 留給 isolated Supabase CI job。
- 主要目錄：`app/`、`lib/`、`docs/`、`scripts/`、`supabase/`、`tests/`、`versions/`、`.github/workflows/`。

### 2.2 A–P manifest 候選（PR #185 parent SHA）

A–P 註冊存在於 PR #185 head `6e76272623333201228d4ed82f63141f56dcb868` 的 `versions/manifest.json`。F/G/H 為 foundation / implementation-candidate；I–P 主要為 planned。這是候選治理資料，不等同已合併 main 的正式現況。

| 線 | 名稱 | manifest 候選版本 | manifest 狀態 | 本次判斷 |
|---|---|---:|---|---|
| F | Cyber Security & Defense | 0.1.5 | foundation | 有安全治理/headers 候選；未完成獨立驗收 |
| G | Release, QA & Integration | 0.1.7 | implementation-candidate | 有 evidence contract 候選；未通過 exact-head CI |
| H | Observability, Telemetry & Cost/Quota Governance | 0.1.5 | implementation-candidate | 有純資料契約/健康評估候選；未通過 exact-head CI、未接實際 telemetry |
| I | Ecosystem, Connectors & Workflow Automation | 0.1.0 | planned | 未找到獨立可驗收實作 |
| J | Self-Healing, Chaos & Continuity | 0.1.0 | planned | 未找到 J 專屬驗收實作；A 的 retry/recovery 不自動等於 J |
| K | Knowledge Base, Docs & Governance Playbooks | 0.1.7 | planned | 有既有 docs/runbook；未找到完整 K 擁有的已驗收工作流 |
| L | Multi-Node, Federation & Edge/Cluster Coordination | 0.1.0 | planned | 有設計與安全契約候選；無可運作社群節點/worker |
| M | Compliance, Policy Audit & Risk Governance | 0.1.0 | planned | 未找到完整 M track implementation/acceptance |
| N | Productization, Analytics & Growth/Ecosystem Ops | 0.1.0 | planned | 未找到獨立產品分析/成長營運驗收 |
| O | Lifecycle, Deprecation & Legacy Retirement | 0.1.0 | planned | 未找到棄用/遷移/退場治理實作 |
| P | Governance, Ethics & Trust/Policy Evolution | 0.1.1 | planned | 有政策/治理候選文件；尚未建立可強制執行的全域治理關卡 |

## 3. F–P 逐線盤點

### F — Cyber Security & Defense

- 主要候選：PR #145，branch `feat/cyber-security-defense-integration`，head `27d31444d8fb8d57040e60aa554e5d8e905d00e4`，base `main`。
- 主要路徑：`lib/security/headers.ts`、`docs/security/threat-model.md`、`docs/security/incident-response.md`、`docs/security/release-gates.md`、`docs/security/README.md`、`SECURITY.md`、`.github/dependabot.yml`、`tests/security-governance.test.mjs`、`tests/security-ci-policy.test.mjs`、`tests/security-headers.test.ts`。
- 實際內容：HSTS/安全標頭、跨線 threat model、incident response、release security gates、Dependabot 與安全回歸測試。
- 已知限制：PR body 明確說明新增 security tests 已註冊但尚未本機/Actions 執行；未完成 penetration test 或 security certification。
- 依賴/風險：F 是 A–P 所有線的跨線安全門檻，不應被 G/H/P 取代。PR #146 的 base `feat/cyber-security-defense` 與 #145 head branch 不同，須先核對 commit ancestry。
- 分類：B（少量修補/驗收後可整合）；目前不准標記為 security accepted。

### G — Release, QA & Integration

- 候選 PR #147（v1）及 #148（v2），兩者均以 PR #146 架構分支為 base；PR #148 head `273eb012f7558c1223c3af3d4543c6745d6aaefa`。
- 路徑：`lib/release-evidence-contract.mjs`、`docs/release-evidence-contract.md`、`tests/release-evidence-contract.test.mjs`、`.github/workflows/ci.yml`、`tests/ci-trigger-policy.test.mjs`。
- 實際內容：驗證 repository/track/PR/base SHA/head SHA/time/check records；拒絕未知欄位、重複 gate、錯誤時間及 SHA 不一致。
- 限制：合約驗證只檢查 evidence shape/consistency，不能自行向 GitHub 認證 run 真偽；PR #148 明確指出尚未接入 Agent Factory publisher。
- 驗證：PR #148 exact-head Actions run #44703057912 結果 failure；PR #147 未查到 associated workflow run。不可把舊 SHA 或另一個 G PR 的結果當作目前通過。
- 重複：#147 與 #148 是重疊的 G contract 候選；應選定唯一父分支/實作並做 diff 比對，不可雙重合併。
- 分類：B（修補/重新驗收後可整合）。

### H — Observability, Telemetry & Cost/Quota Governance

- 候選 PR #150，branch `feat/h-runner-observability-v3`，head `d2bd6d49edae549dde319750a64a101bd7b5fabf`，base `feat/g-release-evidence-v2`。
- 路徑：`lib/runner-observability-contract.mjs`、`docs/runner-observability-contract.md`、`tests/runner-observability-contract.test.mjs`，並更新治理/版本文件。
- 實際內容：privacy-minimized Runner snapshot、heartbeat/queue/task outcomes/quota validation、stale/offline/queue pressure/failure rate/clock skew health evaluation。
- 安全界線：拒絕 secrets/env vars/host paths/raw job payload；只回報 findings/advisories，不會 pause/cancel/restart Runner。
- 限制：PR body 說明 telemetry 尚未接到 GitHub Actions、Runner API、Agent Factory scheduler 或 notifications；不能宣稱即時監控已啟用。
- 驗證：exact-head Actions run #44781690181 failure。
- 分類：B（修補/重新驗收後可整合）；在資料來源連線及隱私審查前只能視為純契約模組。

### I — Ecosystem, Connectors & Workflow Automation

- manifest 狀態 planned；未找到 I 專屬獨立實作 PR/驗收證據。
- 預期責任：authenticated external APIs、webhooks、notifications、state sync、idempotency、replay-safe event adapters。
- 目前可確認：repository 有 GitHub/Supabase/Actions integrations，但不能把 A/B 既有連線直接算成 I track 完成。
- 分類：E（尚未具備獨立整合條件）；先定義 provider-neutral connector contract、auth scope、event envelope、replay key、rate limit 與 failure taxonomy。

### J — Self-Healing, Chaos & Continuity

- manifest 狀態 planned；未找到 J 專屬已驗收實作。
- 預期責任：bounded recovery、circuit breakers、safe degradation、checkpoints、backup/restore、controlled fault drills。
- A 已有 retry/recovery/isolation 類程式碼，但 A 自身功能不可自動轉列 J；需明確 ownership、failure-domain boundaries 與 recovery evidence。
- 未經明確授權不得對 production 執行 chaos/destructive tests。
- 分類：C（需補足介面/依賴）；先建立非破壞性 fault-injection harness 與 restore drill。

### K — Knowledge Base, Docs & Governance Playbooks

- manifest 狀態 planned，候選版本 0.1.7。
- 現有文件資產包括 `docs/agent-factory-operations-runbook.md`、`docs/agent-factory-smoke-test.md`、`docs/ai-agent-scheduler.md`、`docs/database-safety.md`、`docs/production-readiness.md`、`docs/engineering-workstreams.md`（在 governance candidate branch）。
- 本次新建五份 F–P handover documents 是 K 可接收的文件成果，但尚未合併到 K 正式分支。
- 分類：B（文件資產可移交；需建立 freshness owner、decision log index、runbook test/verification cadence 後才算 K acceptance）。

### L — Multi-Node, Federation & Edge/Cluster Coordination

- 設計 PR #66：`docs/citizen-cloud-network.md`、`lib/compute/cost-metrics.ts`、`lib/compute/cost-router.ts`、`app/api/admin/ai-costs/route.ts`、相關 tests；head `8e28ceb2a1ca0c992dc8304c8537ea50bf94584a`。
- 安全契約 PR #67：`lib/compute/device-capabilities.ts`、`lib/compute/workload-contract.ts`、`docs/citizen-cloud-network.md`、相關 tests；head `9b65d28f3939bdbd13aef76e3879079fd55653bf`。
- #67 限制：只做 opt-in capability normalization 與 allowlisted public workload/lease shape；不 probe hardware、不 fingerprint、不 dispatch worker、不驗證簽章、不提供完整 sandbox。
- 驗證：#66 associated Actions run #44297572047 failure；#67 作者聲明 9/9 tests 在 isolated Node 22 mirror 通過及純模組 strict TS pass，但明確不是 repo checkout/full suite/Actions，不能列為正式 pass。
- Roadmap 將 L 延後到 H 提供容量證據、F 獨立 security review 及明確核准後。
- 分類：D（必須獨立保留並延後）；禁止部署節點、執行社群任務或收集裝置資料。

### M — Compliance, Policy Audit & Risk Governance

- manifest 狀態 planned；未找到獨立 M implementation/acceptance PR。
- 預期責任：actor/action audit trails、policy evidence、risk register、scoped exceptions、expiry/retention。
- B 現有審核/帳本與 F incident/security evidence 是可供 M 對接的來源，但不能等同完整合規系統或法律認證。
- 分類：E（尚未具備整合條件）；先定義 audit event schema、retention/privacy classification、exception lifecycle、evidence export 與 reviewer ownership。

### N — Productization, Analytics & Growth/Ecosystem Ops

- manifest 狀態 planned；未找到獨立 N track implementation/acceptance。
- 預期責任：privacy-aware product metrics、adoption/quality analysis、feedback loops、onboarding、ecosystem operations。
- 不得把 demo metrics、頁面計數或尚未接通的 analytics SDK 當作真實用戶分析。
- 分類：E；先確認 B 的事件來源、consent/privacy policy、metric definitions、data minimization 與 dashboard acceptance。

### O — Lifecycle, Deprecation & Legacy Retirement

- manifest 狀態 planned；未找到 O 專屬 deprecation/migration/retirement 實作。
- 預期責任：deprecation inventory、migration windows、compatibility contracts、removal approvals、legacy maintenance reduction。
- 不能以清理重複檔案或刪除舊分支代替 O；任何移除必須證明 consumer inventory、migration/rollback、owner sign-off。
- 分類：E；先建立依賴盤點與 deprecation policy，不執行刪除。

### P — Governance, Ethics & Trust/Policy Evolution

- manifest 狀態 planned；候選 PR #68（治理/AI security controls）、#206（首頁治理呈現）。
- #68 路徑：`.github/workflows/ai-security.yml`、`docs/agent-cost-ledger.md`、`docs/ai-agent-security-contract.md`、`docs/observability-integration.md`、治理文件。
- #68 PR body 記錄 CI/AI Security Static Checks failure，且未執行完整 local build/security audit；PostHog 尚未啟用事件匯入。
- #206 只同步 README/首頁與 P 原則，exact-head CI/Vercel preview 待確認。
- P 是 cross-cutting governance layer，不是替代 F security gate，也不是可自行授權高風險操作的 feature track。
- 分類：B（政策文件候選需 review/測試）；任何強制 gate 必須與 GitHub/CI 權限和人工審查真正連接後才可宣稱 enforced。

## 4. 共通問題與整合風險

1. **Mainline registry drift：** default main README/manifest仍是 A–E；A–P manifest 在 PR #185 候選。不可把候選 registry 當成已合併正式狀態。
2. **F→G ancestry mismatch：** PR #145 head branch 與 PR #146 base branch 不同；先比較 ancestry/diff，重建唯一正確堆疊。
3. **Duplicate G candidates：** PR #147/#148 是同一責任範圍的兩個版本；選定一條並保留另一條供差異審查，不可雙 merge。
4. **H depends on G v2：** #150 依賴 #148；G 不穩定時 H 不能獨立宣稱整合完成。
5. **L security/capacity gate：** #66/#67 只到 pure policy/contracts；缺 signed desktop agent、sandbox、egress controls、revocation、attestation/verification、operational monitoring、F approval。
6. **P enforcement gap：** 文件與靜態檢查不等於 server-side authority enforcement 或 required branch protection。
7. **CI evidence freshness：** 所有 CI 必須綁定目前 PR head SHA；不同 PR、不同 SHA、mirror tests 不可互相代替。
8. **B stack divergence：** PR #187 與 #201 依賴不同 A/governance/migration baselines；不可 cherry-pick metadata snapshot 而不重算相容性。
9. **A factory protection：** 本次不修改 A runtime；A #200 exact-head CI pass 與 A #208 pending 必須分開看待。
10. **Local verification unavailable：** GitHub connector 可讀寫遠端 Git 資料，但本工作階段沒有 repository checkout / shell execution / connected Runner session，故不能執行 npm commands 或確認本機 dirty working tree。

## 5. 本次實際變更

- 新建分支 `audit/f-p-engineering-handover-20261121`，初始父提交 `6e76272623333201228d4ed82f63141f56dcb868`；其後僅在此分支提交文件更新。
- 新增五份 F–P 交接文件，以及 `GCAN_SHARED_ENGINEERING_GOVERNANCE.md`、`GCAN_SHARED_TASK_LEDGER.md` 兩份跨線協作文件；合計七份文件。
- 未修改 app/lib/scripts/supabase/workflows/package/lockfile/manifest。
- 未建立 PR、未合併、未推送 main、未部署、未觸碰 production。
- 本分支尚無本機 build/test 結果；文件提交不代表功能驗收。

## 5A. Shared governance and task coordination additions

- Added `GCAN_SHARED_ENGINEERING_GOVERNANCE.md`: A–P are treated as one GCAN ecosystem with reusable shared infrastructure; separate deployables require an explicit architecture decision. It defines planned/specifed/implemented/tested/accepted/integrated/deployed evidence levels and multi-agent Git isolation rules.
- Added `GCAN_SHARED_TASK_LEDGER.md`: initial 16-task coordination register covering architecture, Git isolation, F–P, B ancestry, A protection and local verification. Owners remain unassigned; no task is falsely marked in progress or accepted.
- Both files are committed only on the audit branch. No branch protection, CI enforcement or production policy was changed.

## 6. 下一步優先順序

1. 核對 #145 F head 與 #146 base 的 ancestry，選定唯一 F→G parent chain。
2. 選定 #147 或 #148 作為唯一 G contract；修復目前 exact-head CI failure，並確認 G 是否能讀取/認證 GitHub run evidence。
3. 以選定 G 為唯一 parent，修復 #150 H tests/CI，再接入只讀 Runner/queue telemetry。
4. 保持 L deferred，直到 H capacity evidence、F review、sandbox/security/consent/signature/revocation 全部具備。
5. 將 I/J/K/M/N/O/P 先轉成有 owner、API/schema、tests、exit criteria 的獨立 issue/PR；不要同時展開過多工作線。
6. B 僅選擇一條 A/governance/migration ancestry 正確的堆疊；目前 #187 與 #201 是不同候選，需由主控 Agent 決定基準。
7. 取得本機或隔離 Runner checkout，按 ACCEPTANCE 文件執行完整命令與 DB/RLS 驗收。

## 7. 結論

F–P 已有正式架構定義，但不是 11 條都已實作。第一輪證據支持 F/G/H/L 存在部分候選成果，I/J/K/M/N/O/P 仍以規劃/治理文件為主；目前沒有任何依據可將 F–P 整體標記為「全部驗收完成」或「可直接整合 B」。本次最重要成果是確認真實工作線職責、候選程式碼位置、PR ancestry、CI 狀態與阻礙，並建立不覆蓋既有 Agent 成果的交接分支。


## 6. Live GitHub recheck — 2026-11-21 (supersedes earlier PR metadata where different)

A fresh read of the current PR records and exact-head workflow-run endpoints was performed after the initial report. These are remote GitHub observations only; no local code was executed.

| Track | PR / current head | Current remote state | Exact-head workflow evidence returned | Updated assessment |
|---|---|---|---|---|
| F | #145, `27d31444d8fb8d57040e60aa554e5d8e905d00e4` | Open, non-draft, base `main`; mergeable=false; 20 files | No PR-triggered workflow run returned by the commit workflow-runs endpoint | Still UNKNOWN/BLOCKED for CI acceptance; ancestry and mergeability need investigation |
| G | #147, `6f735c1251907c5016e7eea32ea0253142e537ec` | Open; base `feat/g-p-workstream-governance`; mergeable=false | No PR-triggered workflow run returned | UNKNOWN; not accepted |
| G | #148, `273eb012f7558c1223c3af3d4543c6745d6aaefa` | Open; same governance base; mergeable=true | CI completed with failure | FAIL; still competing with #147 |
| H | #150, `d2bd6d49edae549dde319750a64a101bd7b5fabf` | Open; base is G #148 head; mergeable=true | CI completed with failure | FAIL; dependent on unaccepted G v2 |
| L | #66, `8e28ceb2a1ca0c992dc8304c8537ea50bf94584a` | Open; base `main`; mergeable=false | CI completed with failure | FAIL |
| L | #67, `9b65d28f3939bdbd13aef76e3879079fd55653bf` | Open; base is #66 head; mergeable=false | No PR-triggered workflow run returned | Mirror-test author report remains non-acceptance evidence |
| P | #68, `a277b7a78ae32182b14dec2f621258969ea85554` | Open; base `main`; mergeable=false | AI Security Static Checks and CI both completed with failure | FAIL |
| P | #206, `11869f21745efc88064487a167cd0296cfe21edc` | Open; base `main`; mergeable=true | Exact-head CI completed successfully | CI PASS for this SHA only; does not establish P policy enforcement or deployment |

The current PR metadata reports #145/#147/#66/#67/#68 as not mergeable. “mergeable=false” is a GitHub metadata observation and must not be translated into a specific conflict diagnosis without reading the mergeability details/diff. #148/#150/#206 currently report mergeable=true, which is not an approval or acceptance decision.

### 6.1 F–P status corrections and scope clarifications

- F #145 has moved from the earlier recorded head to `27d3144...`; its current changed-file inventory includes security policy/runbooks, Dependabot, security headers, package/version metadata and security regression tests. The PR's own change description says the security tests still require exact-head Runner execution. Do not call F certified or accepted.
- G #147 and #148 remain duplicate/overlapping candidates. #147 is not simply a newer passing version; its exact-head workflow result is UNKNOWN. #148 has a failed CI run.
- H #150 still has no connected live telemetry and its exact-head CI fails.
- L #66/#67 remain design/contract candidates. #66 CI fails; #67 has no associated PR workflow run in the queried endpoint. No community worker or device execution is authorized by these artifacts.
- P #206 now has a successful exact-head CI run (the earlier “pending” statement is superseded). The PR's content describes P as a cross-cutting Governance, Ethics & Trust layer, not a sixth feature-development track, and says A–E are the five currently active feature tracks. This wording must be reconciled with the broader A–P sixteen-workstream registry before the canonical architecture is published. A successful CI validates only the checks in that run, not governance enforcement, production readiness, or deployment.
- P #68 remains failed. A policy document or static prompt scan does not prove server-side authorization, required branch protection, or runtime tool enforcement.
- I, J, K, M, N and O still have no independently accepted track implementation established by this recheck. Existing integration code, A recovery, and documentation assets must not be relabelled as I/J/K acceptance without explicit ownership and criteria.

### 6.2 Updated next priorities

1. F: inspect why #145 is non-mergeable and compare its base/ancestry with the F branch used by the A–P governance stack; then execute security tests on the final exact SHA.
2. G: diff #147 against #148, select one candidate, fix exact-head CI and prove the evidence publisher can authenticate GitHub run provenance.
3. H: do not rebase/accept until G is selected and passing; keep telemetry integration read-only and privacy-minimized.
4. L: hold both PRs; require F security review, H measured capacity, signed identity, sandbox/egress controls, revocation and explicit opt-in before any worker execution.
5. P: treat #206 as CI-validated documentation/UI synchronization only; resolve canonical A–P registry language and separately demonstrate enforceable controls.
6. I/J/K/M/N/O: create scoped contracts and acceptance tests with named owners rather than marking planned items implemented.



### 6.3 Job-level CI evidence detail

A second read of the workflow job records clarifies which gates failed or passed:

- **G #148, run #44703057912:** exact candidate metadata resolution passed; the combined build/unit/type/lint/production-build job failed specifically at the **Unit tests** step; the local Supabase migrations/PostgreSQL/RLS job passed.
- **H #150, run #44781690181:** exact candidate metadata resolution passed; the combined quality job failed specifically at **Unit tests**; the local Supabase migrations/PostgreSQL/RLS job passed. This does not make H accepted because its required quality gate is red and its parent G candidate is not accepted.
- **L #66, run #44297572047:** both the **build** and **database** jobs failed. The job records alone do not expose the root cause; do not infer whether this was source failure or runner/setup failure without logs.
- **P #68:** the queried head check-runs include failures in **database**, **build**, and **UltraProbe** checks across the associated runs. No successful P #68 acceptance is established.
- **P #206, run #44903614946, exact head `11869f21745efc88064487a167cd0296cfe21edc`:** exact candidate metadata resolution passed; **Windows Runner quality gates — tests, types, lint, audit and production build** passed; **Windows Ollama/local execution integration** passed; **Windows Supabase migrations, PostgreSQL and RLS integration** passed. This is stronger than a generic CI-green label, but it remains acceptance evidence for PR #206's documentation/homepage synchronization scope only.

