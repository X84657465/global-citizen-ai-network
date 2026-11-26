## P 0.1.5 — 2026-11-26

- Extend the executable A–P version contract to verify the README's displayed H and P track versions against the canonical manifest.
- Synchronize the H/P version summaries and advance P's governance validator with regression coverage for stale displayed track versions.

## P 0.1.4 — 2026-11-22

- Require a current, independently versioned changelog entry for every F–P workstream.
- Preserve deferred L as a versioned roadmap baseline without enabling federation or cluster implementation.
- Add missing H, I, L, N and O track-history baselines and reject missing/stale history during the canonical validation command.

## P 0.1.3 — 2026-11-22

- Validate the A–P engineering-workstream planning baseline against the canonical repository release version.
- Add a regression test that rejects stale architecture-document baselines.

## P 0.1.2 — 2026-11-22

- Add a pure A–P version contract validator.
- Require every workstream to own a numeric MAJOR.MINOR.PATCH version.
- Verify root, package, both package-lock version copies, manifest, README and governance baseline remain synchronized.
- Require top-level and P-specific changelog entries to match current versions.
- Add unit regression coverage and wire validation into the unit-test command.
