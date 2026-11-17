# Product Scope and Roadmap

## Product thesis

Global Citizen AI Network is a shared AI ecosystem, not merely a chatbot. It combines useful AI services with a verified contribution economy and, later, opt-in distributed compute.

A revenue-generating service is the first sustainability engine. It must not replace or narrow the wider citizen-participation mission.

## Four pillars

1. AI Service Center
2. Global Contribution Center
3. Distributed Compute Network
4. Contribution Rewards and Governance

## Phase 0 — foundation

- Establish product principles, repository, threat model, data model, and cost accounting.
- Build a responsive prototype using mock data and no paid model calls.
- Define contribution policies, task acceptance criteria, data rights, and reward eligibility.

## Phase 1 — closed MVP

Build only what can be operated safely by a small team:

- Account, profile, and role management
- AI workspace with saved projects and history
- Research/search integration behind server-side provider adapters
- Usage quotas, spend caps, request audit records, and kill switch
- Contribution tasks, submissions, review, rejection reasons, and appeal
- Personal contribution and reward ledger
- Admin dashboard and audit trail
- Chinese-first UI with localization-ready structure

Do not enable cash payouts until legal, tax, identity, fraud, and settlement processes are reviewed. A manually reconciled ledger can be used during closed testing, but it must clearly state that entries are not cash balances.

## Phase 2 — paid service and contributor marketplace

- Validate recurring use cases with interviews and paid pilots.
- Add subscriptions only after willingness to pay and gross margin are measured.
- Let external clients fund well-scoped, rights-cleared contribution tasks.
- Publish task rates, quality standards, review times, appeal routes, and payout terms.
- Keep AI usage credits distinct from cash, rewards, and profit distributions.

## Phase 3 — opt-in compute research

- Desktop-first node client, separate from the web app.
- Explicit installation, permissions, resource ceilings, temperature/power safeguards, idle/charging/network conditions, pause, uninstall, and transparent telemetry.
- Sandboxed workloads, signed jobs, attestation where practical, result verification, abuse controls, and compensation rules.
- Independent security review before any public node launch.

Phones and tablets should not be used for sustained heavy compute. Browser tabs are not a reliable background compute substrate.

## Phase 4 — governance and global expansion

- Gradually introduce contributor representation and transparent governance processes.
- Publish financial and impact reports with privacy-preserving aggregation.
- Localize language, legal terms, tax handling, and data policies by jurisdiction.

## Commercial validation gates

Do not choose a permanent product direction based only on intuition. Test recurring problems and willingness to pay:

- What problem recurs weekly or monthly?
- What does the user currently pay for or spend time doing?
- What measurable outcome does the product improve?
- Can the service retain users after the first month?
- Is contribution cost plus inference and support cost covered by revenue?

Initial product hypotheses to test: research/decision workspace, personal document and knowledge hub, and paid expert/verification tasks. A hypothesis is not validated until real users repeatedly use and pay for it.

## Reward policy

- Pay or reward only accepted work under published criteria.
- Clearly label volunteer tasks and never imply future guaranteed compensation.
- No multi-level referral rewards, speculative token requirement, or investment-return claims.
- Record earned, pending, disputed, reversed, and paid amounts as separate ledger events.
- Corrections use reversal/adjustment records; never silently overwrite history.
- Do not arbitrarily claw back legitimate earned rewards.

## MVP acceptance criteria

- A user can register, access only their own data, and save a project.
- Every live AI request creates a traceable usage and cost record.
- Budget ceilings block or degrade service before uncontrolled spend.
- A contributor can submit a task and see its review status and reason.
- A reviewer can accept/reject with evidence and an appeal path.
- Every reward change is append-only and auditable.
- Admin actions are role-restricted and logged.
- Data export/deletion and backup/restore procedures are tested.
- No compute node or payment feature is represented as live before its controls exist.