# Database migration and backend setup

The first database target is PostgreSQL, with Supabase as a candidate managed pilot. This is a reversible implementation choice, not a claim that a Supabase project exists.

- Initial schema: [0001_initial_schema.sql](../supabase/migrations/0001_initial_schema.sql)
- Provisioning checklist: [backend-setup.md](backend-setup.md)
- Security baseline: [security-baseline.md](security-baseline.md)
- Cost and contribution ledger: [data-model.md](data-model.md)

The migration creates core identity, workspace, AI request/cost, task/review, contribution, reward, and audit tables. It enables row-level security and protects ledgers against update/delete. It does not create production credentials, deploy infrastructure, or authorize payouts.
