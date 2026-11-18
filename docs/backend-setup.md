# Backend provisioning and live integration checklist

## Verified environment snapshot — 2026-11-18

The project now has an existing Supabase project and is no longer in the pre-provisioning state described in the original bootstrap notes.

- Supabase project: `global-citizen-ai-network`
- Project ref: `rtkpdafkpncoluhdihlv`
- Region: `ap-northeast-1`
- Database: PostgreSQL 17; Supabase status: `ACTIVE_HEALTHY`
- Applied migrations: 24; latest version: `20261118061217` (`dedupe_active_submission_index`)
- Public schema: 22 base tables; all 22 have RLS enabled.
- Vercel Production is READY on commit `0495355900b16f14f4443f508d569b825e3fbbb3` (`perf(db): deduplicate active task submission index`). This includes the latest application-code change from `7a2e4d990fdfa5290484ffcae647dcc802a64f61` and migration 0024. The current `main` head is `386b4505254c18fb262e643e0b4dc59211692d3b`; its delta after the deployed commit is documentation/repository housekeeping. The earlier Hobby deployment quota failure is no longer blocking the current READY Production deployment.
- Latest main commit: `386b4505254c18fb262e643e0b4dc59211692d3b`; latest application-code commit: `7a2e4d990fdfa5290484ffcae647dcc802a64f61`. Production is READY on `0495355900b16f14f4443f508d569b825e3fbbb3`, which contains the latest application code and migration 0024. The remaining main-vs-Production delta is documentation/repository housekeeping.

These checks establish that the database exists and migrations are recorded as applied. They do **not** prove end-to-end authentication, RLS behavior with real member accounts, provider connectivity, SMTP delivery, or production readiness. Migration 0019 has now been applied to live Supabase. Post-apply catalog checks confirmed 0 direct public-table grants to `anon`, 0 public-schema function EXECUTE grants to `PUBLIC`/`anon`/`authenticated`, and retained service-role access to all 22 public relations and 20 public functions. The 9 RLS-enabled tables without policies are internal service-only tables; their lack of member policies is intentional because browser roles have no direct SQL grants. The security advisor reports only those 9 informational findings; the health advisor returns no findings. Migration 0020 added all 17 missing FK indexes and removed both duplicate permissive SELECT-policy findings. The performance advisor now reports 36 unused indexes, including the 17 new indexes on currently empty/low-traffic tables; do not remove them without workload evidence.

## 1. Existing Supabase project

Do not create a second project or replay the initial schema blindly. Before any schema change:

1. Confirm the target project ref is `rtkpdafkpncoluhdihlv`.
2. Note the identifier drift: repository migration files use numeric prefixes (`0001`–`0023`), while remote migration history uses timestamp versions. Names align, identifiers do not. All 23 migrations are applied live and mapped in `docs/migration-history-map.md`. Do not run `supabase db push` or `migration repair` against production.
3. Review the SQL diff and backup/restore posture.
4. Apply only a reviewed, forward-only migration to this existing database and record the remote timestamp returned by Supabase.
5. Re-run Supabase security, performance, and health advisors.

Authentication settings, SMTP, backup retention, and recovery drills still require explicit dashboard verification.

## 2. Deployment environment

Set required values only in the hosting provider's encrypted environment settings. Do not send credentials in chat or commit them to GitHub.

Browser-visible project values:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_ENABLE_PUBLIC_SIGNUP=false`

Server-only values:
- `ENABLE_PUBLIC_SIGNUP=false`
- `SUPABASE_SERVICE_ROLE_KEY` (reserved for trusted server operations only; never expose to browser)
- `AI_PROVIDER=mock`
- `AI_MONTHLY_SPEND_LIMIT_TWD=0`

The `SUPABASE_SERVICE_ROLE_KEY` environment-variable name is present in Vercel's Preview/Production configuration metadata; its value was not decrypted or exposed. It is used only by explicitly designed trusted server operations. Never expose it through any `NEXT_PUBLIC_*` variable. The registration screen and API route default to closed; Supabase's own public sign-up setting must also remain disabled.

The current verification did not inspect or disclose Vercel environment-variable values. Confirm variable presence and scope in the Vercel dashboard without copying secrets into logs or chat.

## 3. Authentication flow present in code

- `/login`: email/password sign-in UI and a registration mode that remains disabled by default.
- `POST /api/auth/signup`: server-side registration gate; requires `ENABLE_PUBLIC_SIGNUP=true`.
- `/auth/callback`: exchanges the email confirmation code and rejects external redirect targets.
- `middleware.ts`: refreshes Supabase cookie sessions for Next.js 15.
- Authenticated project and conversation APIs use the member session and RLS; clients cannot write assistant/system messages.
- `lib/supabase/client.ts` and `server.ts`: separate browser and server clients.

The UI flag is not a security boundary. Keep Supabase dashboard sign-ups disabled until legal and abuse-prevention gates are approved. Enable both environment flags only after those controls are in place.

## 4. Before accepting real users

- Review and test every RLS policy using at least two ordinary accounts and one privileged account.
- Verify the SQL migration grants and policies against the exact Supabase project configuration.
- Verify a member cannot assign their own admin/reviewer role or change account status.
- Add explicit admin/reviewer policies through trusted server-side authorization; never let a client set its own role.
- Add file storage policies and malware/content scanning before enabling uploads.
- Complete privacy notice, terms, retention, export, deletion, support contact, and incident response.
- Run restore drills and an independent security review.
- Keep AI calls in mock mode until per-user quotas, monthly caps, supplier billing alerts, and a kill switch are tested.


Migration 0021 adds the atomic contribution-task administration RPC. It is SECURITY DEFINER with an empty search path, verifies the actor is an active admin, serializes status transitions with row locks, and writes each audit event in the same transaction as the task change. Live catalog verification confirms only `service_role` can execute this RPC; effective public-schema function access remains 0 for `anon` and `authenticated`.


Migration 0022 (`ai_providerless_completed_replay`) is applied live as `20261118060600`. It permits replay of an already completed response under the same idempotency key and payload hash when provider config is missing; new billable requests remain blocked before side effects.

Migration 0023 (`single_active_task_submission`) is applied live as `20261118060607`. It enforces one active submission per member/task and prevents resubmission during an unresolved appeal. Rejected submissions can be retried after rejection/appeal closure.
