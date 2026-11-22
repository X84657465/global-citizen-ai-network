# Work-item record

> Copy this template into the issue or implementation record. Replace every bracketed field. Use `Not applicable` with a reason; do not silently omit evidence.

## Identity and ownership

- **Work item:** [issue / PR]
- **Track(s):** [primary track; list every affected receiving track]
- **Accountable owner:** [track owner / reviewer]
- **Objective:** [observable outcome]
- **Non-goals:** [explicit exclusions]
- **Allowed paths:** [exact repository paths]
- **Current status:** [proposed / in progress / blocked / merged / accepted]
- **Track version transition(s):** [track old → new; unaffected tracks unchanged]
- **Repository version transition:** [old → new, if applicable]

## Dependencies and compatibility

- **Base branch and exact base SHA:** [branch + full SHA]
- **Candidate branch and exact head SHA:** [branch + full SHA]
- **Upstream dependencies:** [issue / PR / contract]
- **Receiving owners:** [owner and compatibility decision for each cross-track interface]
- **Interface/schema impact:** [none or exact contract and compatibility evidence]

## Verification plan

| Gate | Required? | Exact command / workflow | Evidence reference | Result |
|---|---|---|---|---|
| Unit/regression tests | [yes/no + reason] | [command] | [URL/artifact] | [pending/pass/fail/N/A] |
| Type check / lint / build | [yes/no + reason] | [command] | [URL] | [pending/pass/fail/N/A] |
| Security review | [yes/no + reason] | [scope] | [review URL] | [pending/pass/fail/N/A] |
| PostgreSQL / RLS | [yes/no + reason] | [integration job] | [run URL] | [pending/pass/fail/N/A] |
| Local service integration | [yes/no + reason] | [service + bounded test] | [run URL] | [pending/pass/fail/N/A] |
| Independent formal review | [yes/no + reason] | [review requirement] | [review URL] | [pending/approved/changes requested/N/A] |

## Safety, operations and recovery

- **Security/privacy impact:** [data classes, trust boundary, threat change]
- **Resource budget:** [bounded runtime, retries, external calls, compute]
- **Operational change:** [telemetry/runbook impact or none]
- **Rollback / forward-fix:** [safe recovery path]
- **Approval boundary:** [human approvals required; never imply this record grants authority]

## Acceptance statement

- **Exact accepted SHA:** [full SHA]
- **All required checks terminal:** [yes/no]
- **Independent review complete:** [yes/no]
- **Blocking findings resolved:** [yes/no]
- **Receiving-owner compatibility confirmed:** [yes/no/N/A with reason]
- **Acceptance owner and timestamp:** [identity / UTC timestamp]

A merge, version bump, draft PR or partial green CI is not by itself acceptance.
