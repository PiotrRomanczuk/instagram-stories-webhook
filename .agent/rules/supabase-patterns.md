---
description: Enforce best practices for Supabase data access and security.
---

# Supabase Data Access Patterns

## Client Usage
- Always import the Supabase client from `lib/supabase.ts`.
- Never create ad-hoc Supabase clients in components or API routes.

## Environment Variables
- **CRITICAL**: Never use `NEXT_PUBLIC_` prefix for `SUPABASE_SERVICE_ROLE_KEY`.
- Server-side keys must only be accessible in Server Components and API Routes.
- Use `NEXT_PUBLIC_SUPABASE_URL` only for the URL, never for keys.

## Type Safety
- Define explicit TypeScript interfaces for all table rows (e.g., `ScheduledPost`, `TokenData`).
- Avoid `as` type casting on Supabase query results; use proper type inference.
- Map database column names (snake_case) to TypeScript properties (camelCase) in dedicated functions.

## Query Patterns
- Always handle the `error` object returned from Supabase queries.
- Use `.single()` when expecting exactly one row; handle `null` cases.
- Use `.select('*')` sparingly; prefer selecting only needed columns for performance.

## Row Level Security (RLS)
- Ensure RLS is enabled on all tables.
- Define policies using `auth.uid()` or custom functions like `next_auth.uid()`.
- Test queries with the `anon` key to verify policies are working.
