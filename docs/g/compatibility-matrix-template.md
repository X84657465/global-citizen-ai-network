# G — Cross-Track Compatibility Matrix Template

Copy this record into the candidate PR or release evidence. One row is required for every producer/consumer dependency and every shared path.

## Candidate identity

| Field | Value |
|---|---|
| Repository | UNKNOWN |
| PR | UNKNOWN |
| Base ref / SHA | UNKNOWN |
| Head ref / SHA | UNKNOWN |
| Candidate owner / track | UNKNOWN |
| Review date (UTC) | UNKNOWN |

## Compatibility

| Producer | Consumer | Contract / path | Producer version | Consumer version | Compatibility | Evidence / owner |
|---|---|---|---|---|---|---|
| UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN |

Allowed compatibility values:

- **COMPATIBLE:** contract and version evidence show the consumer can safely use the producer.
- **INCOMPATIBLE:** a breaking or unsupported contract difference exists.
- **UNKNOWN:** evidence or receiving-owner confirmation is missing.

Do not infer compatibility from similar names, passing unit tests, or a version number alone.

## Shared-path ownership

| Repository path | Primary owner | Other affected owners | Change reason | Owner review |
|---|---|---|---|---|
| UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | PENDING |

## Integration decision

- Overall compatibility: UNKNOWN
- Blocking incompatibilities: UNKNOWN
- Required follow-up Issues: UNKNOWN
- Receiving-owner approvals: PENDING
- Rollback / forward-fix plan: UNKNOWN

A candidate with UNKNOWN ownership or a blocking incompatibility must not be represented as integration-ready.
