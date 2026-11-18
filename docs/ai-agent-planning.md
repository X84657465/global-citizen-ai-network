# AI Agent Planning Contract

## Purpose

The planning layer converts a validated task specification into a bounded, reviewable task graph. It validates a proposed plan; it does not call a model, execute commands, write repository files, or create pull requests.

## Plan contract

A plan has schema version 1 and 1–12 tasks. Each task declares:

- a stable lowercase task ID and short title;
- one role: planner, implementer, tester, or reviewer;
- one action allowed for that role;
- explicit task dependencies;
- paths inherited from the original issue allowlist only;
- measurable acceptance criteria;
- a maximum output size no greater than 64 KiB.

The validator rejects unknown fields, invalid role/action combinations, paths outside the original task allowlist, duplicate IDs or dependencies, unknown dependencies, self-dependencies, cycles, invalid acceptance criteria, and excessive output limits. It returns a stable topological order.

## Role/action matrix

| Role | Permitted actions |
| --- | --- |
| planner | inspect, report |
| implementer | inspect, propose_patch |
| tester | inspect, validate_patch |
| reviewer | inspect, validate_patch, report |

The implementer can propose patch data only. It receives no repository write credential and cannot apply its output. Testing and review are descriptions of trusted host-side stages, not permission to execute arbitrary commands from the plan.

## Safety boundary

- The original validated task remains the authority for allowed paths.
- The plan is untrusted input and must pass `validateAgentPlan`.
- The planner returns data only; no shell command, script, URL, credential, or executable payload is accepted as an action.
- The output is explicitly marked `validated_plan_only` and `ai_execution_enabled: false`.
- Patch output must separately pass `validatePatchManifest` before any future isolated application stage.
- Human review remains mandatory before PR merge, database migration, secret/configuration changes, or production deployment.

## Current status

This contract and validator are a foundation only. No AI provider is invoked and no autonomous execution is enabled.
