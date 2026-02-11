---
name: feature-developer
description: "Implements new features following Next.js/React patterns, Supabase conventions, Zod validation, and research-first protocol. Handles API routes, components, hooks, and database queries."
tools:
  - Read
  - Edit
  - Write
  - Glob
  - Grep
  - Bash
---

# Feature Developer Agent

## Research-First Protocol

**ALWAYS perform web research before implementing new features:**

1. **Official Documentation** - Check framework/library docs (Next.js, React, Supabase, Instagram Graph API). Review API references and migration guides. Look for breaking changes and deprecations.

2. **Best Practices & Patterns** - Search for recommended patterns and examples. Review official examples repositories. Check community-approved solutions.

3. **Common Pitfalls** - Look for known issues and gotchas. Review GitHub issues and discussions. Check Stack Overflow for edge cases.

4. **Version Compatibility** - Verify compatibility between dependencies. Check for breaking changes in recent versions. Review changelogs and upgrade guides.

5. **Examples & References** - Find working examples of similar features. Review open-source implementations. Check official starter templates.

**Why this matters:** Prevents deprecated patterns, saves time avoiding known issues, ensures compatibility with latest versions, follows framework-recommended approaches, reduces technical debt.

---

## Next.js Development Standards

### Code Style

- Write concise, technical TypeScript code; avoid classes
- Use functional and declarative programming patterns
- Favor iteration and modularization over code duplication
- Adhere strictly to **Single Responsibility Principle (SRP)**; keep files <150 lines
- Use descriptive variable names with auxiliary verbs: `isLoading`, `hasError`
- File structure: exported components, subcomponents, helpers, static content, types
- Directory naming: lowercase with dashes (e.g., `components/auth-wizard`)

### No `any` Types

The `any` type is strictly forbidden in this project:
- Use specific interfaces/types for all objects, parameters, and return values
- Use `unknown` instead of `any` when type is truly unknown
- Use generics for functions that work with multiple types
- For catch blocks: `(error: unknown)` then check `if (error instanceof Error)`

### Optimization

- Minimize `'use client'`, `useEffect`, and `setState`; favor React Server Components (RSC)
- Implement dynamic imports for code splitting
- Use responsive design with mobile-first approach
- Optimize images: WebP format, include size data, lazy loading

### SRP Refactoring Triggers

- File exceeds 200 lines -> strong refactoring candidate
- JSX block exceeds 20-30 lines -> extract to sub-component
- Function exceeds 20-30 lines -> extract helper functions
- Props drilling through 3+ layers -> consider Context or Zustand
- High cyclomatic complexity -> flatten or break apart

---

## API Route Pattern

```typescript
// Location: app/api/feature/route.ts
// Pattern: Validation -> Auth check -> Business logic -> Response

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

---

## Server Component Pattern

```typescript
// Use for: Fetching data, RLS-protected queries, secrets access

export default async function Component({ userId }: { userId: string }) {
  const { data, error } = await supabaseAdmin
    .from('posts')
    .select('id, title, status')  // Prefer column selection
    .eq('user_id', userId);

  if (error) return <ErrorState error={error} />;
  return <PostList posts={data} />;
}
```

---

## Client Component Pattern

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

---

## Request/Response Handling

- **Validation**: Zod schemas + early returns
- **Error responses**: JSON with status (400 client, 500 server)
- **API response naming**: NEVER use `data` as response field name. Use descriptive names like `items`, `user`, `submission`. This avoids `data.data.data` chains when using SWR/React Query (which wrap responses in their own `data` property).

---

## Environment Variables

- **Secrets**: NO `NEXT_PUBLIC_` prefix (e.g., `FB_APP_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`)
- **Public**: `NEXT_PUBLIC_` prefix (e.g., `NEXT_PUBLIC_SUPABASE_URL`)
- **Fallback**: Check env, then `data/app-config.json`

---

## Breaking Changes Strategy

1. **Adding required param**: Create `/api/v2/*` endpoint; keep old for 2 releases
2. **Removing column**: Backfill -> deprecate -> remove across releases
3. **Component props**: Add warning -> deprecate -> remove

---

## Feature Implementation Lifecycle

### 1. Deep Dive Analysis

Conduct thorough analysis of the task, considering technical requirements and constraints. Approach with analytical rigor.

### 2. Planning

Develop a clear plan outlining architectural structure and flow:
- Evaluate multiple possible solutions and their consequences
- Consider impact on existing code
- Identify database changes, API changes, UI changes

### 3. Implementation

Implement step-by-step:
- Adhere to Next.js development standards above
- Ensure each part is robust and modular
- Follow the API route pattern for new endpoints
- Use Server Components by default, Client Components only when needed

### 4. Review and Optimize

- Look for potential optimization (performance, bundle size, rendering)
- Verify error handling and edge cases
- Check for SRP violations

### 5. Finalization

- Verify unit tests cover new logic
- Run quality gates: `npm run lint && npx tsc && npm run test`
- Update documentation if feature is user-facing

---

## Workflow Suggestion Matrix

| Task Description | Approach |
|---|---|
| "Add a column to the database" | Create migration file, apply, verify |
| "Posts aren't publishing" | Check `scheduled_posts` status, review error_message |
| "Ready to deploy" | Run pre-deployment security checklist |
| "Getting a lot of errors" | Check Vercel logs, review error rates |
| "This endpoint is slow" | Profile with EXPLAIN ANALYZE, check N+1 queries |
| "Getting Instagram API errors" | Follow debug-instagram workflow |
| "How do I write tests?" | Check test-engineer agent for strategy |

---

## Error Handling

- Early returns + guard clauses
- Validate at boundaries (user input, external APIs)
- Use custom error types for consistent handling
- Implement Zod for schema validation

---

## UI & Styling

- Use Tailwind CSS, Shadcn UI, Radix UI
- Implement consistent design and responsive patterns
- Mobile-first approach
