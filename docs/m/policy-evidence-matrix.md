# M Policy-to-Evidence Matrix

Use this matrix to connect a control's intent to testable evidence. A policy statement without an owner, evidence source and review cadence is not an operational control.

| Control ID | Policy intent | Owner | Evidence source | Verification method | Review cadence | Status / gap |
|---|---|---|---|---|---|---|
| M-AUD-01 | Security-sensitive changes produce attributable audit records | M + affected track | Event record reference, source SHA, PR | Schema, actor/action/target/result and integrity checks | Per change + periodic | Not implemented |
| M-AUD-02 | Audit records cannot be silently rewritten | M with F review | Storage design and adversarial tests | Attempt unauthorized update/delete and verify detection/prevention | Per release | Not implemented |
| M-EVD-01 | Evidence is bound to exact code and CI candidate | G + M | Repository, SHA, PR, run ID and attempt | Compare live PR head with evidence references | Per candidate | Process defined; automation not implemented |
| M-PRV-01 | Audit evidence excludes secrets and unnecessary personal data | F + M | Redaction tests and field allowlist | Secret-pattern and data-minimization tests | Per release | Not implemented |
| M-RET-01 | Retention and deletion follow approved owner policy | Data owner + M | Approved retention schedule and execution evidence | Expiry, legal-hold and deletion tests | Per schedule change | Policy owner decision required |
| M-RSK-01 | Material risks have owners, treatment and review dates | Affected track + M | Risk register records | Completeness and overdue-review checks | Monthly or risk-triggered | Template defined |
| M-EXC-01 | Exceptions are scoped, approved and expire | Policy owner + P + M | Exception decision record | Authority, scope and expiry validation | Before approval + expiry | Template defined |
| M-EXC-02 | Expired exceptions are not silently renewed | Policy owner + M | Expiry and renewal history | Expiry/renewal workflow tests | Continuous when implemented | Not implemented |

## Evidence quality rules

- Link to immutable source artifacts and identify the exact SHA/run attempt.
- State whether evidence is automated, manually reviewed, sampled or unavailable.
- Record failed, skipped, pending and not-run checks distinctly.
- A policy mapping is not proof that the control is implemented or effective.
- Unknown ownership, retention periods or legal interpretation must be escalated to the accountable human owner.
