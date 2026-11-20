# GCAN Security Incident Response Runbook

**Status:** operational draft; exercise and owner assignment required before production reliance.

## 1. Activation criteria

Use this runbook for suspected or confirmed:
- account takeover or privileged session compromise;
- exposure of API keys, service-role keys, GitHub tokens, Runner credentials or deployment secrets;
- unauthorized data access, cross-tenant disclosure or destructive database activity;
- malicious code execution, compromised dependency/action or Runner host compromise;
- AI agent/tool misuse, prompt-injection-driven data disclosure or unauthorized write;
- abuse causing material availability degradation or unexpected AI/provider spend.

When uncertain, preserve evidence and escalate. Do not delay containment of an active credential or execution compromise while waiting for perfect attribution.

## 2. Roles

Assign named people before production launch:
- **Incident Commander (IC):** declares severity, coordinates decisions and communications.
- **Technical Lead:** owns containment, forensic preservation and recovery.
- **Service/Data Owner:** evaluates affected data, tenants and integrity.
- **Security Lead (F):** maintains timeline, threat assessment, remediation and post-incident review.
- **Communications/Privacy Owner:** coordinates user, provider and legal notifications where required.

One person may temporarily cover multiple roles in a small team, but the IC and technical actions must remain explicitly recorded.

## 3. First response

1. Open a restricted incident record; assign ID, IC, severity and UTC start time.
2. Record observed indicators, affected systems, first/last known activity and confidence level.
3. Preserve relevant GitHub run IDs, commit SHAs, audit events, provider request IDs and timestamps.
4. Do not copy secrets or unnecessary personal data into tickets, chat or logs.
5. Identify affected credentials, accounts, repositories, branches, datasets, services and deployment versions.
6. Choose containment that limits harm while preserving evidence where safe.

## 4. Containment playbooks

### Credential or account compromise
- Revoke or rotate the affected credential/session at its issuing provider.
- Disable compromised automation identities and remove unnecessary grants.
- Invalidate sessions or reset affected accounts using provider-supported controls.
- Search audit logs for use of the credential before and after the suspected exposure.
- Do not paste replacement secrets into source code, issue comments or model context.

### Malicious Runner or code execution
- Stop the affected workflow and prevent new jobs from using the compromised runner.
- Isolate the host from production networks; do not simply delete evidence or assume container cleanup is sufficient.
- Revoke every credential available to the host, including cached GitHub, cloud, database and deployment credentials.
- Preserve relevant process, network, filesystem, container and workflow evidence where feasible.
- Rebuild from a known-good image; do not return the host to service until integrity checks and credential rotation are complete.

### Data exposure or tenant-isolation failure
- Disable the affected endpoint or access path if safe.
- Preserve query, application and database audit evidence.
- Determine the exact data classes, tenant scope, records, access window and recipients.
- Rotate exposed credentials and review service-role usage.
- Restore or correct data only from verified backups/transactions; preserve an audit trail of remediation.
- Escalate notification decisions to the responsible privacy/legal owner.

### AI agent or prompt-injection misuse
- Disable the affected tool or write capability; preserve read-only service only if independently safe.
- Revoke tool credentials and terminate active tasks.
- Preserve source URLs/files, prompt/context provenance, tool arguments and action results with sensitive values redacted.
- Identify whether the model received secrets or accessed unauthorized data.
- Add server-side policy tests; do not rely on a revised system prompt as the sole fix.

### API abuse or availability incident
- Apply scoped rate limits, block clearly malicious patterns and disable expensive or abused capabilities.
- Enforce per-user and global budget hard stops.
- Preserve request IDs, source signals and provider usage records.
- Avoid broad IP blocking that could cause disproportionate collateral impact.

## 5. Recovery and return-to-service gates

Before re-enabling affected capabilities:
- root cause and affected scope are documented, or residual uncertainty is explicitly accepted by the IC;
- compromised credentials are revoked/rotated and unnecessary permissions removed;
- affected code/configuration is patched or the vulnerable path remains disabled;
- relevant unit, integration, authorization and regression tests pass on the exact candidate SHA;
- data integrity and tenant isolation are checked;
- monitoring and alert ownership are in place;
- rollback or feature-disable procedure is tested;
- F and the service owner record their approval; production changes retain human authorization.

## 6. Communications and notifications

The Communications/Privacy Owner determines, with appropriate legal and provider advice, whether users, regulators, law enforcement or vendors must be notified. Do not speculate publicly, disclose exploitable details prematurely or promise that no data was accessed without evidence. Keep communications factual, time-bounded and consistent.

## 7. Closure and learning

Within five business days after containment (or a documented exception):
- publish a restricted post-incident review;
- distinguish confirmed facts, hypotheses and unknowns;
- record root cause, impact, detection gap and response timeline;
- create owned remediation tasks with severity and due dates;
- add regression tests and update the threat model;
- review whether backups, access scopes, logging and response procedures worked;
- track each corrective action to verified closure.

## 8. Tabletop exercise checklist

Run before production launch and at least twice yearly:
- exposed service-role key;
- compromised self-hosted Runner;
- cross-tenant RLS regression;
- malicious research page attempts prompt injection and tool misuse;
- runaway AI spend or API abuse;
- backup restore after destructive database operation.

Record exercise date, participants, scenario, measured response time, gaps and corrective actions.
