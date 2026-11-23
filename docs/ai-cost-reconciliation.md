# AI provider invoice CSV preview (Issue #85)

## Status

A read-only first vertical slice is implemented in the admin AI cost dashboard:
- bounded CSV parsing and validation;
- authenticated admin-only preview endpoint;
- upload and preview surface in the existing admin dashboard;
- exact-evidence request matching and explicit variance/unmatched/duplicate outcomes;
- deterministic repeated-file fingerprint detection within the active dashboard session.

The work is still a Draft candidate. Exact-head CI, integration tests, independent GPT3 review, and owner acceptance remain required.

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
- Exact-head tests, TypeScript, lint, production build, and independent review are still required before acceptance.
