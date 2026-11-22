## P 0.1.3 — 2026-11-22

- Validate the A–P engineering-workstream planning baseline against the canonical repository release version.
- Add a regression test that rejects stale architecture-document baselines.

## P 0.1.2 — 2026-11-22

- Add a pure A–P version contract validator.
- Require every workstream to own a numeric MAJOR.MINOR.PATCH version.
- Verify root, package, both package-lock version copies, manifest, README and governance baseline remain synchronized.
- Require top-level and P-specific changelog entries to match current versions.
- Add unit regression coverage and wire validation into the unit-test command.
