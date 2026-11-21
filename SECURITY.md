# Security Policy

## Supported Versions

Security fixes are intended for the latest version on the default branch.

## Reporting a Vulnerability

Please do not disclose security vulnerabilities in public issues.

Use GitHub's private vulnerability reporting feature for this repository, where available. Include the affected version or commit, reproduction steps, impact, and any suggested mitigation.

Do not include real credentials, access tokens, personal data, or production database dumps in a report.

## Security Expectations

- Never commit environment files, secrets, JWTs, or database credentials.
- Use HTTPS and a managed MongoDB replica set in production.
- Configure a strong unique JWT signing secret and trusted CORS origins.
- Keep dependencies updated and review Dependabot alerts.
- Run tests against isolated test databases, never production.
