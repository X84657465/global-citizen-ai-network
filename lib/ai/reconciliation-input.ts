export type ReconciliationDecision =
  | "confirmed_billed"
  | "confirmed_not_billed"
  | "inconclusive";

export type ReconciliationInput = {
  requestId: string;
  idempotencyKey: string;
  decision: ReconciliationDecision;
  provider: string;
  evidenceReference: string;
  rationale: string;
  providerBilledCost?: number;
  providerBilledCurrency?: string;
  normalizedCostTwd?: number;
};

type RawReconciliationInput = Record<string, unknown>;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_COST = 9999999999.99999999;

function validCost(value: unknown): value is number {
  return typeof value === "number" &&
    Number.isFinite(value) &&
    value >= 0 &&
    value <= MAX_COST;
}

export function parseReconciliationInput(
  value: unknown,
): { ok: true; value: ReconciliationInput } | { ok: false; reason: string } {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { ok: false, reason: "invalid_object" };
  }

  const input = value as RawReconciliationInput;
  const requestId = typeof input.requestId === "string" ? input.requestId : "";
  const idempotencyKey = typeof input.idempotencyKey === "string" ? input.idempotencyKey : "";
  const decision = input.decision;
  const provider = typeof input.provider === "string" ? input.provider.trim() : "";
  const evidenceReference = typeof input.evidenceReference === "string" ? input.evidenceReference.trim() : "";
  const rationale = typeof input.rationale === "string" ? input.rationale.trim() : "";
  const billedCost = input.providerBilledCost;
  const billedCurrency = input.providerBilledCurrency;
  const normalizedCost = input.normalizedCostTwd;

  if (!UUID_PATTERN.test(requestId) || !UUID_PATTERN.test(idempotencyKey) ||
      !["confirmed_billed", "confirmed_not_billed", "inconclusive"].includes(String(decision)) ||
      provider.length < 1 || provider.length > 120 ||
      evidenceReference.length < 8 || evidenceReference.length > 500 ||
      rationale.length < 20 || rationale.length > 2000) {
    return { ok: false, reason: "invalid_fields" };
  }

  if (decision === "confirmed_billed") {
    if (!validCost(billedCost) || !validCost(normalizedCost) ||
        typeof billedCurrency !== "string" || !/^[A-Z]{3}$/.test(billedCurrency)) {
      return { ok: false, reason: "invalid_billed_cost" };
    }
    return {
      ok: true,
      value: {
        requestId,
        idempotencyKey,
        decision,
        provider,
        evidenceReference,
        rationale,
        providerBilledCost: billedCost,
        providerBilledCurrency: billedCurrency,
        normalizedCostTwd: normalizedCost,
      },
    };
  }

  if (billedCost !== undefined || billedCurrency !== undefined || normalizedCost !== undefined) {
    return { ok: false, reason: "cost_not_allowed_for_decision" };
  }

  return {
    ok: true,
    value: { requestId, idempotencyKey, decision, provider, evidenceReference, rationale },
  };
}
