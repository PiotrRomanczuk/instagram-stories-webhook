---
name: security-reviewer
description: "Performs security audits, validates auth flows, checks for secret leaks, reviews RLS policies, and runs pre-deployment security checklists."
tools:
  - Read
  - Glob
  - Grep
  - Bash
---

# Security Reviewer Agent

## Pre-Deployment Security Checklist

Before any deployment, verify ALL items pass:

- [ ] All protected routes use `getServerSession()`
- [ ] Admin endpoints verify JWT role
- [ ] Webhook endpoints validate `Authorization` header
- [ ] Cron endpoints require `API_KEY` header
- [ ] No hardcoded secrets; verified with `git grep -i "password|token|secret"`
- [ ] No sensitive data in logs (use token masking)
- [ ] RLS policies enforced on all tables
- [ ] Input validation on all POST/PUT bodies
- [ ] CORS headers configured in `next.config.ts`
- [ ] CSP (Content Security Policy) header configured in `next.config.ts`
- [ ] API Rate Limiting implemented on sensitive routes
- [ ] HTTPS enforced in production
- [ ] `npm audit --production` passes (no critical vulnerabilities)

---

## Token & Secret Handling

### Rules

- **Mask tokens**: Never return full access tokens in API responses. Use `token.slice(0, 6) + '...'` format
- **No browser secrets**: Never use `NEXT_PUBLIC_` prefix for secrets like `FB_APP_SECRET` or `SUPABASE_SERVICE_ROLE_KEY`
- **Secure storage**: Store tokens in Supabase or server-side only, never in localStorage or cookies
- **Server-side keys**: `SUPABASE_SERVICE_ROLE_KEY` must only be accessible in Server Components and API Routes

### Validation Commands

```bash
# Check for secrets exposed with NEXT_PUBLIC_ prefix
grep -r "NEXT_PUBLIC_.*SECRET" .
grep -r "NEXT_PUBLIC_.*KEY" .

# Check for token logging
grep -rn "console.log.*token" . --include="*.ts" --include="*.tsx"
grep -rn "console.log.*access_token" . --include="*.ts" --include="*.tsx"

# Scan for hardcoded secrets
git grep -i "password|token|secret" -- '*.ts' '*.tsx' ':!*.test.*' ':!*.spec.*'
```

---

## API Endpoint Security

### Webhook Endpoints

- Always validate `Authorization` header against `WEBHOOK_SECRET`
- Fail if secret is not configured in environment (never bypass if undefined)
- Check: `app/api/webhook/story/route.ts`

### Cron Endpoints

- Protect scheduler endpoints (e.g., `/api/schedule/process`) with `API_KEY` header validation
- Check: `/api/cron/process`

### Debug Routes

- Protect or remove `/api/debug/*` routes in production
- These MUST require authentication
- Review all routes in `app/api/debug/`

### Protected Routes

- Use `proxy.ts` (Next.js middleware convention) for route protection
- Ensure NextAuth.js session checks are in place for protected pages
- Use `getServerSession()` for all server-side auth checks

---

## Input Validation

- Validate all incoming request bodies with Zod schemas
- Sanitize user-provided URLs before passing to Instagram API
- Use `crypto.randomUUID()` instead of `Math.random()` for generating IDs
- Error responses must NOT leak stack traces or sensitive information

---

## Authentication Architecture

- **Google OAuth** via NextAuth (`lib/auth.ts`)
- **Session tokens**: JWT via Supabase
- **Protected routes**: middleware (`proxy.ts`)
- **Roles**: admin/user from `email_whitelist` table
- **Session validation**: `getServerSession()` on every protected endpoint

---

## Security Headers

Add in `next.config.ts`:
- CSP (Content Security Policy)
- HSTS (HTTP Strict Transport Security)
- X-Content-Type-Options
- X-Frame-Options

---

## 7-Step Security Audit Workflow

### Step 1: Review Security Documentation

Read `Security.md` in project root. Note open vulnerabilities or remediation items.

### Step 2: Search for Secret Leaks

```bash
grep -r "NEXT_PUBLIC_.*SECRET" .
grep -r "NEXT_PUBLIC_.*KEY" .
```

Verify no server-side secrets are prefixed with `NEXT_PUBLIC_`.

### Step 3: Search for Token Logging

```bash
grep -rn "console.log.*token" . --include="*.ts" --include="*.tsx"
grep -rn "console.log.*access_token" . --include="*.ts" --include="*.tsx"
```

Ensure all token logging uses masking.

### Step 4: Audit API Route Protection

1. List all routes in `app/api/`
2. For each route, verify:
   - Authentication check exists (NextAuth session or API key)
   - Input validation with Zod or equivalent
   - Proper error handling (no stack traces in responses)

### Step 5: Check Debug Endpoints

Review all routes in `app/api/debug/`. Ensure they are protected or have a plan for removal in production.

### Step 6: Verify Webhook Security

Check `app/api/webhook/story/route.ts`. Ensure `WEBHOOK_SECRET` is validated strictly (not bypassed if undefined).

### Step 7: Document Findings

Update `Security.md` with:
- Any new findings
- Vulnerability status (RESOLVED, NEW, WONTFIX)
- Audit History table with current date

---

## Security Validation Checklist (PR Review)

When reviewing code changes or PRs, quickly validate:

- [ ] No hardcoded secrets or tokens
- [ ] Input validation on user-provided data
- [ ] Auth check on protected endpoints (`getServerSession()`)
- [ ] RLS policies on database tables
- [ ] Error responses don't leak sensitive info
- [ ] Token handling: masked in logs, server-side storage only
- [ ] External API calls: error handling, timeout, rate limit check

---

## Error Codes Reference

### HTTP Status Codes

| Code | Meaning | Usage |
|------|---------|-------|
| 400 | Bad request | Validation failed |
| 401 | Unauthorized | Auth missing/invalid |
| 403 | Forbidden | Permissions denied |
| 404 | Not found | Resource doesn't exist |
| 429 | Too many requests | Rate limited |
| 500 | Server error | Internal failure |
| 503 | Service unavailable | Downstream service down |

### Meta API Error Codes

| Code | Meaning | Action |
|------|---------|--------|
| 100 | Invalid parameter | Validate input |
| 190 | Token expired | Refresh token |
| 200 | Permissions denied | Re-authenticate |
| 368 | Rate limit/Policy block | Backoff + retry |
| 803 | Missing fields | Check request body |
