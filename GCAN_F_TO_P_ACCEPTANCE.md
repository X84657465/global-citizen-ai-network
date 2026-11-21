# GCAN F–P Acceptance Record

**Audit status:** first-round GitHub evidence review completed; runtime acceptance remains incomplete.  
**Execution limitation:** this session had GitHub repository read/write access but no local checkout or shell/Runner execution. Therefore no npm, TypeScript, ESLint, Next build, database, or local integration command was run.

## Acceptance policy

- Record repository, PR, base SHA, exact head SHA, workflow/run ID, attempt, required jobs, and conclusion.
- Only complete required CI for the exact current head can count as a repository CI pass.
- Mirror tests and manually reported test results are useful hints, not repository CI acceptance.
- Missing workflow evidence is UNKNOWN, never PASS.
- No production DB migrations, deploys, destructive tests, or permission changes under this audit.

## Evidence matrix

| Track / PR | Evidence observed | Verdict |
|---|---|---|
| F #145 | PR states security tests registered but not run; no associated exact-head workflow run returned | BLOCKED / UNKNOWN |
| G #147 | No associated workflow run returned for candidate head | UNKNOWN |
| G #148 | Actions run #44703057912 for head `273eb012f7558c1223c3af3d4543c6745d6aaefa` concluded failure | FAIL |
| H #150 | Actions run #44781690181 for head `d2bd6d49edae549dde319750a64a101bd7b5fabf` concluded failure | FAIL |
| I | No independent implementation/acceptance located | NOT ACCEPTED |
| J | A has related retry/recovery code, but no J-owned acceptance evidence | NOT ACCEPTED |
| K | Existing runbooks/docs; no track-specific execution evidence | PARTIAL DOCS ONLY |
| L #66 | Actions run #44297572047 for head `8e28ceb2a1ca0c992dc8304c8537ea50bf94584a` concluded failure | FAIL |
| L #67 | Author reports 9/9 isolated Node 22 mirror tests and pure-module TS check; not full repo CI | PARTIAL / NOT ACCEPTED |
| M | No independent implementation/acceptance located | NOT ACCEPTED |
| N | No independent implementation/acceptance located | NOT ACCEPTED |
| O | No independent implementation/acceptance located | NOT ACCEPTED |
| P #68 | PR reports CI and AI Security Static Checks failure; full local audit not run | FAIL / BLOCKED |
| P #206 | Exact-head CI and preview were pending in PR evidence | PENDING |

## Local verification commands — NOT RUN

Execute from a clean, authorized checkout after confirming the intended branch and preserving existing work:

```bash
git status --short --branch
git worktree list
npm ci
npm run test:unit
npx --no-install tsc --noEmit
npm run lint
npm run build
```

Inspect `.github/workflows/ci.yml` for the authoritative job matrix and required services. Run Supabase/PostgreSQL and RLS tests only in isolated test infrastructure following repository instructions; never point test commands at production.

## Track-specific exit criteria

- **F:** security headers and policy tests pass; threat model covers trust boundaries; dependency/security review and incident response ownership verified.
- **G:** schema/contract tests pass; GitHub run identity and exact-head provenance authenticated; stale/mismatched evidence rejected; publisher integration tested in a safe harness.
- **H:** contract tests pass; telemetry source authenticated; data minimized/redacted; read-only Runner/queue integration and alert thresholds tested; no automatic Runner mutation.
- **I:** connector auth scopes, signature verification, idempotency/replay, rate limits, retries, secret redaction and provider-failure handling tested.
- **J:** bounded retry, checkpoint recovery, backup/restore drill, idempotency and escalation tested in non-production.
- **K:** accountable owner, freshness policy, reviewed runbooks, validated links and successful operator walkthrough.
- **L:** signed worker identity, sandbox isolation, least privilege, egress restrictions, revocation, workload verification, explicit opt-in, H capacity evidence and F security approval.
- **M:** audit event schema, actor attribution, retention/privacy review, exception lifecycle and evidence export tests.
- **N:** approved metric definitions, consent/privacy controls, real event provenance, retention and product outcome tests.
- **O:** consumer/dependency inventory, migration window, compatibility tests, rollback plan and owner approval before retirement.
- **P:** autonomy tiers, approval/escalation rules, enforceable server/CI controls, independent review and governance regression tests.

## Current acceptance decision

No F–P module is fully accepted by this audit. F/G/H/L/P have candidate artifacts with failed, missing, or incomplete evidence; K has documentation assets; I/J/M/N/O remain planned. This record intentionally reports partial status rather than inferring completion from roadmap or PR existence.
