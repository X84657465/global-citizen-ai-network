# Citizen Cloud Network — Architecture and Economics

**Status:** Design proposal only. No node agent, queue, scheduler, new database table, provider integration, or production infrastructure is enabled by this document.

## 1. Product definition

The Citizen Cloud Network is a two-sided, opt-in resource network:

- **Consumers** submit useful workloads and receive services.
- **Providers** voluntarily contribute bounded CPU, GPU, memory, storage, or bandwidth capacity and receive transparent credits or cash compensation only under published, funded rules.
- **The platform** authenticates participants, admits and schedules jobs, enforces resource and data boundaries, verifies results, measures cost, and settles contribution records.

This is not a promise that volunteer devices make cloud compute free. Electricity, hardware depreciation, network egress, orchestration, verification, support, security, and incentives remain real costs.

## 2. Recommended topology: central control plane, distributed execution plane

### Control plane (central, trusted)

Initially retain the existing application stack:

- **Next.js on Vercel:** member UI, API gateway, node registration UI, admin controls.
- **Supabase Auth:** member and node-owner identity.
- **Supabase PostgreSQL:** authoritative node registry, job state, quotas, cost ledger, contribution ledger, audit trail, and transactional admission/settlement RPCs.
- **Private object storage:** signed, short-lived artifact transfer; never public buckets for private job payloads.
- **Scheduler/dispatcher:** initially a small server-side worker process or managed queue consumer; do not run long-lived scheduling loops in Vercel request handlers.
- **Observability:** job lifecycle events, node heartbeat, failure rate, verified throughput, energy/resource declarations, and cost per successful result.

The database remains the source of truth. Queue messages are delivery hints, not authoritative job state.

### Execution plane (untrusted, distributed)

A separately versioned desktop node agent runs only after explicit installation and opt-in. It:

- advertises coarse capabilities and availability, not files or arbitrary device telemetry;
- enforces user-configured CPU/GPU, memory, disk, bandwidth, temperature, power, and schedule limits locally;
- downloads a signed, allowlisted workload and verifies its digest and signature;
- executes in a disposable sandbox with restricted filesystem and network access;
- returns a result plus execution evidence;
- supports pause, revoke, uninstall, and immediate local stop;
- never receives Supabase service-role credentials, provider API keys, payment credentials, or another member's session token.

Browser tabs and phones/tablets are not suitable as dependable sustained worker nodes. Start desktop-first.

### Trust boundary

Treat every node, workload result, uploaded artifact, and worker-reported metric as untrusted. The platform must independently validate job ownership, job signature, artifact hashes, resource limits, result schema, and acceptance criteria. High-value or safety-critical results require redundant execution or human review.

## 3. Workload admission classes

| Class | Examples | Initial policy |
|---|---|---|
| A — embarrassingly parallel, non-sensitive | public-data transforms, image thumbnails, open dataset processing, public benchmark jobs | First candidate for community nodes |
| B — local/private user data | personal document processing, private files, private model prompts | Keep on trusted provider infrastructure or user's own device; do not send to community nodes |
| C — secrets / privileged operations | API keys, database operations, payments, admin tasks, authentication | Never execute on community nodes |
| D — nondeterministic AI inference | model inference with floating-point variation | Only after model/runtime pinning, tolerance-based verification, and privacy review |

A job is eligible for community execution only when its input rights, privacy classification, runtime, resource envelope, verification method, and compensation rule are explicit.

## 4. Job lifecycle

1. Member submits a workload request through the authenticated API.
2. API validates ownership, payload size, data classification, allowed workload type, quota, and budget.
3. An admission RPC creates a durable job and reserves its maximum platform cost/credit exposure atomically.
4. Scheduler selects eligible nodes using capability, region, availability, reliability, price, and policy constraints.
5. Dispatcher issues a short-lived, single-job signed lease. A lease binds job ID, node ID, workload digest, input artifact hashes, resource ceilings, expiry, and nonce.
6. Node downloads only the authorized artifact, verifies the lease and workload signature, then executes in the sandbox.
7. Node uploads output to a private quarantine location and submits a result manifest.
8. Verifier checks hashes, schema, limits, deterministic output or tolerance/redundancy policy, and deadline.
9. Accepted results settle the job and append usage/contribution ledger events. Failed, expired, or disputed jobs follow explicit retry/release/review transitions.
10. A node's reward is not earned merely for claiming a job; it is based on accepted work and the published rate, with anti-fraud and appeal controls.

Use idempotency keys and compare-and-set state transitions throughout. A node must never be able to mark its own work accepted or set its own reward.

## 5. Scheduling and verification

### Eligibility score

The scheduler should filter first, score second. Hard filters include job class, runtime compatibility, resource ceiling, node opt-in state, lease availability, geography/data policy, and current node health.

A candidate score may then use normalized values:

score = w1 × reliability + w2 × capability_fit + w3 × locality + w4 × availability − w5 × expected_cost − w6 × failure_risk

Weights are operational configuration, versioned and auditable. Do not claim that a node is cheaper solely because it is volunteer-owned.

### Result verification levels

- **Level 0:** schema/hash validation; suitable only for low-risk transforms with independently checkable output.
- **Level 1:** deterministic recomputation or sampled recomputation on a trusted verifier.
- **Level 2:** redundant execution on independent nodes and quorum comparison.
- **Level 3:** human review or domain-specific external evidence for high-value outputs.

For model inference, exact bitwise equality may be unrealistic across hardware/runtime versions. Define model hash, runtime/container digest, precision, seed where applicable, and accepted numeric/textual tolerance. Never use a node's self-reported success as sole proof.

## 6. Security requirements before any public node beta

- Explicit opt-in, granular resource caps, visible active status, pause/stop, uninstall, and no hidden persistence.
- Signed workloads and signed updates; key rotation and revocation.
- Disposable sandbox; non-root execution; read-only base image; bounded temporary storage; restricted egress allowlist; no host mounts except a dedicated job directory.
- No arbitrary shell, arbitrary browser automation, or arbitrary user-supplied executable code on community nodes.
- No access to participant files, browser profiles, credentials, clipboard, camera, microphone, or unrelated device data.
- Short-lived, audience-bound, one-job leases; replay protection and revocation.
- Private object storage, short-lived signed URLs, encryption in transit and at rest, retention/deletion policy, and malware scanning where relevant.
- Node attestation/reputation is a signal, not proof of honesty. Use independent verification.
- Rate limits, Sybil resistance, abuse reporting, incident response, vulnerability disclosure, and independent security review.
- Never expose Supabase service-role keys or model-provider keys to node agents.

## 7. Cost model and break-even test

Measure cost per **accepted, useful result**, not per CPU-hour advertised by a node.

Let:

- C_cloud = trusted cloud/provider cost for the same accepted workload.
- C_node = node incentive or compensation for accepted work.
- C_verify = trusted verification/redundant execution cost.
- C_transfer = ingress/egress, storage, and artifact delivery cost.
- C_coord = scheduler, queue, database, monitoring, and support allocation.
- C_failure = expected retry, fraud, and failed-work cost per accepted result.

Then:

C_citizen = C_node + C_verify + C_transfer + C_coord + C_failure

Net saving = C_cloud - C_citizen

Saving rate = (C_cloud - C_citizen) / C_cloud

Community execution is economically justified only when Net saving > 0 and latency, privacy, reliability, and quality are within the product's service objectives. If not, route the job to the trusted cloud or the user's own device.

### Illustrative sensitivity example (not a quote or forecast)

Assume a comparable trusted-cloud workload costs NT$10 per accepted result. If the combined community-node incentive, verification, transfer, coordination, and failure cost is:

| Community total cost | Net saving | Saving rate |
|---:|---:|---:|
| NT$4 | NT$6 | 60% |
| NT$7 | NT$3 | 30% |
| NT$10 | NT$0 | 0% |
| NT$12 | -NT$2 | -20% |

The example only demonstrates the break-even formula. Actual prices must be measured from real workloads and provider invoices.

### Required accounting dimensions

Track separately: provider invoice cost, internal cloud compute, node rewards, verification/redundancy, storage, bandwidth/egress, queue/database, observability, support, refunds, and failed-work loss. Do not label estimated savings as realized savings. Report median and p95 cost/latency, accepted-result rate, retry rate, and cost per accepted result by workload class and region.

### Incentive policy

- Publish the rate, resource unit, acceptance criteria, payment timing, dispute process, and any tax/identity requirements before a task starts.
- Reward accepted useful work, not uptime alone, raw claimed FLOPS, referrals, or token speculation.
- Credits, cash rewards, and AI usage allowance must remain separate ledger types.
- Never promise guaranteed income or treat volunteer participation as an employment substitute.

## 8. Integration with the current repository

Current repository already provides important foundations:

- Supabase Auth and member profiles.
- Next.js API routes and server-only service-role client.
- AI request idempotency, budget reservations, settlement, hard-stop, and reconciliation patterns.
- Contribution task/review/appeal workflows and append-only reward/cost ledger principles.
- Admin audit and cost transparency surfaces.

Reuse those patterns; do not introduce a second identity system or let nodes write directly to business tables.

### Proposed bounded domain additions (future migrations, not created here)

| Entity | Purpose | Key controls |
|---|---|---|
| compute_nodes | registered node identity and capability snapshot | owner-scoped RLS; public view exposes only coarse, opt-in capacity |
| compute_node_heartbeats | availability and health events | short retention; no sensitive device fingerprint |
| compute_workloads | signed, allowlisted workload catalog | immutable digest/version and approval state |
| compute_jobs | durable job state and ownership | owner-scoped reads; state changes through RPC only |
| compute_job_leases | one-time node assignment and expiry | hashed lease token; one active lease; expiry/revocation |
| compute_artifacts | private input/output manifest | private storage, owner/job checks, retention |
| compute_verification_events | independent validation evidence | append-only; verifier identity and method |
| compute_usage_ledger | measured resource usage and cost allocation | append-only; separate estimate vs invoice |
| compute_reward_ledger | accepted contribution reward events | append-only, idempotent, reversal events |

Prefer a dedicated compute schema or otherwise unexposed tables/functions for internal scheduler data. Expose only narrowly scoped API/RPC surfaces. Every privileged RPC must validate actor identity, ownership, job state, lease validity, and allowed transition. No broad table grants to browser roles.

### Proposed API surface (not implemented)

- POST /api/compute/nodes/register — authenticated owner creates or rotates a node registration.
- POST /api/compute/nodes/heartbeat — node submits bounded health/capacity heartbeat.
- POST /api/compute/jobs — member submits an eligible job.
- POST /api/compute/leases/claim — node requests one eligible lease.
- POST /api/compute/jobs/:id/result — node submits result manifest to quarantine.
- GET /api/compute/jobs/:id — owner-scoped job status.
- POST /api/compute/nodes/:id/revoke — owner/admin revokes a node.

All node endpoints require short-lived node credentials, request signing, replay protection, rate limiting, and strict schema validation. A member session alone is not a node credential.

## 9. Phased implementation plan and release gates

### Phase 0 — cost baseline (now; no distributed nodes)

1. Instrument existing AI and application paths by feature, provider/model, region, and accepted result.
2. Record actual invoice costs separately from internal estimates.
3. Add a cost dashboard view for baseline cost per accepted operation.
4. Benchmark local execution on the user's own device as a private/local mode, without enrolling it as a public worker.
5. Define eligible public-data workloads and verification fixtures.

**Exit gate:** at least one workload has repeatable baseline measurements and an independently verifiable output.

### Phase 1 — trusted hybrid execution

1. Route between local user device and trusted server-side execution for explicitly supported workloads.
2. Add a durable queue and a separate worker service for non-interactive jobs.
3. Keep Supabase as control-plane source of truth; queue payloads contain opaque job IDs only.
4. Add worker leases, timeout, dead-letter handling, idempotent result commit, and operator pause switch.

**Exit gate:** failure/retry, duplicate delivery, worker loss, and budget-stop tests pass in disposable staging.

### Phase 2 — private opt-in node pilot

1. Build a signed desktop agent for one OS and one workload class.
2. Launch with a small invited cohort and non-sensitive public-data jobs only.
3. Add independent verification and capped pilot compensation.
4. Conduct threat modeling, penetration testing, privacy review, and incident drill.

**Exit gate:** positive measured savings after all incentives and overhead, with acceptable p95 latency and verified-result rate.

### Phase 3 — multi-region community network

Add region-aware scheduling, node reputation, multiple workload classes, transparent reward settlement, jurisdiction-specific legal/tax handling, and public aggregate reporting only after Phase 2 gates pass.

## 10. What not to build yet

- No blockchain/token requirement.
- No peer-to-peer mesh or public arbitrary-code marketplace.
- No community access to private prompts, user documents, database credentials, or provider API keys.
- No always-on hidden mining or background compute.
- No custom GPU data center before utilization and workload economics justify it.
- No global microservice fleet before measured demand.
- No Production schema changes, node installation, paid provider enablement, or deployment as part of this design proposal.

## 11. Immediate engineering decision

Proceed with **Phase 0 only** in the existing repository. First establish real cost and workload telemetry; then design a small queue/worker boundary. Keep distributed desktop nodes behind a separate future security review. This sequencing can lower costs sooner without prematurely creating a high-risk global compute marketplace.
