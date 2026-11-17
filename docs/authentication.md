# Authentication implementation

## Current code

- Supabase SSR browser and server clients are separated under `lib/supabase/`.
- Next.js 15 uses `middleware.ts` to refresh cookie-based sessions.
- `/login` supports email/password sign-in.
- Registration is closed by default in both the UI and server route.
- `POST /api/auth/signup` requires the server-only `ENABLE_PUBLIC_SIGNUP=true`.
- Supabase email confirmation returns through `/auth/callback`.
- Callback redirect targets are restricted to local relative paths.

## Launch controls

Before accepting public sign-ups:
1. Complete privacy notice, terms, support, data retention, and deletion procedures.
2. Configure verified email and a production SMTP provider.
3. Configure CAPTCHA and rate limits in Supabase Auth.
4. Review the registration endpoint and monitor abuse.
5. Enable Supabase dashboard sign-ups and set both signup environment flags intentionally.

The environment flags are additional application controls, not a replacement for disabling sign-ups in the Supabase project settings.

## Current limitations

Authentication code is committed but not live-tested because the project has no Supabase URL or publishable key configured. No account has been created and no user data has been collected by this application.
