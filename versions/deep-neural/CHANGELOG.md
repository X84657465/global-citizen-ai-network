# Deep Neural Changelog

## 0.3.8 — 2026-11-20

### Fixed
- Enforce the ISO-8601 ±14:00 timezone-offset boundary for knowledge artifacts and evidence records.

### Tests
- Add valid +14:00 and invalid +14:01/-15:00 regression cases.

### Verification
- Exact-head CI required.

## 0.3.6 — 2026-11-20

### Security
- Align the Track E research-source receiver with the stricter public-host URL policy used by Track E.
- Reject loopback, private, link-local, carrier-grade NAT, documentation, multicast, reserved and IPv4-mapped IPv6 literals.

### Tests
- Add adversarial coverage for non-public IPv4 and IPv6 URL literals.

### Verification
- Exact-head CI is required; source URLs are validated but never fetched by this contract.

# Deep Neural Changelog

## 0.3.5 — 2026-11-20

### Fixed
- Harden shared knowledge-artifact and evidence-record timestamps against invalid calendar dates, impossible clock values, invalid timezone offsets and missing timezone designators.

### Tests
- Add regression coverage for impossible dates, times and timezone-less values.

### Verification
- Exact-head CI required before acceptance.

## 0.2.0 — 2026-11-20

### Added
- Runtime validators for KnowledgeArtifact, EvidenceRecord, CapabilityManifest, LearningProposal and EvaluationResult.
- Strict numeric version checks, provenance validation, reviewed-artifact gating, evidence freshness identifiers, least-privilege permission token validation and explicit unknown evaluation outcomes.
- Unit tests for valid and adversarial contract inputs.


## 0.2.1 — 2026-11-20

### Changed
- Integrated Track C Predictive Coding into Deep Neural's cross-track learning contract.
- Clarified the observe-predict-act-measure-error-review learning loop and non-autonomous production boundary.

## 0.2.2 — 2026-11-20

### Added
- Make the Deep Neural knowledge workbench interactive with local search, type filtering and artifact detail inspection.
- Add a local-only learning proposal interaction with explicit non-persistence disclosure.
- Expand cross-track knowledge exchange from four to five workstreams and remove unsupported live evidence metrics.

### Limitations
- All artifacts and interactions remain local demonstration data; no persistent knowledge store, vector database or live reasoning service is connected.

### Verification
- Exact-head CI and independent review required.

## 0.2.3 — 2026-11-20

### Fixed
- Align the runtime workstream allowlist with the five-track A–E governance model.
- Allow learning proposals to name all five affected tracks while continuing to reject unknown tracks and oversized lists.
- Update the Deep Neural architecture charter to define Track E research evidence as a first-class input to reviewed knowledge exchange.

### Tests
- Add regression coverage for Track E knowledge artifacts, all-five-track proposals, unknown track rejection and the five-track limit.

### Verification
- Exact-head CI is required before acceptance; no production data or autonomous production mutation is introduced.


## 0.3.0 — 2026-11-20

### Added
- Add a strict Track E ResearchSourceRecord receiver validator matching the E source-provenance output contract.
- Validate public HTTPS references, source and claim IDs, curated publisher identity keys, source type, stance, publication/retrieval timestamps and bounded limitations.
- Add compatibility tests using the same field shape produced by E and adversarial URL/provenance cases.

### Verification boundary
- Source URLs are validated, not fetched or authenticated. No automatic knowledge persistence, vector embedding or adoption is enabled.
- Exact-head CI and independent review are required.


## 0.3.1 — 2026-11-20

### Fixed
- Register the new Track E source-provenance validator in the contract test module import list so the added compatibility cases execute rather than fail at test setup.

### Verification
- Exact-head CI remains required.


## 0.3.2

- Run full CI on the explicit A-E development-branch push allowlist.
- Keep push execution restricted to repository-owner events and verify the five workstream branches in the CI policy test.

Verification: exact-head CI and database/RLS validation required; no merge or deployment implied.


## 0.3.3 — 2026-11-20

### Fixed
- Register `tests/deep-neural-contracts.test.mjs` in the canonical unit-test command so all runtime contract and Track E adapter cases actually execute in CI.

### Verification
- Exact-head CI must execute the complete Deep Neural contract suite; registration alone is not acceptance evidence.


## 0.3.4 — 2026-11-20

### Fixed
- Correct the CI push-allowlist regression assertion to match the actual workflow list: `main` appears once, followed by the five controlled A-E branches.
- Keep the Deep Neural contract suite registered in the canonical unit-test command.

### Verification
- Exact-head CI must pass the push policy, all Deep Neural contract tests, TypeScript, lint, production build and PostgreSQL/RLS checks.
