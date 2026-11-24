# AI provider invoice CSV preview (Issue #85)

## Implementation status — 2026-11-25

The read-only invoice-preview implementation has been merged into `main` through PR #530 (merge commit `a3c244b3684966922373892fb4ab087cf776e3aa`). The main baseline checked for this status update is `e37cec78de7131b2c066952500eb739d9dc4c2cd`.

This merge is implementation progress, **not full Issue #85 acceptance**. Issue #85 remains OPEN. Do not describe the feature as fully accepted, independently approved, or production-accounting complete until every required gate is evidenced on the applicable exact SHA.

The current mainline evidence observed on 2026-11-25 is:
- GitHub Actions: no run was returned for the exact main SHA in this check; status is UNKNOWN, not PASS.
- Vercel: FAILURE.
- CircleCI Pipeline #380: ERROR.
- No exact-main CI pass or formal GPT3 APPROVED review is established by this status update.

The current GPT2 candidate evidence is:
- PR #536 head `c848ba193417eea9f80dfac0b1d5958a1457ba9f`.
- GitHub Actions run `45462687029`: completed SUCCESS on this exact head. Resolver, Windows quality gates (unit tests, TypeScript, lint, audits, production build), Ollama/local execution integration, and Supabase migrations/PostgreSQL/RLS integration all completed SUCCESS.
- Conditional evidence/persistence/diagnostic jobs were SKIPPED; those skips are not independent passes and are not represented as required quality-gate passes.
- Main external statuses at the time of this check: Vercel FAILURE (build-rate-limit); CircleCI Pipeline #380 ERROR.
- The review records checked for this candidate are COMMENTED only; no formal GPT3 APPROVED review is established.

## Delivered implementation

The merged read-only first vertical slice provides:
- bounded CSV parsing and validation;
- authenticated admin-only preview endpoint;
- upload and preview surface in the existing admin dashboard;
- exact-evidence request matching and explicit variance/unmatched/duplicate outcomes;
- deterministic repeated-file fingerprint detection within the active dashboard session.

## Remaining acceptance gates

Keep Issue #85 OPEN until the owner records evidence for all applicable acceptance criteria, including:
- complete exact-head CI validation, including unit tests, TypeScript, lint, and required integration/build gates;
- formal independent GPT3 review of the exact candidate head, recorded as APPROVED (COMMENTED is not approval);
- confirmation that every acceptance criterion is met without expanding scope into provider polling, credential handling, scheduled jobs, invoice persistence, schema/migration changes, ledger writes, payments, or automatic financial adjustments;
- explicit owner acceptance based on the above evidence.

A missing Actions run, PENDING state, 0 jobs, SKIPPED jobs, provider API/log retrieval failure, or external rate limit must be recorded as UNKNOWN/BLOCKED rather than PASS.

## CSV contract

UTF-8 CSV, maximum 1 MB and 5,000 data rows. The first row must contain these unique headers (column order may vary):

```csv
provider,model,billing_period_start,billing_period_end,source_reference,currency,amount
openai,gpt-model,2026-11-01,2026-11-30,provider-request-id,USD,1.25000000
```

- Dates use `YYYY-MM-DD`; period start must not be after period end.
- Amount is a non-negative decimal with at most eight fractional digits. Scientific notation, grouping separators, and negative values are rejected.
- Supported currencies in this first bounded format: AUD, CAD, CHF, CNY, EUR, GBP, HKD, INR, JPY, KRW, SGD, TWD, USD.
- `source_reference` is an opaque provider reference. It must not contain secrets or credentials.
- Quoted CSV fields and doubled quote escaping are supported. Malformed quoting and inconsistent column counts fail closed.

## Evidence semantics

- `matched_actual`: exact source reference equals the request's provider request ID, provider/model agree, request creation time falls inside the supplied billing period, and provider-reported billed amount and currency exactly agree.
- `variance`: exact request evidence exists but billed amount or currency differs. This is never silently corrected.
- `unmatched_estimate`: no exact request-level evidence supports a match.
- `duplicate_row`: repeated normalized row; excluded from counted unique rows.
- `duplicate_reference`: same source reference appears with a different row; excluded from matched actuals pending human review.
- TWD normalization is emitted only when the operator supplies an explicit positive rate, matching source currency, target TWD, and parseable timestamp. Original amount and currency remain present.

The preview returns a SHA-256 source fingerprint. The dashboard compares it against fingerprints already previewed in the active browser session and flags repeated files so operators do not treat the same source as a new import. No fingerprints or invoice rows are persisted; cross-session duplicate-file suppression is not claimed.

## Safety and limitations

- The POST preview endpoint checks the current active-admin role before processing, enforces a bounded streamed request body, and reads only request-level evidence needed for the preview.
- Pure parsing and preview only: no provider polling, credentials, scheduled jobs, database writes, ledger changes, payments, refunds, or automatic adjustments.
- No invoice contents or secrets are logged.
- A preview is evidence for human review, not a ledger posting or accounting approval.
- Exact-head tests, TypeScript, lint, production build, and independent review remain required for full Issue #85 acceptance.
