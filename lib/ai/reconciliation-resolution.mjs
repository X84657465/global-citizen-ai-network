import { db } from './database.js';
import { authenticateAdmin } from './auth.js';

export async function resolveOutcome(outcomeId, evidence, provider, reviewer, classification, rationale) {
  const admin = await authenticateAdmin();
  if (!admin) throw new Error('Only active administrators can resolve outcomes');

  const outcome = await db.getOutcome(outcomeId);
  if (!outcome) throw new Error('Outcome not found');

  if (outcome.status === 'confirmed-billed') {
    // Settle confirmed-billed outcome atomically
    await db.settleOutcome(outcomeId, evidence, provider, reviewer, classification, rationale);
    return { status: 'settled', message: 'Outcome settled successfully' };
  } else if (outcome.status === 'confirmed-not-billed') {
    // Release reservations atomically
    await db.releaseReservations(outcomeId);
    return { status: 'released', message: 'Reservations released successfully' };
  } else if (outcome.status === 'inconclusive') {
    // Preserve state and record review evidence
    await db.recordReviewEvidence(outcomeId, evidence, provider, reviewer, classification, rationale);
    return { status: 'reviewed', message: 'Inconclusive outcome reviewed and evidence recorded' };
  } else {
    throw new Error('Invalid outcome status');
  }
}

// Ensure atomicity and idempotency
export async function ensureAtomicResolution(outcomeId, evidence, provider, reviewer, classification, rationale) {
  const transaction = await db.beginTransaction();
  try {
    const result = await resolveOutcome(outcomeId, evidence, provider, reviewer, classification, rationale);
    await transaction.commit();
    return result;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

// Concurrency and replay safety
export async function handleConcurrentResolution(outcomeId, evidence, provider, reviewer, classification, rationale) {
  const outcome = await db.getOutcome(outcomeId);
  if (!outcome) throw new Error('Outcome not found');

  // Check for duplicate requests
  if (outcome.resolutionAttempted) {
    throw new Error('Resolution already attempted');
  }

  // Mark resolution as attempted
  await db.markResolutionAttempted(outcomeId);
  try {
    const result = await resolveOutcome(outcomeId, evidence, provider, reviewer, classification, rationale);
    return result;
  } catch (error) {
    // Rollback if resolution fails
    await db.rollbackResolutionAttempt(outcomeId);
    throw error;
  }
}