# GCAN F–P Master Agent Brief

**Audience:** GCAN main controller and B Product integration owner  
**Date:** 2026-11-21 (Asia/Taipei)  
**Audit branch:** `audit/f-p-engineering-handover-20261121`

## Executive handoff

F–P is a defined part of the A–P architecture, but it is not eleven completed modules. First-round evidence supports the following:

| Track | Actual state | Controller decision |
|---|---|---|
| F | Security governance / headers candidate; tests not proven passed | Review ancestry, run tests, independent security review |
| G | Release-evidence validator candidate; #147/#148 overlap; #148 CI failed; publisher integration absent | Select one candidate, fix and validate exact head |
| H | Sanitized Runner-health contract; CI failed; live telemetry not connected | Rebuild on accepted G parent; read-only telemetry only |
| I | Planned; no accepted connector module located | Define provider-neutral contract and owner |
| J | Planned; A retry/recovery does not equal J acceptance | Define bounded recovery and non-production drills |
| K | Existing docs/runbooks; independent K acceptance incomplete | Assign freshness owner and operator walkthrough |
| L | Cost-routing/device/workload policy candidates only; no node worker runtime | Keep deferred until H capacity proof and F security gates |
| M | Planned audit/risk system | Define event, retention, exception and reviewer contracts |
| N | Planned analytics/growth operations | Define consent-aware event and metric contracts |
| O | Planned deprecation/legacy retirement | Inventory consumers; no deletion without migration approval |
| P | Governance/ethics/trust policy candidates; enforcement not proven | Review policy and prove server/CI enforcement |

## Critical blockers

1. F PR #145 head branch differs from the base branch used by PR #146. Verify ancestry before claiming F→G stack.
2. G PR #147 and #148 overlap. Select one; #148 exact-head CI failed.
3. H PR #150 depends on G v2 and exact-head CI failed.
4. L #66 CI failed; #67 has only author-reported mirror tests. Keep L deferred.
5. P #68 checks failed; #206 exact-head CI/preview evidence was pending.
6. B #187 and #201 have different parents. Select one B ancestry stack before transplanting work.
7. No local checkout or shell/Runner execution was available during this audit; local build, test, DB and dirty-worktree status remain unknown.

## Protect Agent Factory V2

- Integrated main A baseline observed: version 2.0.71, candidate integrated-main SHA `5b274eed904e40159c8ab8c13bba68fbc83c1370`.
- A #200 candidate version 2.0.84, head `4891340e4c7d2bd3398bbec50eca9624624b0a81`, has exact-head CI success evidence recorded for that PR.
- A #208 candidate head `c19f3136be61fc61811a9923d8a7247f4c7317fa` is draft/pending; do not treat as accepted.
- This audit branch changes handover documentation only; it does not modify A runtime.

## B integration decision

Do not merge F–P into B yet. B can consume the security requirements, evidence concepts, runbooks and risk boundaries as design inputs. G/H runtime connections remain blocked until exact-head CI, provenance, privacy and owner reviews pass. Select one B ancestry chain (#187 or #201), then retest the final combined SHA.

## Files on this audit branch

- `GCAN_F_TO_P_MASTER_REPORT.md`
- `GCAN_F_TO_P_HANDOVER.md`
- `GCAN_F_TO_P_ACCEPTANCE.md`
- `GCAN_F_TO_P_INTEGRATION_MAP.md`
- `GCAN_F_TO_P_MASTER_AGENT_BRIEF.md`

## Shared governance / coordination files

- `GCAN_SHARED_ENGINEERING_GOVERNANCE.md` — shared infrastructure, evidence levels, Git branch/worktree isolation, protected boundaries; proposal only.
- `GCAN_SHARED_TASK_LEDGER.md` — initial task register with unassigned owners and evidence-based next actions.

## Next priorities

1. Verify F ancestry and obtain security acceptance.
2. Select G, fix exact-head CI and authenticate evidence provenance.
3. Fix H and wire read-only telemetry only after F/G gates.
4. Keep L deferred; do not run community workers.
5. Create owned scopes, contracts and tests for I/J/K/M/N/O/P.
6. Have B owner select one parent stack and rerun required checks on final SHA.
7. Obtain local checkout/isolated CI to run the acceptance checklist; update the acceptance record with exact run IDs and outcomes.
