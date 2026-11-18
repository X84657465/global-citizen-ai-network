# Live Supabase migration history map

Last verified: 2026-11-18. Source: live Supabase `list_migrations` plus repository `supabase/migrations` filenames.

The repository migration filenames now use the exact 14-digit version identifiers returned by the live Supabase migration history. All 24 migration SQL contents were preserved byte-for-byte; only filenames were aligned. This removes the prior local/remote version-prefix mismatch. It does not apply, repair, or replay any migration on the live database.

| Repository file | Live version | Live migration name |
|---|---:|---|
| `20261118003031_initial_schema.sql` | `20261118003031` | `initial_schema` |
| `20261118003035_member_status_rls.sql` | `20261118003035` | `member_status_rls` |
| `20261118003039_atomic_ai_budget_reservations.sql` | `20261118003039` | `atomic_ai_budget_reservations` |
| `20261118003043_ai_budget_overrun_hard_stop.sql` | `20261118003043` | `ai_budget_overrun_hard_stop` |
| `20261118003047_ai_request_idempotency.sql` | `20261118003047` | `ai_request_idempotency` |
| `20261118003051_ai_request_rate_limits.sql` | `20261118003051` | `ai_request_rate_limits` |
| `20261118003055_ai_operational_retention.sql` | `20261118003055` | `ai_operational_retention` |
| `20261118003059_atomic_contribution_review.sql` | `20261118003059` | `atomic_contribution_review` |
| `20261118003104_atomic_appeal_review.sql` | `20261118003104` | `atomic_appeal_review` |
| `20261118003109_immutable_contribution_reward_snapshots.sql` | `20261118003109` | `immutable_contribution_reward_snapshots` |
| `20261118003121_submission_appeal_lifecycle_hardening.sql` | `20261118003121` | `submission_appeal_lifecycle_hardening` |
| `20261118003125_atomic_ai_chat_completion_and_reconciliation.sql` | `20261118003125` | `atomic_ai_chat_completion_and_reconciliation` |
| `20261118003129_bound_ai_reconciliation_queue.sql` | `20261118003129` | `bound_ai_reconciliation_queue` |
| `20261118003135_single_unresolved_ai_request_per_member.sql` | `20261118003135` | `single_unresolved_ai_request_per_member` |
| `20261118003138_audited_ai_reconciliation_resolution.sql` | `20261118003138` | `audited_ai_reconciliation_resolution` |
| `20261118003142_conversation_project_ownership.sql` | `20261118003142` | `conversation_project_ownership` |
| `20261118003146_conversation_project_locking.sql` | `20261118003146` | `conversation_project_locking` |
| `20261118005041_service_role_ai_reconciliation.sql` | `20261118005041` | `service_role_ai_reconciliation` |
| `20261118045417_least_privilege_public_grants.sql` | `20261118045417` | `least_privilege_public_grants` |
| `20261118045832_foreign_key_indexes_and_policy_split.sql` | `20261118045832` | `foreign_key_indexes_and_policy_split` |

| `20261118050801_atomic_contribution_task_admin.sql` | `20261118050801` | `atomic_contribution_task_admin` |
| `20261118060600_ai_providerless_completed_replay.sql` | `20261118060600` | `ai_providerless_completed_replay` |
| `20261118060607_single_active_task_submission.sql` | `20261118060607` | `single_active_task_submission` |
| `20261118061217_dedupe_active_submission_index.sql` | `20261118061217` | `dedupe_active_submission_index` |

## Production safety rule

- Do not run `supabase db push`, `supabase migration repair`, or a bulk migration replay against the live project while local numeric versions and remote timestamp versions differ.
- Continue using reviewed, forward-only migrations. Record the remote timestamp returned by Supabase and update this map in the same change.
- CI applies the repository's numeric migration files to a disposable local Supabase instance; this verifies SQL behavior but does not reconcile remote version identifiers.
- Never replay `20261118003031_initial_schema.sql` against the existing populated project.