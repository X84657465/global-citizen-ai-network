# F — Cyber Security & Defense

**Track version:** 0.1.1  
**Status:** foundation with first runtime hardening control; broader controls remain implementation candidates  
**Owner:** dedicated security workstream; product and platform owners retain responsibility for fixes in their code.

## Mission

Protect GCAN users, data, infrastructure, AI workflows and development supply chain against malicious activity. F is an independent assurance and engineering line that defines security controls, maintains the threat model, validates safeguards and coordinates incident response across A–E.

F does not replace secure engineering ownership in other tracks. Every track remains responsible for its own code, data, dependencies and operational controls. F defines cross-track minimum requirements and independently challenges evidence.

## Scope

1. **Identity and access:** authentication assurance, session lifecycle, authorization, least privilege, privileged access and recovery.
2. **Application and API:** input validation, output encoding, injection prevention, CSRF, SSRF, abuse controls, rate limits and safe error handling.
3. **Data and privacy:** tenant isolation, Supabase RLS, service-role boundaries, secrets, encryption, retention, export and deletion.
4. **AI and agent security:** prompt injection, untrusted retrieved content, tool authorization, memory poisoning, data exfiltration, model/provider boundaries and human approval.
5. **Factory and compute:** Runner isolation, ephemeral workspaces, untrusted patch handling, artifact provenance, token scope and supply-chain integrity.
6. **Detection and resilience:** security telemetry, alert triage, backup/restore, containment, incident response and recovery exercises.
7. **Governance:** security review, threat modeling, vulnerability intake, remediation tracking and release gates.

## Cross-track ownership

| Track | Security responsibility | F review focus |
|---|---|---|
| A — Agent Factory V2 | Runner, task lifecycle, patch generation, GitHub automation and CI credentials | Untrusted task isolation, token scope, workflow trust, artifact provenance, human merge gate |
| B — GCAN Product | Accounts, APIs, member workspaces, contributions, ledger and user data | Authorization, tenant isolation, abuse prevention, privacy and financial integrity |
| C — Predictive Coding | Prediction inputs, observations, metrics and feedback loops | Data poisoning, manipulation, provenance, anomaly signal quality and false positives |
| D — Deep Neural | Memory, retrieval, reasoning and knowledge integration | Memory poisoning, instruction/data separation, provenance and sensitive-data leakage |
| E — Deep Research | Retrieval, browsing, source ingestion and report generation | Malicious sources, prompt injection, citation integrity, SSRF and exfiltration paths |

## Non-negotiable security principles

- Deny by default; grant the minimum permission for the minimum duration.
- Treat user input, repository issues, pull requests, web pages, documents, model output and external tool responses as untrusted data.
- Data retrieved from a source is not an instruction to change system policy or invoke tools.
- Separate instructions from content; validate tool arguments and authorize every consequential action server-side.
- Never expose provider keys, service-role keys, runner credentials, access tokens or private environment values to browsers, model prompts, logs or generated artifacts.
- Do not execute untrusted patches or scripts on a persistent host with production credentials.
- Require isolated, disposable execution environments for untrusted code; restrict network egress and filesystem access by default.
- Require explicit human approval for merges, production deployments, destructive actions, financial operations and production data migrations.
- Record security-relevant events without logging secrets or unnecessary personal data.
- Fail closed for authorization, budget, signature, provenance and safety checks. Failures must be visible and recoverable.
- Security tests must use synthetic accounts and disposable environments unless a separately approved test plan states otherwise.

## Minimum release evidence

A security-sensitive PR must provide:

- affected assets, trust boundaries and abuse cases;
- changed permissions, secrets, network access and data flows;
- tests for both allowed and denied behavior;
- dependency and secret-scan results where applicable;
- exact branch and commit SHA;
- unresolved risks, owner and mitigation;
- rollback or containment instructions.

A green generic CI job is not proof that a security control is effective. F review is required for changes to authentication, authorization, RLS, secrets, AI tool permissions, Runner isolation, deployment permissions, payment/ledger flows or security headers.

## Severity and remediation targets

Targets below are internal response objectives, not guarantees. Start the clock when the issue is confirmed and scoped.

| Severity | Example | Triage objective | Remediation objective |
|---|---|---:|---:|
| Critical | unauthenticated remote code execution, active credential compromise, cross-tenant data exposure | immediately | contain immediately; fix or disable affected path before reopening |
| High | privilege escalation, exploitable injection, exposed sensitive secret, bypass of approval gate | within 1 business day | mitigation within 3 days; permanent fix tracked to closure |
| Medium | meaningful defense weakness requiring prerequisites | within 5 business days | planned fix within 30 days |
| Low | hardening or low-impact disclosure | within 10 business days | backlog with owner and target date |

## Current maturity and explicit limitations

This charter creates the F workstream and governance baseline. It does **not** certify GCAN as secure, prove that all listed controls are implemented, or authorize production penetration testing. The existing baseline headers now include HSTS (`max-age=31536000`) in addition to MIME, clickjacking, referrer and browser-capability protections; the application CI also runs dependency audits. These are only partial controls. Each control must be mapped to implementation and tested evidence before it can be marked implemented.

## Working documents

- [Threat model](threat-model.md)
- [Incident response runbook](incident-response.md)
- [Security release gates](release-gates.md)
