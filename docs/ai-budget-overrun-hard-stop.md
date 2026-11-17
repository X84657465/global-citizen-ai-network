# AI budget overrun hard-stop

## What changed

Migration `0004_ai_budget_overrun_hard_stop.sql` replaces the settlement function with a serialized version that:

1. Locks the global AI control row before the reservation row, matching the reservation function's lock order.
2. Settles the provider-reported actual TWD cost without capping or hiding it.
3. Recalculates current-month committed spend, counting settled actual costs and outstanding reservations.
4. Disables the global AI switch when hard-stop is enabled and committed spend exceeds the configured monthly ceiling.

## Operational behavior

- The real charge remains recorded even when it exceeds the reservation.
- New reservations are blocked after the global switch is disabled.
- An administrator must review the overrun, reconcile the provider invoice and budget, then explicitly re-enable AI.
- This migration is not active until applied to a Supabase database.
- A live concurrency and overrun integration test is still required before production use.

## Apply order

Apply migrations in numeric order: `0001`, `0002`, `0003`, then `0004`.
