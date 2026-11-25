# G — Changelog

## 0.1.4 — 2026-11-25

- Reject repeated GitHub Actions job URLs across distinct required job IDs so one underlying job cannot satisfy multiple release gates.
- Add a regression proving four distinct required job IDs sharing one job URL are rejected; preserve exact run/attempt binding and advisory-only authorization.

## 0.1.3 — 2026-11-23

- Reject canonical array-index properties outside the declared array length in exact-head CI evidence snapshots.
- Add a zero-length hidden-index regression; preserve fail-closed, advisory-only release assessment.

## 0.1.2 — 2026-11-22

- Add the G release/QA integration operating guide.
- Define exact-SHA and run-attempt evidence requirements and fail-closed gate aggregation.
- Add cross-track compatibility and release evidence templates.
- Documentation/process capability only; no runtime, workflow, Runner, database, permission, or deployment changes.

## 0.1.1

- Initial G workstream registry entry.
