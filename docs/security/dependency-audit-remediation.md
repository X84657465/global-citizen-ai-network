# Dependency audit remediation evidence

## Scope and decision

This report records a fresh dependency audit of the locked dependency tree on the main revision below. The audit completed successfully for both production-only and complete dependency scopes. The evidence supports retaining the existing Next.js 15 and ESLint 9 major lines; it does not justify a package-manifest or lockfile edit, nor a speculative override.

- Audited revision: `2789027136f1577af5871d300ad6465cab267cab`
- Core CI run: [45916809209](https://github.com/X84657465/global-citizen-ai-network/actions/runs/45916809209)
- Windows quality-gates job: [140239281189](https://github.com/X84657465/global-citizen-ai-network/actions/runs/45916809209/job/140239281189)
- Audit date (UTC): 2026-11-27
- Root manifest version: `0.3.138`
- Lockfile format: npm lockfile v3
- Audited lockfile blob: `e5b72564051448b5195e2116eb7d51e497aa0b10`

## Exact audit evidence

The Windows quality-gates job installed the locked dependencies, then ran both commands against the audited revision:

| Command | Result | Exit status |
|---|---|---:|
| `npm audit --omit=dev --audit-level=high` | `found 0 vulnerabilities` | 0 |
| `npm audit --audit-level=high` | `found 0 vulnerabilities` | 0 |

These are the exact outcomes recorded in job 140239281189. The first command covers production dependencies; the second includes development dependencies. The result is a point-in-time npm advisory-database assessment for this lockfile and run, not a guarantee about future advisories or non-dependency security issues.

## Locked tooling chain observed

The audited lockfile contains the following resolved versions. All listed packages are marked as development dependencies in the lockfile:

| Package | Resolved version(s) | Lockfile location |
|---|---|---|
| `picomatch` | `2.3.2` | `node_modules/picomatch` |
| `picomatch` | `4.0.7` | `node_modules/tinyglobby/node_modules/picomatch` |
| `tinyglobby` | `0.2.17` | `node_modules/tinyglobby` |
| `fdir` | `6.5.0` | `node_modules/tinyglobby/node_modules/fdir` |
| `fast-glob` | `3.3.1` | `node_modules/fast-glob` |
| `eslint` | `9.39.5` | `node_modules/eslint` |
| `eslint-config-next` | `15.5.29` | `node_modules/eslint-config-next` |

The root manifest continues to declare Next.js `15.5.29`, ESLint `^9.30.1`, and eslint-config-next `15.5.29`. The existing targeted Next.js/PostCSS override remains the only root override observed.

## Remediation assessment

- `GHSA-c2c7-rcm5-vvqj` is the ReDoS advisory, and `GHSA-3v7f-55p6-f55p` is the POSIX character-class method-injection advisory that can cause incorrect glob matching. The resolved picomatch lines are at or beyond the patched 2.3.2 and 4.0.4 releases for both advisories.
- The nested `tinyglobby` / `fdir` and `fast-glob` versions were included in the successful full-tree audit; no high-severity finding was reported for this exact dependency graph in the recorded run.
- No direct dependency upgrade or additional override is indicated by the current audit output. Avoid adding overrides without a reproducible advisory, a compatible fixed release, and a fresh audit of the resulting lockfile.
- Keep the existing Next.js 15 and ESLint 9 major lines. Any future update should be a narrowly scoped compatible release, followed by both audit commands and the normal CI suite.

## Residual risk and follow-up

1. The audit result is tied to the exact lockfile blob and timestamp above. Re-run both commands after any dependency or lockfile change and periodically as the advisory database changes.
2. A zero-result npm audit does not assess application logic, malicious package publication, compromised maintainer accounts, license obligations, or vulnerabilities not yet present in the advisory database.
3. The same core CI run has an unrelated unit-test failure in `tests/agent-plan-validation.test.mjs` (test 308: patch-proposal `max_output_bytes` lower-bound fixture). Type check, lint, and production build were skipped after that failure. This does not invalidate the two audit command results, but it means the overall CI is not green.
4. No package manifest or lockfile change is proposed by this task because the fresh production and full-tree audits both reported zero vulnerabilities.

## Evidence boundary

This document records what the named CI job actually executed and observed. It does not claim that every possible security issue has been eliminated or that the repository's overall CI passed.
