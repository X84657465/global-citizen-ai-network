# Row-level security verification plan

Run these checks against a non-production Supabase project after applying the initial migration. Use two ordinary test accounts (A and B), plus a trusted server-side service-role context. Do not use real user data.

## Account isolation

- A can create, read, update, and delete only A's projects and conversations.
- B cannot select or mutate A's project, conversation, message, AI request, cost, submission, contribution, or reward records by guessing UUIDs.
- A cannot attach a conversation to B's project.
- A cannot insert a message into B's conversation.
- A cannot insert a forged assistant/system message; only server-side trusted code can write those roles.

## Privilege escalation

- A can update their display name and preferred language.
- A cannot change their own role to reviewer/admin.
- A cannot change their account status to active/restricted/suspended/closed.
- A cannot create or modify review decisions, contribution ledger entries, reward ledger entries, or audit records through the client.

## Contribution controls

- A can submit only to a published task.
- A cannot submit on behalf of B.
- A cannot read B's submission or review notes.
- A can read review results for their own submission.
- A cannot publish or edit task acceptance criteria or reward amounts.
- A can submit one active submission per task; rejected submissions may be resubmitted after review.
- A can appeal only their own rejected submission and cannot alter the appeal decision.

## Ledger integrity

- Client-side update/delete attempts against AI cost, contribution, and reward ledgers must fail.
- A correction is represented by a new reversal/adjustment record referencing the original event.
- Duplicate idempotency keys in reward_ledger must fail.
- All money values retain currency and source/calculation method.

## Release gate

Do not enable public sign-up, paid AI calls, file uploads, or cash settlement until these checks pass. Save test evidence and review any policy change before release.
