# Development dependency audit remediation

**Review date:** 2026-11-19  
**Repository baseline:** `main` at the time this task was inspected  
**Scope:** development-only Next.js / ESLint tooling dependencies

## Executive result

The checked-in lockfile contains both patched and still-unpatched glob-related dependency lines. The historical picomatch advisories CVE-2026-33671 / GHSA-c2c7-rcm5-vvqj and CVE-2026-33672 / GHSA-3v7f-55p6-f55p are fixed by picomatch 4.0.4, 3.0.2, and 2.3.2 respectively. The lockfile's 2.3.2 and 4.0.7 lines meet those historical minimums.

That is **not** sufficient to call the dependency tree clean. A later high-severity advisory, GHSA-fc5q-39xc-vjpf / CVE-2026-112366, reports picomatch versions through 4.0.7 as affected and does not publish a patched version. The lockfile currently resolves picomatch 4.0.7 under tinyglobby. Separately, GHSA-vfj7-8cjw-p6xm reports the braces 3.0.3 line as vulnerable with no published patched release; that line is reached through eslint-config-next -> @next/eslint-plugin-next -> fast-glob -> micromatch -> braces.

Therefore the correct disposition is **known development-tooling findings remain; no safe complete fix can currently be asserted from the available patched releases**. Do not add a speculative override, downgrade a framework major, or suppress the audit finding.

## Lockfile inventory

The following versions were read from `package-lock.json`, not inferred from package ranges:

| Package / lockfile path | Locked version | Relevant dependency edge |
|---|---:|---|
| `node_modules/next` | 15.5.29 | Production framework |
| `node_modules/eslint` | 9.39.5 | Development tooling |
| `node_modules/eslint-config-next` | 15.5.29 | `@next/eslint-plugin-next@15.5.29` |
| `node_modules/@next/eslint-plugin-next` | 15.5.29 | `fast-glob@3.3.1` |
| `node_modules/fast-glob` | 3.3.1 | `micromatch@^4.0.4` |
| `node_modules/micromatch` | 4.0.8 | `braces@^3.0.3`, `picomatch@^2.3.1` |
| `node_modules/braces` | 3.0.3 | Unpatched advisory GHSA-vfj7-8cjw-p6xm |
| `node_modules/picomatch` | 2.3.2 | Meets the older 2.x patched floor; still requires a fresh audit |
| `node_modules/tinyglobby` | 0.2.17 | Depends on `fdir@^6.5.0` and `picomatch@^4.0.4` |
| `node_modules/tinyglobby/node_modules/fdir` | 6.5.0 | No replacement is justified without a matching advisory / compatible upstream release |
| `node_modules/tinyglobby/node_modules/picomatch` | 4.0.7 | Affected by GHSA-fc5q-39xc-vjpf according to the published advisory |

The two chains are different and must not be conflated:

1. Next ESLint plugin -> fast-glob -> micromatch -> braces.
2. tinyglobby -> picomatch 4.0.7.

Upgrading tinyglobby or fdir alone does not prove that the picomatch finding is removed. Likewise, changing picomatch does not remove the braces path.

## Compatibility and remediation decision

| Component | Current lock | Safe action now | Decision |
|---|---:|---|---|
| picomatch 2.x | 2.3.2 | This meets the older 2.x patched floor (2.3.2), but re-check every current advisory | Keep pending fresh audit |
| picomatch 4.x | 4.0.7 | Newer high advisory covers versions through 4.0.7 and has no published patched floor | No override can be claimed as a fix yet |
| tinyglobby | 0.2.17 | Preserve API-compatible line; verify its next release and resolved picomatch edge before updating | No blind upgrade |
| fdir | 6.5.0 | No evidence in the inspected advisory sources that an fdir upgrade resolves either finding | Keep |
| fast-glob | 3.3.1 | Its current micromatch -> braces path reaches an advisory with no patched braces release | Wait for upstream remediation or a reviewed compatible replacement in the owning Next ESLint plugin |
| eslint-config-next / Next.js | 15.5.29 | Keep both on the existing 15.x line; upgrade only to a compatible patched 15.x release after reviewing its peer and dependency graph | Do not force a major downgrade or upgrade |
| ESLint | 9.39.5 | Preserve major 9; confirm peer compatibility before any update | No major change |

A future patch may be applied only when all of these are true:

- The upstream release publishes a fixed version for the exact advisory and affected major line.
- The chosen Next.js and eslint-config-next versions remain mutually compatible and preserve the project's current major lines.
- `npm ls picomatch braces fast-glob tinyglobby fdir` confirms the intended graph.
- A fresh `npm audit --json` records advisory IDs, affected paths, severity, and patched ranges.
- Both `npm audit --omit=dev --audit-level=high` and `npm audit --audit-level=high` are rerun after the lockfile is regenerated.
- Unit tests, typecheck, lint, and production build pass.

If upstream offers no patched release, retain the visible finding and document the dev-only execution boundary. Do not use `npm audit fix --force`, a broad `overrides` entry, or an audit suppression as a substitute for a patch.

## Audit commands and evidence required

Run from a clean checkout with the committed lockfile:

```powershell
npm ci
npm ls picomatch braces fast-glob tinyglobby fdir
npm audit --omit=dev --audit-level=high
npm audit --audit-level=high
npm audit --json
```

Record the UTC timestamp, Node/npm versions, exit code, full audit summary, advisory IDs, and dependency paths. The repository CI currently runs the production audit as a blocking step and the full development-inclusive audit with `continue-on-error: true`; a green build therefore does **not** prove the development dependency audit is clean.

## Residual risk

- The reported paths are in development / lint tooling according to the inspected lockfile and upstream advisory discussions; this reduces production runtime exposure but does not eliminate developer or CI resource-exhaustion risk.
- Do not accept attacker-controlled glob patterns in tooling or configuration paths that reach these libraries.
- The current report is a lockfile and advisory review, not a fresh execution of `npm audit`. CI evidence must be attached before any claim that either audit passes.
- No package manifest or lockfile was changed in this task because Issue #17 explicitly prohibits those changes until the Runner's path allowlist supports them.

## References

- [GitHub Advisory Database: GHSA-c2c7-rcm5-vvqj (picomatch historical patched floors)](https://github.com/advisories/GHSA-c2c7-rcm5-vvqj)
- [GitHub Advisory Database: GHSA-fc5q-39xc-vjpf (picomatch through 4.0.7; patched version unknown)](https://github.com/advisories/GHSA-fc5q-39xc-vjpf)
- [Next.js discussion: GHSA-vfj7-8cjw-p6xm braces finding and absence of a patched release](https://github.com/vercel/next.js/discussions/100590)
- [Next.js discussion: replacing fast-glob in the ESLint plugin is an upstream proposal, not a released fix](https://github.com/vercel/next.js/discussions/100028)
