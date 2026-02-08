# CLAUDE.md - Project Guidelines

**instagram-stories-webhook** is a Next.js app for programmatic Instagram Stories publishing via Meta Graph API. Integrates Google auth, Supabase, and cron-based scheduling.

---

## 📊 Development Status

**For current project status and progress**, see **[PROJECT_STATUS.md](./PROJECT_STATUS.md)**

`PROJECT_STATUS.md` is the primary source of truth for:
- 🎯 Current development phase and weekly progress
- 📋 Active work and immediate priorities (with task assignments)
- 🆕 Recent changes and updates (mini changelog)
- 🐛 Known issues and blockers
- 🔗 Quick navigation to all documentation
- ⚡ Development quick reference (commands, URLs, credentials)

**This file (CLAUDE.md)** contains stable reference information:
- Project architecture and conventions
- Code organization patterns
- Testing strategies
- Commands reference
- **Parallel execution coordination protocol** (see below)

**For detailed metrics and historical tracking**, see [IMPLEMENTATION_STATUS.md](./IMPLEMENTATION_STATUS.md)

---

## 🤝 Parallel Execution Coordination

**When multiple Claude Code sessions may run in parallel:**

### Before Starting Any Work

1. **Read PROJECT_STATUS.md first**
   ```bash
   # Always start by checking current status
   cat PROJECT_STATUS.md
   ```

2. **Check "Active Tasks" section**
   - Look for tasks with Status: ⏳ Available
   - Verify no other session claimed it recently
   - Avoid tasks marked "🔄 In Progress" unless >2 hours old

3. **Ask user which task to work on**
   - Do NOT assume which task to start
   - Ask: "I see these available tasks: [list]. Which would you like me to work on?"
   - Wait for explicit assignment

### Claiming a Task

**Required Protocol**:

1. **Check PROJECT_STATUS.md "Active Tasks"** section
2. **Verify task is available** (Status: ⏳ Available, Owner: *Unclaimed*)
3. **Edit PROJECT_STATUS.md** to claim:
   ```markdown
   - **Status**: 🔄 In Progress
   - **Owner**: Session: Claude #[N] ([User Name]) - Started: [Timestamp]
   ```
4. **Proceed with work** on that specific task only
5. **Update status when complete**:
   ```markdown
   - **Status**: ✅ Complete
   - **Owner**: Session: Claude #[N] - Completed: [Timestamp]
   ```

### Conflict Resolution

**If task is already claimed**:
- Check timestamp - if >2 hours old, may be abandoned
- Ask user: "Task X is claimed by Session Y since [time]. Should I take over or work on something else?"
- Never forcibly take over active tasks

**If multiple sessions start same task**:
- First to update PROJECT_STATUS.md wins
- Others should abort and pick different task
- Ask user to mediate if unclear

### Example Workflow

```
User: "Work on authentication testing"

Claude: "I see these available tasks in PROJECT_STATUS.md Active Tasks:
1. Task 1.1: Measure Accurate Coverage Baseline (⏳ Available, 1-2h)
2. Task 1.2: Authentication Flow Testing (⏳ Available, 3-4h)
3. Task 1.3: Instagram API Integration Testing (⏳ Available, 4-5h)

Which task would you like me to work on?"

User: "Task 1.2"

Claude: "Claiming Task 1.2 in PROJECT_STATUS.md..."
[Updates file with Status: In Progress, Owner: Session info]
"Starting work on authentication flow testing..."
```

### Why This Matters

- **Prevents duplicate work** - Multiple sessions won't test the same file
- **Clear ownership** - Easy to see who's working on what
- **Coordination** - Team can work in parallel efficiently
- **Accountability** - Track who completed which tasks
- **Recovery** - Abandoned tasks can be identified and reassigned

---

## 🔍 Research-First Development Protocol

**ALWAYS perform web research before implementing new features:**

1. **Official Documentation**
   - Check framework/library official docs (Next.js, React, Supabase, Instagram Graph API)
   - Review API references and migration guides
   - Look for breaking changes and deprecations

2. **Best Practices & Patterns**
   - Search for recommended patterns and examples
   - Review official examples repositories
   - Check community-approved solutions

3. **Common Pitfalls**
   - Look for known issues and gotchas
   - Review GitHub issues and discussions
   - Check Stack Overflow for edge cases

4. **Version Compatibility**
   - Verify compatibility between dependencies
   - Check for breaking changes in recent versions
   - Review changelogs and upgrade guides

5. **Examples & References**
   - Find working examples of similar features
   - Review open-source implementations
   - Check official starter templates

**Why This Matters:**
- Prevents implementing deprecated patterns
- Saves time by avoiding known issues
- Ensures compatibility with latest versions
- Follows framework-recommended approaches
- Reduces technical debt from the start

---

## Quick Start

**Dev**: `npm run dev` | **Build**: `npm run build` | **Tests**: `npm run test` | **Lint**: `npm run lint`

### Pre-Commit Checklist (MANDATORY)
```bash
npm run lint && npx tsc && npm run test
```
**DO NOT COMMIT** if any command fails. Zero exceptions.

### PR Creation & CI/CD Verification (MANDATORY)
1. Create PR: `gh pr create --title "..." --body "..."`
2. Watch checks: `gh pr checks --watch`
3. **MUST PASS**: Lint, TypeScript, Tests, Build
4. If failed: Fix locally, re-test, push, re-verify

## Versioning (MANDATORY)

This project uses **Semantic Versioning** ([semver.org](https://semver.org/)) via the `version` field in `package.json`.

**Bump the version in `package.json` when committing feature work:**

| Change Type | Version Bump | Example | When to Use |
|-------------|-------------|---------|-------------|
| **Bug fix** | `PATCH` (0.1.0 → 0.1.1) | `npm version patch --no-git-tag-version` | Backwards-compatible bug fixes |
| **New feature** | `MINOR` (0.1.0 → 0.2.0) | `npm version minor --no-git-tag-version` | New functionality, backwards-compatible |
| **Breaking change** | `MAJOR` (0.2.0 → 1.0.0) | `npm version major --no-git-tag-version` | Incompatible API/schema changes |

### Rules

1. **Every feature branch** must bump the version before merging
2. Use `--no-git-tag-version` to avoid auto-commit — version bump goes in your feature commit
3. If multiple features merge in the same cycle, the highest bump wins (e.g., minor > patch)
4. Pre-1.0: breaking changes can use MINOR bumps (0.x.0)
5. Include the version bump in your commit: `feat: add dark mode (0.2.0 → 0.3.0)`

### Workflow

```bash
# After finishing feature work, before committing:
npm version minor --no-git-tag-version   # or patch/major

# Verify it updated package.json
grep '"version"' package.json

# Include package.json in your commit
git add package.json
```

## Architecture

### Authentication
- Google OAuth via NextAuth (`lib/auth.ts`)
- Session tokens: JWT via Supabase
- Protected routes via middleware (`proxy.ts`)
- Roles: admin/user from `email_whitelist` table

### Instagram API
- Graph API v24.0 at `lib/instagram/publish.ts`
- 3-step flow: create container → wait ready → publish
- Tokens: server-side only in Supabase `oauth_tokens`
- Error handling: codes 190 (expired), 100 (invalid), 368 (rate limit)

### Data Layer (Supabase)
- **oauth_tokens**: Meta tokens + Instagram account IDs
- **scheduled_posts**: Status (pending/processing/published/failed)
- **email_whitelist**: User roles
- **meme_submissions**: User submissions for admin review
- RLS enforced on all tables

### Scheduler System
- Cron: Vercel (prod) or node-cron (dev)
- Entry: `/api/cron/process` processes scheduled posts
- Lock mechanism prevents concurrent processing
- Auto token refresh before expiry

### Media & AI Analysis
- Image/video validation: `lib/media/validator.ts`
- AI analysis bucket: `ai-analysis` (Pro plan)
- Auto-archive: Published memes saved for analysis

## Key Patterns

### Request/Response
- Validation: Zod schemas + early returns
- Error responses: JSON with status (400 client, 500 server)
- **API response naming**: NEVER use `data` as response field name. Use descriptive names like `items`, `user`, `submission`. This avoids `data.data.data` chains when using SWR/React Query (which wrap responses in their own `data` property).

### Database Queries
- Use `supabaseAdmin` client (server-side only)
- Explicit error handling; check result presence
- Use `.single()` for one row; use type-mapping functions
- Prefer column selection over `select('*')`

### Meta API Calls
- Wrap in try/catch; use `axios.isAxiosError()`
- Handle specific error codes (190, 100, 368)
- Mask tokens in logs: `token.slice(0, 6) + '...'`
- Cache Instagram Business Account IDs

### Environment Variables
- Secrets: NO `NEXT_PUBLIC_` prefix
- Public: `NEXT_PUBLIC_` prefix
- Fallback: Check env, then `data/app-config.json`

## Testing Strategy

### 🚨 CRITICAL: E2E Testing Policy

**E2E tests ALWAYS use REAL Instagram accounts. NEVER mock Meta API in E2E tests.**

#### Why Real Accounts for E2E?

1. **Instagram API is Complex** - Mocking doesn't catch real API behavior changes
2. **Video Processing Variability** - Instagram video transcoding takes 30-90s, varies by load
3. **Container Status Polling** - Real timing matters for async operations
4. **Rate Limiting** - Need to test real rate limit handling
5. **Token Expiration** - Must verify real token refresh flows
6. **Error Codes** - Instagram returns specific codes (190, 100, 368) in production

**If you can't test with real Instagram → Don't write an E2E test. Write a unit test with MSW instead.**

### Test Layers

| Layer | Tool | Scope | Instagram API |
|-------|------|-------|---------------|
| **Unit Tests** | Vitest + MSW | Functions, modules | ✅ Mock with MSW |
| **Integration Tests** | Vitest + Supabase | Database, API routes | ✅ Mock with MSW |
| **E2E Tests** | Playwright | Full user flows | ❌ **NEVER MOCK - Use Real Account** |

### E2E Test Requirements

**Real Instagram Account:**
- Account: `p.romanczuk@gmail.com`
- Instagram: `@www_hehe_pl` (Business Account)
- Tokens stored in Supabase `oauth_tokens` table
- Environment variables:
  ```bash
  ENABLE_REAL_IG_TESTS=true
  ENABLE_LIVE_IG_PUBLISH=true
  ```

**What to Test in E2E:**
- ✅ Full publishing flow (image + video)
- ✅ Token validation and expiration handling
- ✅ Instagram connection status
- ✅ Real upload to Instagram servers
- ✅ Container creation and status polling
- ✅ Publishing logs and database updates
- ✅ UI interactions with real API delays

**What NOT to Test in E2E:**
- ❌ Mocked API responses (use unit tests)
- ❌ Fake Instagram accounts (always use real)
- ❌ Simulated delays (use real API timings)

### Unit Test Strategy (Mocking Allowed)

**Use MSW to mock Meta API in unit tests:**
```typescript
// CORRECT: Unit test with MSW
server.use(
  rest.post('https://graph.instagram.com/v*/me/media', (req, res, ctx) => {
    return res(ctx.json({ id: '12345' }));
  })
);
```

**What to test:**
- ✅ Function logic (error handling, data transforms)
- ✅ Database operations (with test database)
- ✅ Input validation (Zod schemas)
- ✅ Auth callbacks (NextAuth)
- ✅ API error code handling (190, 100, 368)

### E2E Test Execution Order (Dependency Workflow)

**ALL E2E tests use REAL Instagram account - NO MOCKING.**

The E2E test suite uses a **dependency workflow** to ensure the critical live Instagram publishing test passes before running other tests.

**Prerequisite Test (Runs First):**
- File: `__tests__/e2e/instagram-publishing-live.spec.ts`
- Account: `p.romanczuk@gmail.com` → Instagram: `@www_hehe_pl`
- Environment: Requires `ENABLE_REAL_IG_TESTS=true` and `ENABLE_LIVE_IG_PUBLISH=true`
- Tests: **4 live publishing tests** (3 image + 1 video)
  - LIVE-PUB-01: Publish image via debug page
  - LIVE-PUB-02: Publish image with file upload
  - LIVE-PUB-03: Verify publishing is logged
  - LIVE-PUB-04: Publish video story (30-90s processing time)

**Dependency Chain:**
1. `live-publishing-prerequisite` project runs first (REAL Instagram API)
2. If passes → `main-tests` project runs (UI/UX tests, also REAL API)
3. If fails → All main tests are automatically skipped (fail fast)

**Why This Order?**
- Live publishing is the app's core functionality
- If publishing is broken, no point testing UI/scheduling
- Saves CI time by failing fast on critical issues

**Local Development:**
```bash
# Run all E2E tests (with REAL Instagram - dependency chain)
ENABLE_REAL_IG_TESTS=true ENABLE_LIVE_IG_PUBLISH=true npm run test:e2e

# Run ONLY live publishing tests (REAL Instagram)
ENABLE_REAL_IG_TESTS=true ENABLE_LIVE_IG_PUBLISH=true npm run test:e2e:live

# Run specific test (e.g., video publishing)
ENABLE_REAL_IG_TESTS=true ENABLE_LIVE_IG_PUBLISH=true \
  npx playwright test --project=live-publishing-prerequisite -g "LIVE-PUB-04"

# Skip live publishing (will skip all E2E tests due to dependency)
npm run test:e2e  # Prerequisites skipped → main tests skipped
```

**CI/CD:**
- Live publishing tests run automatically in GitHub Actions
- Environment variables set in workflow file
- Requires valid Instagram tokens in Supabase for `p.romanczuk@gmail.com`
- If prerequisite fails, all main tests are skipped (fail fast)
- **NEVER mock Instagram API in CI - always use real account**

### E2E Test Safety Features

**24-Hour De-duplication:**
- Tests check if content was published in last 24 hours
- Prevents duplicate content errors from Instagram
- Avoids rate limiting issues
- Tests skip gracefully if recently published

**Extended Timeouts for Real API:**
- Image upload: 30s (real Supabase upload time)
- Video upload: 60s (larger files, real processing)
- Image publishing: 60s (Instagram container creation)
- Video publishing: 120s (Instagram video transcoding is SLOW)

**Why These Timeouts?**
- Real API calls have variable latency
- Instagram video processing is not instant (30-90s typical)
- Network conditions affect real uploads
- Better to have generous timeouts than flaky tests

### E2E Testing Do's and Don'ts

#### ✅ DO: E2E Tests

```typescript
// ✅ CORRECT: E2E test using REAL Instagram account
test('publish video to Instagram', async ({ page }) => {
  await signInAsRealIG(page);  // Real account: p.romanczuk@gmail.com

  await page.goto('/debug');
  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles(testVideoPath);

  const publishButton = page.getByRole('button', { name: /Publish/i });
  await publishButton.click();

  // Wait for REAL Instagram API response (can take 30-90s for video)
  await expect(page.locator('text=Published Successfully!'))
    .toBeVisible({ timeout: 120000 });
});
```

**When to write E2E tests:**
- Full user workflows (login → upload → publish)
- Real Instagram API interactions
- UI/UX flows with real backend
- Integration between all system components

#### ❌ DON'T: Mock in E2E Tests

```typescript
// ❌ WRONG: DO NOT mock Instagram API in E2E tests
test('publish video to Instagram', async ({ page }) => {
  // ❌ NEVER DO THIS IN E2E TESTS
  await page.route('**/graph.instagram.com/**', (route) => {
    route.fulfill({
      status: 200,
      body: JSON.stringify({ id: 'fake_id' })
    });
  });

  // This test is WORTHLESS - not testing real Instagram behavior
});
```

**Why this is wrong:**
- Doesn't test real Instagram API delays
- Doesn't catch API changes or errors
- Doesn't verify token expiration handling
- Gives false confidence

#### ✅ DO: Unit Tests with Mocking

```typescript
// ✅ CORRECT: Unit test with MSW mock
import { server } from '../mocks/server';
import { rest } from 'msw';

describe('publishToInstagram', () => {
  it('should handle expired token error', async () => {
    // Mock is APPROPRIATE in unit tests
    server.use(
      rest.post('https://graph.instagram.com/v*/me/media', (req, res, ctx) => {
        return res(ctx.status(400), ctx.json({
          error: { code: 190, message: 'Token expired' }
        }));
      })
    );

    const result = await publishToInstagram(mockData);
    expect(result.error).toBe('TOKEN_EXPIRED');
  });
});
```

**When to write unit tests with mocks:**
- Testing function logic
- Testing error handling paths
- Testing edge cases quickly
- Testing without real API quota/rate limits

### Quick Decision Tree

```
Need to test publishing flow?
│
├─ Is it a full user workflow (UI → API → Instagram)?
│  └─ YES → Write E2E test with REAL Instagram account
│
├─ Is it a function/module logic test?
│  └─ YES → Write unit test with MSW mock
│
└─ Is it database/API route integration?
   └─ YES → Write integration test with MSW mock
```

### Test File Organization

```
__tests__/
├── unit/                          # Mock Instagram API (MSW)
│   ├── instagram/
│   │   ├── publish.test.ts       # ✅ Mock API responses
│   │   ├── insights.test.ts      # ✅ Mock API responses
│   │   └── quota.test.ts         # ✅ Mock API responses
│   └── media/
│       └── validator.test.ts     # ✅ No API calls
│
├── integration/                   # Mock Instagram API (MSW)
│   └── api/
│       ├── content.test.ts       # ✅ Mock API responses
│       └── schedule.test.ts      # ✅ Mock API responses
│
└── e2e/                           # REAL Instagram account (NO MOCKS)
    ├── instagram-publishing-live.spec.ts  # ❌ NEVER mock
    ├── video-upload.spec.ts               # ❌ NEVER mock
    ├── schedule-timeline.spec.ts          # ❌ NEVER mock
    └── admin-publish.spec.ts              # ❌ NEVER mock
```

### Remember: E2E = End-to-End = Real Everything

**E2E tests verify the entire system works together in production-like conditions.**

- Real Instagram account (`@www_hehe_pl`)
- Real Meta Graph API calls
- Real Supabase database
- Real authentication flow
- Real network delays
- Real error responses

**If you need to mock → It's not an E2E test → Write a unit/integration test instead.**

---

## Code Standards

### General
- Functional > classes | SRP | Keep files <150 lines
- Descriptive names: `isLoading`, `hasError`
- No `any` types

### React/Next.js
- Minimize `'use client'` and `useEffect`
- Prefer Server Components
- Use dynamic imports for code splitting

### Error Handling
- Early returns + guard clauses
- Validate at boundaries (user input, external APIs)

### Security
- Validate webhook/cron secrets every request
- Never log full tokens (mask them)
- Store tokens server-side only
- Sanitize user URLs before Meta API calls
- Use `getServerSession()` for protected routes

### Quality Gates (MANDATORY)
```bash
npm run lint && npx tsc && npm run test
```
**Every commit, no exceptions.**

## Debugging

| Issue | How to Debug |
|-------|-------------|
| Auth failing | Visit `/debug` - shows token validity, auth status |
| Publishing broken | Check `scheduled_posts` status; review error_message |
| Cron not running | Check Vercel logs; verify `vercel.json` schedule |
| High latency | Profile with Chrome DevTools; check DB queries |
| Token refresh failing | Verify `oauth_tokens.expires_at` being updated |

## Database Schema

```
oauth_tokens: id, user_id, access_token, expires_at, instagram_business_id
scheduled_posts: id, user_id, media_id, caption, scheduled_at, status, error_message
email_whitelist: id, email, user_id, role (admin/user)
meme_submissions: id, user_id, media_url, status (pending/approved/rejected)
```

**RLS**: Users see own data; admins see all via JWT role check

## Migrations

1. Create: `supabase migration new name`
2. Write SQL in `supabase/migrations/TIMESTAMP_name.sql`
3. Test locally: `supabase migration up && npm run test`
4. Deploy via Supabase Dashboard → SQL Editor
5. Rollback: Create reverse migration + apply

**Best practices**: Add nullable → backfill → add NOT NULL. Never edit existing migrations.

## Performance

**Frontend**: Chrome DevTools → Performance tab → identify long tasks, layout thrashing
**Backend**: Check slow queries via `EXPLAIN ANALYZE`; add indexes if needed
**Database**: Enable logging: `SET log_min_duration_statement = 1000;`

## Pre-Deployment Security Checklist

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

## File Naming

| Type | Convention | Example |
|------|-----------|---------|
| Components | PascalCase | `ScheduleForm.tsx` |
| Utilities | camelCase | `validateEmail.ts` |
| Hooks | `use` prefix | `useScheduledPosts.ts` |
| Types | PascalCase | `lib/types/Post.ts` |
| Tests | `.test.ts` suffix | `__tests__/lib/validate.test.ts` |
| API Routes | kebab-case | `app/api/schedule/route.ts` |
| Env Vars | SCREAMING_SNAKE_CASE | `WEBHOOK_SECRET` |
| Documentation | `/docs` folder + `YYYY-MM-DD_name.md` | `docs/2024-03-15_feature-timeline-integration.md` |

## Deployment

- Environment: Set via Vercel Dashboard
- Security headers: `next.config.ts` (CSP, HSTS, X-Frame-Options)
- Cron: Configure in `vercel.json`
- Migrations: Run via Supabase Dashboard

## Folder Structure

```
app/                    # Next.js routes
├─ api/                # API endpoints (feature-organized)
├─ components/         # React components
└─ middleware.ts       # Auth middleware

lib/                    # Shared logic
├─ auth.ts, config/, instagram/, scheduler/, media/, types/, validations/

docs/                   # Project documentation (guides, feature docs, standards)
scripts/                # Utility scripts (migrations, deployment, testing)
screenshots/            # Playwright failure screenshots & manual reference images

__tests__/              # Unit tests (Vitest)
tests/e2e/              # E2E tests (Playwright)
supabase/               # Migrations + seeds
public/                 # Static assets
```

## Common Tasks

**Debug Scheduled Post Failures**:
1. Visit `/debug` dashboard
2. Query `scheduled_posts`: filter by status = 'failed'
3. Review `error_message` column
4. Check `/api/cron/process` logs
5. Re-authenticate if token issue via `/api/auth/link-facebook`

**Test Publishing**: Use "Quick Test Suite" on `/` homepage

**Add Feature**: Follow PR process → verify CI/CD passes

**Fix Linting**: `npm run lint -- --fix`

**Profile Performance**: Chrome DevTools → Performance tab → record action

**Database Query Issue**: `EXPLAIN ANALYZE SELECT ...` to find bottleneck

## Rate Limiting (Instagram)

Error code 368 = rate limited. Implement exponential backoff:
```bash
# Wait 60s, retry with backoff: 1s, 2s, 4s, ...
```
User-facing: Return 429 with `retryAfter` header.

## Monitoring

**Stack**: Sentry (errors), Vercel Analytics (perf), Vercel Logs (aggregation)

**Critical Alerts**:
- Auth failures > 5 in 5 min → Check Google/Supabase status
- Publishing failures > 10 in 1 hour → Check Instagram API + tokens
- DB connection errors → Check Supabase status
- Webhook failures > 3 consecutive → Check endpoint health
- Error rate > 1% → Roll back recent deploy

## Environment Variables

**Production**: Set in Vercel Dashboard per environment (dev/preview/prod)
**Development**: Use `.env.local` (not in git)

**Client** (`NEXT_PUBLIC_` prefix): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_API_ENDPOINT`
**Server-only**: `SUPABASE_SERVICE_ROLE_KEY`, `FB_APP_SECRET`, `WEBHOOK_SECRET`

## Breaking Changes

1. **Adding required param**: Create `/api/v2/*` endpoint; keep old for 2 releases
2. **Removing column**: Backfill → deprecate → remove across releases
3. **Component props**: Add warning → deprecate → remove

## Important Links

- Auth flow: `lib/auth.ts`
- Publishing logic: `lib/instagram/publish.ts`
- Scheduler: `lib/scheduler/process-service.ts`
- Debug dashboard: `/debug`
- Media validator: `lib/media/validator.ts`

---

**Remember**: Quality over speed. Every commit must pass linting, type-checking, and tests. CI/CD verification is mandatory before PR merge.
