# Deep Research（深度研究）— Track E Architecture

## Evidence-first research contract

Track E accepts source records only after schema validation. A source record preserves a stable source ID, title, HTTPS URL, publisher and curated publisher identity key, source type, publication date, retrieval timestamp, linked claim IDs, evidence stance and limitations.

The validator rejects non-HTTPS references, embedded URL credentials, non-standard ports, localhost and common private-network hosts. It does not fetch the URL and does not claim that a page is authentic, current or authoritative. Retrieval, page capture, checksum and citation verification remain separate capabilities.

## Claim corroboration

For each claim, `assessClaimEvidence` separates:
- supporting sources;
- contradicting sources;
- contextual sources;
- independent publisher identities;
- publishers whose own records contain both support and contradiction.

Multiple URLs from the same publisher identity count as one publisher. Two distinct supporting publishers may be labelled `corroborated`; a distinct publisher with counter-evidence makes the claim `contested`. One publisher remains `single-source`, even when it publishes multiple articles. Counter-evidence-only and insufficient states are kept distinct.

The contract intentionally emits no numeric truth score or synthetic confidence percentage. Publisher identity keys require curator consistency; they are not cryptographically verified identities. A corroborated status is a workflow cue, not proof of truth.

## Safety and integration boundary

- No network requests, scraping, browser automation or content ingestion occur in this module.
- No source record is sent to another track automatically.
- A receiving track must inspect the source, citation, claim relationship, counter-evidence and limitations before adoption.
- Synthetic examples in the workbench are marked as demonstrations and are not live research results.
- Exact-head CI and independent review are required before acceptance.

## Version 0.2.0

Adds source provenance validation and deterministic claim-evidence assessment. No database schema or production write path is added.
