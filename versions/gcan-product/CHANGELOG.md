# GCAN Product changelog

## 0.1.7 — 2026-11-20

### Improved
- Increase small homepage text sizes and establish readable mobile typography floors across hero, navigation, cards, governance and documentation copy.

### Tests
- Add CSS regression checks for desktop and mobile typography sizing.

### Verification
- Exact-head CI required before acceptance.

## 0.1.6 — 2026-11-20

### Fixed
- Repair escaped newline literals in homepage regression assertions so the test file parses as JavaScript.

### Verification
- Exact-head CI must pass before this candidate is accepted.


## 0.1.0

- Establish the public Global Citizen AI Network product homepage and responsive visual identity.
- Add the initial public entry point and navigation into the signed-in workspace and conversation experience.
- Add conversation message validation and owner-scoped database security regression coverage in the product workflow.
- Validate local Supabase migrations, PostgreSQL/RLS behavior, unit tests, type checks, lint and production build in CI.

**Release status:** development candidate under PR #137. Exact-head CI and independent review are required before acceptance.

## 0.1.1 — 2026-11-20

### Changed
- Synchronize the GCAN Product track version with the five-track integration manifest.
- Clarify that the product homepage and linked workspaces remain development candidates until their exact-head CI and acceptance checks pass.

### Verification
- Existing exact-head CI for the previous product candidate passed; this documentation/version update requires a new exact-head CI result.

## 0.1.2 — 2026-11-20

### Fixed
- Return the newest 500 conversation messages rather than the oldest 500, which previously hid all later history once a conversation exceeded the cap.
- Keep the response in chronological order for the workspace UI and use message ID as a deterministic tie-break for identical timestamps.

### Tests
- Add a regression guard for descending bounded retrieval followed by chronological response ordering.

### Verification boundary
- Reads remain authenticated, owner-scoped, bounded and non-cacheable; no RLS, schema, auth or production data behavior is broadened.
- Exact-head CI is required before acceptance.

## 0.1.3 — 2026-11-20

### Added
- Redesign the GCAN public homepage with responsive dark-technology visual identity and accessible workstream navigation.
- Distinguish four product value pillars from the five engineering workstreams and disclose preview/demo maturity per workbench.
- Add the five-track architecture visual, shared learning loop, trust/governance section and technical documentation routes.
- Expand page metadata and social preview information for the public product entry point.

### Verification boundary
- Homepage and linked workbenches remain development candidates; Vercel preview links do not imply production availability.
- Exact-head CI is required before acceptance. No production database schema, payment flow or account permission change is included.


## 0.1.4

- Run full CI on the explicit A-E development-branch push allowlist.
- Keep push execution restricted to repository-owner events and verify the five workstream branches in the CI policy test.

Verification: exact-head CI and database/RLS validation required; no merge or deployment implied.


## 0.1.5 — 2026-11-20

### Fixed
- Correct the CI push-allowlist regression assertion to match the actual workflow list: `main` appears once, followed by the five controlled A-E branches.

### Verification
- Exact-head CI must complete the policy test, unit tests, TypeScript, lint, production build and database/RLS jobs.
