# Observability Integration — PostHog

## Current read-only inventory (2026-11-18)

The connected PostHog organization exposes exactly one project:
- Project name: `Default project`
- Project ID: `743236`
- Ingestion host: `https://us.i.posthog.com`
- Existing events ingested: `false`
- Existing project description: empty
- Existing website integration: none found in this repository
- Existing Vercel project variables: no `NEXT_PUBLIC_POSTHOG_*` variables found

The project was created on 2026-11-17. It is the only project visible to the connected PostHog account, so it is the provisional GCAN analytics destination. Do not create another PostHog project or pay for an additional analytics provider.

## Integration decision

Use the existing US Cloud project only after the application integration is implemented and verified. The public project token must be supplied as `NEXT_PUBLIC_POSTHOG_KEY` through Vercel environment configuration, never committed to source. The ingestion host must be supplied as `NEXT_PUBLIC_POSTHOG_HOST`.

## Privacy and security requirements

- Disable autocapture by default; instrument only named, documented events.
- Do not enable session replay, console capture, or network payload capture by default.
- Do not send email addresses, names, message bodies, prompts, uploaded content, authentication tokens, billing details, or other sensitive values.
- Use a stable pseudonymous application user ID only when the privacy notice and consent policy permit it; otherwise use an anonymous identifier.
- Keep server-side secrets and PostHog's project token out of server logs and source control.
- Respect the application's consent state before analytics collection where required.
- Analytics failure must never block authentication, payments, AI requests, or other product workflows.
- Add a small integration test for event payload minimization and a positive control proving the event reaches the intended project before declaring integration complete.

## Status

**Project selected provisionally; website SDK and event instrumentation are not yet installed.** No event has been sent, no project settings have been changed, and no environment variables have been added. The next implementation should use the official PostHog Next.js integration, pin an exact SDK version with the package lockfile, disable optional collection by default, and pass CI before Preview validation.

Official guide: https://posthog.com/docs/libraries/next-js
