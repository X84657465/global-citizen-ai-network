# Global Citizen AI Network
全球公民 AI 網路

A people-powered AI ecosystem: useful AI services, verified human contributions, transparent rewards, and—later—opt-in distributed compute.

## Project status

**Phase:** Foundation / MVP scaffolding  
**Status:** Early development; not production-ready.

This repository starts with the product principles, architecture, security baseline, and cost-accounting rules. No live AI provider, payment processor, reward payout, or distributed compute node is connected yet.

## Core pillars

1. **AI Service Center** — research, writing, analysis, document workflows, and persistent projects.
2. **Global Contribution Center** — knowledge curation, translation, evaluation, fact-checking, and tool-building tasks.
3. **Distributed Compute Network** — optional, transparent CPU/GPU participation; desktop-first and deferred until the security model is independently reviewed.
4. **Contribution Rewards & Governance** — auditable contribution records, fair reward rules, transparent finances, and gradual community governance.

## Non-negotiable principles

- No silent use of a participant's device resources.
- No guaranteed investment returns, speculative token requirement, or pyramid/referral scheme.
- Rewards are issued only for verified work or actual distributable surplus under published rules.
- Human review remains available; an AI system must not be the sole judge of its own correctness.
- API/provider charges, estimated internal inference cost, human review cost, infrastructure cost, and operating expenses are recorded separately.
- Users can inspect, export, and request deletion of their personal data, subject to applicable legal retention requirements.
- Do not train a large foundation model or build a global compute network in the first MVP.

## Planned MVP

- Account and profile foundation
- AI workspace and saved projects (provider integration is gated by configuration)
- Research and document workflows
- Contribution task listing, submission, review, and appeal
- Personal usage and contribution ledger
- Cost transparency and administrative controls
- Chinese-first interface with an English-ready structure

## Repository structure

```
app/                 Next.js application and API routes
lib/                 Domain logic and shared types
supabase/migrations/ PostgreSQL schema and row-level security
docs/                Product, architecture, security, and data specifications
```

## Local development

Requirements: Node.js 22.13+ and npm.

```bash
npm ci
cp .env.example .env.local
npm run dev
```

Open http://localhost:3000.

The initial interface is a prototype. Demo task data is illustrative, not paid work. AI calls, authentication, persistence, payments, and payouts must not be represented as live until their integrations and tests are implemented.

## Documentation

- [Engineering governance and verification standard](docs/engineering-governance.md)
- [AI agent security contract](docs/ai-agent-security-contract.md)
- [Agent and CI cost ledger](docs/agent-cost-ledger.md)

- [Product scope and phased roadmap](docs/product-scope.md)
- [Architecture](docs/architecture.md)
- [Security and privacy baseline](docs/security-baseline.md)
- [Data model and transparent cost ledger](docs/data-model.md)
- [Database safety, ledger retention, and pre-launch verification](docs/database-safety.md)
- [Database migration](docs/database.md)
- [Backend provisioning checklist](docs/backend-setup.md)
- [Health endpoint](docs/health-endpoint.md)
- [RLS security verification plan](docs/rls-test-plan.md)
- [Authentication implementation](docs/authentication.md)
- [Application API reference](docs/api.md)
- [AI budget overrun hard-stop](docs/ai-budget-overrun-hard-stop.md)

## Contributions

Early contributors must receive clear task scopes, acceptance criteria, ownership/licensing terms, and explicit disclosure of whether work is paid, volunteer, or reward-eligible. Volunteer participation is optional and must not be treated as a permanent substitute for paid labor.

## License

No open-source license has been selected yet. Until a license is added, all rights are reserved by the repository owner.

## Current application routes

- \`/\`: public platform overview and early prototype.
- \`/login\`: member authentication UI. Public signup remains disabled by default.
- \`/workspace\`: authenticated AI workspace. Loads the signed-in member's conversations and calls the server-side AI gateway with an idempotency key. AI calls fail closed until provider credentials, database controls, and member/global budgets are configured.
- \`/account\`: authenticated member account page.
- \`/admin/ai-operations\`: active-admin-only view of stale AI requests that require manual provider/billing reconciliation.
- \`/api/admin/ai-operations\`: active-admin-only operational JSON endpoint.

The workspace is connected to the existing conversation and AI APIs; it is not a claim that the live AI provider is configured. No public signup, paid AI request, payout, or live deployment is enabled by this code alone.


- \`/contribute\`: authenticated contribution center. It lists only database-published tasks and accepts member submissions through RLS-protected APIs. Rewards are not granted at submission time; verification and the reward ledger remain separate.
- \`/api/contribution/tasks\`: lists published tasks and the signed-in member's submissions, and accepts validated submissions. Reward values and task state are read from the database, never trusted from the client.


## Contribution review and reward ledger

- \`/contributions\`: signed-in member view of contribution events and reward ledger entries. Pending rewards are not cash withdrawals; the current MVP does not enable automated payouts.
- \`/admin/contributions\`: active admin/reviewer interface for reviewing submitted work.
- \`/api/admin/contribution/reviews\`: privileged review endpoint. The database RPC verifies the actor role again, locks the submission and task, and atomically writes the review, submission status, contribution ledger, pending reward ledger, and audit event.
- \`/api/contribution/summary\`: member-scoped read-only summary using RLS.
- Migration \`0008_atomic_contribution_review.sql\`: review idempotency and atomic ledger posting. A repeated identical review request returns the original result; a key reused with a different payload is rejected.


- \`/admin/contribution-tasks\`: admin-only task authoring and lifecycle management. New tasks are drafts; publication requires complete task details, acceptance criteria, and a non-expired deadline.
- \`/api/admin/contribution/tasks\`: admin-only task creation, publication, pause, and close operations. MVP reward currency is explicitly TWD.


- \`/api/contribution/appeals\`: members may submit one reasoned appeal for their own rejected submission; RLS and a unique submission constraint enforce ownership and one appeal per submission.
- \`/contributions\`: the member ledger view now displays submission and appeal statuses and allows an appeal on rejected work.


- \`/admin/appeals\`: reviewer/admin appeal adjudication. Overturning a rejected submission restores accepted status and accrues pending reward atomically; upholding leaves the rejection in place.
- \`/api/admin/contribution/appeals\`: authenticated reviewer-only API backed by a service-role-only idempotent database RPC.
- Claude review handoff: see \`docs/claude-review-brief.md\` for an independent security and architecture review checklist.


- \`/admin/ai-costs\`: admin-only cost transparency dashboard. It separately groups internal estimates, allocated costs, invoice imports, and provider-reported usage costs by currency; each query is bounded to a recent window.
