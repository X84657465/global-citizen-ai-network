import { FPHostAdapter, type FPHostRequestContext } from "./host-adapter.ts";

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

export interface FPResilienceEvidence {
  readonly schemaVersion: "1";
  readonly source: FPResilienceSource;
  readonly failureCode: FPResilienceFailureCode;
  /** Opaque reference to the trusted evidence record; never a free-form message. */
  readonly evidenceRef: string;
  /** Stable component identifier, not a URL, secret, or user-supplied label. */
  readonly componentRef: string;
  readonly occurredAt: string;
  readonly attemptCount: number;
  readonly policyDecision: FPResiliencePolicyDecision;
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
  readonly manualApprovalRequired: true;
  readonly executionPerformed: false;
  readonly generatedAt: string;
}

const SAFE_REF = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const POLICY_VERSION = /^[A-Za-z0-9][A-Za-z0-9._+-]{0,63}$/;
const SOURCES = new Set<FPResilienceSource>(["provider", "database", "queue", "runtime"]);
const CODES = new Set<FPResilienceFailureCode>([
  "TIMEOUT",
  "RATE_LIMITED",
  "CONNECTION_UNAVAILABLE",
  "DEPENDENCY_UNAVAILABLE",
  "RESOURCE_EXHAUSTED",
  "INVALID_CONFIGURATION",
  "PERMISSION_DENIED",
  "UNKNOWN",
]);

const ADVICE: Record<FPResilienceFailureCode, Omit<FPResilienceProposal, 
  "schemaVersion" | "proposalId" | "correlationId" | "evidenceRef" |
  "componentRef" | "classification" | "generatedAt">> = {
  TIMEOUT: {
    severity: "medium",
    recommendation: "Review dependency latency and timeout budgets before proposing a bounded retry.",
    suggestedChecks: ["Compare recent latency against the configured timeout.", "Check dependency health and queue depth."],
    manualApprovalRequired: true,
    executionPerformed: false,
  },
  RATE_LIMITED: {
    severity: "medium",
    recommendation: "Review provider quota and retry-after guidance; do not retry automatically.",
    suggestedChecks: ["Inspect the provider rate-limit response metadata.", "Confirm the configured request budget."],
    manualApprovalRequired: true,
    executionPerformed: false,
  },
  CONNECTION_UNAVAILABLE: {
    severity: "high",
    recommendation: "Verify network reachability and provider availability before proposing a controlled retry.",
    suggestedChecks: ["Check dependency health.", "Review recent connection failures and network changes."],
    manualApprovalRequired: true,
    executionPerformed: false,
  },
  DEPENDENCY_UNAVAILABLE: {
    severity: "high",
    recommendation: "Confirm dependency recovery and assess affected work before proposing a recovery action.",
    suggestedChecks: ["Check dependency health status.", "Identify affected requests using the correlation ID."],
    manualApprovalRequired: true,
    executionPerformed: false,
  },
  RESOURCE_EXHAUSTED: {
    severity: "high",
    recommendation: "Review capacity and admission limits; do not increase limits automatically.",
    suggestedChecks: ["Inspect bounded resource and queue metrics.", "Review recent capacity changes."],
    manualApprovalRequired: true,
    executionPerformed: false,
  },
  INVALID_CONFIGURATION: {
    severity: "high",
    recommendation: "Validate the relevant configuration through the owning team; do not mutate configuration automatically.",
    suggestedChecks: ["Compare active configuration with the approved version.", "Review the last authorized configuration change."],
    manualApprovalRequired: true,
    executionPerformed: false,
  },
  PERMISSION_DENIED: {
    severity: "high",
    recommendation: "Stop retries and have the resource owner review authorization and policy evidence.",
    suggestedChecks: ["Verify the principal and resource scope.", "Review the applicable policy decision and grant history."],
    manualApprovalRequired: true,
    executionPerformed: false,
  },
  UNKNOWN: {
    severity: "medium",
    recommendation: "Collect additional sanitized evidence and route the incident to the owning operator.",
    suggestedChecks: ["Inspect trusted event metadata.", "Correlate related failures without exporting request payloads."],
    manualApprovalRequired: true,
    executionPerformed: false,
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
    "occurredAt", "policyDecision", "schemaVersion", "source",
  ].sort();
  if (keys.length !== expected.length || keys.some((key, index) => key !== expected[index])) {
    throw new TypeError("Resilience evidence contains missing or unsupported fields.");
  }
  if (evidence.schemaVersion !== "1" ||
      typeof evidence.source !== "string" || !SOURCES.has(evidence.source as FPResilienceSource) ||
      typeof evidence.failureCode !== "string" || !CODES.has(evidence.failureCode as FPResilienceFailureCode) ||
      typeof evidence.evidenceRef !== "string" || !SAFE_REF.test(evidence.evidenceRef) ||
      typeof evidence.componentRef !== "string" || !SAFE_REF.test(evidence.componentRef) ||
      typeof evidence.occurredAt !== "string" || Number.isNaN(Date.parse(evidence.occurredAt)) ||
      !Number.isSafeInteger(evidence.attemptCount) || (evidence.attemptCount as number) < 1 ||
      !evidence.policyDecision || typeof evidence.policyDecision !== "object" ||
      Array.isArray(evidence.policyDecision)) {
    throw new TypeError("Resilience evidence is invalid.");
  }
  const decision = evidence.policyDecision as Record<string, unknown>;
  if (Object.keys(decision).sort().join(",") !== "decision,policyVersion" ||
      !["allow-advisory", "deny"].includes(String(decision.decision)) ||
      typeof decision.policyVersion !== "string" || !POLICY_VERSION.test(decision.policyVersion)) {
    throw new TypeError("Resilience policy decision is invalid.");
  }
}

export function createFPResilienceProposal(
  evidence: FPResilienceEvidence,
  context: Pick<FPHostRequestContext, "correlationId">,
  now: Date = new Date(),
): FPResilienceProposal | null {
  validateEvidence(evidence);
  if (!context || typeof context.correlationId !== "string" || !SAFE_REF.test(context.correlationId)) {
    throw new TypeError("A valid host correlation ID is required.");
  }
  if (!(now instanceof Date) || Number.isNaN(now.getTime())) {
    throw new TypeError("A valid proposal timestamp is required.");
  }
  if (evidence.policyDecision.decision !== "allow-advisory") return null;

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
    generatedAt: now.toISOString(),
  });
}

/** Registers deterministic, read-only J diagnostics on the shared F–P host. */
export function registerFPResilienceCapability(input: {
  readonly host: FPHostAdapter;
}): void {
  if (!input || !(input.host instanceof FPHostAdapter)) {
    throw new TypeError("An existing FPHostAdapter is required.");
  }
  input.host.register<FPResilienceEvidence, FPResilienceProposal | null>(
    "J",
    "diagnose",
    (evidence, context: FPHostRequestContext) =>
      createFPResilienceProposal(evidence, { correlationId: context.correlationId }, context.now?.() ?? new Date()),
  );
}
