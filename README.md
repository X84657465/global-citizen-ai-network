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
app/                 Next.js application
lib/                 Domain logic and shared types
docs/                Product, architecture, security, and data specifications
```

## Local development

Requirements: Node.js 20.9+ and npm.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open http://localhost:3000.

The initial interface is a prototype. Demo task data is illustrative, not paid work. AI calls, authentication, persistence, payments, and payouts must not be represented as live until their integrations and tests are implemented.

## Documentation

- [Product scope and phased roadmap](docs/product-scope.md)
- [Architecture](docs/architecture.md)
- [Security and privacy baseline](docs/security-baseline.md)
- [Data model and transparent cost ledger](docs/data-model.md)

## Contributions

Early contributors must receive clear task scopes, acceptance criteria, ownership/licensing terms, and explicit disclosure of whether work is paid, volunteer, or reward-eligible. Volunteer participation is optional and must not be treated as a permanent substitute for paid labor.

## License

No open-source license has been selected yet. Until a license is added, all rights are reserved by the repository owner.