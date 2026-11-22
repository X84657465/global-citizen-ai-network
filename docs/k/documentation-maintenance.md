# Documentation ownership and freshness

## Ownership

- Each workstream owns the accuracy of its source-specific runbooks, interfaces, acceptance criteria and decision records.
- K owns the shared index, templates, cross-track handoff conventions and documentation maintenance policy.
- P owns autonomy and human-approval policy; F owns security requirements; K links to those authorities but cannot rewrite or supersede them.
- The source code, schemas, workflow definitions and live configuration remain authoritative for actual behavior.

## Review triggers

Review affected documentation when any of these changes:
- An owned interface, schema, permission boundary or workflow changes.
- A new operational failure mode, recovery path or runbook step is introduced.
- A track changes ownership, dependency or acceptance gate.
- A security finding changes the required control or evidence.
- A release changes a version, compatibility statement or support window.

## Periodic freshness

The accountable track owner reviews operationally relevant documentation at least every 90 days and records the review date, reviewer role, source SHA and any corrections. If a document is not reviewed by its due date, mark its freshness as unknown; do not infer it is current.

## Change control

- Link material documentation changes to an issue/PR and exact source SHA.
- Use a decision record for cross-track or authority-boundary changes.
- Preserve historical records; mark them superseded rather than silently rewriting decisions.
- Do not include secrets, private member content, unredacted incident payloads or credentials.
- Documentation changes do not authorize code changes, production operations, migrations, permission changes or deployment.
