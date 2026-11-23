# AI provider invoice CSV preview (Issue #85)

## Status

This document describes the read-only parsing and evidence-matching foundation. It is not a claim that the complete admin upload workflow is shipped or accepted. The API/UI integration, independent review, and exact-head CI remain required.

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
- TWD normalization is emitted only when the caller supplies an explicit positive rate, matching source currency, target TWD, and parseable timestamp. Original amount and currency remain present.

The parser returns a SHA-256 source fingerprint so an operator can recognize an identical file during preview. This foundation does not persist fingerprints, invoice rows, or reconciliation outcomes. Cross-session duplicate-file detection therefore requires a separately approved persistence design and is not claimed here.

## Safety and limitations

- Pure parsing and preview only: no provider polling, credentials, scheduled jobs, database writes, ledger changes, payments, refunds, or automatic adjustments.
- No invoice contents or secrets are logged.
- This module does not establish a financial liability. A preview is evidence for human review, not a ledger posting or accounting approval.
- Admin authentication, upload-size enforcement at the HTTP boundary, safe UI rendering, and integration tests must be verified in the API/UI follow-up before the MVP can be accepted.
