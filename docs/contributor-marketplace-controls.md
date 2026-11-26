# Externally Funded Contributor Task Marketplace Controls

**Status:** Design and operational-control proposal; not a payment, escrow, legal, or production-launch authorization.  
**Work item:** Issue #89  
**Owner:** GPT2 — N (Productization / Analytics / Growth / Ecosystem), within the assigned documentation-only path.  
**Scope:** `docs/contributor-marketplace-controls.md` only.

## 1. Purpose and non-goals

This document defines the minimum controls for listing externally funded contribution tasks with clear scope, ownership, rights, review, dispute, and reward terms.

It is a readiness specification, not evidence that a marketplace, payment processor, escrow account, payout rail, or production settlement system exists.

The following are out of scope and remain disabled:
- Payment processing, custody, escrow movement, refunds, or live payout execution.
- Production settlement, billing, authentication, or database changes.
- Guaranteed compensation, investment returns, speculative tokens, referral pyramids, or recruitment-based rewards.
- Publication of a paid task before funding evidence and all required terms are approved.
- Automatic acceptance, rejection, dispute resolution, or payout without accountable human authorization.

A task may be marked paid only when the funding and publication gates below are evidenced. Otherwise it must be labelled volunteer, unfunded, or not open for submission.

## 2. Parties, ownership, and separation of duties

Each task record must identify:

| Party / role | Required responsibility |
|---|---|
| Client / sponsor | Defines the business need, supplies funding evidence, confirms permitted use of deliverables, and accepts the published terms. |
| Task owner | Maintains the scope, deliverables, acceptance criteria, dependencies, and change history. |
| Contributor | Reviews the terms before opting in, submits original or properly licensed work, and discloses relevant conflicts. |
| Reviewer | Applies the published rubric and records evidence-based findings. Must not review their own work or a task where a material conflict exists. |
| Appeal reviewer | A separate authorized person who did not make the original decision and is not conflicted. |
| Marketplace administrator | Performs documented eligibility, funding, publication, moderation, and reconciliation checks; cannot silently rewrite accepted terms. |
| Finance / settlement approver | Independently verifies settlement eligibility and authorizes any future settlement process, if separately approved and implemented. |

A person may hold multiple roles only where separation-of-duties controls remain effective. The task owner, original reviewer, appeal reviewer, and settlement approver must not collapse into one person for the same disputed transaction.

Every task must have one accountable client and one internal task owner. Ownership changes require a timestamped audit event and must not erase prior accountability.

## 3. Task lifecycle and publication gates

Use explicit states; do not infer readiness from a task title or a funding note.

1. **Draft** — scope is being prepared; not publicly discoverable as paid work.
2. **Terms incomplete** — one or more mandatory fields, rights, rubric, or review details are missing; submissions are disabled.
3. **Funding pending** — client funding has been promised or initiated but is not independently verified as available under the approved funding arrangement.
4. **Ready for approval** — scope, funding evidence, rate card, rights, rubric, review schedule, dispute route, and risk checks are complete.
5. **Approved / published** — an authorized administrator records the approval; only now may a funded paid task accept submissions.
6. **In progress** — a contributor has opted in or submitted work under the versioned terms.
7. **Under review** — submission is awaiting a reviewer decision.
8. **Accepted** or **rejected** — a human reviewer records the decision and reasons against the published criteria.
9. **Appeal pending** — a timely appeal is awaiting an independent reviewer.
10. **Final decision** — appeal upheld, modified, or overturned with recorded reasons.
11. **Settlement eligible** — accepted work and all applicable checks are complete; this is an accounting eligibility state, not a payment instruction.
12. **Settled** — may be used only after a separately authorized settlement system records independently verified settlement evidence.
13. **Cancelled / expired / disputed** — terminal or paused states with explicit reason, responsibility, and treatment of committed funds and submissions.

### Mandatory paid-publication gate

A paid task cannot be published or accept submissions unless all checks below pass:

- Client identity and authority to commission the work are verified under the applicable onboarding policy.
- Funding amount, currency, funding status, funding reference, and availability conditions are recorded and independently checked by an authorized person.
- The complete task scope, deliverables, exclusions, dependencies, and acceptance criteria are versioned.
- The contributor-facing rate, calculation method, currency, payment conditions, and any caps are explicit.
- Licensing, ownership, third-party rights, confidentiality, and permitted reuse are clear.
- Reviewer assignment rules, quality rubric, expected review times, and appeal route are visible.
- Cancellation, rejection, refund, and dispute terms are disclosed.
- Required policy, privacy, security, and abuse checks are complete.
- An administrator records who approved publication and when.

If funding cannot be verified, the task must remain unpublished as paid work. It may be converted to a volunteer task only through a new, explicit version that clearly removes paid/reward claims and obtains contributor opt-in; prior paid representations cannot be silently changed.

## 4. Required task listing and rate card

Before a contributor can submit, the listing must show:

- Task ID, client/sponsor identity or approved public display identity, task owner, and current terms version.
- Problem statement, deliverables, acceptance criteria, exclusions, dependencies, estimated effort, and required skills.
- Funding class: **paid and funded**, **volunteer**, or **reward-eligible under separately published rules**. These labels are not interchangeable.
- For paid work: exact amount or formula, currency, unit (fixed task, milestone, or other defined unit), maximum payable amount, conditions for earning it, and expected settlement timing after eligibility.
- For reward-eligible work: eligibility rules, source of the reward pool, calculation method, cap, approval process, and statement that eligibility is not a guaranteed cash payment.
- Review rubric, reviewer process, target response times, appeal deadline, and appeal route.
- Rights and licence summary, attribution requirements, third-party material restrictions, and confidentiality obligations.
- Cancellation, rejection, refund, dispute, and resubmission rules.
- Contact and support route, last-updated time, and a durable link to the complete terms.

### Rate publication rule

There is no universal rate implied by this document. The client and authorized marketplace owner must agree a task-specific rate before paid publication. The listing must display the actual amount and currency or a deterministic calculation formula; placeholders such as “competitive rate”, “up to” without a defined cap, or “to be discussed” do not satisfy the gate.

Any rate change applies prospectively to a new terms version. Contributors who already accepted the prior version retain the prior version's terms unless they explicitly opt into the replacement. A change cannot retroactively reduce earned or accepted compensation.

## 5. Review service levels and quality standards

The following are proposed operational targets, not guarantees. The task listing must show the applicable targets and any known exception before opt-in.

| Event | Target | Required handling |
|---|---:|---|
| Submission acknowledgement | Within 1 business day | Confirm receipt and provide a traceable submission ID. |
| Initial review | Within 5 business days | Assign an eligible, non-conflicted reviewer and record status. |
| Review delay notice | Before the stated target expires | Explain the delay, provide a revised date, and allow withdrawal where the terms permit. |
| Appeal acknowledgement | Within 2 business days | Confirm appeal receipt and identify the independent appeal route. |
| Appeal decision | Within 10 business days | Record an independent, reasoned outcome or a revised date with explanation. |

Business-day calendars, time zone, holidays, and any task-specific exception must be stated in the listing. A missed target must trigger a visible delay status and escalation route; it must not silently convert to rejection or acceptance.

### Minimum quality rubric

The task owner must publish measurable criteria appropriate to the deliverable, including:
- Completeness against each acceptance criterion.
- Correctness and reproducibility, with evidence or test instructions where applicable.
- Security, privacy, safety, and policy compliance.
- Maintainability, documentation, and integration quality where relevant.
- Originality, provenance, licence compatibility, and attribution.
- Required format, delivery location, and handover materials.

Each criterion must be marked pass, fail, or not applicable with a short rationale and evidence reference. Reviewers must distinguish a defect from a preference and must not add new acceptance criteria after submission.

## 6. Intellectual property, licensing, and third-party rights

Every task must state, before opt-in:

- Who owns the task specification and supplied materials.
- Whether the contributor retains ownership, grants a licence, or assigns specified rights upon a clearly defined event.
- Licence type, territory, duration, exclusivity, sublicensing, attribution, and permitted commercial use.
- Treatment of pre-existing contributor materials and reusable tools.
- Rules for open-source dependencies, datasets, media, fonts, model outputs, and other third-party materials.
- Confidential information, data handling, retention, and deletion expectations.
- Required provenance records and disclosure of AI-assisted or third-party work where relevant.

No rights transfer or broad licence may be implied from submission alone. The listing must not request rights the client cannot lawfully grant or acquire. Unclear ownership, incompatible licences, or missing permission is a publication blocker and may require legal review.

## 7. Conflicts of interest and reviewer integrity

Before assignment, reviewers must disclose personal, financial, employment, supervisory, family, competitive, or other relationships that could reasonably affect impartiality.

Controls:
- Contributors cannot review their own submissions.
- The client cannot unilaterally suppress a reviewer finding or appeal.
- A reviewer with a material conflict must recuse; the recusal and replacement are logged.
- Review assignment and reassignment must be auditable.
- Reviewers must use the versioned rubric and cite evidence.
- Appeals must be assigned to a reviewer independent of the original decision.
- Suspected collusion, retaliation, plagiarism, or review manipulation is escalated to a separate administrator.

## 8. Funding, rewards, refunds, and settlement accounting

The marketplace must maintain distinct ledgers or independently reconcilable records for these concepts:

| Concept | Meaning | Must not be confused with |
|---|---|---|
| Client committed funding | Amount contractually committed by the client | Verified available funds or contributor earnings |
| Verified client funding | Amount independently confirmed as available under the approved arrangement | Revenue recognition or settlement |
| Pending contributor reward | Provisional amount subject to review and acceptance conditions | Accepted or payable balance |
| Accepted work amount | Amount earned under the published terms after authorized acceptance | Cash paid |
| Refund / returned client funds | Amount returned or due to be returned to the client under the terms | Contributor reward reversal without separate evidence |
| Settlement eligible | Accepted amount that passed required eligibility and compliance checks | A payment instruction |
| Actual settlement | Independently evidenced completed transfer or other approved settlement | Pending, estimated, or promised amount |

Client funding and contributor rewards must reconcile independently. A client refund must not silently erase a contributor's accepted entitlement; any adjustment requires a separate reason, authority, and audit record. Likewise, pending rewards must not be presented as withdrawable cash.

At minimum, reconciliation reports must show opening balance, new commitments, verified funding, task allocations, accepted amounts, pending amounts, refunds, adjustments, actual settlements, closing balance, and unresolved differences. Each line must link to its source event and terms version.

This document does not authorize or implement custody, payment processing, refunds, or payouts. Any future settlement capability requires separate legal, financial, security, privacy, and operational approval plus tested dual-control execution.

## 9. Cancellation, rejection, disputes, and appeals

The task terms must define cancellation rights for both client and contributor, including treatment of work already submitted, accepted milestones, committed funds, and third-party costs.

A rejection must:
- Identify the criteria not met.
- Provide concise, actionable reasons and supporting evidence.
- Distinguish fixable defects from scope mismatch or policy concerns.
- State whether resubmission is allowed and the deadline.
- Explain the appeal deadline and route.

An appeal must be available for material factual error, inconsistent rubric application, reviewer conflict, procedural failure, or undisclosed scope change. The appeal reviewer must be independent of the original decision. The appeal outcome must state whether the original decision is upheld, modified, or overturned and why.

A dispute must pause only the affected task or amount where possible; unrelated tasks and undisputed records should continue. No party may alter or delete the historical decision, submission, or funding evidence to resolve a dispute.

## 10. Administrator controls and audit trail

Privileged actions require named accounts, least privilege, and a reason. At minimum, log:

- Task creation, terms versions, edits, publication, pause, cancellation, and closure.
- Client identity/authority checks and funding evidence references (never raw payment credentials).
- Rate changes, caps, reward rules, and contributor opt-ins.
- Reviewer assignment, conflict declarations, recusals, decisions, and appeals.
- Acceptance, rejection, refunds, adjustments, settlement eligibility, and independently verified settlement references.
- Administrator approvals, overrides, exports, and access to sensitive records.

Audit events should be append-only or otherwise tamper-evident, timestamped, attributable, and linked to the task and terms version. Corrections must be new events that reference the superseded event; do not overwrite history.

High-impact actions require dual control: paid publication, rate or reward-rule changes after initial approval, refund approval, dispute override, and any future settlement authorization. The requester and approver must be different authorized people.

## 11. Abuse, fraud, and safety monitoring

Monitor for:
- Unfunded tasks advertised as paid.
- Misleading rates, hidden conditions, or retroactive term changes.
- Duplicate tasks, duplicate submissions, fabricated acceptance, or duplicate reward claims.
- Client/reviewer collusion, self-review, retaliation, and conflicts not disclosed.
- Plagiarism, licence violations, stolen work, malicious files, and unsafe instructions.
- Attempts to move payment or sensitive data outside approved channels.
- Artificial urgency, coercion, referral manipulation, or misleading guaranteed-income claims.
- Unusual refund, cancellation, rejection, or administrator-override patterns.

Controls should include rate limits, duplicate detection, evidence-based moderation, contributor reporting, temporary holds on the affected task, and documented human investigation. Automated signals may flag or pause for review but must not make final high-impact decisions without authorized human review.

Collect only data necessary for these controls. Restrict access, define retention and deletion periods, protect audit exports, and avoid storing bank credentials, payment-card data, secrets, or unnecessary identity documents in task descriptions or audit notes.

## 12. Operational readiness checklist

A task is not ready for paid publication until every applicable item is checked:

- [ ] Client and task owner are identified and authorized.
- [ ] Scope, deliverables, exclusions, dependencies, and acceptance criteria are complete.
- [ ] Funding amount, currency, status, evidence reference, and availability are verified.
- [ ] Exact rate or deterministic formula, caps, earning conditions, and settlement terms are visible.
- [ ] Rights, licence, attribution, confidentiality, and third-party permissions are clear.
- [ ] Quality rubric, reviewer eligibility, review targets, and escalation are published.
- [ ] Conflict-of-interest and independent appeal controls are assigned.
- [ ] Cancellation, rejection, refund, dispute, and appeal terms are visible.
- [ ] Audit events and administrator approvals are configured and testable.
- [ ] Abuse monitoring and human support route are available.
- [ ] Privacy, security, and any required legal/finance review are complete.
- [ ] The task is labelled correctly as paid and funded, volunteer, or reward-eligible.

Any unchecked mandatory item means **do not publish as paid**.

## 13. Launch gates and unresolved decisions

Before implementation or public launch, the project owner must decide and document:
- Jurisdictions served and the required legal, tax, consumer, employment, and payment-provider reviews.
- Permitted funding and custody model, including who holds funds and what constitutes verified availability.
- Approved rate-card governance and who may authorize exceptions.
- Accounting treatment, reconciliation ownership, refund liability, and records-retention schedule.
- Identity verification, sanctions/fraud screening, privacy impact, and data-subject request handling.
- Dispute escalation, independent reviewer pool, and appeal authority.
- Security architecture, access controls, incident response, and audit retention.
- Whether any settlement provider is selected and separately approved.

Until these decisions and implementation controls are approved, this document remains a design specification. No task should imply that funds are held, rewards are guaranteed, or a payout can be executed.

## 14. Change control

Changes to task scope, rates, rights, acceptance criteria, review timing, or dispute terms require a new immutable terms version, a reason, an authorized approver, and contributor notification. Material changes require renewed opt-in. Preserve prior versions and all decisions made under them.

The marketplace owner should review this control set at least quarterly and after any material dispute, fraud incident, privacy incident, or settlement discrepancy. Record the review date, owner, findings, and follow-up actions.
