## 0.1.22 — 2026-11-23

### Added — Refresh the B product delivery map and dependency backlog
- Translate the Product North Star into a capability-by-capability delivery matrix, separating mainline source presence, candidate work, unknown acceptance, blocked capabilities and future research.
- Refresh Workspace PR #391 evidence and keep its exact-head CI/browser acceptance gates explicit.
- Correctly distinguish the closed #354 lease-handoff fix from the still-open Factory-wide acceptance and independent #136 audit gate.
- Add prioritized B delivery packages with owners, dependencies and evidence-based exit conditions.

### Verification
- Documentation and B version metadata only; no application code, migrations, runtime, database, browser/device tests or deployment were changed/run.
- Candidate metadata increment only. Exact-head CI and independent review remain pending; no release or acceptance is claimed.

## 0.1.21 — 2026-11-23

### Governance and baseline — Keep the B product plan evidence-aligned
- Add the GCAN B Product Lead charter and long-term Product North Star, explicitly separating roadmap intent from implemented or accepted capability.
- Add the B source-inspection baseline and refresh its live dependency evidence: Issue #354 is closed by the integrated PR #362 lease-handoff fix; PR #383 is closed; neither result is misrepresented as full Factory acceptance.
- Preserve the four-GPT coordination model as a candidate pending independent review, exact-head CI and integration into main.
- Keep the A→B Read Adapter proposal-only and B Runtime BLOCKED / PREPARATION ONLY; no paid AI traffic, runtime activation, migration, deployment or new execution authority is introduced.

### Verification
- Documentation and version metadata only; no runtime, database, browser/device or deployment tests were run for this changelog entry.
- Exact-head CI and independent review remain pending; this version is a candidate metadata increment, not a release or acceptance claim.

## 0.1.20 — 2026-11-22

### Changed — Align the public GCAN homepage with the A–P architecture
- Publish the fifteen A–O workstream cards and identify P as the cross-cutting Governance, Ethics & Trust layer.
- Make the factory-first, B-next, ecosystem-last development priority explicit on the public homepage.
- Add responsive workstream layouts, direct Workspace/Factory navigation, and exact-SHA Preview disclosure.
- Preserve early-development and demonstration-data disclosures; no production readiness or operational capability is implied.

### Verification
- Exact-head CI and current-SHA Preview acceptance are pending for this candidate.

## 0.1.19 — 2026-11-21

### Fixed — Preserve the current A integration baseline in B metadata
- Keep the B stack aligned with its actual A 2.0.84 parent instead of reverting the repository release, A track version, and active Agent Factory PR link to superseded 0.3.112 / 2.0.79 / PR #195 metadata.
- Preserve the parent integration baseline at 0.3.117 and increment only the GCAN Product track to 0.1.19.

### Verification
- Fresh exact-head CI and independent cross-track review remain required; no deployment or production data mutation is claimed.

## 0.1.18 — 2026-11-21

### Fixed — Enforce workspace metadata title constraints
- Reject blank/whitespace-only and over-160-character conversation and project titles before updating workspace state.
- Extend malformed metadata regression fixtures for empty and oversized titles.

### Verification
- Exact-head full CI and independent cross-track review required before acceptance.

## 0.1.17 — 2026-11-21

### Fixed — Validate workspace metadata before state updates
- Reject conversation metadata with malformed conversation UUIDs, invalid project UUID relationships, missing titles or invalid update timestamps.
- Retain only active project records with valid UUIDs and expected metadata shape; reject malformed records fail-closed.
- Keep message API projections limited to fields consumed by the workspace client; remove the unused model column from GET and POST responses.
- Add behavioral fixtures for valid, malformed, archived and empty metadata, plus exact message API projection regression coverage.

### Verification
- Exact-head CI, authenticated API contract review and independent cross-track review required before acceptance. No production deployment or database mutation is claimed.

## 0.1.13 — 2026-11-20

### Integrated
- Add the public GCAN homepage, five-track architecture visuals and login entry on the Agent Factory V2 integration base.
- Route A and C workbenches to first-party application routes while preserving D and E as clearly labeled standalone previews until their routes are integrated.
- Preserve the factory-owned Workspace recovery, message API, validation and owner-security implementation.

### Verification
- Exact-head integration CI and browser visual acceptance remain required; no production deployment is claimed.

## 0.1.12 — 2026-11-20

### Accessibility and readability
- Increase supporting copy, workstream descriptions, feature lists and secondary metadata to a more readable desktop/mobile size floor.
- Add a homepage regression test to guard the desktop and mobile typography rules.

### Verification
- Exact-head CI required; no browser or device visual pass is claimed.

# GCAN Product Changelog

## 0.1.11 — 2026-11-20

### Fixed
- Allocate Windows Supabase CI ports from 20000–39999, outside the default dynamic TCP range, and guard the formula with a regression test.

### Verification
- Exact-head CI required.

## 0.1.9 — 2026-11-20

### Fixed
- Correct timestamp-validator regex escaping and validate every accepted timezone-qualified timestamp through the runtime date parser.

### Verification
- Exact-head CI required.

## 0.1.8 — 2026-11-20

### Security
- Share strict ISO-8601 timestamp validation across workspace message and conversation response handling.

### Verification
- Added valid and adversarial timestamp test cases; exact-head CI required.


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
