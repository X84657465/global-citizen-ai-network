# Backend provisioning and live integration checklist

## Verified environment snapshot — 2026-11-18

The project now has an existing Supabase project and is no longer in the pre-provisioning state described in the original bootstrap notes.

- Supabase project: `global-citizen-ai-network`
- Project ref: `rtkpdafkpncoluhdihlv`
- Region: `ap-northeast-1`
- Database: PostgreSQL 17; Supabase status: `ACTIVE_HEALTHY`
- Applied migrations: 18; latest version: `20261118005041`
- Public schema: 22 base tables; all 22 have RLS enabled.
- Vercel project: `global-citizen-ai-network`; latest inspected deployment is a READY preview.
- Vercel project is not marked live; no production release was performed in this verification.

These checks establish that the database exists and migrations are recorded as applied. They do **not** prove end-to-end authentication, RLS behavior with real member accounts, provider connectivity, SMTP delivery, or production readiness. The security advisor currently reports RLS-enabled tables without policies for internal tables; this is intentional only if access is denied by grants and server-side service-role operations. Verify actual grants and RPC boundaries before launch.

## 1. Existing Supabase project

Do not create a second project or replay the initial schema blindly. Before any schema change:

1. Confirm the target project ref is `rtkpdafkpncoluhdihlv`.
2. Compare repository migrations with the applied migration history.
3. Review the SQL diff and backup/restore posture.
4. Apply only a reviewed, forward-only migration intended for this existing database.
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

The service-role key is not currently required by the app runtime except for explicitly designed trusted operations. Keep it unset until a specific server-only operation requires it. Do not expose it through any `NEXT_PUBLIC_*` variable. The registration screen and API route default to closed; Supabase's own public sign-up setting must also remain disabled.

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
