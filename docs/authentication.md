# Authentication implementation

## Current code

- Supabase SSR browser and server clients are separated under `lib/supabase/`.
- Next.js 15 uses `middleware.ts` to refresh cookie-based sessions.
- `/login` supports email/password sign-in.
- Registration is closed by default in both the UI and server route.
- `POST /api/auth/signup` requires the server-only `ENABLE_PUBLIC_SIGNUP=true`.
- Supabase email confirmation returns through `/auth/callback`.
- Callback redirect targets are restricted to local relative paths.

## Deployment configuration

The production project has a Supabase URL and publishable key configured. The database project is active and its 17 migrations have been applied. The public health endpoint intentionally reports configuration presence only; it does not test authentication or database connectivity.

The server-side admin client additionally requires `SUPABASE_SERVICE_ROLE_KEY`. This secret must be copied from the Supabase project's API settings into Vercel Project Settings → Environment Variables for Production, Preview, and Development as appropriate. Never place this value in client-side variables, source control, issue comments, or chat messages.

## Launch controls

Before accepting public sign-ups:
1. Complete privacy notice, terms, support, data retention, and deletion procedures.
2. Configure verified email and a production SMTP provider.
3. Configure CAPTCHA and rate limits in Supabase Auth.
4. Review the registration endpoint and monitor abuse.
5. Enable Supabase dashboard sign-ups and set both signup environment flags intentionally.

The environment flags are additional application controls, not a replacement for disabling sign-ups in the Supabase project settings.

## Current limitations

Authentication code is committed but has not yet been end-to-end tested with a real user session. No account has been created and no user data has been collected by this application.