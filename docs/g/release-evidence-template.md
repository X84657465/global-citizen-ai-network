# G — Release Evidence Record Template

> A release evidence record documents verification; it does not itself authorize merge, deployment, production migration, or permission changes.

## Candidate identity

| Field | Value |
|---|---|
| Repository | UNKNOWN |
| Workstream(s) | UNKNOWN |
| PR URL / number | UNKNOWN |
| Head branch | UNKNOWN |
| Base ref / SHA | UNKNOWN |
| Exact candidate head SHA | UNKNOWN |
| Track version transition(s) | UNKNOWN |
| Repository version transition | UNKNOWN / NOT CHANGED |
| Evidence timestamp (UTC) | UNKNOWN |

## Required checks

| Check / job | Applicable? | Run ID | Attempt | Tested SHA | Conclusion | Evidence URL |
|---|---|---:|---:|---|---|---|
| Candidate identity resolver | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | NOT RUN | UNKNOWN |
| Unit/regression tests | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | NOT RUN | UNKNOWN |
| Type check | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | NOT RUN | UNKNOWN |
| Lint | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | NOT RUN | UNKNOWN |
| Production build | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | NOT RUN | UNKNOWN |
| Dependency/security audit | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | NOT RUN | UNKNOWN |
| Database/RLS integration | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | NOT RUN | UNKNOWN |
| Runner/Ollama integration | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | NOT RUN | UNKNOWN |
| F security review | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | NOT RUN | UNKNOWN |
| Receiving-owner compatibility | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | NOT RUN | UNKNOWN |

Add rows for every repository-required or change-specific gate. Do not remove failed attempts from the record.

## Review and risk

- Authorized independent reviewer(s): UNKNOWN
- Formal review state: PENDING
- Unresolved review threads: UNKNOWN
- Security/privacy impact: UNKNOWN
- Data/schema/RLS impact: UNKNOWN
- Runner/secret/permission impact: UNKNOWN
- Rollback or forward-fix plan: UNKNOWN
- Known limitations and non-claims: UNKNOWN

## Decision

- Status: NOT RUN
- Rationale: UNKNOWN
- Merge eligibility: NO until all repository-required gates and approvals pass
- Deployment authorization: NOT GRANTED
- Follow-up owner / Issue: UNKNOWN

Use only PASS, FAIL, BLOCKED, NOT RUN, or PENDING as the final status. Preserve links and exact identifiers so another reviewer can reproduce the decision.
