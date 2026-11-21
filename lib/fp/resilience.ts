import {
  FPHostAdapter,
  type FPHostPrincipal,
  type FPHostRequestContext,
} from "./host-adapter.ts";

export type FPResilienceFailureCode =
  | "TIMEOUT"
  | "RATE_LIMITED"
  | "CONNECTION_UNAVAILABLE"
  | "DEPENDENCY_UNAVAILABLE"
  | "RESOURCE_EXHAUSTED"
  | "INVALID_CONFIGURATION"
  | "PERMISSION_DENIED"
  | "UNKNOWN";

export type FPResilienceSource = "provider" | "database" | "queue" | "runtime";

export interface FPResiliencePolicyDecision {
  readonly decision: "allow-advisory" | "deny";
  readonly policyVersion: string;
}

export interface FPResilienceEvidenceRequest {
  readonly evidenceRef: string;
}

export interface FPResilienceEvidenceProvider {
  /** Resolve only host-owned evidence visible to this trusted actor/resource. */
  resolve(
    evidenceRef: string,
    principal: FPHostPrincipal,
  ): Promise<FPResilienceEvidence> | FPResilienceEvidence;
}

export interface FPResiliencePolicyProvider {
  /** Trusted P integration; never take policy decisions from request payloads. */
  evaluate(
    evidence: FPResilienceEvidence,
    principal: FPHostPrincipal,
  ): Promise<FPResiliencePolicyDecision> | FPResiliencePolicyDecision;
}

export interface FPResilienceEvidence {
  readonly schemaVersion: "1";
  readonly source: FPResilienceSource;
  readonly failureCode: FPResilienceFailureCode;
  /** Opaque reference to a trusted evidence record; never a free-form message. */
  readonly evidenceRef: string;
  /** Stable component identifier, not a URL, secret, or user-supplied label. */
  readonly componentRef: string;
  readonly occurredAt: string;
  readonly attemptCount: number;
}

export interface FPResilienceProposal {
  readonly schemaVersion: "1";
  readonly proposalId: string;
  readonly correlationId: string;
  readonly evidenceRef: string;
  readonly componentRef: string;
  readonly classification: FPResilienceFailureCode;
  readonly severity: "low" | "medium" | "high";
  readonly recommendation: string;
  readonly suggestedChecks: readonly string[];
  readonly policyVersion: string;
  readonly manualApprovalRequired: true;
  readonly executionPerformed: false;
  readonly generatedAt: string;
}

const SAFE_REF = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const POLICY_VERSION = /^[A-Za-z0-9][A-Za-z0-9._+-]{0,63}$/;
const ISO_UTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/;
const SOURCES = new Set<FPResilienceSource>(["provider", "database", "queue", "runtime"]);
const CODES = new Set<FPResilienceFailureCode>([
  "TIMEOUT", "RATE_LIMITED", "CONNECTION_UNAVAILABLE", "DEPENDENCY_UNAVAILABLE",
  "RESOURCE_EXHAUSTED", "INVALID_CONFIGURATION", "PERMISSION_DENIED", "UNKNOWN",
]);

const ADVICE: Record<FPResilienceFailureCode, {
  severity: "low" | "medium" | "high";
  recommendation: string;
  suggestedChecks: readonly string[];
}> = {
  TIMEOUT: {
    severity: "medium",
    recommendation: "Review dependency latency and timeout budgets before proposing a bounded retry.",
    suggestedChecks: ["Compare recent latency against the configured timeout.", "Check dependency health and queue depth."],
  },
  RATE_LIMITED: {
    severity: "medium",
    recommendation: "Review provider quota and retry-after guidance; do not retry automatically.",
    suggestedChecks: ["Inspect provider rate-limit metadata.", "Confirm the configured request budget."],
  },
  CONNECTION_UNAVAILABLE: {
    severity: "high",
    recommendation: "Verify network reachability and provider availability before proposing a controlled retry.",
    suggestedChecks: ["Check dependency health.", "Review recent connection failures and network changes."],
  },
  DEPENDENCY_UNAVAILABLE: {
    severity: "high",
    recommendation: "Confirm dependency recovery and assess affected work before proposing a recovery action.",
    suggestedChecks: ["Check dependency health status.", "Identify affected requests using the correlation ID."],
  },
  RESOURCE_EXHAUSTED: {
    severity: "high",
    recommendation: "Review capacity and admission limits; do not increase limits automatically.",
    suggestedChecks: ["Inspect bounded resource and queue metrics.", "Review recent capacity changes."],
  },
  INVALID_CONFIGURATION: {
    severity: "high",
    recommendation: "Validate configuration through the owning team; do not mutate configuration automatically.",
    suggestedChecks: ["Compare active configuration with the approved version.", "Review the last authorized configuration change."],
  },
  PERMISSION_DENIED: {
    severity: "high",
    recommendation: "Stop retries and have the resource owner review authorization and policy evidence.",
    suggestedChecks: ["Verify the principal and resource scope.", "Review applicable policy and grant history."],
  },
  UNKNOWN: {
    severity: "medium",
    recommendation: "Collect additional sanitized evidence and route the incident to the owning operator.",
    suggestedChecks: ["Inspect trusted event metadata.", "Correlate related failures without exporting request payloads."],
  },
};

function validateEvidence(value: unknown): asserts value is FPResilienceEvidence {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError("Resilience evidence must be an object.");
  }
  const evidence = value as Record<string, unknown>;
  const keys = Object.keys(evidence).sort();
  const expected = [
    "attemptCount", "componentRef", "evidenceRef", "failureCode",
    "occurredAt", "schemaVersion", "source",
  ].sort();
  if (keys.length !== expected.length || keys.some((key, index) => key !== expected[index])) {
    throw new TypeError("Resilience evidence contains missing or unsupported fields.");
  }
  if (
    evidence.schemaVersion !== "1" ||
    typeof evidence.source !== "string" || !SOURCES.has(evidence.source as FPResilienceSource) ||
    typeof evidence.failureCode !== "string" || !CODES.has(evidence.failureCode as FPResilienceFailureCode) ||
    typeof evidence.evidenceRef !== "string" || !SAFE_REF.test(evidence.evidenceRef) ||
    typeof evidence.componentRef !== "string" || !SAFE_REF.test(evidence.componentRef) ||
    typeof evidence.occurredAt !== "string" || !ISO_UTC.test(evidence.occurredAt) ||
    Number.isNaN(Date.parse(evidence.occurredAt)) ||
    typeof evidence.attemptCount !== "number" ||
    !Number.isSafeInteger(evidence.attemptCount) ||
    evidence.attemptCount < 1 || evidence.attemptCount > 1_000_000
  ) {
    throw new TypeError("Resilience evidence is invalid.");
  }
}

function validatePolicyDecision(value: unknown): asserts value is FPResiliencePolicyDecision {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError("Trusted resilience policy decision is required.");
  }
  const decision = value as Record<string, unknown>;
  if (
    Object.keys(decision).sort().join(",") !== "decision,policyVersion" ||
    !["allow-advisory", "deny"].includes(String(decision.decision)) ||
    typeof decision.policyVersion !== "string" ||
    !POLICY_VERSION.test(decision.policyVersion)
  ) {
    throw new TypeError("Trusted resilience policy decision is invalid.");
  }
}

export function createFPResilienceProposal(
  evidence: FPResilienceEvidence,
  policyDecision: FPResiliencePolicyDecision,
  context: Pick<FPHostRequestContext, "correlationId">,
  now: Date = new Date(),
): FPResilienceProposal | null {
  validateEvidence(evidence);
  validatePolicyDecision(policyDecision);
  if (!context || typeof context.correlationId !== "string" || !SAFE_REF.test(context.correlationId)) {
    throw new TypeError("A valid host correlation ID is required.");
  }
  if (!(now instanceof Date) || Number.isNaN(now.getTime())) {
    throw new TypeError("A valid proposal timestamp is required.");
  }
  if (policyDecision.decision !== "allow-advisory") return null;

  const advice = ADVICE[evidence.failureCode];
  return Object.freeze({
    schemaVersion: "1",
    proposalId: `j:${evidence.evidenceRef}:${evidence.failureCode.toLowerCase()}`,
    correlationId: context.correlationId,
    evidenceRef: evidence.evidenceRef,
    componentRef: evidence.componentRef,
    classification: evidence.failureCode,
    ...advice,
    suggestedChecks: Object.freeze([...advice.suggestedChecks]),
    policyVersion: policyDecision.policyVersion,
    manualApprovalRequired: true,
    executionPerformed: false,
    generatedAt: now.toISOString(),
  });
}

/** Registers deterministic, read-only J diagnostics behind trusted evidence and P policy providers. */
export function registerFPResilienceCapability(input: {
  readonly host: FPHostAdapter;
  readonly evidence: FPResilienceEvidenceProvider;
  readonly policy: FPResiliencePolicyProvider;
}): void {
  if (!input || !(input.host instanceof FPHostAdapter) ||
      !input.evidence || typeof input.evidence.resolve !== "function" ||
      !input.policy || typeof input.policy.evaluate !== "function") {
    throw new TypeError("An existing FPHostAdapter and trusted evidence and P policy providers are required.");
  }
  input.host.register<FPResilienceEvidenceRequest, FPResilienceProposal | null>(
    "J",
    "diagnose",
    async (request, context: FPHostRequestContext) => {
      if (!request || typeof request !== "object" || Array.isArray(request) ||
          Object.keys(request).join(",") !== "evidenceRef" ||
          typeof request.evidenceRef !== "string" || !SAFE_REF.test(request.evidenceRef)) {
        throw new TypeError("A valid opaque resilience evidence reference is required.");
      }
      const evidence = await input.evidence.resolve(request.evidenceRef, context.principal);
      validateEvidence(evidence);
      if (evidence.evidenceRef !== request.evidenceRef) {
        throw new TypeError("Resolved evidence does not match the requested reference.");
      }
      const decision = await input.policy.evaluate(evidence, context.principal);
      return createFPResilienceProposal(
        evidence,
        decision,
        { correlationId: context.correlationId },
        context.now?.() ?? new Date(),
      );
    },
  );
}
