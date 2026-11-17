# Backend provisioning checklist

This repository contains integration code and a database migration. It is **not connected to a live Supabase project**, and no production credentials have been created or stored.

## 1. Create the Supabase project

1. Create a Supabase project in a region appropriate for the first users and data-residency requirements.
2. Open SQL Editor and run `supabase/migrations/0001_initial_schema.sql` against a fresh project.
3. In Authentication settings, configure the site URL, allowed redirect URL `https://YOUR-DOMAIN/auth/callback`, email verification, and SMTP delivery.
4. Keep Supabase Authentication public sign-ups disabled until privacy terms, abuse controls, CAPTCHA/rate limits, email delivery, and support procedures are ready.
5. Configure database backups and review recovery options.

## 2. Configure deployment environment

Set the following in the hosting provider's encrypted environment settings. Do not send credentials in chat or commit them to GitHub.

Browser-visible project values:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_ENABLE_PUBLIC_SIGNUP=false`

Server-only values:
- `ENABLE_PUBLIC_SIGNUP=false`
- `SUPABASE_SERVICE_ROLE_KEY` (reserved for trusted server operations only; never expose to browser)
- `AI_PROVIDER=mock`
- `AI_MONTHLY_SPEND_LIMIT_TWD=0`

The service-role key is not currently used by the app runtime. Keep it unset until a specific server-only operation requires it. The registration screen and API route both default to closed; Supabase's own public sign-up setting must also remain disabled.

## 3. Authentication flow now present in code

- `/login`: email/password sign-in UI and a registration mode that remains disabled by default.
- `POST /api/auth/signup`: server-side registration gate; requires `ENABLE_PUBLIC_SIGNUP=true`.
- `/auth/callback`: exchanges the email confirmation code and rejects external redirect targets.
- `middleware.ts`: refreshes Supabase cookie sessions for Next.js 15.
- `lib/supabase/client.ts` and `server.ts`: separate browser and server clients.

The UI flag is not a security boundary. Before public launch, keep Supabase dashboard sign-ups disabled until the legal and abuse-prevention gates are approved. Enable both environment flags only after those controls are in place.

## 4. Before accepting real users

- Review and test every RLS policy using at least two ordinary accounts and one privileged account.
- Verify the SQL migration grants and policies against the exact Supabase project configuration.
- Add explicit admin/reviewer policies through trusted server-side authorization; never let a client set its own role.
- Add file storage policies and malware/content scanning before enabling uploads.
- Complete privacy notice, terms, retention, export, deletion, support contact, and incident response.
- Run restore drills and an independent security review.
- Keep AI calls in mock mode until per-user quotas, monthly caps, supplier billing alerts, and a kill switch are tested.
