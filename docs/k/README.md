# K — Knowledge Base, Docs & Governance Playbooks

K maintains the navigable engineering knowledge layer: architecture references, reusable work-item records, handoff checklists and decision history.

## Source-of-truth map

| Subject | Canonical reference | Use |
|---|---|---|
| Workstream ownership and exclusions | [A–P engineering architecture](../engineering-workstreams.md) | Resolve ownership, dependencies and sequence before editing |
| Repository-wide engineering rules | [A–P engineering governance](../engineering-governance.md) | Apply shared quality, security, review and release constraints |
| P autonomy and trust boundaries | [P version governance](../p/version-governance.md) | Classify approval boundaries; P cannot override owners or F controls |
| Repository release history | [Root changelog](../../CHANGELOG.md) | Track repository-wide releases |
| A–P numeric versions | [Version manifest](../../versions/manifest.json) | Read each track's independent version and maturity status |
| K change history | [K changelog](CHANGELOG.md) | Track K-specific documentation capabilities |

## K operating rules

1. Treat source code, schemas, workflow files and live configuration as authoritative for actual behavior; documents describe them but do not override them.
2. Mark each statement as verified, proposed, historical or unknown when the distinction affects an operator decision.
3. Every handoff carries a repository, branch, exact base/head SHA, owner, allowed paths, dependencies, tests, evidence, risks and next action.
4. A green check from another SHA, a merged document or an implementation label is not acceptance evidence for the current head.
5. Keep secrets, personal data, credentials, private member content and machine-managed Factory state out of docs, examples and evidence.
6. Update only the owning track's history and version. Cross-track work records each affected owner and version transition.
7. Never turn a runbook into an authorization mechanism. Approval and execution remain with the designated owners and protected workflows.

## Templates

- [Work-item evidence record](work-item-record-template.md)
- [Handoff checklist](handoff-checklist.md)
- [Architecture decision record](decision-record-template.md)

## Maintenance

The owning track maintains its documents when interfaces, ownership, safety boundaries or acceptance evidence change. Review freshness at each material cross-track handoff; do not infer that a document is current merely because it exists.
