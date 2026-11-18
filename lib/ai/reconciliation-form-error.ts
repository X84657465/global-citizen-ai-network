/**
 * Only a 400 response is guaranteed to originate before the privileged
 * reconciliation RPC (body parsing/input validation). Other failures may be
 * ambiguous and must preserve the submitted payload and idempotency key.
 */
export function canCorrectReconciliationSubmission(status: number): boolean {
  return status === 400;
}
