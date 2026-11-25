# G — Release, QA & Integration

**Track version:** 0.1.4  
**Status:** implementation candidate; operational release authority is not implied.  
**Owner:** GPT 2 / G workstream.

## Purpose

G makes cross-track integration deterministic and evidence-driven. It rejects repeated Actions job URLs so one underlying job record cannot satisfy multiple required gates. It sequences candidate integration, records compatibility, defines required quality gates, and produces release evidence bound to an exact repository, pull request, commit SHA, workflow run, and run attempt.

G does not own feature implementation, override F security decisions, grant approval authority, or bypass repository branch protection. A successful partial job, stale run, skipped check, draft PR, version bump, or merged documentation is not acceptance.

## Operating sequence

1. **Identify scope.** Record the workstream owner, changed paths, non-goals, affected contracts, and receiving owners.
2. **Pin the candidate.** Record repository, base ref/SHA, head ref/SHA, PR number, and the exact diff.
3. **Resolve compatibility.** Check producer/consumer contract versions and classify each dependency as compatible, incompatible, or unknown.
4. **Select gates.** Run the required checks for the changed paths and risk profile. Security-sensitive changes require F review; database changes require migration and RLS evidence.
5. **Collect exact evidence.** Bind each result to the same candidate head SHA and retain workflow run ID plus run attempt. A rerun is a distinct attempt.
6. **Review independently.** Record authorized review disposition and unresolved threads. A COMMENT is not an APPROVE.
7. **Decide.** PASS only when every applicable required gate is terminal and successful, independent review is satisfied, and no blocking finding remains. Otherwise use BLOCKED, PENDING, FAIL, or NOT RUN.
8. **Handoff.** Publish the evidence record and receiving-owner compatibility result before integration.

## Ownership and path-impact matrix

| Track | Primary responsibility | G integration action |
|---|---|---|
| A–E | Independently owned core/product tracks | Treat as external owners; do not modify their files or claim their acceptance |
| F | Security controls and adversarial validation | Require applicable F findings/controls to be resolved before release |
| G | Release, QA and integration evidence | Maintain matrices, templates and exact-SHA release records |
| H | Telemetry and cost/quota governance | Verify privacy-minimized observability compatibility |
| I–O | Their named workstream contracts | Require owner review when their interfaces or paths are affected |
| P | Governance and human-approval boundaries | Preserve approval thresholds; G cannot grant itself merge/deploy authority |

A shared file must list every affected owner. If ownership or compatibility is unknown, classify the candidate as BLOCKED pending owner clarification rather than guessing.

## Acceptance vocabulary

- **PASS:** all applicable required checks are terminal and successful on the exact current head; review and compatibility gates are satisfied.
- **FAIL:** an applicable check or acceptance criterion failed.
- **BLOCKED:** required evidence, owner decision, environment, permission, or dependency is unavailable.
- **PENDING:** an applicable check or review is still running or awaiting a result.
- **NOT RUN:** the check has not been executed.

Skipped, cancelled, stale, missing, resolver-only, or different-SHA results never count as PASS.

## Non-goals and safety

- No automatic merge, deployment, production migration, permission change, secret rotation, or infrastructure purchase.
- No modification of A–E source or tests by this G documentation work.
- No Runner bypass, CI weakening, retry loop, or reinterpretation of system-scoped failure as a code pass.
- No L/Federation activation.
- F security controls and explicit human approval requirements take precedence over delivery speed.

## Templates and procedures

- [Required checks matrix](required-checks-matrix.md)
- [Compatibility matrix template](compatibility-matrix-template.md)
- [Release evidence template](release-evidence-template.md)

## Versioning

G owns its independent numeric version in `versions/manifest.json` and this changelog. This G code-and-regression patch advances the independent G track from 0.1.3 to 0.1.4. The repository-wide version is intentionally unchanged; shared release metadata must be coordinated separately by its owning candidate.
