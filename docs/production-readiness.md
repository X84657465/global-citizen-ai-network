# Production readiness and integration handoff

## Verified deployment

- Production domain: https://global-citizen-ai-network.vercel.app
- Vercel production deployment: READY, currently serving commit `0495355900b16f14f4443f508d569b825e3fbbb3`.
- GitHub `main` is at `128fb1c6d53e96a4dc099998afa92e20991c6dc7`; a GitHub compare confirms `main` is 9 commits ahead of the deployed Production commit (0 behind). Production is therefore healthy but not current with `main`.
- Vercel Git integration has rejected additional deployments with `api-deployments-free-per-day` (more than 100 deployments in the daily window). Do not retry Preview/Production deployments until the quota window resets; do not promote an unrelated Preview deployment.
- GitHub main CI for commit `c02b95867a2ed96085c7014ff02c9819438caad8`: success
- `GET /`: HTTP 200
- `GET /api/health`: HTTP 200
- The health endpoint reports environment-variable presence only. It does not prove that the database or AI provider can authenticate.

## Verified Supabase state

- Project: `global-citizen-ai-network`
- Region: `ap-northeast-1` (Tokyo)
- Project status: `ACTIVE_HEALTHY`
- Database engine: PostgreSQL 17
- Migrations applied: 24 (verified from the linked project's migration history on 2026-11-18)
- Public tables: 22
- Public tables with RLS enabled: 22
- Read-only live catalog verification on 2026-11-18: all 22 public tables have RLS enabled; all 9 internal service-only tables have zero direct table privileges for `anon` and `authenticated` across SELECT/INSERT/UPDATE/DELETE/TRUNCATE/REFERENCES/TRIGGER.
- The 9 RLS-enabled internal tables intentionally have no browser-facing policies; access is restricted to trusted server-side operations. The security advisor reports these as informational findings, not as a reason to add permissive policies.
- A second read-only ACL query confirmed the `postgres` defaults in `public` grant table/sequence/function privileges only to `postgres` and `service_role`; public functions with browser-role EXECUTE and public sequences with browser-role privileges both count zero.
- Do not alter Supabase-managed `supabase_admin` default privileges through project migrations. CI proved the migration role cannot change them; keep application schema migrations under `postgres`.
- A read-only SQL query against the live database succeeded.

## Remaining operator configuration

1. In Supabase Dashboard → Project Settings → API, copy the service-role secret for this project.
2. In Vercel → Project Settings → Environment Variables, set `SUPABASE_SERVICE_ROLE_KEY` as a Sensitive variable. Select only the environments that should access the server-side admin API.
3. Do not use a `NEXT_PUBLIC_` prefix for this key. Never paste the key into chat, GitHub, source files, or browser code.
4. Redeploy Production after changing the variable.
5. Run the protected admin workflows and authenticated signup/login smoke tests in Preview before enabling public registration.

## AI and cost controls

- AI provider remains `mock`.
- No paid AI provider credentials are configured.
- Do not enable production AI until provider credentials, per-request limits, monthly budget caps, uncertain-outcome reconciliation, and billing verification have been tested.
- Keep public registration disabled until privacy, terms, support, retention, deletion, email verification, CAPTCHA, and abuse controls are ready.

## Health endpoint contract

`GET /api/health` is intentionally a lightweight deployment smoke check. It reports only whether required configuration is present. It must not expose keys, hostnames, stack traces, or infrastructure identifiers, and a configured status must never be interpreted as a successful live integration test.