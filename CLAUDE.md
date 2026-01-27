# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**instagram-stories-webhook** is a Next.js application that enables programmatic publishing and scheduling of Instagram Stories via the Meta Graph API. It integrates Google authentication, Supabase for token/post storage, and a cron-based scheduler for automated publishing.

## Common Commands

### Development
```bash
npm run dev              # Start dev server on http://localhost:3000
npm run build            # Build for production
npm run start            # Run production build
```

### Testing
```bash
npm run test             # Run unit tests (Vitest) once
npm run test:watch       # Run unit tests in watch mode
npm run test:e2e         # Run Playwright E2E tests
npm run test:e2e:ui      # Run Playwright E2E tests with UI
npm run test:coverage    # Generate coverage reports
```

### Linting & Quality
```bash
npm run lint             # Run ESLint checks
```

### Running Single Tests
```bash
# Unit test for a specific file (Vitest)
npx vitest __tests__/lib/some-module.test.ts

# E2E test for a specific file (Playwright)
npx playwright test tests/e2e/some-flow.spec.ts --headed
```

## Pre-Commit Checklist

**CRITICAL: Before EVERY git commit, you MUST run these commands in order:**

```bash
npm run lint        # ✅ Lint all code (ESLint)
npx tsc             # ✅ Type check (TypeScript)
npm run test        # ✅ Run all tests (Vitest)
```

If ANY of these commands fail, **DO NOT COMMIT**. Fix all errors first, then re-run all three commands before committing.

**One-liner for quick verification:**
```bash
npm run lint && npx tsc && npm run test
```

**Consequences of skipping:**
- Broken builds in CI/CD
- Runtime errors in production
- Type safety violations
- Test coverage gaps
- Lint violations accumulating

**No exceptions.** This applies to every single commit without fail.

## Pull Request Creation & CI/CD Verification

**CRITICAL: After EVERY pull request creation, you MUST verify CI/CD checks pass.**

### PR Creation Process

When creating a pull request, follow these steps:

1. **Create the PR** using `gh` CLI:
```bash
gh pr create --title "Your PR title" --body "$(cat <<'EOF'
## Summary
- Brief description of changes

## Testing
- Tests performed

https://claude.ai/code/session_XXXXX
EOF
)"
```

2. **IMMEDIATELY verify CI/CD status** (mandatory):
```bash
# Get the PR number from the output above, then check status
gh pr view <PR_NUMBER> --json statusCheckRollup

# Or check your current branch's PR
gh pr view --json statusCheckRollup
```

3. **Wait for checks to complete**:
```bash
# Watch checks in real-time (recommended)
gh pr checks --watch

# Or check status manually every 30 seconds
while true; do
  gh pr checks && break || sleep 30
done
```

### Mandatory Verification Steps

**You MUST NOT consider a PR complete until:**

- [ ] All CI/CD checks are green (passing)
- [ ] Lint check passed
- [ ] TypeScript compilation passed
- [ ] All tests passed
- [ ] Build succeeded

**If ANY check fails:**

1. **Read the failure logs**:
```bash
# View detailed check results
gh pr checks

# View logs for specific failed check
gh run view <RUN_ID> --log-failed
```

2. **Fix the issues locally**:
```bash
# Reproduce the failure
npm run lint && npx tsc && npm run test && npm run build

# Fix the errors
# ... make changes ...

# Verify locally
npm run lint && npx tsc && npm run test
```

3. **Push fixes**:
```bash
git add .
git commit -m "fix: resolve CI/CD failures

- Fixed linting errors
- Fixed type errors
- Fixed test failures

https://claude.ai/code/session_XXXXX"
git push
```

4. **Re-verify CI/CD** (repeat from step 2 above)

### Automated Status Check

**Recommended approach** - Use this one-liner after PR creation:

```bash
# Create PR, capture URL, then watch checks
PR_URL=$(gh pr create --title "..." --body "..." | grep -o 'https://github.com/[^[:space:]]*') && \
echo "Created: $PR_URL" && \
echo "Waiting for CI/CD checks..." && \
sleep 10 && \
gh pr checks --watch
```

### Common CI/CD Failures & Fixes

**ESLint errors:**
```bash
npm run lint          # See errors
npm run lint -- --fix # Auto-fix
```

**TypeScript errors:**
```bash
npx tsc              # See errors
# Fix manually in code
```

**Test failures:**
```bash
npm run test         # Run all tests
npm run test:watch   # Watch mode for rapid fixes
```

**Build failures:**
```bash
npm run build        # Reproduce locally
# Fix errors, then rebuild
```

### Why This Matters

**Consequences of skipping CI/CD verification:**
- ❌ Broken code merged to branch
- ❌ Blocking other developers
- ❌ Failed deployments
- ❌ Production incidents
- ❌ Wasted time rolling back

**Benefits of verifying:**
- ✅ Catch issues before merge
- ✅ Maintain code quality
- ✅ Faster review process
- ✅ Reliable deployments
- ✅ Team confidence in PRs

**Remember:** The pre-commit checklist catches issues locally; CI/CD verification catches issues that might occur in different environments or configurations.

**No exceptions.** Every PR must have verified passing CI/CD checks before being considered complete.

## Architecture Overview

### Authentication Flow
- **Primary Auth**: Google OAuth via NextAuth.js (not Facebook sign-in)
- **Setup**: `lib/auth.ts` defines NextAuth providers and callbacks
- **Middleware**: `proxy.ts` protects routes; exempts `/api/auth`, `/api/webhook`, public assets, and sign-in page
- **Session Tokens**: JWT-based with Supabase RLS JWT for frontend API calls
- **Authorization**: User roles (admin/user) checked against `email_whitelist` table; fallback to `ADMIN_EMAIL` env var

### Instagram API Integration
- **Base URL**: Graph API v24.0 from `lib/instagram/publish.ts`
- **Publishing**: Three-step process: create container → wait for ready (videos) → publish
- **Token Storage**: Stored server-side in Supabase `oauth_tokens` table (never in localStorage/cookies)
- **Account Linking**: Separate Facebook flow via `/api/auth/link-facebook` to associate Instagram accounts with user sessions

### Data Layer (Supabase PostgreSQL)
- **Key Tables**:
  - `oauth_tokens`: Stores Meta access tokens and Instagram business account IDs
  - `scheduled_posts`: Tracks stories to publish, with status (pending/processing/published/failed)
  - `email_whitelist`: User access control and role assignments
  - `meme_submissions`: User-submitted content for admin review/publishing

- **Row Level Security (RLS)**: Enabled on all tables using `auth.uid()` and custom policies
- **Type Mapping**: Database columns (snake_case) mapped to TypeScript types (camelCase) via `mapScheduledPostRow()` and similar functions in `lib/types/database.ts`

### Scheduler System
- **Cron Triggers**: Vercel Cron (production) or local cron via `node-cron` (development)
- **Entry Points**:
  - `/api/cron/process`: Main processor for scheduled posts (runs periodically)
  - `/api/cron/identity-audit`: Validates account identity consistency
- **Core Logic**: `lib/scheduler/process-service.ts` handles batch processing, token refresh, and duplicate detection
- **Processing Lock**: Prevents concurrent processing of the same post via distributed lock mechanism
- **Token Refresh**: Automatically extends short-lived tokens before expiry

### Media Processing
- **Image Validation**: Aspect ratio, dimensions, size checks in `lib/media/validator.ts`
- **Video Processing**: Transcoding and format conversion in `lib/media/video-processor.ts`
- **Cleanup**: 24-hour delay before media deletion to allow Instagram preview generation

### AI Analysis Storage (Pro Plan)
- **Storage Bucket**: Private `ai-analysis` bucket (Supabase Pro)
- **Auto-Archival**: Published memes automatically saved for AI analysis
- **Tracking Table**: `ai_meme_analysis` stores metadata and analysis results
- **Workflow**: Publish → Download → Archive → Track → Ready for Analysis
- **Access**: Admin-only via signed URLs with expiry
- **Integration**: `lib/ai-analysis/meme-archiver.ts` handles all operations
- **APIs**:
  - `GET /api/ai-analysis` - List pending memes
  - `POST /api/ai-analysis/results` - Submit analysis results
  - `POST /api/ai-analysis/signed-url` - Get download URLs
- **Setup**: Run migration `20260126180000_ai_analysis_storage.sql`
- **Docs**: See `docs/AI_ANALYSIS_SETUP.md` for detailed guide

### API Endpoint Security
- **Webhook Secret**: `/api/webhook/story` requires `Authorization` header matching `WEBHOOK_SECRET`
- **API Key Protection**: Scheduler endpoints require `API_KEY` header for external triggering
- **Session Auth**: Protected endpoints use `getServerSession()` to verify user identity
- **Input Validation**: All request bodies validated with Zod schemas from `lib/validations/`

### Frontend Architecture
- **Server Components**: Preferred for data fetching and protected content
- **Client Components**: Minimal use of `'use client'`; only for interactive UI
- **Data Fetching**: SWR for client-side caching, React Query patterns where needed
- **Styling**: Tailwind CSS + custom components in `app/components/ui/`

## Key Files & Patterns

### Request/Response Handling
- **API Routes**: Stored in `app/api/`, organized by feature (auth, webhook, schedule, memes, etc.)
- **Validation**: Use Zod schemas (`lib/validations/*.schema.ts`) and early returns for validation failure
- **Error Responses**: Standard JSON format with status codes (400 for client error, 500 for server)

### Database Queries
- Always use `supabaseAdmin` client for server-side operations (defined in `lib/config/supabase-admin.ts`)
- Handle Supabase errors explicitly; check both `error` and result presence
- Use `.single()` when expecting one row; map results using dedicated type-mapping functions
- Prefer column selection over `select('*')` for performance

### Meta API Calls
- Wrap all axios calls in try/catch; use `axios.isAxiosError()` to detect network vs API errors
- Handle specific error codes: `190` (token expired), `100` (invalid param), `368` (rate limit)
- Always mask tokens in logs: `token.slice(0, 6) + '...'`
- Cache Instagram Business Account IDs after first lookup

### Environment Variables
- **Server-Only Secrets**: Never prefix with `NEXT_PUBLIC_` (e.g., `SUPABASE_SERVICE_ROLE_KEY`, `FB_APP_SECRET`)
- **Public URLs**: Use `NEXT_PUBLIC_` prefix (e.g., `NEXT_PUBLIC_SUPABASE_URL`)
- **Fallbacks**: Check environment first, then config file (`data/app-config.json`)

## Testing Strategy

### Coverage Rules & Limitations

**CRITICAL - What MUST be tested:**
- ✅ Everything up to scheduled post creation (in `scheduled_posts` table)
- ✅ All meme submission workflows (user → admin → schedule)
- ✅ Search, pagination, filtering
- ✅ Bulk operations (approve/reject/reschedule)
- ✅ Edit workflows (submissions, scheduled posts)
- ✅ Database operations and RLS policies
- ✅ Auth flows and role-based access control
- ✅ Input validation and error handling

**CANNOT be automated - Meta API calls:**
- ❌ Meta Graph API publishing (requires real FB user account linked to IG account)
- ❌ Instagram container creation and status checks
- ❌ Actual media upload to Instagram servers
- ❌ Real IG media ID retrieval

**Strategy for Meta API testing:**
- Use MSW (Mock Service Worker) to mock all Meta API responses in unit tests
- Test the integration layer that calls Meta API (error handling, retries, etc.)
- Mock successful/failed response scenarios
- Manual/staging testing required for actual IG integration
- Don't mock at the axios level - mock the actual Meta API endpoints

### Unit Tests (Vitest + MSW)
- Mock Meta API responses via `tests/mocks/handlers.ts`
- Test business logic, utilities, and API routes in isolation
- Global MSW setup in `tests/setup.ts`
- **Meta API mocking**: Mock `https://graph.instagram.com/v*` endpoints for container creation, status checks, publish, etc.

### E2E Tests (Playwright)
- Test real user flows and UI interactions up to scheduling
- Save authentication state to bypass login in subsequent tests: `page.context().storageState({ path: 'auth.json' })`
- Configuration in `playwright.config.ts` (handles dev server startup)
- Do NOT attempt to test actual Instagram publishing - verify data is prepared for publishing instead

### Integration Tests
- Test database operations with real Supabase (or local emulator)
- Test API routes with mocked Meta API responses
- Verify RLS policies work correctly
- Test error handling and edge cases

### Test Focus by Feature (Meme-to-Schedule Workflow)

**Section 2: Meme Submissions** ✅ FULLY TESTABLE
```
Tests required:
 ✅ Create submission (upload file, validation)
 ✅ Search memes (by title/caption, with filters)
 ✅ Pagination (page navigation, correct items)
 ✅ Edit submission (title/caption update)
 ✅ Delete submission (with confirmation)
 ✅ View own/all memes (based on role)
```

**Section 3: Meme Review & Admin** ✅ FULLY TESTABLE
```
Tests required:
 ✅ Approve single meme
 ✅ Reject single meme with reason
 ✅ Bulk approve (multiple memes)
 ✅ Bulk reject (multiple memes)
 ✅ View pending memes (admin only)
 ✅ Edit submission after review blocked
```

**Section 4: Scheduling & Publishing** ⚠️ PARTIALLY TESTABLE
```
Tests required:
 ✅ Schedule post (create with future datetime)
 ✅ Edit scheduled post (time, URL, caption, tags)
 ✅ View scheduled posts
 ✅ Bulk reschedule (multiple posts to new time)
 ✅ Delete scheduled post
 ✅ Validate datetime (must be future)
 ✅ Check publish quota API response
 ✅ Database record created correctly

 ❌ CANNOT TEST (requires Meta API):
 ❌ Actual publishing to Instagram
 ❌ Cron job triggering
 ❌ Meta container creation
 ❌ Real IG media ID retrieval

 ✅ CAN TEST (with mocked Meta API):
 ✅ Publishing logic with mocked responses
 ✅ Error handling (rate limit, token expired)
 ✅ Retry logic
 ✅ Database status updates on mock success
```

### Testing Best Practices

1. **Mock Meta API at the HTTP level**: Use MSW to intercept `graph.instagram.com` requests
2. **Test the integration layer**: Verify code that calls Meta API handles responses correctly
3. **Don't test external services**: Focus on your code's behavior, not Meta's API behavior
4. **RLS policy testing**: Create tests that verify data isolation between users
5. **Staging environment**: Use for manual end-to-end testing with real IG accounts
6. **Acceptance criteria**: If it reaches `scheduled_posts` table correctly, it's ready for publishing

## Code Standards (from .agent rules)

### General
- Prefer functional programming; avoid classes
- Follow Single Responsibility Principle (SRP); keep files <150 lines
- Use descriptive variable names with auxiliary verbs (isLoading, hasError)
- No `any` types; use proper TypeScript inference

### Next.js & React
- Minimize `'use client'`, `useEffect`, and state mutations
- Prefer React Server Components and SSR features
- Use dynamic imports for code splitting

### Error Handling
- Use early returns and guard clauses for preconditions
- Implement custom error types for consistent handling
- Validate at system boundaries (user input, external APIs), not internal code

### Security Checklist
- Validate webhook/cron secrets on every request
- Never log full tokens; use masking
- Store tokens server-side only (Supabase or encrypted files)
- Sanitize user-provided URLs before passing to Instagram API
- Ensure all protected routes use `getServerSession()` or similar session checks

### Quality Gates (Non-Negotiable)
- **EVERY commit requires:**
  - ✅ `npm run lint` passes (zero ESLint errors)
  - ✅ `npx tsc` passes (zero TypeScript errors)
  - ✅ `npm run test` passes (all tests pass)
- No exceptions. No partial commits. No "I'll fix it later."
- Use: `npm run lint && npx tsc && npm run test` as pre-commit verification

## Common Debugging Tasks

### Verify Authentication
- Visit `/debug` for real-time connection status and API insights
- Check `NEXT_PUBLIC_SUPABASE_URL` and `AUTH_GOOGLE_ID` are set
- Review email whitelist in Supabase `email_whitelist` table

### Test Publishing Flow
- Use "Quick Test Suite" on homepage (`/`) to publish a test story
- Debug dashboard at `/debug` shows token validity and permissions
- Check `/api/debug/publish` endpoint for manual publishing tests (dev only)

### Scheduled Post Issues
- Visit `/schedule` to create or view pending posts
- Check `scheduled_posts` table status (pending → processing → published)
- Review logs in `/api/cron/process` for batch operation results
- Token refresh happens automatically; check `oauth_tokens.expires_at` if posts fail

### Media Processing
- Validate aspect ratio (1:1 for square, 9:16 for vertical stories)
- Video files must be MP4/MOV; images must be JPG/PNG
- Check Supabase storage for processed media files
- Cleanup job deletes media 24 hours after processing

## Database Schema & Relationships

### Complete Schema Overview
The application uses 4 core tables with relationships:

```
oauth_tokens (1:M) → scheduled_posts
  user_id → user_id

email_whitelist (1:M) → scheduled_posts
  user_id → user_id

oauth_tokens
  Columns: id, user_id, provider (meta), access_token, refresh_token, expires_at, instagram_business_id
  PK: id | FK: user_id
  RLS: Users see only their own tokens

scheduled_posts
  Columns: id, user_id, media_id, caption, scheduled_at, status (pending/processing/published/failed),
           error_message, instagram_post_id, created_at
  PK: id | FK: user_id
  RLS: Users see only their own posts; admins see all

email_whitelist
  Columns: id, email, user_id, role (admin/user), created_at
  PK: id
  RLS: Admins only; users see self info

meme_submissions
  Columns: id, user_id, media_url, submitted_at, status (pending/approved/rejected), admin_notes
  PK: id | FK: user_id
  RLS: Users see own submissions; admins see all
```

### RLS Policy Examples
- User sees their token: `auth.uid() = user_id`
- Admin sees all: `(auth.jwt()::jsonb -> 'user_metadata' ->> 'role') = 'admin'`
- Email whitelist lookup: `email = auth.email()` or admin bypass

### Performance Indexes
```sql
CREATE INDEX idx_scheduled_posts_user_status ON scheduled_posts(user_id, status);
CREATE INDEX idx_scheduled_posts_created_at ON scheduled_posts(created_at DESC);
CREATE INDEX idx_oauth_tokens_user_id ON oauth_tokens(user_id);
```

## Database Migrations

### Creating Migrations

1. **Generate migration file**:
```bash
supabase migration new add_column_name
```

2. **Write migration SQL** in `supabase/migrations/TIMESTAMP_add_column_name.sql`
```sql
ALTER TABLE table_name ADD COLUMN new_column TYPE;
-- Add RLS policy if needed
CREATE POLICY "policy_name" ON table_name FOR SELECT USING (auth.uid() = user_id);
```

3. **Test locally**:
```bash
supabase migration up  # Apply migrations
npm run test           # Run tests to verify
```

4. **Deploy to production**:
   - Run migration via Supabase Dashboard → SQL Editor
   - Wait for completion; monitor for locks with: `SELECT * FROM pg_stat_activity;`
   - Verify via: `supabase db pull` to sync local schema

### Migration Best Practices
- **Avoid downtime**: Add columns as nullable; backfill data; add NOT NULL later
- **Test column additions**: Verify existing code handles new columns
- **Use transactions**: Wrap related changes in `BEGIN; ... COMMIT;`
- **Document RLS changes**: Comment new policies explaining access patterns
- **Team coordination**: One migration per feature; prefix with username if collaborative
- **Version control**: Keep migrations in git; never edit existing migration files

### Rollback Procedures

**For uncommitted migrations**:
- Delete the migration file and restart Supabase: `supabase stop && supabase start`

**For committed migrations in production**:
1. Create a new "down" migration that reverses the change
```sql
-- supabase/migrations/TIMESTAMP_rollback_column.sql
ALTER TABLE table_name DROP COLUMN new_column;
```
2. Apply via Supabase Dashboard
3. Create post-incident review to document what happened

**Recovery checklist**:
- [ ] Notify stakeholders of rollback
- [ ] Verify data integrity post-rollback
- [ ] Review migration for issues (performance, logic)
- [ ] Test thoroughly before re-deployment

## Performance Profiling

### Frontend Performance (Chrome DevTools)
1. Open DevTools → Performance tab
2. Click record, perform action, stop recording
3. Analyze:
   - **Long Tasks** (>50ms) → Code to optimize
   - **Layout Thrashing** → DOM reads/writes alternating
   - **Rendering** → CSS recalc, layout, paint times
   - **FCP/LCP** → First/Largest Contentful Paint

**Common fixes**:
- `useCallback()` for functions passed to child components
- `useMemo()` for expensive computations
- Code splitting: `dynamic(() => import('./Component'), { ssr: false })`
- Image optimization: Next.js `<Image>` component with `priority` prop

### Backend Performance (Node Profiler)
```bash
# Enable profiling with flag
node --prof app.js

# Process profile output
node --prof-process isolate-*.log > profile.txt

# Or use real-time profiling
npm run dev  # Use Chrome DevTools: chrome://inspect
```

**Key metrics**:
- **CPU usage** → Look for hot functions
- **Memory allocation** → Check for memory leaks (growing over time)
- **GC pauses** → Frequent garbage collection indicates memory pressure

### Database Query Performance
```sql
-- Enable query logging
SET log_min_duration_statement = 1000;  -- Log queries > 1s

-- Analyze slow query
EXPLAIN ANALYZE SELECT * FROM scheduled_posts WHERE user_id = $1;

-- Check index usage
SELECT schemaname, tablename, indexname FROM pg_indexes WHERE tablename = 'scheduled_posts';
```

**Optimization flow**:
1. Identify slow query via logs
2. Run EXPLAIN ANALYZE to find bottleneck
3. Add index on filter columns if missing
4. Verify index is used in EXPLAIN plan

## Pre-Deployment Security Audit Checklist

Run this checklist before every production deploy:

### Authentication & Authorization
- [ ] All protected routes use `getServerSession()` or middleware auth
- [ ] Admin-only endpoints verify role from JWT: `(auth.jwt()::jsonb -> 'user_metadata' ->> 'role') = 'admin'`
- [ ] Session timeout configured appropriately (current: 30 days in NextAuth)
- [ ] No hardcoded credentials in codebase; verified with: `git grep -i "password\|token\|secret" -- *.js *.ts`

### API & Webhook Security
- [ ] All `/api/webhook/*` endpoints validate `Authorization` header against `WEBHOOK_SECRET`
- [ ] `/api/cron/*` endpoints require `API_KEY` header
- [ ] Input validation on all POST/PUT bodies using Zod schemas
- [ ] File upload endpoints verify mime type and size limits
- [ ] CORS headers configured correctly in `next.config.ts`

### Data & Secrets
- [ ] No secrets in environment variables without `NEXT_PUBLIC_` prefix check
- [ ] Sensitive data (tokens, API keys) never logged; use masking: `token.slice(0, 6) + '...'`
- [ ] Database RLS policies enforced: `supabase rls verify` (if available)
- [ ] Supabase service role key only used server-side (not exposed to frontend)
- [ ] Instagram tokens stored in encrypted Supabase table; never in localStorage

### Code Quality
- [ ] No `console.log()` statements logging sensitive data
- [ ] SQL injection prevented (using parameterized queries with Supabase client)
- [ ] XSS prevention: no `dangerouslySetInnerHTML` without sanitization
- [ ] CSRF tokens present on state-changing forms (if using traditional forms)
- [ ] Dependency audit passed: `npm audit --production` (no critical vulnerabilities)

### Infrastructure & Deployment
- [ ] Security headers in `next.config.ts`: CSP, HSTS, X-Frame-Options, X-Content-Type-Options
- [ ] HTTPS enforced in production
- [ ] Rate limiting configured on `/api/auth/*` endpoints
- [ ] Error responses don't leak sensitive info (no full error traces in production)
- [ ] Vercel environment variables correctly set (no secrets in public config)

### Database
- [ ] RLS policies verified on all tables: `SELECT * FROM pg_policies WHERE tablename IN ('oauth_tokens', 'scheduled_posts', ...);`
- [ ] Backup strategy documented and tested: `supabase db backup download`
- [ ] No direct access to tables bypassing RLS in application code

## Breaking Changes & Deprecation Strategy

### Handling API Route Changes

**Type 1: Adding required parameters**
```typescript
// ❌ Breaking - existing clients will fail
POST /api/schedule { caption, media_id, scheduled_at }  // Add new field

// ✅ Non-breaking - existing clients work
POST /api/schedule { caption, media_id, scheduled_at?, instagram_account_id? }
```

**For breaking changes**:
1. Create new endpoint: `/api/v2/schedule` with updated signature
2. Keep old endpoint for 2 release cycles with deprecation notice in response headers
3. Notify clients via changelog/email with migration guide
4. Remove old endpoint after grace period

### Database Schema Changes

**Type 1: Adding nullable column** → Non-breaking
```sql
ALTER TABLE scheduled_posts ADD COLUMN priority INT DEFAULT 0;  -- Safe, backward compatible
```

**Type 2: Removing column or changing NOT NULL** → Breaking
```sql
-- First: Backfill data (multiple releases)
-- Second: Create new migration with NOT NULL
-- Third: Notify clients; provide migration guide in CHANGELOG

ALTER TABLE scheduled_posts ALTER COLUMN caption SET NOT NULL;
```

### Component Prop Changes

**For removed props**:
```typescript
// Current
interface Props { caption: string; legacyFormat?: boolean; }

// v1: Deprecate with console warning
export const Schedule = ({ caption, legacyFormat }: Props) => {
  if (legacyFormat) console.warn('legacyFormat prop is deprecated and will be removed in v2.0');
  // ...
};

// v2 (next release): Remove prop
interface Props { caption: string; }
```

### Deprecation Timeline
- **Release N**: Introduce new approach, deprecate old
- **Release N+1**: Warn users in logs/docs
- **Release N+2**: Remove deprecated code

## Cache Invalidation Strategy

### SWR (Client-Side Caching)

```typescript
// Automatic revalidation
const { data } = useSWR('/api/posts', fetcher, {
  revalidateOnFocus: true,        // Refetch when window regains focus
  revalidateOnReconnect: true,    // Refetch on network reconnect
  dedupingInterval: 60000,        // 60s deduping
});

// Manual invalidation on mutations
const mutate = useSWRConfig().mutate;
mutate('/api/posts');  // Refetch immediately

// Optimistic update
mutate('/api/posts', (data) => ({ ...data, status: 'published' }), false);
```

### React Query (if adopted)
```typescript
const queryClient = useQueryClient();

// In mutation
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: ['posts'] });
}
```

### Manual Cache Invalidation
```typescript
// Clear specific cache entries
const clearPostCache = (postId: string) => {
  delete localStorage[`posts:${postId}`];  // If using localStorage
  // Or: mutate(`/api/posts/${postId}`);  // SWR
};
```

**When to invalidate**:
- After POST/PUT/DELETE operations
- After webhooks (e.g., Instagram publish confirmation)
- On auth changes (login/logout)
- On user role changes
- Periodically for long-lived sessions

## Server Components vs Client Components Decision Tree

```
Does the component need...

├─ Server-side data fetching?
│  ├─ YES → Server Component ✓
│  └─ NO → Continue...
│
├─ User interaction (clicks, forms, drag)?
│  ├─ YES → Client Component ✓ (use 'use client')
│  └─ NO → Continue...
│
├─ Browser APIs (useEffect, useState, localStorage)?
│  ├─ YES → Client Component ✓ (use 'use client')
│  └─ NO → Continue...
│
├─ Direct access to secrets/env vars?
│  ├─ YES → Server Component ✓
│  └─ NO → Continue...
│
└─ Otherwise → Server Component ✓ (default to Server Component)
```

### Examples

**Server Component** (default):
```typescript
// app/components/PostsList.tsx
export default async function PostsList({ userId }: { userId: string }) {
  const posts = await supabaseAdmin
    .from('scheduled_posts')
    .select('*')
    .eq('user_id', userId);

  return <div>{posts.data?.map(post => <PostCard key={post.id} post={post} />)}</div>;
}
```

**Client Component** (only when needed):
```typescript
'use client';
// app/components/PostActions.tsx
export function PostActions({ postId }: { postId: string }) {
  const [isPublishing, setIsPublishing] = useState(false);

  const handlePublish = async () => {
    setIsPublishing(true);
    await fetch('/api/posts/publish', { method: 'POST', body: JSON.stringify({ postId }) });
  };

  return <button onClick={handlePublish}>{isPublishing ? 'Publishing...' : 'Publish'}</button>;
}
```

## Custom Hook Development Guide

### When to Create a Custom Hook
- Logic used by 2+ components
- Complex state management in a single component
- Reusable API/data fetching logic

### Hook Naming Convention
```typescript
// Fetch pattern
useScheduledPosts()      // Fetches and returns data
useFetchUserProfile()    // Explicit fetch operation

// State management pattern
usePostForm()            // Form state: values, errors, handlers
usePublishingState()     // Complex state related to publishing

// Boolean/status pattern
useIsAuthenticated()     // Returns boolean
useAuthToken()           // Returns token and methods
useSchedulerStatus()     // Returns status enum
```

### Example: Data Fetching Hook
```typescript
export function useScheduledPosts(userId: string) {
  const { data, error, isLoading, mutate } = useSWR(
    userId ? `/api/posts?userId=${userId}` : null,
    fetcher
  );

  return {
    posts: data || [],
    error,
    isLoading,
    refresh: () => mutate(),  // Manual refresh
  };
}

// Usage
const { posts, isLoading, error } = useScheduledPosts(userId);
```

### Example: State Management Hook
```typescript
export function usePostForm(initialPost?: Post) {
  const [values, setValues] = useState(initialPost || {});
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValues(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!values.caption) newErrors.caption = 'Caption required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  return { values, errors, handleChange, validate };
}
```

### Avoid Common Mistakes
- **Don't**: Conditionally call hooks → Breaks React rules
```typescript
// ❌ Wrong
if (userId) {
  const posts = useScheduledPosts(userId);  // Hook called conditionally!
}

// ✅ Correct
const posts = useScheduledPosts(userId);    // Always called
```

- **Don't**: Create hooks that do too much → Split into smaller hooks
- **Do**: Keep hooks focused on single responsibility

## Error Recovery & Resilience Patterns

### Retry Mechanisms

**Exponential backoff for API calls**:
```typescript
async function callWithRetry(fn: () => Promise<any>, maxRetries = 3) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxRetries - 1) throw error;
      const delay = Math.pow(2, attempt) * 1000;  // 1s, 2s, 4s
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

// Usage
const result = await callWithRetry(() => publishToInstagram(post));
```

### Fallback UI States

```typescript
export function PostList({ userId }: { userId: string }) {
  const { posts, error, isLoading } = useScheduledPosts(userId);

  if (isLoading) return <SkeletonLoader />;
  if (error) return <ErrorFallback error={error} onRetry={() => mutate()} />;
  if (!posts?.length) return <EmptyState message="No posts scheduled" />;

  return <div>{posts.map(post => <PostCard post={post} />)}</div>;
}
```

### Graceful Degradation

```typescript
// Feature: Instagram account stats (non-critical)
try {
  const stats = await fetchInstagramStats();
} catch (error) {
  console.warn('Failed to fetch stats, showing cached data');
  // Show last known stats or placeholder
}

// Feature: Publishing (critical) - don't degrade
try {
  await publishPost();
} catch (error) {
  // Show error to user, don't proceed
  throw error;
}
```

## Feature Flags & A/B Testing

### Environment-Based Flags

```typescript
// lib/features.ts
export const FEATURES = {
  ENABLE_SCHEDULING: process.env.NEXT_PUBLIC_FEATURE_SCHEDULING === 'true',
  ENABLE_ANALYTICS: process.env.NEXT_PUBLIC_FEATURE_ANALYTICS === 'true',
  ENABLE_BETA_UI: process.env.NEXT_PUBLIC_FEATURE_BETA_UI === 'true',
};

// app/page.tsx
import { FEATURES } from '@/lib/features';

export default function Home() {
  return (
    <>
      {FEATURES.ENABLE_SCHEDULING && <SchedulingSection />}
      {FEATURES.ENABLE_BETA_UI && <BetaUIVersion />}
    </>
  );
}
```

### User-Based Flags

```typescript
// Database: Add flags to email_whitelist table
// Column: beta_features (array)

export async function isFeatureEnabled(userId: string, feature: string): Promise<boolean> {
  const { data: user } = await supabaseAdmin
    .from('email_whitelist')
    .select('beta_features')
    .eq('user_id', userId)
    .single();

  return user?.beta_features?.includes(feature) ?? false;
}

// Usage in server component
const isBetaUIEnabled = await isFeatureEnabled(userId, 'beta-ui');
```

### Rollout Timeline
1. **Internal**: Set `NEXT_PUBLIC_FEATURE_BETA_UI=true` locally
2. **Alpha**: Deploy to staging with flag disabled; enable for internal team
3. **Beta**: Enable for 10% of users via database flag
4. **GA**: Set environment variable to true; remove feature flag logic next release

## Dependency Upgrade Strategy

### Patch Upgrades (1.0.0 → 1.0.1)
- **Risk**: Minimal
- **Testing**: Run unit tests only
- **Approval**: Auto-merge if CI passes

```bash
npm update              # Updates patch versions
npm run test            # Verify no breakage
```

### Minor Upgrades (1.0.0 → 1.1.0)
- **Risk**: Low
- **Testing**: Unit tests + E2E tests
- **Approval**: Code review

```bash
npm install next@latest
npm run test
npm run test:e2e
```

### Major Upgrades (1.0.0 → 2.0.0)
- **Risk**: High (breaking changes expected)
- **Testing**: Full test suite + manual QA on staging
- **Approval**: Tech lead review
- **Timeline**: Plan for 1-2 weeks

```bash
# Read changelog first!
# Make incremental changes, test frequently
npm install next@latest
npm run build           # Check for TypeScript errors
npm run test            # Full test suite
npm run test:e2e        # E2E on staging
```

### Vulnerability Handling
```bash
npm audit              # Check for security issues
npm audit fix          # Auto-fix vulnerable dependencies

# For unfixable vulnerabilities:
# 1. File issue with library maintainers
# 2. Find alternative library if unmaintained
# 3. Document workaround in code comments
```

## Code Review Guidelines

### Reviewer Checklist

**Functionality**
- [ ] Change achieves stated goal
- [ ] No regressions introduced (existing tests pass)
- [ ] Edge cases handled (null, empty, error states)
- [ ] Logic is correct (walk through mentally)

**Code Quality**
- [ ] No unnecessary complexity (DRY principle)
- [ ] Follows project patterns (see CLAUDE.md patterns)
- [ ] No hardcoded values (use env vars or config)
- [ ] No `any` types (proper TypeScript)

**Testing**
- [ ] New code has appropriate tests
- [ ] Edge cases tested (happy path + error path)
- [ ] Test names describe what they test
- [ ] Coverage didn't decrease significantly

**Performance**
- [ ] No N+1 queries (batch queries where needed)
- [ ] No unnecessary re-renders (useCallback, useMemo)
- [ ] No memory leaks (cleanup in useEffect)
- [ ] API response times acceptable (< 500ms typical)

**Security**
- [ ] No hardcoded secrets
- [ ] Input validated (especially user uploads, API params)
- [ ] No XSS vulnerabilities (sanitize if using innerHTML)
- [ ] Auth/permissions checked (getServerSession, RLS)

**Documentation**
- [ ] Inline comments for non-obvious logic
- [ ] Complex functions documented (what, why, not how)
- [ ] Breaking changes documented in PR description

### Comment Guidelines
**Good comments**:
```typescript
// Supabase RLS doesn't support LIMIT on joined queries; fetch separately
const user = await supabaseAdmin.from('email_whitelist').select('role');
```

**Avoid comments**:
```typescript
// ❌ Obvious - what the code does, not why
const name = 'John';  // Set name to John
```

## File Naming Conventions

### Components
```
PascalCase, descriptive

✓ ScheduleForm.tsx
✓ PostCard.tsx
✓ AdminDashboard.tsx
✗ scheduleform.tsx
✗ post-card.tsx
```

### Utilities & Helpers
```
camelCase, verb-first for actions

✓ validateEmail.ts
✓ formatDate.ts
✓ parseScheduleTime.ts
✗ EmailValidation.ts
✗ date-format.ts
```

### Hooks
```
camelCase, use prefix

✓ useScheduledPosts.ts
✓ useAuthToken.ts
✓ usePostForm.ts
✗ ScheduledPostsHook.ts
✗ auth-token-hook.ts
```

### Types & Interfaces
```
PascalCase, descriptive

✓ lib/types/Post.ts
✓ lib/types/ScheduleRequest.ts
✓ lib/types/database.ts
✗ lib/types/post.ts
```

### Tests
```
camelCase, .test or .spec suffix

✓ __tests__/lib/validateEmail.test.ts
✓ tests/e2e/schedule-flow.spec.ts
✗ __tests__/lib/validate-email-test.ts
✗ validateEmail.test.ts (without __tests__ folder)
```

### API Routes
```
Kebab-case, feature-organized

✓ app/api/schedule/route.ts
✓ app/api/schedule/[id]/route.ts
✓ app/api/webhook/instagram/route.ts
✗ app/api/scheduleRoute.ts
✗ app/api/webhook_instagram.ts
```

### Environment Variables
```
SCREAMING_SNAKE_CASE, feature-prefixed

✓ NEXT_PUBLIC_SUPABASE_URL
✓ SUPABASE_SERVICE_ROLE_KEY
✓ WEBHOOK_SECRET
✓ INSTAGRAM_API_VERSION
✗ nextPublicSupabaseUrl
✗ supabase_service_role_key
```

## Instagram API Rate Limiting

### Rate Limit Handling

**Error Code 368**: Rate limit exceeded
```typescript
import axios from 'axios';

export async function publishWithRateLimit(container: Container, token: string) {
  try {
    return await axios.post(`${GRAPH_API_URL}/publish`, {
      creation_id: container.id,
      access_token: token,
    });
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 400) {
      const errorCode = error.response.data?.error?.code;
      if (errorCode === 368) {
        // Rate limited; implement backoff and retry
        await new Promise(resolve => setTimeout(resolve, 60000));  // Wait 60s
        return publishWithRateLimit(container, token);  // Retry
      }
    }
    throw error;
  }
}
```

### User-Facing Messaging

```typescript
// app/api/schedule/route.ts
export async function POST(req: Request) {
  try {
    await publishPost(post);
    return Response.json({ success: true });
  } catch (error) {
    if (error.message.includes('rate limit')) {
      return Response.json(
        {
          error: 'Publishing temporarily unavailable. Please try again in a few minutes.',
          retryAfter: 300,  // 5 minutes
        },
        { status: 429 }
      );
    }
    throw error;
  }
}
```

### Dashboard UI Feedback
```typescript
'use client';
export function ScheduleForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (formData: FormData) => {
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/schedule', { method: 'POST', body: formData });
      if (response.status === 429) {
        const data = await response.json();
        setErrorMessage(`${data.error} Try again in ${data.retryAfter} seconds.`);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {errorMessage && <Alert type="error">{errorMessage}</Alert>}
      <form onSubmit={handleSubmit}>...</form>
    </>
  );
}
```

## Monitoring & Alerting Strategy

### Production Monitoring Stack
- **Error tracking**: Sentry (or similar)
- **Performance monitoring**: Vercel Analytics / Datadog
- **Log aggregation**: Vercel Logs / CloudWatch
- **Uptime monitoring**: UptimeRobot or similar

### Setup Checklist
- [ ] Configure Sentry for error tracking (set environment to 'production')
- [ ] Enable Vercel Analytics on dashboard
- [ ] Set up log retention (minimum 30 days)
- [ ] Configure critical alerts (see below)

### Critical Alerts (must configure)
1. **Authentication failures** (> 5 in 5 minutes)
   - Action: Check auth provider (Google/Supabase status)
2. **Publishing failures** (> 10 in 1 hour)
   - Action: Check Instagram API status; verify tokens
3. **Database connection errors**
   - Action: Check Supabase status; verify connection string
4. **Webhook delivery failures** (> 3 consecutive)
   - Action: Check webhook endpoint health; verify signatures
5. **High error rate** (> 1% of requests)
   - Action: Roll back recent deploy; check logs

### Dashboards to Create
```
Main Production Dashboard:
├─ Error Rate (% of requests with 5xx status)
├─ API Response Time (p50, p95, p99)
├─ Published Posts Count (24h)
├─ Failed Posts Count (24h)
├─ Database Connection Pool Usage
├─ Instagram API Rate Limit Usage
└─ Webhook Delivery Success Rate
```

## Developer Environment Setup

### Initial Setup Checklist
- [ ] Clone repository: `git clone https://github.com/...instagram-stories-webhook.git`
- [ ] Install Node 18+ (verify with `node --version`)
- [ ] Copy environment file: `cp .env.local.example .env.local`
- [ ] Fill in environment variables (see Environment Variables section)
- [ ] Install dependencies: `npm install`
- [ ] Start Supabase: `supabase start` (requires Docker)
- [ ] Run migrations: `supabase migration up`
- [ ] Start dev server: `npm run dev`
- [ ] Verify: Visit `http://localhost:3000/debug` → check "✓ All systems operational"

### First-Time Contributions
1. **Verify setup**: Create a test scheduled post via UI
2. **Run tests**: `npm run test` (should pass)
3. **Read code**: Pick a small component or utility; understand flow
4. **Try a small fix**: Update documentation, fix typo, or add logging
5. **Submit PR**: Include description and test results

### Useful Local Commands
```bash
npm run dev                    # Start dev server with hot reload
npm run test                   # Run all tests once
npm run test:watch            # Watch mode for tests
npm run lint                   # Check for linting issues
supabase start                 # Start local Supabase (Docker required)
supabase stop                  # Stop Supabase
supabase reset                 # Reset database to initial state
npm run build                  # Build production bundle (checks for errors)
```

### IDE Setup Recommendations
- **Editor**: VS Code (recommended) or WebStorm
- **Extensions**: ESLint, Prettier, Tailwind CSS IntelliSense, Supabase
- **Format on save**: Configure Prettier in VS Code settings
- **TypeScript version**: Use workspace version (in .vscode/settings.json)

## Edge Case Testing Patterns

### Testing Edge Cases

**Example: Empty/Null states**
```typescript
// __tests__/components/PostList.test.ts
describe('PostList', () => {
  it('renders empty state when no posts', () => {
    const { getByText } = render(<PostList posts={[]} />);
    expect(getByText('No posts scheduled')).toBeInTheDocument();
  });

  it('handles null posts gracefully', () => {
    const { getByText } = render(<PostList posts={null} />);
    expect(getByText('Loading...')).toBeInTheDocument();  // Or error state
  });
});
```

**Example: Network errors**
```typescript
// __tests__/api/schedule.test.ts
describe('POST /api/schedule', () => {
  it('handles Supabase connection error', async () => {
    supabaseMock.insert.mockRejectedValue(new Error('Connection refused'));

    const response = await fetch('/api/schedule', { method: 'POST', body: '...' });
    expect(response.status).toBe(503);
  });

  it('handles Instagram API timeout', async () => {
    instagramMock.publishContainer.mockRejectedValue(
      new Error('Request timeout')
    );

    const response = await request(app).post('/api/schedule');
    expect(response.status).toBe(502);
  });
});
```

**Example: Rate limiting**
```typescript
it('handles Instagram rate limit (error code 368)', async () => {
  instagramMock.publishContainer.mockRejectedValue({
    response: { data: { error: { code: 368 } } }
  });

  const response = await publish(post);
  expect(response.status).toBe(429);
});
```

**Example: Concurrent operations**
```typescript
it('handles concurrent publish requests for same post', async () => {
  // Simulate processing lock
  const promises = [
    publish(post),
    publish(post),
    publish(post),
  ];

  const results = await Promise.all(promises);
  // Verify only one succeeded, others got "already processing" response
  const successCount = results.filter(r => r.success).length;
  expect(successCount).toBe(1);
});
```

## Production Troubleshooting Decision Tree

```
Problem: Posts not publishing

├─ Check API status
│  ├─ Instagram API down? → Wait for recovery
│  └─ All systems up? → Continue...
│
├─ Check authentication
│  ├─ Is token expired? (check oauth_tokens.expires_at)
│  │  └─ YES → Re-authenticate user via /api/auth/link-facebook
│  └─ Continue...
│
├─ Check scheduled post status
│  ├─ Status = failed?
│  │  └─ YES → Review error_message column
│  ├─ Status = processing?
│  │  └─ YES → Check if processing lock is stuck (20+ min old)
│  └─ Status = pending?
│     └─ Continue...
│
├─ Check cron trigger
│  ├─ Last run time recent? (check Vercel logs)
│  │  └─ NO → Check vercel.json for cron schedule
│  └─ YES → Continue...
│
└─ Check server logs
   └─ Review /api/cron/process output for specific errors
```

### Common Issues & Solutions

**Issue**: Posts stuck in "processing" state
```sql
-- Check for stale locks
SELECT * FROM scheduled_posts WHERE status = 'processing' AND updated_at < NOW() - INTERVAL '30 minutes';

-- Release stuck lock (manual intervention)
UPDATE scheduled_posts SET status = 'pending', processing_lock = NULL WHERE id = 'post_id';
```

**Issue**: Token refresh failing
```
Check oauth_tokens table: Are expires_at timestamps being updated?
Review logs for "Token refresh failed" errors
Verify FB_APP_SECRET is correct in environment variables
```

**Issue**: High webhook latency
```
Check Vercel function duration in logs
Profile the webhook handler (see Performance Profiling section)
Check if Supabase is slow (query times)
Verify no backlog of scheduled posts
```

## Folder Structure Rationale

```
instagram-stories-webhook/
├─ app/                          # Next.js App Router
│  ├─ api/                       # API routes, organized by feature
│  │  ├─ auth/                   # Authentication endpoints
│  │  ├─ schedule/               # Post scheduling
│  │  ├─ webhook/                # External webhooks (Instagram events)
│  │  └─ cron/                   # Scheduled jobs
│  ├─ components/                # React components
│  │  ├─ ui/                     # Reusable UI components (Button, Form, etc.)
│  │  ├─ forms/                  # Complex form components
│  │  ├─ sections/               # Page sections (Hero, Features, etc.)
│  │  └─ debug/                  # Development-only debug components
│  ├─ (pages)/                   # Page routes
│  ├─ layout.tsx                 # Root layout
│  ├─ page.tsx                   # Home page
│  └─ middleware.ts              # Route middleware & auth
│
├─ lib/                          # Shared utilities & business logic
│  ├─ auth.ts                    # NextAuth configuration
│  ├─ config/                    # Configuration & environment
│  ├─ instagram/                 # Instagram API integration
│  ├─ scheduler/                 # Scheduling logic & cron handlers
│  ├─ media/                     # Media processing & validation
│  ├─ types/                     # TypeScript types & interfaces
│  ├─ validations/               # Zod schemas for validation
│  └─ utils/                     # General utilities (formatters, helpers)
│
├─ __tests__/                    # Unit tests (Vitest)
│  ├─ lib/                       # Tests for lib/ modules
│  └─ api/                       # Tests for API routes
│
├─ tests/                        # E2E tests (Playwright)
│  └─ e2e/                       # End-to-end test specs
│
├─ supabase/                     # Database & Supabase setup
│  ├─ migrations/                # SQL migration files
│  └─ seeds/                     # Seed data for dev
│
├─ public/                       # Static assets (images, fonts)
├─ data/                         # Config files (JSON)
├─ .env.local                    # Environment variables (not in git)
├─ CLAUDE.md                     # This file - Claude guidelines
└─ vercel.json                   # Vercel deployment config
```

**Rationale**:
- **app/api**: Feature-based organization mirrors business domains
- **lib/**: Centralized logic reusable across API routes and components
- **__tests__/ vs tests/**: Separation of unit (Vitest) vs E2E (Playwright) tests
- **supabase/**: Co-located with app; easy to version migrations with code
- **public/**: Assets served by CDN; small, versioned by Next.js

## Logging Best Practices

### What to Log

**Do log**:
```typescript
// Business events
logger.info('Post published', { postId, userId, instagramId });
logger.warn('Token refresh required', { userId, expiresIn: 300 });

// Errors with context
logger.error('Failed to publish', { postId, error: error.message, userId });

// Performance metrics
logger.info('Batch processed', { count: 50, duration: 1230 });
```

**Don't log**:
```typescript
// ❌ Full tokens
logger.debug('Token:', accessToken);  // Never!

// ❌ Full request/response bodies (PII)
logger.debug('Request:', req.body);

// ❌ Sensitive environment variables
logger.debug('DB URL:', process.env.DATABASE_URL);
```

### Token Masking
```typescript
const maskToken = (token: string) => token.slice(0, 6) + '...';
logger.info('Using token', { token: maskToken(accessToken) });
```

### Log Levels
- **ERROR**: Issues requiring immediate attention (5xx errors, API failures)
- **WARN**: Potential issues (token expiring soon, rate limit approaching)
- **INFO**: Important events (user action, cron completion, auth success)
- **DEBUG**: Development-only (function entry/exit, state changes)

### Structured Logging Format
```typescript
// Good: Machine-parseable JSON
logger.info('webhook.received', {
  provider: 'instagram',
  timestamp: new Date().toISOString(),
  webhookId: req.headers['x-webhook-id'],
  status: 'queued',
});

// Avoid: Unstructured text
logger.info('Instagram webhook received at ' + new Date());
```

## Environment Variable Precedence

### Loading Order
1. **Process environment** (highest priority)
```bash
API_KEY=production node app.js
```

2. **.env.local** (local overrides)
```
# .env.local
DATABASE_URL=postgresql://localhost
```

3. **.env** (team defaults)
```
# .env
NODE_ENV=development
```

4. **hardcoded config** (fallback; use `lib/config/index.ts`)
```typescript
// lib/config/index.ts
export const config = {
  apiVersion: process.env.INSTAGRAM_API_VERSION || '24.0',
  webhookSecret: process.env.WEBHOOK_SECRET || 'dev-secret-do-not-use',
};
```

### Client vs Server Variables

**`NEXT_PUBLIC_*` prefix** (exposed to browser):
```
NEXT_PUBLIC_SUPABASE_URL=https://abc.supabase.co
NEXT_PUBLIC_API_ENDPOINT=https://api.example.com
```

**Server-only** (never prefix with `NEXT_PUBLIC_`):
```
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
FB_APP_SECRET=sk_live_...
DATABASE_PASSWORD=mysecretpassword
```

### Verification
```typescript
// ✓ Safe: Server-side only
export const getServerConfig = () => ({
  dbUrl: process.env.DATABASE_URL,
  apiSecret: process.env.API_SECRET,
});

// ❌ Never: Client-side secret exposure
export const clientSecret = process.env.API_SECRET;  // Don't do this!
```

## Backward Compatibility Strategy

### API Response Versioning

**Scenario**: Adding new optional field
```typescript
// v1: Existing clients don't break
interface ScheduledPost {
  id: string;
  caption: string;
  scheduledAt: Date;
  // New field (optional)
  priority?: number;
}

// Existing clients ignore priority; new clients use it
```

**Scenario**: Changing response structure
```typescript
// v1 Response (deprecated, still supported)
{ publishedAt: "2024-01-01T10:00:00Z" }

// v2 Response (new structure)
{ publishedAt: { iso: "2024-01-01T10:00:00Z", unix: 1704110400 } }

// During transition: Support both
const response = {
  publishedAt: {
    iso: date.toISOString(),
    unix: date.getTime() / 1000,
  },
};
// Old clients: response.publishedAt.iso (still works)
// New clients: response.publishedAt.unix (new capability)
```

### Database Migrations with Zero Downtime

**Adding column**:
```sql
-- Migration 1: Add nullable column
ALTER TABLE scheduled_posts ADD COLUMN priority INT DEFAULT 0;

-- Migration 2 (next release): Backfill data
UPDATE scheduled_posts SET priority = 1 WHERE status = 'published';

-- Migration 3 (release after): Make NOT NULL
ALTER TABLE scheduled_posts ALTER COLUMN priority SET NOT NULL;
```

### Feature Removal Timeline

```
Release N: Deprecation
├─ Add deprecation warning in code
├─ Document in CHANGELOG: "Feature X deprecated; use Y instead"
└─ Notify users in dashboard notification

Release N+1: Final warning
├─ Log warning on every use
└─ Update documentation with removal date

Release N+2: Removal
├─ Remove code
└─ Close support tickets referencing old feature
```

## Advanced Debugging Workflows

### Enable Verbose Logging

**Backend**:
```bash
# Start dev server with debug output
DEBUG=app:* npm run dev

# Or set in code
process.env.DEBUG = 'app:*';
```

**Frontend** (in browser console):
```javascript
localStorage.setItem('debug', 'app:*');
// Reload page; now SWR and fetch logs visible
```

### Debug Endpoints (dev only)

**Existing debug endpoints**:
- `/debug` - Dashboard showing auth status, token validity
- `/api/debug/publish` - Test publishing (dev only)

**To test a specific scenario**:
```bash
# Test scheduled post processing manually
curl -H "API_KEY: $API_KEY" http://localhost:3000/api/cron/process

# Test webhook payload
curl -X POST http://localhost:3000/api/webhook/story \
  -H "Authorization: Bearer $WEBHOOK_SECRET" \
  -H "Content-Type: application/json" \
  -d @webhook-payload.json
```

### Reading Supabase Logs

**Via Dashboard**:
1. Go to Supabase project → Logs
2. Filter by API endpoint: `/rest/v1/scheduled_posts`
3. View actual SQL queries executed

**Via CLI**:
```bash
supabase logs push                  # Real-time API logs
supabase logs postgres              # Database logs
supabase logs realtime              # Realtime channel logs
```

### Browser DevTools Debugging

**React Components**:
- Install React DevTools extension
- Inspect component tree, props, state in DevTools
- Use Profiler to identify re-renders

**Network Requests**:
- DevTools → Network tab
- Filter by `fetch/xhr`
- Check response status and headers
- Use `fetch` in console to debug API calls

**Performance Analysis**:
- DevTools → Performance tab
- Record; perform action; stop recording
- Analyze flame chart for bottlenecks

## Multi-Environment Configuration

### Three Environment Setup

**Development** (local):
```
NODE_ENV=development
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_API_ENDPOINT=http://localhost:3000
ENABLE_DEBUG_ENDPOINTS=true
LOG_LEVEL=debug
```

**Staging** (preview):
```
NODE_ENV=staging
NEXT_PUBLIC_SUPABASE_URL=https://staging.supabase.co
NEXT_PUBLIC_API_ENDPOINT=https://staging-api.example.com
ENABLE_DEBUG_ENDPOINTS=false
LOG_LEVEL=info
WEBHOOK_SECRET=staging-secret-xyz
```

**Production** (live):
```
NODE_ENV=production
NEXT_PUBLIC_SUPABASE_URL=https://prod.supabase.co
NEXT_PUBLIC_API_ENDPOINT=https://api.example.com
ENABLE_DEBUG_ENDPOINTS=false
LOG_LEVEL=error
WEBHOOK_SECRET=prod-secret-abc
SENTRY_DSN=https://...@sentry.io/...
```

### Conditional Configuration

```typescript
// lib/config/index.ts
export const config = {
  isDev: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',

  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,

  // Different timeouts per environment
  requestTimeout: process.env.NODE_ENV === 'production' ? 30000 : 60000,

  // Debug endpoints only in dev
  enableDebug: process.env.ENABLE_DEBUG_ENDPOINTS === 'true' && !config.isProduction,
};
```

### Vercel Environment Variables UI

Set variables per environment:
1. Vercel Dashboard → Settings → Environment Variables
2. Create variable
3. Assign to: Development, Preview, Production (independently)
4. Redeploy to apply changes

### Local Development with Different Environments

```bash
# Test staging config locally
NEXT_PUBLIC_SUPABASE_URL=https://staging.supabase.co npm run dev

# Test production config (warning!)
NODE_ENV=production npm run build && npm start
```

## Deployment Notes

- **Environment Setup**: Use `/settings` page to configure credentials via web interface
- **Security Headers**: Configured in `next.config.ts` (CSP, HSTS, X-Frame-Options, etc.)
- **Vercel Cron**: Configure in `vercel.json` for production scheduling
- **Supabase Migrations**: Located in `supabase/migrations/`; run via Supabase dashboard

---

## Workflow Definitions

These are recommended workflows for common development tasks:

### Workflow: Database Migration
1. Create migration: `supabase migration new migration_name`
2. Write SQL in `supabase/migrations/TIMESTAMP_migration_name.sql`
3. Test locally: `supabase migration up && npm run test`
4. Deploy: Apply via Supabase Dashboard → SQL Editor

### Workflow: Debugging Scheduled Post Failures
1. Check `/debug` dashboard for auth/token status
2. Query `scheduled_posts` table: filter by status = 'failed'
3. Review `error_message` column for details
4. Check `/api/cron/process` logs for batch operation errors
5. If token issue: re-authenticate via `/api/auth/link-facebook`

### Workflow: Pre-Deployment Security Audit
1. Run checklist from "Pre-Deployment Security Audit Checklist" section
2. Execute: `npm audit --production`
3. Run full test suite: `npm run test && npm run test:e2e`
4. Review recent changes for security issues
5. Get sign-off from tech lead before deploying

### Workflow: Performance Investigation
1. Enable debug mode: `DEBUG=app:* npm run dev`
2. Run Chrome DevTools Performance profiler
3. Identify bottleneck (frontend render, API latency, query time)
4. Optimize: add useCallback, create index, batch queries, etc.
5. Measure improvement: profile again, compare results
