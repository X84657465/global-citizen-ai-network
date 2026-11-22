# J changelog

## 0.1.1 — 2026-11-22

- Snapshot trusted-provider evidence using enumerable own data descriptors before classification.
- Reject accessors, symbols, exotic prototypes, and unsupported evidence shapes without invoking caller-controlled getters.
- Redact hostile reflection/provider errors at the J evidence boundary.
- Preserve advisory-only behavior: proposals require manual approval and are never executed by J.

