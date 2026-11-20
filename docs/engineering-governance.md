# Five-Track Engineering Governance

**Governance revision: 1.4.3**  
**Repository release baseline: 0.3.91**

## A–P workstream registry

The repository defines sixteen independent engineering workstreams. The README contains the at-a-glance index; the [A–P architecture document](engineering-workstreams.md) is the detailed source for ownership, non-goals, dependencies, staged deliverables and exit criteria.

| Track | Name | Responsibility |
|---|---|---|
| A | Agent Factory V2 | AI 自動開發工廠：需求拆解、任務派送、隔離執行、測試、候選 PR、CI 證據與復原。 |
| B | GCAN Product | GCAN 主產品：公開網站、會員體驗、AI 工作台、全球貢獻流程與平台服務。 |
| C | Predictive Coding（預測編碼） | 預測與觀測、預測誤差計算、信心校準、漂移分析及可驗證的模型更新訊號。 |
| D | Deep Neural（深度神經） | 知識記憶、推理、知識整合、評估與跨線學習提案。 |
| E | Deep Research（深度研究） | 多來源研究、來源品質與溯源、交叉查證、反證分析及引用式研究報告。 |
| F | Cyber Security & Defense（資安防禦） | 跨線威脅模型、安全控制、弱點驗證、漏洞應變與事件準備。 |
| G | Release, QA & Integration（發布、品質與整合） | 跨線整合順序、相容性矩陣、回歸測試、發布關卡、精確 SHA 證據與回滾準備。 |
| H | Observability, Telemetry & Cost/Quota Governance（可觀測性、遙測與成本配額） | Queue／Runner 健康、任務耗時、失敗分類、成本來源、配額與安全暫停告警。 |
| I | Ecosystem, Connectors & Workflow Automation（生態串接與流程自動化） | 外部 API、Webhook、通知、資料同步、冪等處理與防重播工作流。 |
| J | Self-Healing, Chaos & Continuity（自我修復、混沌與持續營運） | 有限重試、熔斷、安全降級、檢查點、備份還原及受控故障演練。 |
| K | Knowledge Base, Docs & Governance Playbooks（知識庫、文件與治理手冊） | 架構紀錄、線別責任、操作手冊、交接模板、決策紀錄與故障排查。 |
| L | Multi-Node, Federation & Edge/Cluster Coordination（多節點、聯邦與叢集協調） | 未來自願加入節點的身分、能力排程、租約 fencing、健康檢查與跨節點協調。 |
| M | Compliance, Policy Audit & Risk Governance（法遵、政策稽核與風險治理） | 可稽核事件、政策證據、風險登錄、限時例外及資料保留控制。 |
| N | Productization, Analytics & Growth/Ecosystem Ops（產品化、分析與成長營運） | 隱私友善的產品指標、採用與品質分析、回饋循環、新手導引及生態營運。 |
| O | Lifecycle, Deprecation & Legacy Retirement（生命週期、棄用與舊系統退場） | 棄用清單、遷移窗口、相容性契約、移除核准及舊系統維護成本降低。 |
| P | Governance, Ethics & Trust/Policy Evolution（治理、倫理、信任與政策演進） | 自主權限分級、人類核准門檻、信任原則、政策演進及跨線優先級仲裁。 |

A is the highest-priority Agent Factory V2 line. B is the product integration line and follows A capability acceptance. C–H supply only required capability, security, quality, observability and integration dependencies. I–P retain independent ownership and numeric versions; planned status is not an operational-readiness claim. Multi-node execution (L) remains deferred until measured capacity evidence, explicit participant opt-in and independent security approval exist.

## 1. Five development tracks

| Track | Scope | Primary responsibility |
|---|---|---|
| A — Agent Factory V2 | Autonomous engineering workflow | Task lifecycle, isolated patch generation, CI, recovery, evidence |
| B — Global Citizen AI Network | Public product | User experience, AI workspace, contribution workflows, ledger and platform |
| C — Predictive Coding（預測編碼） | Predictive processing and prediction-error learning | Build explicit prediction, observation, error comparison and model-update loops; publish measurable signals to the other tracks |
| D — Deep Neural | Neural intelligence foundation | Memory, reasoning, evaluation, knowledge integration and cross-track learning |
| E — Deep Research（深度研究） | Research and evidence synthesis | Multi-source retrieval, source provenance and quality, corroboration, counter-evidence, cited synthesis and actionable research reports |

Each track owns its own branch, work items, version history, tests and acceptance evidence. Shared contracts are maintained centrally and changes that affect multiple tracks require explicit impact analysis.

## 2. Numeric version policy

Use numeric `MAJOR.MINOR.PATCH` only. Do not use words such as alpha, beta or rc as version identifiers.

- **MAJOR**: incompatible architecture or contract change; reset MINOR and PATCH to zero.
- **MINOR**: backward-compatible capability or subsystem addition; reset PATCH to zero.
- **PATCH**: every smaller improvement, defect fix, documentation correction that changes an operational rule, or test/quality improvement.

Examples: `1.2.4 → 2.0.0`, `1.2.4 → 1.3.0`, `1.2.4 → 1.2.5`.

Every release must update the relevant track version, the overall integration version when shared behavior/contracts change, and `CHANGELOG.md`. The authoritative current values are in `VERSION` and `versions/manifest.json`. Git tags use the exact numeric version, for example `v0.1.1`; tags are created only after the release candidate has passed its required checks and human review.

A version bump is not evidence of completion. Acceptance requires exact commit SHA, tests, CI outcome, reviewer decision and rollback instructions.

## 3. Cross-track learning and support

Tracks A, B, C, D and E must exchange reusable knowledge through reviewed, versioned artifacts:

1. A publishes engineering patterns, test fixtures, failure classifications, recovery playbooks and verified automation capabilities.
2. B contributes real product workflows, user-facing requirements, usability findings and operational constraints.
3. C (Predictive Coding) publishes explicit predictions, observed outcomes, prediction-error measurements, confidence/calibration data and tested model-update rules. It helps A anticipate task failures, B anticipate user/product needs and D prioritize memory/reasoning updates.
4. D (Deep Neural) maintains provenance-aware memory, integrates evidence, reasons over uncertainty and proposes reusable learning/evaluation strategies. It returns reviewed knowledge to A/B/C/E.
5. E (Deep Research) conducts multi-source research, checks source provenance and freshness, seeks corroboration and counter-evidence, and publishes cited findings and actionable recommendations to A/B/C/D.

### Five-track mutual-support loop

- **A → B/C/D:** verified automation, reproducible builds, test evidence, failure taxonomy and recovery playbooks.
- **B → A/C/D:** real product workflows, user feedback, operational constraints, usage patterns and measurable outcomes.
- **C → A/B/D:** predictions, prediction errors, uncertainty/calibration signals, drift indicators and experimentally validated update rules.
- **D → A/B/C/E:** reviewed memory, cross-domain synthesis, reasoning plans, evidence retrieval and evaluation recommendations.
- **E → A/B/C/D:** sourced research, verification methods, counter-evidence, source-quality assessments and cited synthesis.
- **All tracks → all tracks:** changes are proposed as versioned artifacts, reviewed by the receiving owner, tested against that track's acceptance criteria and adopted explicitly.

The shared loop is **observe → predict → act → measure outcome → calculate prediction error → explain/store evidence → revise model or plan → test → publish → adopt → monitor**. Prediction error is a learning signal, not automatic permission to mutate production systems.

No track is a subordinate of another. Each owns its roadmap and release; shared work is coordinated through documented interfaces, dependency records and cross-track PRs.

The learning loop is: **observe → record evidence → classify → review → generalize → test → publish → adopt → measure**.

No track may silently rewrite another track's code, configuration, database or policy. Reuse occurs through explicit interfaces, reviewed PRs and compatibility tests. Unverified model output is a proposal, never an authoritative fact.

## 4. Shared contracts

- Versioned task and event schemas.
- Stable API/module boundaries and explicit ownership.
- Common error taxonomy and retry semantics.
- Evidence format containing repository, branch, commit SHA, test command, result and timestamp.
- Security and privacy classification for every shared knowledge artifact.
- Prediction record contract: prediction, target, horizon, confidence, observed outcome, error metric, context/version and evidence provenance.
- Cross-track learning proposal contract: source evidence, affected tracks, expected benefit, risk, validation plan and receiving-owner decision.
- Compatibility checks before a shared contract is changed.

## 5. Integration-branch CI policy

- The integration branch `feat/github-project-showcase` is an approved base for dependent workstreams D and E while the five-track integration PR is under review.
- Pull requests targeting either `main` or the integration branch must run the same build, unit-test, type-check, lint, production-build and database/RLS verification workflow.
- A dependent branch must include the current integration branch as an ancestor; its PR diff must contain only its own workstream files.
- After the integration PR is merged, dependent PRs are retargeted to `main` only after their diff and exact-head CI are revalidated.

## 6. Quality gates

A change is not accepted merely because code was committed or a PR exists.

- Unit and integration tests must pass for the affected scope.
- Type checking, lint and production build must pass where applicable.
- Database migrations and RLS tests must run in an isolated local/test environment.
- Candidate CI must refer to the exact PR head SHA.
- Failure must be classified as code, test, dependency, infrastructure or unknown; unknown is not reported as passed.
- No automatic approval, merge, production database mutation or production deployment.
- Draft PRs remain Draft until all stated acceptance criteria are evidenced and reviewed.

## 7. Required change record

Every improvement, including a small one, records:

- old version → new version;
- track(s) affected;
- change summary and rationale;
- affected interfaces/dependencies;
- tests and exact commit SHA;
- CI status (pass/fail/pending/blocked);
- security/privacy impact;
- rollback or recovery method.

## 8. Rollback

Each change must identify the smallest safe rollback unit. Application changes should be reverted by commit or PR; schema changes require a separately reviewed forward-fix or verified migration rollback strategy. Never assume a database migration is reversible.

## 9. Five-track baseline

Track C is formally named **Predictive Coding（預測編碼）**; its current track version is recorded in `versions/manifest.json`. Track D is **Deep Neural** and Track E is **Deep Research（深度研究）**. All five tracks have independent ownership, interfaces, versions, tests and acceptance evidence. The overall integration baseline is `0.3.79`. A track version does not imply production readiness; current maturity and limitations must be stated explicitly.
