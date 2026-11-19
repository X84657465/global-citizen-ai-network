# Agent Factory V2 changelog

## 2.0.0

- Introduce the durable task lifecycle with explicit state transitions and a persistent state store.
- Add lease ownership, workflow-attempt-aware recovery, retry scheduling, quarantine and system cooldown controls.
- Add bounded candidate patch validation, isolated scratch testing and deterministic Draft PR publication.
- Add lifecycle, state-machine, policy, path-safety, publisher and integration regression coverage.
- Add an operations runbook documenting Windows Runner, Docker, Ollama, CI, recovery and security boundaries.
- Add the Factory V2 operations console at `/factory` (demonstration status only; live runner telemetry is not implied).

**Release status:** development candidate under PR #134. Version metadata does not constitute release acceptance; exact-head CI and independent review remain required.

## 2.0.1

- Fix an escaped newline in the patch generator comment that prevented `patchBatches` from being declared at runtime.
- Add an explicit Node.js syntax-validation step for the patch generator and factory controller to CI.

**Verification:** exact-head CI is required; not yet accepted as complete.
