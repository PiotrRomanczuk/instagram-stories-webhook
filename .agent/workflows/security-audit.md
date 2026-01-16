---
description: Proactive security review workflow for the codebase.
---

# Security Audit Workflow

This workflow performs a systematic security review of the codebase.

## 1. Review Security.md
1. Read `Security.md` in the project root.
2. Note any open vulnerabilities or items in the remediation plan.

## 2. Search for Secret Leaks
1. Search for `NEXT_PUBLIC_` patterns that might expose secrets:
   ```
   grep -r "NEXT_PUBLIC_.*SECRET" .
   grep -r "NEXT_PUBLIC_.*KEY" .
   ```
2. Verify no server-side secrets are prefixed with `NEXT_PUBLIC_`.

## 3. Search for Token Logging
1. Search for potential token exposure in logs:
   ```
   grep -rn "console.log.*token" . --include="*.ts" --include="*.tsx"
   grep -rn "console.log.*access_token" . --include="*.ts" --include="*.tsx"
   ```
2. Ensure all token logging uses masking.

## 4. Audit API Route Protection
1. List all routes in `app/api/`.
2. For each route, verify:
   - Authentication check exists (NextAuth session or API key).
   - Input validation with Zod or equivalent.
   - Proper error handling (no stack traces in responses).

## 5. Check Debug Endpoints
1. Review all routes in `app/api/debug/`.
2. Ensure they are protected or have a plan for removal in production.

## 6. Verify Webhook Security
1. Check `app/api/webhook/story/route.ts`.
2. Ensure `WEBHOOK_SECRET` is validated strictly (not bypassed if undefined).

## 7. Update Security.md
1. Document any new findings.
2. Update vulnerability status (RESOLVED, NEW, WONTFIX).
3. Update the "Audit History" table with the current date.
