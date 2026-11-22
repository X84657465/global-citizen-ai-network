# Runner recovery runbook

## Safety boundary

This document supports read-only diagnosis of the shared Runner. It does not authorize changes to Agent Factory V2 runtime, runner registration, machine state, credentials, leases, cooldowns, quarantines, workflow policy or production services.

## Read-only triage

1. Record UTC time, affected workflow run ID/attempt, exact head SHA, job name and Runner label.
2. Inspect GitHub Actions job state and timestamps. Distinguish queued from assigned, in progress, completed and cancelled.
3. Compare queue wait and execution duration with recent runs. Do not infer machine failure from a queued job alone.
4. Check whether another workflow holds the repository's serialized self-hosted Runner concurrency group.
5. Inspect only approved, redacted Runner diagnostics available to the repository owner. Do not collect environment variables, credential stores, workspace secrets or unrelated job payloads.
6. Classify the condition: queue contention, Runner offline, toolchain missing, disk/resource pressure, network/provider outage or unknown.
7. Escalate machine-level recovery to the designated Runner administrator. Do not reboot, re-register, alter labels, clear workspaces, change concurrency or modify machine-managed Factory state from this runbook.

## Recovery evidence

- Affected run/job and exact SHA
- Observed queue/start/end timestamps
- Read-only diagnostic references
- Failure classification and confidence
- Administrator/owner who authorized any separate recovery
- Post-recovery validation run and exact SHA

A queue delay is not permission to add infrastructure, bypass concurrency or run duplicate jobs.
