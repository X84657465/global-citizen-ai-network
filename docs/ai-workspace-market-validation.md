# AI Workspace Market Validation Protocol

**Status:** UNVALIDATED — research protocol and decision framework only.  
**Work item:** Issue #87  
**Owner:** GPT2 / N (Productization, Analytics, Growth, Ecosystem).  
**Scope:** Documentation only. No customer research, telemetry activation, outreach, paid pilot, subscription launch, or provider spend is authorized by this document.

## 1. Decision question and hypotheses

Evaluate two separate hypotheses; do not combine their evidence:

- **H1 — Research and decision workspace:** A defined customer segment repeatedly needs to gather, compare, synthesize, and act on information in a persistent workspace, and obtains enough recurring value to pay for it.
- **H2 — Personal document and knowledge hub:** A defined customer segment repeatedly needs to organize, retrieve, and reuse personal/work documents and knowledge, and obtains enough recurring value to pay for it.

Both remain **UNVALIDATED** until each independently passes the usage, retention, payment, cost, privacy, and operational gates in this protocol. A positive result for H1 does not validate H2, or vice versa.

The validation decision is one of:
- **PROCEED TO A SEPARATELY APPROVED PILOT:** all required evidence gates pass and dependencies are met; this is not permission to launch or spend.
- **REVISE:** meaningful evidence exists but one or more thresholds or operational assumptions fail; narrow the segment or use case and repeat a pre-registered validation cycle.
- **STOP:** evidence indicates insufficient recurring value, willingness to pay, viable economics, or acceptable risk after the predeclared sample and observation window.
- **INCONCLUSIVE:** sample, observation, or data quality is insufficient; do not reinterpret missing evidence as a positive result.

## 2. Preconditions and non-negotiable exclusions

Before any customer pilot or collection of usage metrics:
1. The relevant MVP must be stable and closed to the intended cohort.
2. Privacy and security controls, data minimization, retention/deletion, access controls, incident response, and any required review must be approved.
3. A separate written authorization must define cohort, collection purpose, exact fields, retention, owner, budget, and stop conditions.
4. Any customer contact, paid pilot, production telemetry, external analytics, payment processing, or provider spend requires separate explicit approval.

Until then, work is limited to this protocol, metric definitions, cost-model templates, and evidence plans. Do not collect customer data, prompts, document contents, personal identifiers, credentials, payment details, or sensitive free text. No production tracking or customer outreach is implied.

## 3. Segment definitions and jobs-to-be-done

Do not target "everyone who uses AI." Select a narrow segment for each hypothesis before evidence collection.

For each candidate segment, record:
- Role and work context at a non-identifying aggregate level.
- Frequency and consequence of the recurring job.
- Current workflow and alternatives (manual process, existing software, general-purpose AI, or no solution).
- Trigger that causes the job to recur.
- Cost of delay, errors, context switching, or repeated work, supported by observed evidence rather than assumed savings.
- Buyer, daily user, budget owner, procurement constraints, and security/privacy requirements.
- Exclusion criteria and reasons the segment may not be representative.

### H1 candidate jobs

- Repeatedly compare multiple sources to make a consequential decision.
- Preserve research context and provenance across sessions.
- Turn findings into a reusable brief, plan, or decision record.
- Revisit and update prior analysis when source information changes.

### H2 candidate jobs

- Retrieve a previously stored document or fact for a recurring task.
- Reuse knowledge across multiple projects or sessions.
- Maintain a searchable personal/work knowledge base with reliable source references.
- Organize and update information without repeatedly uploading or reconstructing context.

A segment is not validated by saying the product is useful or interesting. Evidence must show a repeated job, actual use in the target workflow, a reason to return, and a credible buying path.

## 4. Research protocol

### Stage A — protocol registration

Before recruiting or collecting evidence, create a dated protocol version containing:
- Hypothesis and one primary segment.
- Inclusion/exclusion rules.
- Recruitment channel and sampling method, if separately approved.
- Interview questions and neutral wording.
- Observation window and sample target.
- Primary and guardrail metrics.
- Decision thresholds and analysis method.
- Privacy notice, consent, retention, deletion, and access controls.
- Named research owner and independent reviewer.

Do not change thresholds after seeing results. Material changes require a new protocol version and a new cohort or clearly separated analysis.

### Stage B — problem interviews

If and only if separately authorized, conduct structured interviews about past behavior, not hypothetical enthusiasm.

Suggested prompts:
1. Tell me about the last time this job occurred.
2. What triggered it, and what steps did you take?
3. Which tools or workarounds did you actually use?
4. How often has this happened in a recent, defined period?
5. What was difficult, slow, costly, or error-prone?
6. What happened when the job was not completed?
7. Who chooses and pays for the current solution?
8. What did you last pay for to solve this problem, if anything?

Avoid leading prompts such as "Would you use this?" or "How much would you pay?" Treat stated willingness to pay as a weak, separate signal, not purchase evidence.

### Stage C — behavior and repeated-use evidence

Only after the stable MVP and privacy approvals are documented may a separately authorized cohort be observed. Prefer minimal aggregate event counts over content collection. Define the event taxonomy and denominator before launch.

A returning user must be counted only when they complete a meaningful core job, not merely log in, open a page, or receive a notification. Repeated use must be tied to distinct days or job instances and deduplicated under the approved privacy design.

### Stage D — paid-pilot evidence

A paid pilot is a separate gated activity. Before any offer or collection:
- Obtain explicit authorization for outreach, cohort, price, terms, support capacity, budget, and payment handling.
- Define deliverables, duration, cancellation/refund terms, support limits, data handling, and acceptance.
- Use actual invoices or payment-provider settlement evidence under approved controls.
- Separate signed intent, purchase order, invoice issued, invoice paid, refund, and recognized revenue.
- Do not use a waitlist, verbal promise, survey response, free trial, or simulated checkout as paid conversion.

No pilot may start solely because this protocol proposes one.

## 5. Metric dictionary and privacy boundaries

All metrics below are definitions, not currently observed values. Use only approved aggregate, minimized data.

| Metric | Definition | Guardrail |
|---|---|---|
| Activated cohort | Eligible users who complete the defined first core job | Exclude login-only activity |
| Core-job completion | A successful completion of the predeclared H1 or H2 job | Do not infer success from page views |
| Weekly active core users | Distinct eligible users with at least one core-job completion in a week | Aggregate only; disclose denominator |
| Week-4 retention | Activated users completing a core job in week 4 / eligible activated cohort | State cohort size and missingness |
| Week-8 retention | Activated users completing a core job in week 8 / eligible activated cohort | Do not mix cohorts or versions |
| Repeat-job rate | Users with at least two distinct core-job completions in the observation window / activated users | Deduplicate retries and test events |
| Time-to-value | Time from start to first verified core-job completion | Report median and distribution, not best case |
| Quality / correction rate | Share of completed jobs requiring material correction or rework under a defined rubric | Define reviewer and error taxonomy |
| Stated willingness to pay | Explicit price response in research | Report separately from behavior and payment |
| Paid conversion | Customers with independently evidenced completed payment / eligible paid offers | Refunds and failed payments disclosed |
| Gross margin | (Recognized revenue − attributable variable costs) / recognized revenue | No revenue assumed from unpaid activity |
| Support burden | Human support minutes or cases per paying account and per completed job | Include outliers and manual work |
| Privacy/security incidents | Count by severity and affected process | Any material incident triggers review |

### Data minimization

Do not collect or retain document contents, prompts, file names, search terms, personal identifiers, or free-text payloads merely to calculate these metrics. If user-level deduplication is approved as necessary, use a privacy-reviewed pseudonymous key with restricted access and a defined deletion date. Never place raw identifiers or content into public reports.

Suppress small cohorts and segments where aggregate reporting could identify an individual. Document minimum cell sizes and suppression rules before data collection. If a metric cannot be computed without prohibited data, mark it **NOT MEASURABLE UNDER CURRENT PRIVACY CONTROLS** rather than weakening the controls.

## 6. Cost model and provenance

Calculate H1 and H2 independently. Record actual measured costs where available and label every estimate. No cost may be silently omitted because it is currently absorbed by an internal team.

For each period and product hypothesis, use:

- **Inference cost** = sum of provider-reported input/output usage × the applicable contract rate, plus attributable fixed inference fees.
- **Search/tool cost** = provider/search/API usage charges + attributable infrastructure or licensed-tool fees.
- **Human-review cost** = review minutes × loaded hourly cost + moderation, QA, and escalation costs.
- **Infrastructure cost** = attributable compute, storage, network, database, monitoring, and backup costs.
- **Support cost** = support minutes × loaded hourly cost + ticketing and operational tooling costs.
- **Other variable cost** = payment processing, refunds/chargebacks, and other transaction-linked costs where applicable.
- **Contribution margin** = recognized revenue − all attributable variable costs.
- **Gross margin %** = contribution margin / recognized revenue, only where recognized revenue is greater than zero.

Every input must include source, period, currency, unit, allocation method, and confidence:
- Provider invoice or usage export: observed actual.
- Internal time study: observed sample, with sampling limitations.
- Contract rate card: quoted/contractual, not necessarily invoiced.
- Allocation estimate: modeled assumption, with formula and sensitivity range.

Do not treat list prices as actual effective costs where discounts, free tiers, minimum commitments, or overages apply. Do not treat internal labor as zero. Do not allocate shared fixed costs using an arbitrary percentage without disclosing the basis.

### Unit economics

Report at least:
- Cost per activated user.
- Cost per weekly active core user.
- Cost per completed core job.
- Cost per retained user at week 4 and week 8.
- Support cost per paying account.
- Contribution margin per paying account and per completed paid job, where actual paid data exists.

If paid data is absent, report unit costs only and mark revenue, gross margin, payback, and profitability **NOT OBSERVED**.

## 7. Sample limitations and sensitivity analysis

For every result, disclose:
- Invited, eligible, activated, observed, and excluded counts.
- Recruitment source, selection bias, and non-response.
- Observation period, cohort maturity, product version, and missing data.
- Whether use was self-reported, directly observed, or derived from approved aggregate events.
- Whether the sample is too small to distinguish a real effect from noise.

Do not generalize from employee testing, friends, a convenience sample, a single enthusiastic customer, or a single paid contract to a market-wide conclusion.

For small samples, show raw numerator/denominator and uncertainty intervals rather than only percentages. Include conservative/base/optimistic sensitivity cases for retention, usage frequency, inference/search cost, human review, support burden, price, refunds, and payment fees. Label the cases as scenarios, not forecasts.

If sample size or observation time is insufficient, the outcome is **INCONCLUSIVE**. Do not lower thresholds post hoc.

## 8. Predeclared decision gates

These are proposed minimum internal evidence gates for deciding whether to request a separately approved pilot; they are not market facts, promises, or universal benchmarks. The project owner must approve or revise them before data collection.

### H1 and H2 independent gates

| Gate | Proposed minimum evidence |
|---|---|
| Problem recurrence | At least 12 completed interviews in one narrowly defined segment, with at least 8 independently describing a recent recurring instance of the target job |
| Observed activation | At least 20 eligible cohort members complete the defined core job; report all exclusions |
| Repeated use | At least 40% of activated cohort completes a second core job on a distinct day within the defined 4-week window |
| Retention | Week-4 retained core-job users at least 25%; report exact numerator, denominator, and uncertainty |
| Quality | At least 80% of sampled completed jobs meet the predeclared quality rubric without material correction; report reviewer agreement |
| Buying evidence | At least 3 independent organizations or buyers complete an actual paid transaction under separately approved pilot terms; commitments and unpaid trials do not count |
| Economics | Positive contribution margin in the observed paid cohort after inference, search/tool, human-review, infrastructure, support, and transaction costs; disclose sample limitations |
| Privacy and safety | No unresolved critical/high privacy or security finding; approved controls and deletion process verified |
| Operational capacity | Support and review workload is measured and within an explicitly approved capacity limit |

If any gate fails, the recommendation cannot be PROCEED. If the data is insufficient, the recommendation is INCONCLUSIVE rather than a pass. These thresholds must not be treated as permission to initiate the research or pilot activities.

## 9. Decision report template

Create one report per hypothesis and protocol version.

### Evidence summary

- Hypothesis:
- Segment:
- Protocol version and approval reference:
- Observation period:
- Product version:
- Cohort: invited / eligible / activated / observed / excluded:
- Core-job completion: numerator / denominator:
- Repeat-job rate:
- Week-4 retention:
- Quality and correction rate:
- Stated willingness to pay (separate from purchase):
- Paid offers / invoices / completed payments / refunds:
- Cost inputs and source provenance:
- Unit economics and sensitivity cases:
- Privacy, safety, and operational findings:
- Missing data and limitations:

### Gate assessment

For each predeclared gate, record **PASS / FAIL / INSUFFICIENT EVIDENCE / NOT AUTHORIZED**, the supporting evidence reference, owner, and date. Do not mark an unmeasured gate as PASS.

### Recommendation

Choose exactly one:
- **UNVALIDATED — INCONCLUSIVE**
- **UNVALIDATED — REVISE**
- **UNVALIDATED — STOP**
- **EVIDENCE GATES MET — REQUEST SEPARATE PILOT APPROVAL**

Even if all proposed gates pass, the hypothesis remains UNVALIDATED for broad product-market-fit claims until repeated usage and actual payment evidence are sufficient, representative, privacy-compliant, and independently reviewed. No document in this task authorizes production launch, pricing changes, telemetry, outreach, provider spend, or payment processing.

## 10. Current evidence status and next actions

At the time this protocol is authored, no customer interviews, approved cohort telemetry, paid offers, completed customer payments, or validated unit economics are supplied as evidence for H1 or H2. Therefore:

| Evidence area | Current status |
|---|---|
| Recurring customer problem | NOT OBSERVED |
| Repeated core-job usage | NOT OBSERVED |
| Week-4 / week-8 retention | NOT OBSERVED |
| Stated willingness to pay | NOT OBSERVED |
| Paid pilot commitments | NOT AUTHORIZED / NOT OBSERVED |
| Completed payments | NOT OBSERVED |
| Attributable variable costs | TEMPLATE ONLY; actuals not supplied |
| Gross margin / profitability | NOT OBSERVED |
| Privacy approval for research telemetry | NOT PROVIDED |
| Stable closed MVP dependency | MUST BE VERIFIED BEFORE ANY PILOT |

Next steps, in order:
1. Product owner verifies stable closed-MVP status and records the exact version.
2. Privacy/security owner reviews the proposed minimal metric taxonomy, pseudonymous deduplication, suppression, retention, and deletion.
3. Research owner approves a protocol version, segment, sample, and thresholds before any recruitment.
4. Finance/operations owner validates cost-source access and allocation methodology without enabling new provider spend.
5. Only after all prerequisites and separate authorization are recorded may a pilot proposal be submitted for approval.

**Current conclusion for both H1 and H2: UNVALIDATED.** This is a protocol and evidence plan, not a validation result.
