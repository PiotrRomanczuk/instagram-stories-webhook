# Claude Code Context Guide

This guide helps Claude Code provide better assistance by understanding the project's standards and workflows.

## Project Context

**Project**: instagram-stories-webhook (Next.js Instagram Stories publishing automation)

**Key Tech Stack**:
- Frontend: Next.js, React Server Components, Tailwind CSS
- Backend: Next.js API routes, Node.js
- Database: Supabase PostgreSQL with RLS
- Auth: NextAuth.js + Google OAuth
- External API: Meta Graph API v24.0
- Testing: Vitest (unit) + Playwright (E2E)

## How Claude Should Assist

### When analyzing code or suggesting changes:

1. **Reference CLAUDE.md sections**:
   - Architecture Overview → understand system design
   - Code Standards → follow project patterns
   - Key Files & Patterns → copy working patterns from codebase
   - Security Checklist → validate no security issues introduced

2. **Suggest appropriate workflow**:
   - User adds database column? → "Create & Deploy Database Migration"
   - User debugging publishing failures? → "Debug Scheduled Post Failures"
   - User modifying auth logic? → "Pre-Deployment Security Audit"
   - User optimizing slow endpoint? → "Optimize Slow API Endpoint"

3. **Validate against patterns**:
   - ✓ Use Zod schemas for API input validation
   - ✓ Use `supabaseAdmin` for server-side queries
   - ✓ Mask tokens in logs: `token.slice(0, 6) + '...'`
   - ✓ Handle error code 190 (token expired), 368 (rate limit), 100 (invalid param)
   - ✗ Don't use `any` types
   - ✗ Don't store tokens in localStorage/cookies
   - ✗ Don't skip RLS policies on database tables

### When helping with specific tasks:

**Database Migration**:
- Refer to "Database Migrations" section in CLAUDE.md
- Provide full workflow from WORKFLOWS.md
- Check for: nullable columns, RLS policies, test coverage

**API Development**:
- Reference "Request/Response Handling" and "Meta API Calls"
- Suggest error handling for Instagram error codes
- Validate Zod schema usage

**Feature Implementation**:
- Check "Component Composition Decision Tree" for Server vs Client
- Refer to "Custom Hook Development Guide" if state management needed
- Suggest testing patterns from "Testing Strategy"

**Production Issues**:
- Reference "Troubleshooting Decision Tree" in CLAUDE.md
- Provide "Investigate High Error Rate" or "Debug Scheduled Post Failures" workflow
- Check monitoring/alerting setup from "Monitoring & Alerting Strategy"

## Key Patterns to Recognize & Suggest

### API Route Pattern
```typescript
// Location: app/api/feature/route.ts
// Pattern: Validation → Auth check → Business logic → Response

import { supabaseAdmin } from '@/lib/config/supabase-admin';
import { createRequestSchema } from '@/lib/validations/feature.schema';

export async function POST(req: Request) {
  // 1. Validate input
  const parsed = createRequestSchema.safeParse(await req.json());
  if (!parsed.success) return Response.json({ error: 'Invalid' }, { status: 400 });

  // 2. Check auth
  const session = await getServerSession();
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  // 3. Execute business logic
  try {
    const result = await supabaseAdmin.from('table').insert(data);
    return Response.json(result);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
```

### Instagram API Pattern
```typescript
// Pattern: Wrap in try/catch → Handle specific error codes → Mask token in logs

try {
  const response = await axios.post(`${GRAPH_API_URL}/endpoint`, {
    access_token: token,
    // ... params
  });
  return response.data;
} catch (error) {
  if (axios.isAxiosError(error)) {
    const code = error.response?.data?.error?.code;
    if (code === 190) {
      // Token expired - handle refresh
    } else if (code === 368) {
      // Rate limited - implement backoff
    } else if (code === 100) {
      // Invalid parameter - validate input
    }
  }
  logger.error('API call failed', {
    token: maskToken(token),
    error: error.message
  });
  throw error;
}
```

### Server Component Data Fetching Pattern
```typescript
// Use for: Fetching data, RLS-protected queries, secrets access

export default async function Component({ userId }: { userId: string }) {
  // Always use supabaseAdmin for server-side queries
  const { data, error } = await supabaseAdmin
    .from('posts')
    .select('*')
    .eq('user_id', userId);

  if (error) return <ErrorState error={error} />;
  return <PostList posts={data} />;
}
```

### Client Component Interaction Pattern
```typescript
// Use for: User interactions, state management, browser APIs

'use client';
import { useCallback, useState } from 'react';

export function PublishButton({ postId }: { postId: string }) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handlePublish = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/publish', {
        method: 'POST',
        body: JSON.stringify({ postId })
      });
      if (!response.ok) throw new Error(await response.text());
      // Success - refresh data via SWR mutate or similar
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [postId]);

  return (
    <>
      {error && <Alert>{error}</Alert>}
      <button onClick={handlePublish} disabled={isLoading}>
        {isLoading ? 'Publishing...' : 'Publish'}
      </button>
    </>
  );
}
```

## Error Codes Reference

When working with external APIs, these are common error codes:

**Instagram/Meta API**:
- `100`: Invalid parameter (validation failed)
- `190`: Token expired (refresh needed)
- `368`: Rate limited (backoff + retry)
- `803`: Some fields were missing
- `200`: Permissions denied

**Supabase**:
- `PGRST`: Postgrest API errors (check table/column names)
- `42P01`: Table doesn't exist
- `23505`: Unique constraint violation

**HTTP**:
- `400`: Bad request (validation failed)
- `401`: Unauthorized (auth missing/invalid)
- `403`: Forbidden (permissions denied)
- `404`: Not found
- `429`: Too many requests (rate limited)
- `500`: Server error
- `503`: Service unavailable

## Testing Checklist for PR Review

When Claude is asked to review code or suggest tests, use this checklist:

- [ ] Unit tests for utilities/business logic
- [ ] Integration tests for API endpoints (with mocked external APIs)
- [ ] E2E tests for critical user flows
- [ ] Edge case coverage (null, empty, error states)
- [ ] Security tests (auth check, input validation)
- [ ] Performance tests (N+1 queries, memory leaks)
- [ ] Error scenario tests

## Security Validation Checklist

When Claude suggests code changes or reviews PRs, quickly validate:

- [ ] No hardcoded secrets or tokens
- [ ] Input validation on user-provided data
- [ ] Auth check on protected endpoints (`getServerSession()`)
- [ ] RLS policies on database tables
- [ ] Error responses don't leak sensitive info
- [ ] Token handling: masked in logs, server-side storage only
- [ ] External API calls: error handling, timeout, rate limit check

## Workflow Suggestion Matrix

Match task descriptions to workflows:

| Task Description | Suggested Workflow |
|---|---|
| "I need to add a column to the database" | Create & Deploy Database Migration |
| "Posts aren't publishing" | Debug Scheduled Post Failures |
| "Ready to deploy to production" | Pre-Deployment Security Audit |
| "We're getting a lot of errors" | Investigate High Error Rate |
| "I want to test a new feature with beta users" | Implement Feature Flag Rollout |
| "This endpoint is slow" | Optimize Slow API Endpoint |
| "Getting Instagram API errors" | Handle Instagram API Rate Limit |
| "Production is broken!" | Handle Critical Production Issue |
| "How do I write tests for this?" | Add Comprehensive Tests for Feature |
| "My environment is broken" | Troubleshoot Development Environment |
| "Need to update a dependency" | Update Dependencies Safely |

## Additional Resources

- **CLAUDE.md**: Comprehensive style guide, patterns, and architecture
- **WORKFLOWS.md**: Step-by-step playbooks for specific tasks
- **GitHub Issues**: Use templates (see .github/ISSUE_TEMPLATE/)
- **GitHub PRs**: Use template (see .github/pull_request_template.md)

## Quick Links for Claude

When suggesting help, reference these sections:

- Unsure about component architecture? → "Component Composition Decision Tree" in CLAUDE.md
- Building a hook? → "Custom Hook Development Guide" in CLAUDE.md
- Writing tests? → "Testing Strategy" in CLAUDE.md
- Debugging production? → "Troubleshooting Decision Tree" in CLAUDE.md
- About to deploy? → "Pre-Deployment Security Audit Checklist" in CLAUDE.md
- Task-specific guidance? → See WORKFLOWS.md
