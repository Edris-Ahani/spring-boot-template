# Security policy

## Supported versions

Security fixes target the latest commit on `main`. This template has no supported stable release series yet. Older commits and downstream applications are not maintained separately; users must review and apply relevant fixes to their own deployments.

## Reporting a vulnerability

Use this repository's **Security > Advisories > Report a vulnerability** control on GitHub to submit a private report. The repository administrator must enable private vulnerability reporting before public release, as described in the [publication checklist](docs/security.md#github-publication-checklist).

If that control is unavailable, open an issue asking only for a private security contact. Do not include vulnerability details, exploit code, credentials, personal data, or sensitive logs in a public issue. Wait for a private reporting channel before sharing those details.

Include the affected commit, a description of the impact, reproduction steps against your own local environment, and a proposed mitigation if available. Redact tokens and personal information. Do not test against third-party deployments without their permission.

Maintainers will investigate reports and coordinate fixes and disclosure. This project does not promise a response deadline or offer a bug bounty.

## Scope and safeguards

The template's development Compose stack is for local use. It is not a production identity provider or a complete deployment security boundary. Review the [security guide](docs/security.md) and [deployment guide](docs/deployment.md) before deploying.

Automated scans detect known vulnerability records and recognizable secret patterns; a passing scan does not establish that the application is free of security flaws. If a real credential is exposed, revoke or rotate it immediately. Deleting it from the latest source revision does not revoke it or remove earlier Git history.
