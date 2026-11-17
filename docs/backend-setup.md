# Backend provisioning checklist

The application is not connected to a live database or AI provider until the owner creates the services and supplies credentials through the hosting provider's encrypted environment settings.

## Supabase pilot setup

1. Create a Supabase project in a region appropriate for the first users and data-residency requirements.
2. Open SQL Editor and run `supabase/migrations/0001_initial_schema.sql`.
3. In Authentication settings, configure allowed redirect URLs and email verification. Keep public sign-up disabled until the privacy notice and support process are ready.
4. Configure database backups and review the project's recovery options.
5. Keep Supabase Authentication public sign-ups disabled until privacy terms, abuse controls, email delivery, CAPTCHA/rate limits, and support procedures are ready.
6. Add server-side secrets to the deployment environment only:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (server only; never expose to browser)
   - `ENABLE_PUBLIC_SIGNUP=false` (server-side gate; keep false until public launch is approved)
7. Never commit real credentials to GitHub or send them in chat. Use the deployment provider's encrypted secret manager.

## Current implementation boundary

- The SQL migration defines the initial schema, row-level security, profile bootstrap, and append-only ledger protections.
- No production database is provisioned by this repository change.
- No service-role client or public database access should be added until the environment is configured and the RLS policies have been reviewed.
- AI provider integration remains disabled by default. Keep `AI_PROVIDER=mock` and monthly spend limit at zero until billing limits and monitoring are configured.

## Before accepting real users

- Review and test every RLS policy using at least two ordinary accounts and one privileged account.
- Add explicit admin/reviewer policies through server-side authorization; do not let a client set its own role.
- Add file storage policies and malware/content scanning before enabling uploads.
- Add retention, export, deletion, privacy notice, terms, and support contact.
- Run restore drills and an independent security review.
