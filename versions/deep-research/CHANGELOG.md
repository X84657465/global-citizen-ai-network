## 0.1.13 — 2026-11-20

### Security
- Restrict IPv6 source URL literals to ordinary global-unicast space and reject unspecified, loopback, IPv4-compatible/mapped, ULA, link-local, site-local, multicast, documentation and special-purpose ranges.
- Explicitly reject compressed IPv4-compatible literals that bypassed the previous host-prefix checks.

### Regression coverage
- Add adversarial cases for IPv4-compatible IPv6, site-local, ORCHID/special-purpose and documentation prefixes.

### Verification
- Exact-head CI is required. URL fetching remains disabled; DNS resolution, redirect validation and connection-time address checks remain mandatory before any future fetch feature is activated.

## 0.1.12 — 2026-11-20

### Fixed
- Detect duplicate numeric project identifiers in existing research records, including differently zero-padded aliases.
- Fail closed rather than treating ambiguous identifiers as unique.

### Tests
- Add exact-duplicate and normalized-numeric-collision regression cases.

### Verification
- Exact-head CI is required; research IDs remain caller-persisted local identifiers.

## 0.1.11 — 2026-11-20

### Fixed
- Restore the Windows Supabase test port allocator to the non-default dynamic range and add a regression guard against reverting to 55000–63999.

### Verification
- Exact-head CI must pass the workflow policy test, PostgreSQL migrations and RLS suite.

# Deep Research changelog

## 0.1.10 — 2026-11-20

### Fixed
- Enforce the maximum raw text length before trimming source metadata fields.

### Tests
- Reject oversized title text padded with whitespace.

### Verification
- Exact-head CI required.

## 0.1.9 — 2026-11-20

### Fixed
- Enforce the ISO-8601 ±14:00 timezone-offset boundary for publication and retrieval provenance.

### Verification
- Added timezone-offset boundary regression tests; exact-head CI required.

## 0.1.8 — 2026-11-20

### Fixed
- Validate actual calendar dates, clock fields and timezone offset bounds instead of relying on permissive Date.parse normalization.

### Tests
- Reject invalid month/day combinations, impossible times, leap-second values and invalid timezone offsets.

### Verification
- Exact-head CI required; URL fetching remains unimplemented and must add DNS/redirect protections before activation.

## 0.1.7 — 2026-11-20

### Fixed
- Correct regex escaping in the host-literal and timezone-qualified timestamp validators.

### Verification
- Exact-head CI required.


## 0.1.6 — 2026-11-20

### Security
- Reject additional non-public IP literals and localhost aliases in research source URLs.
- Require explicit timezone offsets in ISO-8601 provenance timestamps.

### Verification
- Added regression cases; DNS rebinding and redirect validation remain responsibilities of a future network fetch layer. Exact-head CI required.


## 0.1.0 — 2026-11-20

### Added
- Initial interactive research workbench at `/deep-research`.
- Research project creation and local filtering demonstration.
- Evidence-first workflow, source-quality gates and five-track collaboration panel.

### Limitations
- Demonstration records only; no live web retrieval, persistent database or autonomous research agent is connected yet.

### Verification
- Exact-head CI and independent review pending.

## 0.1.1 — 2026-11-20

### Fixed
- Scope research workspace footer styles to the local page class.
- Carry the Predictive Coding CSS Module selector fix required by the integrated five-track build.

### Verification
- CI rerun required for this exact commit and its C-track base.

## 0.1.2 — 2026-11-20

### Fixed
- Generate the next research project ID from the highest existing numeric ID, so DR-026 is followed by DR-027 rather than skipping to DR-030.
- Reject malformed identifiers and unsafe numeric overflow; preserve uniqueness for sparse ID sequences.

### Tests
- Add deterministic unit coverage for empty, sequential, sparse and malformed ID collections.
- Register the regression suite in `npm run test:unit`.

### Verification boundary
- Research records remain local demonstration state; no persistence, live retrieval or autonomous research is implied.
- Exact-head CI is required before acceptance.


## 0.1.3

- Run full CI on the explicit A-E development-branch push allowlist.
- Keep push execution restricted to repository-owner events and verify the five workstream branches in the CI policy test.

Verification: exact-head CI and database/RLS validation required; no merge or deployment implied.


## 0.1.4 — 2026-11-20

### Fixed
- Register `tests/deep-research-source-quality.test.mjs` in the canonical unit-test command so source provenance and independent corroboration rules are actually executed in CI.

### Verification
- Exact-head CI must execute source URL safety, claim linkage, publisher-independence and counter-evidence tests; registration alone is not acceptance evidence.


## 0.1.5 — 2026-11-20

### Fixed
- Correct the CI push-allowlist regression assertion to match the actual workflow list: `main` appears once, followed by the five controlled A-E branches.
- Keep the Deep Research source quality suite registered in the canonical unit-test command.

### Verification
- Exact-head CI must execute source provenance, publisher independence, counter-evidence and research ID tests, plus build and database checks.
