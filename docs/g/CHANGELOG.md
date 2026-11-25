# G — Changelog

## 0.1.4 — 2026-11-25

- Reject repeated GitHub Actions job URLs even when job IDs differ, preventing one job record from satisfying multiple required gates.
- Give required-job fixtures distinct URL identities and add a four-job shared-URL regression.
- Preserve exact run/attempt identity and advisory-only acceptance/merge/deployment flags.

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
