# Cross-track handoff checklist

Use this checklist when transferring work between tracks or operators.

## Before handoff

- [ ] Name one accountable sending owner and one receiving owner.
- [ ] Identify the exact work item, objective, non-goals and allowed paths.
- [ ] Record the current main SHA, candidate base SHA and candidate head SHA.
- [ ] List upstream dependencies and distinguish merged, open, blocked and historical work.
- [ ] Describe interfaces consumed or changed; attach schema/API compatibility evidence.
- [ ] Identify security, privacy, tenant-isolation and operational impacts.
- [ ] Record each affected track's version and changelog transition; do not bump unaffected tracks.
- [ ] Define required tests, independent review and acceptance owner.
- [ ] Provide rollback or forward-fix instructions.

## Evidence quality

- [ ] Every result links to the exact SHA it tested.
- [ ] Every required job has a terminal result; pending, skipped or missing is not pass.
- [ ] PostgreSQL/RLS and external-service integration are marked required or not applicable with a technical reason.
- [ ] Vercel/Preview status is separated from GitHub Actions CI and is not presented as equivalent evidence.
- [ ] Findings are classified as confirmed, potential, resolved or unverified.
- [ ] Logs and artifacts are redacted; no credentials, tokens, personal data or private payloads are copied into the handoff.

## At transfer

- [ ] Receiving owner acknowledges scope and compatibility.
- [ ] Open risks, blockers and decisions are explicitly assigned.
- [ ] The next action is one concrete operation with an owner.
- [ ] No merge, deployment, production mutation or permission change is implied by handoff alone.

## Completion

- [ ] Acceptance references the exact final SHA.
- [ ] Independent review and all required gates are complete.
- [ ] The work-item record and relevant track changelog are updated.
