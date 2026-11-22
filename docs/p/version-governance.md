# P — Governance, Ethics & Trust/Policy Evolution

## Numeric version ownership

P is a separately versioned cross-cutting governance workstream. It does not replace the authority of A–O owners, security controls, branch protection, or human approval.

- P maintains its own numeric `MAJOR.MINOR.PATCH` version and `docs/p/CHANGELOG.md`.
- F–P each maintain a dedicated `docs/<track>/CHANGELOG.md` whose first (latest) dated entry must match that track's manifest version.
- L's changelog records its numeric roadmap baseline only; its implementation remains deferred.
- MAJOR changes represent incompatible governance architecture or authority-contract changes.
- MINOR changes add backward-compatible governance capabilities.
- PATCH changes cover smaller policy, validation, documentation, and test improvements.
- Every repository release keeps `VERSION`, `package.json`, the root package-lock version, `versions/manifest.json`, and the top-level `CHANGELOG.md` synchronized.
- Every A–P track has its own numeric version in the manifest. A version value is not evidence of maturity, acceptance, or production readiness.

## Enforced contract

`lib/p/workstream-version-assurance.mjs` provides a pure validator for:
- the exact A–P registry (no missing, duplicate-by-key, or extra track identifiers);
- a numeric version owned by every track;
- synchronized overall release values in root, package and both package-lock metadata copies;
- README release, engineering-governance baseline and engineering-workstream planning baseline matching the overall version;
- the first entry in the overall changelog matching the release version and a valid calendar date;
- the first entry in the P changelog matching the P track version and a valid calendar date;
- the first (latest) dated entry in every F–P track changelog matching its manifest version, including the explicit deferred L baseline.

`scripts/validate-workstream-versions.mjs` runs the contract against repository files. The check is included in `npm run test:unit` so CI exercises it with the unit suite.

## Authority and safety boundaries

The validator is read-only and deterministic. It does not create tags, approve releases, merge pull requests, modify versions, change branch protection, or deploy. Exact-head CI and independent formal review remain mandatory. Cross-track changes must identify affected owners and preserve all existing approval gates.

## Current maturity

This is an implementation candidate for repository version consistency. It does not claim independent review completion, merge acceptance, or release authorization.
