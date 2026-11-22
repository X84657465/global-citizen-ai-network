# Incident response runbook

## First response

1. Preserve safety and service availability; do not improvise a production mutation.
2. Record UTC start time, reporter, affected service/track, severity hypothesis and known user impact.
3. Preserve exact repository/PR/run identifiers and current head SHA when code is involved.
4. Separate confirmed facts, plausible hypotheses and unknowns.
5. Assign an incident owner and a technical communications owner.

## Evidence handling

- Use least-privilege, read-only evidence collection first.
- Preserve relevant run IDs, timestamps, redacted logs, test outcomes and decision records.
- Do not copy secrets, credentials, raw personal data or private member content into issues, PRs or chat.
- Record evidence source, collection time, integrity reference and access classification.
- Keep append-only audit evidence under the designated audit owner's retention policy; this runbook does not define legal retention periods.

## Containment and recovery

- Prefer reversible, scoped containment approved by the responsible service owner.
- Do not change production data, permissions, secrets, migrations, Factory state or deployment state without the required owner authorization and change process.
- Use documented checkpoints and verified restore evidence; never claim a backup is restorable merely because a backup artifact exists.
- Record recovery action, authorizer, before/after evidence and residual risk.

## Closure

- Document impact, timeline, root cause confidence, contributing factors and unresolved risks.
- Assign corrective actions with owners and due dates.
- Link exact-SHA CI, independent review and recovery verification.
- Communicate closure only after the service owner confirms recovery and evidence completeness.
