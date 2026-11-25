# PR Review, Acceptance & Merge Authority Matrix
## Pull Request 審查、驗收與合併權責矩陣

**Status:** PROPOSED — 本文件須由未參與本次撰寫的獨立 Reviewer 審查，並依 Repository 正式治理程序接受後生效。  
**Scope:** 所有 GCAN Repository Pull Requests，優先適用於 Factory、A→B 契約、跨模組、資料、權限與 workflow 變更。  
**Baseline:** main `b39228e24e15c329f3053ba22a3f4dfebe77546b`（2026-11-25）。  
**Authority:** 本文件不建立 GitHub 帳號、不授予 Repository 權限、不改變 Branch Protection，也不將 GPT 角色名稱視為已驗證的 GitHub 身分。

---

## 1. 四種不同決定，不得混為一談

| 決定 | 負責角色 | 判定範圍 | 不代表 |
|---|---|---|---|
| 技術實作與自查 | Developer／任務 DRI（依工作線 owner 指派） | 程式、文件、測試與自查證據 | 不得批准自己的成果 |
| 領域／產品驗收 | 對應 Module Owner；B 產品由 GPT4 | 是否符合模組契約、需求、使用情境與產品 DoD | 不取代獨立技術審查 |
| 獨立技術審查 | GPT3；或專案負責人明確指定、且與 Developer 獨立的合格 Reviewer | 架構、安全、資料邊界、測試品質、精確 SHA 與整合風險 | 不代表 Reviewer 有 GitHub merge 權 |
| GitHub 合併授權 | Repository 中具實際合併權限的授權人／受控自動化 | 依 Branch Protection、必要 CI、必要 Review、mergeability 與政策決定 | 不可由文件、模型自稱或產品驗收自動授予 |

**GPT4 的正式責任是 B Product Lead，不是全 Repository 的最終技術 Reviewer。** GPT4 可接受 B 產品需求與使用者旅程；跨模組／高風險技術審查仍由 GPT3 或正式指定的獨立 Reviewer 執行。

## 2. 五 GPT 的審查責任

| 角色 | 可負責 | 必須交給誰 | 禁止事項 |
|---|---|---|---|
| GPT1 — A–E／Factory | Factory 功能規格、實作協調、A 線領域驗收與交接 | GPT3 做必要獨立技術審查；授權 Maintainer 合併 | 不可批准自己或自己主導的 PR |
| GPT2 — F–P | 對應模組規格、實作協調、領域驗收 | GPT3 做必要跨模組／高風險審查 | 不可批准自己或自己主導的 PR |
| GPT3 — Independent Architecture / QA | 獨立技術審查、風險判定、PASS／FAIL／BLOCKED／NEEDS_CHANGES | GitHub 合併由具權限的 Maintainer／授權流程決定 | 不得審查自己主導或實作的變更；不得把 COMMENT 當 APPROVE |
| GPT4 — B Product Lead | B 產品需求、UX、產品契約與產品驗收 | GPT3／獨立 Reviewer 做技術審查；Maintainer 做合併授權 | 不得取代 GPT3 技術審查或自行取得 Factory 權限 |
| GPT5 — Operations／授權執行支援 | 派工、阻塞清理、支援開發、證據整理 | 對應 owner 驗收；GPT3 必要獨立審查 | 不得自我驗收或把執行支援當獨立審查 |

## 3. Reviewer 身分與獨立性

1. GPT1–GPT5 是專案責任標籤，不是 GitHub 帳號或權限。GitHub Review 必須由實際登入身分提交，並由 Repository 權限查核確認其可審查／批准。
2. 若 Developer 與 Reviewer 使用同一 GitHub 身分、同一受控執行席位，或 Reviewer 未實際檢查該候選 SHA，該 Review 不得計為獨立批准。
3. GPT3 的獨立性以「未參與該變更的實作／主導」及可稽核的獨立審查過程判定；不能只因評論署名為 GPT3 就自動成立。
4. 若 GPT3 不可用，R2/R3 變更須由專案負責人指定另一位實際獨立、具適當權限的 Reviewer；否則維持 BLOCKED。不得由 Developer 自批。
5. Review 必須記錄 reviewer GitHub login、review state、提交時間、PR head SHA、審查範圍及授權查核結果。只有 COMMENT／COMMENTED 不等於 APPROVED。

## 4. 風險分級與必要審查

| 等級 | 例子 | 最低審查要求 |
|---|---|---|
| R0 — 文件／低風險 | 拼字、純說明修正、不改操作規則 | 作者自查；依 Repository 政策執行 CI；若文件改變治理規則，升級 R2 |
| R1 — 局部一般變更 | 局部 UI、一般 adapter、非核心單元測試 | Module Owner／指定 Reviewer；必要 CI 對精確 SHA 通過 |
| R2 — 跨模組／重要契約 | API、資料模型、權限、workflow、CI、Factory 核心、A→B 契約 | GPT3 或正式指定的獨立 Reviewer；必要 CI 對精確 SHA 通過 |
| R3 — 關鍵／不可逆 | 正式資料操作、Secrets、Repository 權限、Branch Protection、正式部署、不可逆遷移 | 明確人工核准；安全／資料／維運責任人審查；Agent 不得自行執行 |

任何 PR head SHA 改變後，必須重新確認 CI、Review 與驗收是否仍適用；舊 SHA 的通過結果不可沿用到新 SHA。

## 5. 合併閘門

合併前逐項確認：

- [ ] PR 有唯一 DRI、Developer、Module Owner、風險級別與明確範圍。
- [ ] Reviewer 身分與 Developer 獨立；必要 Review 為正式 APPROVED，而非 COMMENT。
- [ ] 必要 CI／測試對應目前 PR head SHA，所有必要 Job 均為成功終態。
- [ ] 沒有 PENDING、SKIPPED、CANCELLED、UNKNOWN、0 Job 或缺少證據的必要檢查。
- [ ] 沒有未解決的阻擋性 Review thread 或高風險 finding。
- [ ] 領域／產品驗收與技術審查分開記錄；領域／產品驗收結果必須明確為 ACCEPTED／APPROVED 才可合併。若結果為 REJECTED，必須先有產品負責人與授權 Maintainer 核准的例外決策紀錄，否則 BLOCKED。
- [ ] GitHub mergeability、Branch Protection 與實際合併權限允許。
- [ ] 合併前已識別具實際 GitHub 合併權限的授權者／自動化身分。
- [ ] 合併後記錄實際產生的 merge commit SHA；此 SHA 不得作為合併前置條件。

若任一必要條件不成立，狀態為 BLOCKED／NOT READY，不得以人工口頭宣稱、模型自評或歷史 CI 結果替代。

## 6. 當前 Repository 的實際落差（2026-11-25）

在本文件建立時的查核快照：

- main SHA：`b39228e24e15c329f3053ba22a3f4dfebe77546b`。
- main Branch Protection：GitHub 回傳 `protected=false`；目前未證明 GitHub 會強制執行必要 Review 或 Status Checks。
- 開啟中的 PR #559–#565：查核時均為 Draft，作者均為 `X84657465`，沒有 assignee，也沒有 requested reviewers。
- 因此，文件中的 GPT3 Reviewer 角色尚未等於 GitHub 上已指派的獨立審查者；也不能宣稱現有 PR 已有正式獨立批准。

**安全處理：** 本次只建立治理文件與 PR 範本，不修改 Branch Protection、Repository 權限、Secrets、Reviewer 帳號或既有 PR 的 Draft 狀態。Branch Protection 設定屬 R3，須先確認實際可用的獨立 Reviewer／Maintainer 帳號與必要 CI contexts，再由具管理權限者核准設定。

## 7. PR 範本必填資訊

每個 PR 應填寫：
- Task / Issue、唯一 DRI、Developer、Module Owner。
- Risk Level（R0–R3）與允許修改範圍。
- Reviewer GitHub login（未指定時明確寫 BLOCKED／待指派）。
- Acceptance Criteria、測試命令、CI Run／Attempt 與候選 SHA。
- 領域／產品驗收結果與獨立技術審查結果（分開）。
- 未解決風險、回滾方式與合併授權狀態。

---

**生效條件：** 本文件經獨立審查及正式 Repository 治理接受後才成為有效規範。即使文件已合併，也不會自動設定 GitHub Branch Protection 或建立獨立 Reviewer 身分。
