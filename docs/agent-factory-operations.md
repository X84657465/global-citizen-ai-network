# Agent Factory operations — controlled workflow write exception

## Why this path is separately allowlisted

The scheduler workflow `.github/workflows/agent-task-preflight.yml` is part of the Factory control plane. A future task may need to change this one workflow for a separately reviewed operational capability, but arbitrary workflow or GitHub configuration writes would expand the task agent's authority and could weaken Runner, permission, or deployment boundaries.

## Authorization and exact-path rules

- The task Issue must carry the existing `factory-control-plane-approved` label.
- Task validation, patch validation, scratch application, and publisher revalidation must preserve the explicit control-plane authorization.
- The only exception is the exact lowercase path `.github/workflows/agent-task-preflight.yml`.
- The file must already exist in the base checkout; only a modification is allowed. Adding a replacement file is rejected.
- Sibling workflows, arbitrary `.github` paths, case variants, traversal, symlinks, secrets, credentials, and protected roots remain prohibited.
- The task must explicitly include the path in its own allowed-path list. The label does not expand that list.

## Required review and verification

The exception enables a narrowly scoped future task; it does not approve a workflow change. Any actual workflow edit still requires isolated scratch application and tests, exact-head CI, a Draft PR, normal independent review, and existing branch protection. No change may weaken Runner permissions, secrets handling, production database settings, deployment behavior, auto-merge, or approval requirements under this exception.

Issue #116 defines the implementation scope and acceptance criteria. This document records the rationale and operating constraints only.
