# G Track — Release Evidence Contract

**Contract revision:** 1.0.0  
**Repository baseline:** 0.3.43  
**Status:** implementation candidate; not an approval or merge authority.

## Purpose

Provide a small, deterministic validation boundary for machine-readable release evidence. A release record must describe one repository, one track, one pull request, one base/head pair and the exact CI runs used to evaluate that head.

## Evidence shape

- `schemaVersion`: currently `1`.
- `repository`: canonical `owner/repository`.
- `track`: one of A–P.
- `pullRequestNumber`: positive integer.
- `baseSha` and `headSha`: full 40-character commit SHAs.
- `generatedAt`: timezone-qualified ISO-8601 timestamp.
- `checks`: non-empty array. Each check records a unique name, `success` conclusion, the same `headSha`, positive workflow `runId` and positive `runAttempt`.

Unknown root or check fields are rejected. This prevents accidental acceptance of unreviewed metadata and discourages placing secrets or arbitrary payloads in evidence.

## Acceptance rules

1. The evidence repository must match the caller's expected repository when supplied.
2. The evidence head must match the exact candidate SHA when supplied.
3. Every required check name must be present exactly once.
4. Pending, cancelled, skipped, failed or stale-head checks are not release evidence.
5. The validator is pure and performs no GitHub API calls. A trusted caller must independently authenticate workflow runs and verify their repository, event, conclusion, run attempt and head SHA before constructing evidence.
6. This contract does not approve a PR, merge code, deploy production, apply migrations or certify security.

## Implementation boundary

The module `lib/release-evidence-contract.mjs` validates shape and internal consistency only. It is not yet wired into the Agent Factory publisher or release workflow. Integration requires a separate change with exact-head CI and security review.

## Rollback

Remove the contract module, its unit tests and this document, then restore the prior numeric release metadata. No production state or database schema is changed by this contract.
