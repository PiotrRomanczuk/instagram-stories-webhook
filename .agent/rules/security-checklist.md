---
description: Security non-negotiables to prevent regressions and vulnerabilities.
---

# Security Checklist

## Token & Secret Handling
- **Mask Tokens**: Never return full access tokens in API responses. Use `token.slice(0, 6) + '...'` format.
- **No Browser Secrets**: Never use `NEXT_PUBLIC_` prefix for secrets like `FB_APP_SECRET` or `SUPABASE_SERVICE_ROLE_KEY`.
- **Secure Storage**: Store tokens in Supabase or server-side encrypted files, never in localStorage or cookies.

## API Endpoint Security
- **Webhook Secrets**: Always validate `Authorization` header against `WEBHOOK_SECRET`. Fail if secret is not configured in environment.
- **Cron Secrets**: Protect scheduler endpoints (e.g., `/api/schedule/process`) with `API_KEY` header validation.
- **Debug Routes**: Protect or remove `/api/debug/*` routes in production. These should require authentication.

## Input Validation
- Validate all incoming request bodies with Zod schemas.
- Sanitize user-provided URLs before passing to Instagram API.
- Use `crypto.randomUUID()` instead of `Math.random()` for generating IDs.

## Authentication
- Use `proxy.ts` (Next.js 16 convention) for route protection.
- Ensure NextAuth.js session checks are in place for protected pages.

## Headers
- Add security headers in `next.config.ts` (CSP, HSTS, X-Content-Type-Options).

## Reference
- See `Security.md` in project root for the full vulnerability registry and remediation plan.
