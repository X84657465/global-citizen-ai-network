/**
 * GCAN F–P integration boundary.
 *
 * This module describes how F–P capabilities may be hosted by the existing
 * platform. It deliberately does not implement or import A–E runtime code.
 * Authentication, authorization, task execution, and product ownership remain
 * with their existing owners.
 */

export type WorkstreamId =
  | "F" | "G" | "H" | "I" | "J" | "K" | "L" | "M" | "N" | "O" | "P";

export type ContractMaturity = "specified" | "implemented" | "tested" | "accepted";

export interface WorkstreamContract {
  readonly id: WorkstreamId;
  readonly name: string;
  readonly responsibility: string;
  readonly consumes: readonly string[];
  readonly produces: readonly string[];
  readonly dependsOn: readonly string[];
  readonly maturity: ContractMaturity;
  readonly executionAuthority: "none" | "advisory" | "bounded";
}

export const FP_WORKSTREAM_CONTRACTS = [
  {
    id: "F",
    name: "Security assurance",
    responsibility: "Security controls, vulnerability findings, incident evidence, and security review.",
    consumes: ["platform.identity-reference", "platform.authorization-decision", "platform.audit-event", "platform.correlation-context"],
    produces: ["security.finding", "security.incident-evidence", "security.control-result"],
    dependsOn: ["A", "B", "H", "M", "P"],
    maturity: "specified",
    executionAuthority: "advisory",
  },
  {
    id: "G",
    name: "Integration and release quality",
    responsibility: "Cross-workstream contract checks, regression evidence, acceptance, and release verification.",
    consumes: ["workstream.change-manifest", "ci.exact-sha-result", "test.evidence"],
    produces: ["integration.compatibility-result", "release.acceptance-evidence"],
    dependsOn: ["F", "H", "K", "M", "O", "P"],
    maturity: "specified",
    executionAuthority: "advisory",
  },
  {
    id: "H",
    name: "Observability and operations",
    responsibility: "Request/task correlation, service health, runtime signals, and cost/usage observations.",
    consumes: ["platform.correlation-context", "runtime.health-signal", "runtime.usage-signal"],
    produces: ["observability.structured-event", "observability.health-snapshot", "observability.alert"],
    dependsOn: ["A", "B", "F"],
    maturity: "specified",
    executionAuthority: "advisory",
  },
  {
    id: "I",
    name: "External integrations",
    responsibility: "Versioned adapters for approved external APIs and automation workflows.",
    consumes: ["integration.request", "integration.approved-credential-reference", "policy.decision"],
    produces: ["integration.result", "integration.audit-evidence"],
    dependsOn: ["A", "F", "H", "P"],
    maturity: "specified",
    executionAuthority: "bounded",
  },
  {
    id: "J",
    name: "Resilience and recovery",
    responsibility: "Failure diagnosis, recovery recommendations, and bounded remediation proposals.",
    consumes: ["observability.alert", "runtime.failure-evidence", "policy.decision"],
    produces: ["resilience.diagnosis", "resilience.repair-proposal"],
    dependsOn: ["A", "F", "H", "P"],
    maturity: "specified",
    executionAuthority: "advisory",
  },
  {
    id: "K",
    name: "Knowledge and documentation",
    responsibility: "Versioned technical documentation, operational runbooks, and traceable handover records.",
    consumes: ["workstream.change-manifest", "release.acceptance-evidence", "knowledge.source-reference"],
    produces: ["knowledge.versioned-document", "knowledge.handover-record"],
    dependsOn: ["A", "B", "G", "P"],
    maturity: "specified",
    executionAuthority: "none",
  },
  {
    id: "L",
    name: "Federation and edge",
    responsibility: "Future node federation and distributed execution contracts; activation is explicitly deferred.",
    consumes: ["federation.node-attestation", "federation.capacity-signal", "policy.decision"],
    produces: ["federation.node-status", "federation.execution-evidence"],
    dependsOn: ["A", "F", "H", "J", "P"],
    maturity: "specified",
    executionAuthority: "none",
  },
  {
    id: "M",
    name: "Compliance and risk evidence",
    responsibility: "Control mapping, compliance checks, risk registers, and audit-ready evidence.",
    consumes: ["platform.audit-event", "security.finding", "policy.version", "knowledge.source-reference"],
    produces: ["compliance.control-result", "compliance.risk-record", "compliance.evidence-bundle"],
    dependsOn: ["B", "F", "K", "P"],
    maturity: "specified",
    executionAuthority: "advisory",
  },
  {
    id: "N",
    name: "Product analytics and growth",
    responsibility: "Privacy-minimized product usage analysis, experimentation evidence, and growth insights.",
    consumes: ["product.aggregated-usage-event", "product.experiment-result"],
    produces: ["analytics.insight", "analytics.experiment-report"],
    dependsOn: ["B", "H", "M", "P"],
    maturity: "specified",
    executionAuthority: "none",
  },
  {
    id: "O",
    name: "Lifecycle and deprecation",
    responsibility: "Version lifecycle, compatibility windows, deprecation plans, and retirement evidence.",
    consumes: ["release.acceptance-evidence", "workstream.version-manifest", "integration.compatibility-result"],
    produces: ["lifecycle.deprecation-notice", "lifecycle.retirement-record"],
    dependsOn: ["G", "K", "M", "P"],
    maturity: "specified",
    executionAuthority: "advisory",
  },
  {
    id: "P",
    name: "Governance and trust",
    responsibility: "Cross-cutting policy decisions, ownership, approval records, and evidence requirements.",
    consumes: ["policy.version", "workstream.ownership-record", "platform.audit-event", "compliance.control-result"],
    produces: ["policy.decision", "governance.approval-record", "governance.evidence-requirement"],
    dependsOn: ["F", "G", "K", "M", "O"],
    maturity: "specified",
    executionAuthority: "advisory",
  },
] as const satisfies readonly WorkstreamContract[];

/**
 * Stable transport envelope for F–P events/capability results.
 * actorRef and resourceRef are opaque references: this contract does not
 * authenticate them or grant permissions.
 */
export interface FPCapabilityEnvelope<TPayload = unknown> {
  readonly contractVersion: "1";
  readonly workstream: WorkstreamId;
  readonly capability: string;
  readonly eventId: string;
  readonly occurredAt: string;
  readonly correlationId: string;
  readonly actorRef?: string;
  readonly resourceRef?: string;
  readonly idempotencyKey?: string;
  readonly payload: TPayload;
}

export function getWorkstreamContract(id: WorkstreamId): WorkstreamContract {
  const contract = FP_WORKSTREAM_CONTRACTS.find((item) => item.id === id);
  if (!contract) throw new Error(`Unknown F–P workstream: ${id}`);
  return contract;
}

export function isFPWorkstream(value: string): value is WorkstreamId {
  return FP_WORKSTREAM_CONTRACTS.some((item) => item.id === value);
}
