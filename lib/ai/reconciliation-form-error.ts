/**
 * Body parsing and validation errors are guaranteed to happen before the
 * privileged reconciliation RPC. These requests cannot have written an
 * idempotency record or ledger event, so the operator may correct the form.
 * Every other response stays locked because the mutation outcome may be
 * ambiguous and must be retried with the exact same payload and key.
 */
export function canCorrectReconciliationSubmission(status: number): boolean {
  return status === 400 || status === 413;
}
