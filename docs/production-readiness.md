# Production readiness and integration handoff

## Verified deployment

- Production domain: https://global-citizen-ai-network.vercel.app
- Vercel production deployment: READY
- GitHub main CI for commit `c02b95867a2ed96085c7014ff02c9819438caad8`: success
- `GET /`: HTTP 200
- `GET /api/health`: HTTP 200
- The health endpoint reports environment-variable presence only. It does not prove that the database or AI provider can authenticate.

## Verified Supabase state

- Project: `global-citizen-ai-network`
- Region: `ap-northeast-1` (Tokyo)
- Project status: `ACTIVE_HEALTHY`
- Database engine: PostgreSQL 17
- Migrations applied: 17
- Public tables: 22
- Public tables with RLS enabled: 22
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