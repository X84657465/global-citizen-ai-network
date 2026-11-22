# M — Compliance, Policy Audit & Risk Governance

**Track version:** 0.1.1  
**Status:** documentation foundation / implementation not yet active  
**Owner:** M workstream  
**Architecture source:** `docs/engineering-workstreams.md`, Stage 2

## Purpose

M defines the evidence and governance records needed to answer four questions:

1. What change or action occurred, and what exact artifact or target did it affect?
2. Which policy or control applied, and what evidence demonstrates the result?
3. Which risks remain, who owns them, and what is the next review or treatment date?
4. Which exceptions were explicitly authorized, by whom, for what scope, and until when?

This track provides record contracts and operating templates. It does **not** claim legal certification, regulatory compliance, production audit logging, or an operational retention system.

## Deliverables in this foundation

- [Audit event contract](audit-event-contract.md): minimum event fields, integrity and privacy requirements, and evidence linkage.
- [Risk register template](risk-register-template.md): consistent risk ownership, treatment, residual risk and review.
- [Policy exception template](policy-exception-template.md): bounded, expiring exceptions with compensating controls and authorized approval.
- [Policy-to-evidence matrix](policy-evidence-matrix.md): maps control intent to evidence, owner, cadence and gaps.

## Boundaries and dependencies

- **F** owns security controls and threat response. M records control evidence and gaps; it does not redefine or weaken F controls.
- **G** owns release gates and exact-SHA integration evidence. M consumes those references rather than treating a PR or partial green CI as acceptance.
- **P** owns autonomy boundaries and approval thresholds. M records the relevant policy decision and authorized approver; M cannot grant itself authority.
- **K** owns general runbooks and knowledge practices. M owns the compliance/audit/risk record formats.
- No A–E implementation, Factory private state, Runner permission, L activation, production database, schema, RLS, secrets or deployment changes are included.

## Evidence and privacy rules

- Store references to source artifacts (repository, immutable commit SHA, PR, CI run/attempt, policy ID/version) instead of copying entire logs or payloads.
- Use UTC timestamps and stable, bounded identifiers.
- Record actor category and a minimal actor reference; do not collect unnecessary personal data.
- Never record passwords, tokens, private keys, session cookies, raw credentials or unrestricted request/response bodies.
- Apply least-privilege read/write access and an explicit retention owner.
- Preserve audit history against silent rewriting where an implementation is later approved; any tamper-evident storage design requires F security review.
- Retention periods must be set by the accountable data owner with qualified legal/privacy review where applicable. This template intentionally does not invent a statutory period.
- A missing, stale, inaccessible or mismatched evidence reference is a gap, not a pass.

## Acceptance criteria for future operational implementation

A future implementation PR must separately demonstrate:

1. append-only or tamper-evident event persistence with bounded access;
2. schema validation, event identity, ordering/timestamp behavior and duplicate handling;
3. evidence references bound to exact source SHA and CI run attempt;
4. retention, deletion/legal-hold behavior approved by the data owner;
5. privacy minimization, redaction and access-control tests;
6. exception expiry and risk ownership workflows;
7. failure behavior that does not silently drop security-sensitive records;
8. F security review, G exact-head CI and P approval-policy compatibility.

Until those gates pass, this is a documentation and process foundation only.
