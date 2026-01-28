# CLAUDE.md - Project Guidelines

**instagram-stories-webhook** is a Next.js app for programmatic Instagram Stories publishing via Meta Graph API. Integrates Google auth, Supabase, and cron-based scheduling.

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

### What MUST be tested ✅
- Meme submission workflows (user → admin → schedule)
- Search, pagination, filtering, bulk operations
- Edit workflows, database ops, RLS policies
- Auth flows, role-based access, input validation

### CANNOT test (Meta API) ❌
- Real Instagram publishing (requires actual IG account)
- Container creation, media upload, media ID retrieval

### Strategy
- Mock Meta API via MSW: `https://graph.instagram.com/v*`
- Unit tests: Vitest + MSW in `__tests__/`
- E2E tests: Playwright up to scheduling (not publishing)
- Mock successful/failed response scenarios

**Acceptance**: If data reaches `scheduled_posts` table correctly, it's ready for publishing.

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
