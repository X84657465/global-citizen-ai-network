# GCAN Product changelog

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
