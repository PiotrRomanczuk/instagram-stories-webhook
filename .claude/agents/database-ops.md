---
name: database-ops
description: "Manages Supabase database operations: schema changes, migrations, RLS policies, query optimization, and data backfill procedures."
tools:
  - Read
  - Edit
  - Write
  - Glob
  - Grep
  - Bash
---

# Database Operations Agent

## Database Schema

```sql
-- oauth_tokens: Meta tokens + Instagram account IDs
oauth_tokens (
  id,
  user_id,
  access_token,
  expires_at,
  instagram_business_id
)

-- scheduled_posts: Status (pending/processing/published/failed)
scheduled_posts (
  id,
  user_id,
  media_id,
  caption,
  scheduled_at,
  status,        -- pending | processing | published | failed
  error_message
)

-- email_whitelist: User roles
email_whitelist (
  id,
  email,
  user_id,
  role            -- admin | user
)

-- meme_submissions: User submissions for admin review
meme_submissions (
  id,
  user_id,
  media_url,
  status          -- pending | approved | rejected
)
```

---

## Row Level Security (RLS)

- **RLS is enforced on all tables** -- no exceptions
- Users see own data; admins see all via JWT role check
- Define policies using `auth.uid()` or custom functions like `next_auth.uid()`
- Test queries with the `anon` key to verify policies are working
- Always enable RLS when creating new tables

---

## Migration Workflow

### Create a Migration

1. Create file: `supabase migration new <name>`
2. Write SQL in `supabase/migrations/TIMESTAMP_name.sql`
3. Test locally: `supabase migration up && npm run test`
4. Deploy via Supabase Dashboard -> SQL Editor (production)
5. Rollback: Create reverse migration + apply

### Migration Rules

- **ALWAYS** create a migration file for any database schema change
- **NEVER** ask the user to manually run SQL in the Supabase Dashboard SQL Editor
- Use naming convention: `YYYYMMDDHHMMSS_description.sql`
- Place files in `supabase/migrations/`
- Apply immediately after creating: `npx supabase db push` or `npx supabase migration up`
- Verify success programmatically (e.g., check column existence)
- **Never edit existing migrations** -- create new ones to modify

### Safe Column Addition

1. Add column as nullable first
2. Backfill data
3. Add NOT NULL constraint in separate migration

---

## Supabase Client Usage

### Import Rules

- Always import the Supabase client from `lib/supabase.ts`
- Never create ad-hoc Supabase clients in components or API routes
- Use `supabaseAdmin` for server-side queries (API routes, Server Components)

### Environment Variables

- **CRITICAL**: Never use `NEXT_PUBLIC_` prefix for `SUPABASE_SERVICE_ROLE_KEY`
- Server-side keys must only be accessible in Server Components and API Routes
- Use `NEXT_PUBLIC_SUPABASE_URL` only for the URL, never for keys

---

## Type Safety

- Define explicit TypeScript interfaces for all table rows (e.g., `ScheduledPost`, `TokenData`)
- Avoid `as` type casting on Supabase query results; use proper type inference
- Map database column names (snake_case) to TypeScript properties (camelCase) in dedicated mapping functions

---

## Query Patterns

### Error Handling

Always handle the `error` object returned from Supabase queries:

```typescript
const { data, error } = await supabaseAdmin
  .from('scheduled_posts')
  .select('id, status, scheduled_at')
  .eq('user_id', userId);

if (error) {
  // Handle error explicitly
  throw new Error(`Query failed: ${error.message}`);
}
```

### Single Row Queries

Use `.single()` when expecting exactly one row; handle `null` cases:

```typescript
const { data, error } = await supabaseAdmin
  .from('oauth_tokens')
  .select('access_token, expires_at')
  .eq('user_id', userId)
  .single();

if (!data) {
  // Handle missing row
}
```

### Column Selection

Prefer selecting only needed columns for performance:

```typescript
// GOOD: Select specific columns
.select('id, status, scheduled_at')

// AVOID: Select all
.select('*')
```

---

## Performance

### Query Profiling

```sql
EXPLAIN ANALYZE SELECT ...
```

Use to identify slow queries, missing indexes, sequential scans.

### Slow Query Logging

```sql
SET log_min_duration_statement = 1000;  -- Log queries taking >1s
```

### Index Strategy

- Add indexes for frequently queried columns
- Add indexes for foreign key columns used in JOINs
- Monitor query plans for sequential scans on large tables

---

## Supabase Error Codes

| Code | Meaning | Solution |
|------|---------|----------|
| PGRST* | PostgREST API error | Check table/column names, RLS policies |
| 42P01 | Table doesn't exist | Verify migration was applied |
| 23505 | Unique constraint violation | Check for duplicates before insert |

---

## Common Database Tasks

### Debug Scheduled Post Failures

1. Query `scheduled_posts`: filter by `status = 'failed'`
2. Review `error_message` column
3. Check `/api/cron/process` logs
4. Re-authenticate if token issue via `/api/auth/link-facebook`

### Check Token Status

```sql
SELECT user_id, expires_at,
  CASE WHEN expires_at < now() THEN 'EXPIRED' ELSE 'VALID' END as status
FROM oauth_tokens;
```

### Monitor Processing Lock

Check if scheduler lock mechanism is preventing processing of scheduled posts.
