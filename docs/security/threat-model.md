# GCAN Security Threat Model

**Revision:** 1.0.0  
**Applies to:** A–F workstreams  
**Review trigger:** new trust boundary, data class, privileged integration, public endpoint, AI tool, Runner capability or deployment path.

## 1. Assets to protect

- Member identity, sessions, profile and private workspace content.
- Contributions, review records, reward/ledger entries and administrative decisions.
- Database records, backups, migrations, RLS policies and service-role credentials.
- AI prompts, context, retrieved documents, memory, tool calls and provider credentials.
- GitHub repository contents, branch protections, workflow definitions, Actions secrets and release artifacts.
- Self-hosted Runner host, Docker daemon, Ollama endpoint, local files and network credentials.
- Deployment configuration, environment variables, domains and production service access.
- Security logs, incident evidence and vulnerability reports.

## 2. Trust boundaries

1. **Internet → public application:** every request, header, cookie, upload and query parameter is untrusted.
2. **Browser → server/API:** client-side checks are usability controls only; authorization must be enforced server-side.
3. **Member → tenant data:** a valid session does not imply access to another member's records.
4. **Application → database:** user-scoped clients and privileged service-role access must remain distinct.
5. **AI model → tools:** model output is an untrusted proposal; the server validates schema, identity, scope, budget and policy before any tool action.
6. **External content → AI context:** web pages, files, issues, comments, code and retrieved memory may contain hostile instructions.
7. **GitHub event → automation:** webhook/event payloads, branch names, PR content and generated patches are untrusted until verified.
8. **Runner → host/infrastructure:** executing candidate code creates a high-risk boundary; the host and production secrets must remain outside the candidate sandbox.
9. **CI artifact → release/deployment:** artifact provenance and tested SHA must be verified; a successful unrelated run is not evidence for the candidate.

## 3. Adversaries and abuse cases

| Threat | Example path | Required control family |
|---|---|---|
| Account attacker | credential stuffing, stolen session, recovery abuse | MFA where supported, rate limits, secure cookies, session revocation, anomaly alerts |
| Malicious member | cross-tenant IDOR, oversized upload, API scraping, ledger manipulation | server-side authorization, RLS, schema/size limits, quotas, immutable audit events |
| External attacker | SQL/command injection, XSS, CSRF, SSRF, request smuggling | parameterization, output encoding, origin/CSRF checks, outbound destination policy, edge controls |
| Malicious contributor | crafted task, PR, issue or patch targeting automation | trusted event validation, least-privilege tokens, isolated candidate execution, human approval |
| Prompt-injection attacker | retrieved page asks agent to reveal secrets or call tools | instruction/data separation, no implicit tool authority, content provenance, tool allowlists |
| Poisoning attacker | fabricated observations or memory inserted as trusted knowledge | provenance, independent corroboration, quarantine, review and reversible promotion |
| Supply-chain attacker | compromised package, action, build artifact or maintainer token | lockfiles, pinned actions, audit, provenance, secret scanning, protected branches |
| Insider or compromised integration | misuse of admin credentials or deployment permission | role separation, short-lived access, audit trails, approval and emergency revocation |
| Availability attacker | request floods, expensive AI loops, queue starvation | per-identity/IP limits, budget hard stops, bounded concurrency, circuit breakers and backpressure |

## 4. AI-specific attack controls

- Never place secrets in model context, even when the model is instructed not to reveal them.
- Treat retrieved text as data, not policy. Explicitly delimit and label untrusted source content.
- Tools must have narrow schemas, explicit allowlists, server-side authorization and bounded arguments.
- Separate read-only tools from write-capable tools; write actions require independent policy checks.
- High-impact actions require human approval outside the model's control.
- Prevent the model from choosing arbitrary URLs, filesystem paths, shell commands, repository names or database scopes.
- Record source provenance and tool decisions; redact credentials and sensitive content.
- Do not promote model-generated memories, predictions or research claims to trusted state without validation.

## 5. Runner and code-execution controls

- Do not execute untrusted pull-request code on a persistent host that holds production secrets or privileged tokens.
- Prefer disposable VM/container isolation with a non-root identity, read-only base image, resource quotas, restricted mounts and no Docker socket exposure to the task.
- Default-deny outbound network access; allow only required package/model endpoints through controlled egress.
- Use short-lived, least-privilege credentials only after the candidate is trusted and the specific operation is authorized.
- Separate patch generation, patch validation, CI execution, publication and merge permissions.
- Verify exact repository, branch, PR number and head SHA before acting; reject stale or mismatched events.
- Clean up workspaces, containers and temporary credentials after success, failure, timeout or cancellation.
- Treat Ollama and local model endpoints as privileged internal services; do not expose them publicly.

## 6. Data and tenant isolation

- Every tenant-owned query must have server-side ownership checks and database RLS where supported.
- Never trust a client-provided user ID, role, tenant ID or ownership field.
- Service-role keys must be server-only and narrowly used; they bypass RLS and therefore require explicit authorization before each operation.
- Test both positive access and cross-tenant denial using at least two synthetic users.
- Audit privileged reads/writes while excluding secrets, full credentials and unnecessary personal data.
- Backups must be access-controlled, encrypted in transit and at rest by the hosting provider or an explicitly reviewed mechanism, and periodically restore-tested.

## 7. Detection signals

Monitor and correlate, with privacy-aware retention:

- repeated authentication failures, unusual session changes and recovery attempts;
- authorization denials, cross-tenant access probes and unexpected admin actions;
- rate-limit triggers, request-size anomalies and unusual API/AI spend;
- tool calls rejected by policy, prompt-injection indicators and attempts to access secrets;
- unexpected Runner process/network activity, stale task events and artifact provenance mismatch;
- dependency/secret scan findings and changes to workflow permissions;
- unusual database privilege changes, migration activity and backup/restore failures.

Detection is not prevention. Alerts require an owner, severity, triage path and documented disposition.

## 8. Residual risk and exclusions

- No single scanner can prove absence of vulnerabilities.
- RLS does not replace application authorization or safe service-role handling.
- CSP, security headers and rate limiting do not prevent all injection or account abuse.
- Containerization alone is not a security boundary against a hostile host or privileged Docker socket.
- Model alignment is not a security control; enforce permissions outside the model.
- Production penetration testing, social engineering, load testing and destructive tests require explicit scope, written authorization, rate limits and rollback planning.
