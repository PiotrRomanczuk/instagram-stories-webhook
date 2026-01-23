# Security Policy

## Supported Versions

Currently, only the latest version of the `main` branch is supported for security updates.

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

If you find a security vulnerability in this project, please **do not** report it publicly or via GitHub issues.

Instead, please email the project maintainer directly.

## Audit History

| Date       | Auditor | Status | Notes |
| dist       | ------- | ------ | ----- |
| 2026-01-23 | AI Agent | PASSED | Fixed Webhook IDOR. Added Vercel Cron. |

## known Vulnerabilities & Mitigations

### 1. Webhook Post Spoofing (RESOLVED 2026-01-23)
- **Issue**: Session-authenticated users could post as other users by specifying `email` in the body.
- **Fix**: Added validation in `app/api/webhook/story/route.ts` to ensure non-admins can only post to their own account.

### 2. Token Exposure in Logs (AUDITED)
- **Status**: Grep scan showed no plaintext tokens in logs. `Logger` utility handles redaction.

### 3. API Route Protection
- **Status**: All `/api/memes` and `/api/schedule` routes heavily guarded by `getServerSession`.
