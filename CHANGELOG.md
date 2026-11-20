# Changelog

## 0.3.17 — 2026-11-20

### Security
- Harden Deep Neural's Track E source adapter against non-public IP-literal URLs, including CGNAT, link-local, documentation and IPv4-mapped IPv6 ranges.

### Verification
- Adversarial URL regression cases added; exact-head CI required.

## 0.3.16 — 2026-11-20

### Fixed
- Correct the package-lock regression guard to compare the resolved tarball filename directly with the locked package version.
- Preserve eslint-import-resolver-node at the actual 0.3.10 tarball version.

### Verification
- Regression guard corrected; exact-head Windows Runner CI remains required.
