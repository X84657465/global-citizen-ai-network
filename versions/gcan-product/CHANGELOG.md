## 0.1.22 — 2026-11-21

### Fixed — Make current Preview availability explicit on the public homepage
- Clarify that the current candidate SHA has no available Preview and older Preview deployments are not acceptance evidence.
- Keep the early-development, unmerged-candidate and staged workstream-maturity disclosures visible.

### Verification
- Exact-head CI, a current-SHA Preview and desktop/tablet/mobile browser acceptance remain outstanding; no Production deployment is claimed.

## 0.1.21 — 2026-11-21

### Improved — Align public homepage candidate status and release metadata
- Keep the early-development / preview-stage disclosure visible and explicit on the public homepage.
- Align the B-line version with the repository manifest and require exact-head CI plus a current Preview before visual acceptance.
- Record that the current candidate has no available Preview while Vercel reports a build-rate limit; older Preview URLs are not acceptance evidence.

### Verification
- Static source and metadata checks only. Exact-head CI, successful current-SHA Preview and desktop/tablet/mobile browser acceptance remain outstanding; no Production deployment is claimed.

## 0.1.19 — 2026-11-21

### Fixed — Responsive governance card alignment
- Center the P governance card on tablet layouts and reset it to full width on mobile.
- Clarify README architecture wording so P is not described as a sixth feature workstream.

### Verification
- Static source validation only. Exact-head CI, Preview build and desktop/tablet/mobile browser acceptance remain outstanding; no Production deployment is claimed.

## 0.1.18 — 2026-11-21

### Improved — Distinguish P governance from A–O workstreams
- Render A–O cards as workstreams and P as a distinct Governance Layer card.
- Clarify the hero operating-model summary to state that independent workstream ownership applies to A–O.

### Verification
- Static source validation only. Exact-head CI, Preview build and browser visual acceptance remain required; no Production deployment is claimed.

## 0.1.17 — 2026-11-21

### Improved — Align homepage content, layout and metadata
- Present A–O as fifteen independently owned workstreams and P as the cross-cutting Governance, Ethics & Trust layer.
- Rebalance workstream cards across desktop, tablet and mobile; visually distinguish P governance.
- Correct navigation, documentation links, architecture labels and SEO metadata.

### Verification
- Static source inspection only. Exact-head CI, successful Preview build and desktop/mobile browser acceptance remain outstanding; no Production deployment is claimed.

## 0.1.16 — 2026-11-21

### Improved — Clarify workstream and governance hierarchy
- Present A–O as fifteen independently owned workstreams and P as the cross-cutting Governance, Ethics & Trust layer.
- Improve desktop/tablet/mobile workstream card layout; visually separate the P governance card.
- Synchronize public homepage copy and architecture SVG assets with the repository landing page.

### Verification
- Static source checks only. Exact-head CI, successful Preview build and desktop/mobile browser acceptance remain outstanding; no Production deployment is claimed.

## 0.1.15 — 2026-11-21

### Improved — Align homepage visuals with A–P architecture
- Replace the legacy five-workstream diagram in the public homepage with a 16-workstream A–P architecture visual.
- Keep P visually distinct as the cross-cutting Governance, Ethics & Trust layer over A–O.
- Update the repository landing page navigation and maturity wording to match the public homepage.

### Verification
- Static source checks confirm A–P labels and matching public/documentation SVG assets.
- Exact-head CI, Vercel preview and desktop/mobile visual acceptance remain outstanding; no production deployment is claimed.

## 0.1.14 — 2026-11-21

### Improved — Align public homepage with A–E + P architecture
- Clarify A–E as engineering workstreams and P as cross-cutting Governance, Ethics & Trust.
- Update homepage navigation, hero architecture labels and governance/documentation links.
- Avoid implying that candidate workbenches or external preview routes are production-ready.

### Verification
- Exact-head integration CI and desktop/mobile browser visual acceptance remain required; no production deployment is claimed.

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
