# GCAN F–P Master Agent Brief

## Mission

Continue engineering F–P as capabilities hosted by the existing GCAN platform. Preserve A–E and Agent Factory V2. The Factory is the highest-priority execution core; F–P must not interrupt it, replace it, or gain its publication authority.

## Current baseline

- Repository: `X84657465/global-citizen-ai-network`
- Audited main: `a1c1b58e4d1852f5a09a0e7c6c5cbeb38e1f9582`
- Release: `0.3.124`
- Merged P provider PR #251: merge `a1c1b58e4d1852f5a09a0e7c6c5cbeb38e1f9582`; its exact-head CI was still pending at merge. Follow-up PR #252 head is `5ca035183256a0b3c6f2ac8b4b3e5c81f7b00873` on `feat/p-trusted-review-permission-provider-20261122`.
- The previous exact-head CI run #44931646871 did not complete before merge. PR #252 hardens repository path validation in both P review entry points and adds regression coverage plus the five handover documents. Its exact-head CI run #44932422571 is pending before any job step starts; require runner availability, fresh CI and review.

## Priority order

1. F — security evidence and real test/job mapping.
2. G — exact-head release-quality evidence, bound to the same run/attempt as F.
3. H — paired correlation and end-to-end route/job observability proof.
4. P — exact-head review provenance and trusted-host reviewer permission verification.
5. I/J/M/N/O/K — integrate one bounded capability at a time.
6. L — remain deferred.

## Hard constraints

- Do not edit A–E or Agent Factory V2.
- Do not modify Factory lifecycle, durable state, leases, retry/cooldown/quarantine, sandbox, patch integrity, CI, PR publication or merge authority.
- Do not overwrite or discard staged, unstaged or untracked local work.
- Do not use reset, clean, stash, forced checkout or broad restore as a shortcut.
- Do not change production schema, RLS policies, secrets, workflow permissions, branch protection or deployment settings.
- Do not add a parallel identity provider, task runner, queue, database, telemetry vendor or connector credential.
- No autonomous production repair (J), external writes without explicit approval (I), or federation activation (L).
- Never put secrets, raw user content, private host paths or unnecessary personal data into shared envelopes or logs.
- Never treat skipped, pending, cancelled, stale or mismatched CI as a pass.
- Never claim tests were run unless a real command/result or exact-head CI evidence exists.

## Engineering rules

- Inspect current main, branch and worktree state before modifying code.
- Make additive, narrow, isolated changes under F–P.
- Reuse existing host, authenticated GitHub API client, middleware, database and CI.
- Bind evidence to exact repository, PR, candidate SHA, run ID and run attempt.
- Add focused Node-native tests for every behavior change.
- Keep the governance evaluator advisory. Verified reviewer permission is descriptive provenance, not merge authorization.
- Keep docs synchronized with actual code and current evidence; distinguish implemented, tested, untested, documentation-only, blocked and not implemented.

## Definition of done

A candidate is eligible for acceptance only after exact-head unit tests, typecheck, lint, audits, production build, required Windows/Ollama and isolated Supabase/PostgreSQL/RLS jobs, independent review, clean mergeability and rollback documentation are all satisfied. Merge only when the repository's normal review and branch requirements are met. Deployment is a separate human-controlled decision.
