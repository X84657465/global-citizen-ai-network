# Security Policy

## Supported versions

Security fixes are prioritized for the latest version on the default branch. Development branches and preview deployments are not production security support commitments.

## Reporting a vulnerability

Do not disclose exploitable vulnerabilities in public issues, pull requests, discussions, screenshots, logs or social media.

Use GitHub's **Report a vulnerability** private reporting feature for this repository when it is enabled. If private vulnerability reporting is unavailable, contact the repository maintainers through a private channel listed on the repository owner profile. Do not include credentials, personal data or live customer data in the initial report.

Please include:
- A concise description and affected component or commit.
- Impact and realistic attack prerequisites.
- Minimal reproduction steps or a non-destructive proof of concept.
- Suggested mitigation, if known.

Allow maintainers reasonable time to acknowledge, investigate, remediate and coordinate disclosure. Do not access, modify, retain or exfiltrate data that is not yours; do not perform denial-of-service, destructive testing or social engineering.

## Response and remediation

Maintainers triage reports by exploitability, impact, affected versions and exposure. Confirmed issues are tracked privately until a fix or mitigation is ready. Secrets suspected to be exposed must be revoked and rotated; affected sessions and tokens must be invalidated. Releases should include a regression test and a security advisory when appropriate.

## Scope and authorization

Only systems and environments explicitly owned by this project and expressly authorized for testing are in scope. Production penetration tests, destructive tests, credential attacks and tests against third-party services require separate written authorization.

## Security controls are not a guarantee

A security policy, dependency scanner or CI result does not constitute a security certification. Operators must keep deployment secrets, database credentials, backups and production access restricted and monitored.
