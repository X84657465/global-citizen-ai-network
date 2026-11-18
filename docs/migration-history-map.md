# Live Supabase migration history map

Last verified: 2026-11-18. Source: live Supabase `list_migrations` plus repository `supabase/migrations` filenames.

The repository uses sequential numeric filename prefixes (`0001`–`0023`). The existing live Supabase history was provisioned through timestamp-versioned migrations. Names align, but the version identifiers do not. This map is an operational cross-reference, not a CLI migration repair.

| Repository file | Live version | Live migration name |
|---|---:|---|
| `0001_initial_schema.sql` | `20261118003031` | `initial_schema` |
| `0002_member_status_rls.sql` | `20261118003035` | `member_status_rls` |
| `0003_atomic_ai_budget_reservations.sql` | `20261118003039` | `atomic_ai_budget_reservations` |
| `0004_ai_budget_overrun_hard_stop.sql` | `20261118003043` | `ai_budget_overrun_hard_stop` |
| `0005_ai_request_idempotency.sql` | `20261118003047` | `ai_request_idempotency` |
| `0006_ai_request_rate_limits.sql` | `20261118003051` | `ai_request_rate_limits` |
| `0007_ai_operational_retention.sql` | `20261118003055` | `ai_operational_retention` |
| `0008_atomic_contribution_review.sql` | `20261118003059` | `atomic_contribution_review` |
| `0009_atomic_appeal_review.sql` | `20261118003104` | `atomic_appeal_review` |
| `0010_immutable_contribution_reward_snapshots.sql` | `20261118003109` | `immutable_contribution_reward_snapshots` |
| `0011_submission_appeal_lifecycle_hardening.sql` | `20261118003121` | `submission_appeal_lifecycle_hardening` |
| `0012_atomic_ai_chat_completion_and_reconciliation.sql` | `20261118003125` | `atomic_ai_chat_completion_and_reconciliation` |
| `0013_bound_ai_reconciliation_queue.sql` | `20261118003129` | `bound_ai_reconciliation_queue` |
| `0014_single_unresolved_ai_request_per_member.sql` | `20261118003135` | `single_unresolved_ai_request_per_member` |
| `0015_audited_ai_reconciliation_resolution.sql` | `20261118003138` | `audited_ai_reconciliation_resolution` |
| `0016_conversation_project_ownership.sql` | `20261118003142` | `conversation_project_ownership` |
| `0017_conversation_project_locking.sql` | `20261118003146` | `conversation_project_locking` |
| `0018_service_role_ai_reconciliation.sql` | `20261118005041` | `service_role_ai_reconciliation` |
| `0019_least_privilege_public_grants.sql` | `20261118045417` | `least_privilege_public_grants` |
| `0020_foreign_key_indexes_and_policy_split.sql` | `20261118045832` | `foreign_key_indexes_and_policy_split` |

| `0021_atomic_contribution_task_admin.sql` | `20261118050801` | `atomic_contribution_task_admin` |
| `0022_ai_providerless_completed_replay.sql` | `20261118060600` | `ai_providerless_completed_replay` |
| `0023_single_active_task_submission.sql` | `20261118060607` | `single_active_task_submission` |

## Production safety rule

- Do not run `supabase db push`, `supabase migration repair`, or a bulk migration replay against the live project while local numeric versions and remote timestamp versions differ.
- Continue using reviewed, forward-only migrations. Record the remote timestamp returned by Supabase and update this map in the same change.
- CI applies the repository's numeric migration files to a disposable local Supabase instance; this verifies SQL behavior but does not reconcile remote version identifiers.
- Never replay `0001_initial_schema.sql` against the existing populated project.