# Development Workflows

This document defines reusable workflows for common development tasks. Use these as guides when working on the codebase or when delegating tasks to team members.

---

## Workflow: Create & Deploy Database Migration

**Trigger**: Need to modify database schema (add column, create table, change constraints)

**Steps**:
1. **Create migration file**
   ```bash
   supabase migration new descriptive_migration_name
   ```
   This generates: `supabase/migrations/20240126123456_descriptive_migration_name.sql`

2. **Write SQL migration**
   - Keep migrations atomic (single logical change)
   - Add RLS policies for new tables
   - Include comments explaining non-obvious changes
   - Test locally before committing

3. **Test locally**
   ```bash
   supabase migration up           # Apply migration
   npm run test                    # Verify no breakage
   npm run test:e2e                # Test full flows
   ```

4. **Commit and push**
   ```bash
   git add supabase/migrations/
   git commit -m "feat: add priority column to scheduled_posts"
   git push origin feature-branch
   ```

5. **Deploy to production**
   - Request code review (focus on SQL correctness)
   - After approval, merge to main
   - Deploy Vercel (migrations run on main deployment)
   - Monitor Supabase logs for any issues
   - If issues: create rollback migration (see CLAUDE.md)

**Expected time**: 30-60 minutes (including testing)

**Common mistakes**:
- ❌ Adding NOT NULL column without defaults → breaks existing data
- ❌ Not testing with actual data → surprises in prod
- ❌ Forgetting RLS policies → data security holes

---

## Workflow: Debug Scheduled Post Failures

**Trigger**: Posts not publishing; stuck in processing state; or showing as failed

**Prerequisites**: Access to `/debug` page and Supabase dashboard

**Steps**:
1. **Check system status**
   - Visit `http://localhost:3000/debug` (or production URL)
   - Verify: Auth ✓, Supabase ✓, Instagram Token ✓
   - If any are ✗, fix auth issues first

2. **Inspect specific post**
   - Go to Supabase dashboard → `scheduled_posts` table
   - Find post by ID or search by date range
   - Check columns: `status`, `error_message`, `updated_at`

3. **Based on status, diagnose**:
   | Status | Action |
   |--------|--------|
   | `pending` | Post hasn't been picked up by cron; check if `/api/cron/process` is configured |
   | `processing` | Check if lock is stale (>30 min old); may need manual release |
   | `failed` | Read `error_message` for specific error; see "Common Error Codes" below |
   | `published` | Check Instagram app to verify post exists there |

4. **Check Instagram token validity**
   - Supabase → `oauth_tokens` table
   - Find user's row
   - Check: `expires_at` (should be in future)
   - If expired: User needs to re-authenticate via `/api/auth/link-facebook`

5. **Check cron execution logs**
   - Vercel Dashboard → Deployments → select recent deploy → Logs
   - Search for: `/api/cron/process`
   - Look for: error timestamps matching post's `created_at` time

6. **For development: manually trigger process**
   ```bash
   curl -H "API_KEY: $API_KEY" http://localhost:3000/api/cron/process
   ```

**Resolution examples**:
- **Error: "Instagram API rate limit"** → Wait 60 seconds; retry manually
- **Error: "Invalid token"** → Ask user to re-link their account
- **Error: "Media not found"** → Check Supabase storage for media file
- **Status: "processing" for 30+ min** → Manual release required; update post status to `pending`

---

## Workflow: Pre-Deployment Security Audit

**Trigger**: Before deploying to production (main branch)

**Duration**: 15-20 minutes

**Checklist** (from CLAUDE.md; abbreviated here):

### Phase 1: Code Review (5 min)
- [ ] No hardcoded secrets: `git grep -i "secret\|password\|token" -- '*.ts' '*.tsx' | grep -v node_modules`
- [ ] No `console.log()` with sensitive data
- [ ] All POST/PUT endpoints validate input with Zod

### Phase 2: Authentication & Authorization (5 min)
- [ ] Protected routes use `getServerSession()`
- [ ] Admin endpoints check role: `(auth.jwt()::jsonb -> 'user_metadata' ->> 'role') = 'admin'`
- [ ] Session timeout is reasonable (30-90 days)

### Phase 3: Data Security (5 min)
- [ ] Webhook endpoints validate secret: `Authorization: Bearer $WEBHOOK_SECRET`
- [ ] Cron endpoints validate API key: `API_KEY` header
- [ ] Database RLS policies enabled on all tables
- [ ] Instagram tokens never in localStorage

### Phase 4: Dependencies & Environment (5 min)
- [ ] Run `npm audit --production` (zero critical vulnerabilities)
- [ ] Environment variables correct in Vercel UI (per environment)
- [ ] No `.env.local` secrets committed to git

### Phase 5: Test Coverage (5 min)
- [ ] Unit tests pass: `npm run test`
- [ ] E2E tests pass: `npm run test:e2e`
- [ ] No new warnings during `npm run build`

**If any checks fail**:
- Fix the issue
- Re-run affected checks
- Get second opinion from team member before proceeding

**After checklist passes**:
- Proceed with deploy
- Monitor Sentry/logs for first hour
- Keep rollback procedure ready

---

## Workflow: Investigate High Error Rate

**Trigger**: Alert: "Error rate > 1%" or customer reports widespread failures

**Urgency**: HIGH - Investigate immediately

**Steps**:

1. **Identify root cause (5 minutes)**
   ```bash
   # Check Sentry for error pattern
   # Check Vercel logs for 5xx errors
   # Check database status (any connection issues)
   # Check Instagram API status (api.instagram.com)
   ```

2. **Classify error type**:
   - **Auth errors** → Check Google OAuth / Supabase status
   - **Instagram API errors** → Check Meta API status page
   - **Database errors** → Check Supabase dashboard
   - **Application errors** → Check recent code deploy

3. **Immediate mitigation**:
   - If recent deploy caused it: `vercel rollback` to previous version
   - If external service down: Communicate to users; no action needed
   - If database slow: Check query logs; kill long-running queries if needed

4. **Long-term fix**:
   - Create GitHub issue describing incident
   - Document in postmortem (if customer-facing)
   - Add monitoring/alerting for this error if not present

**Example incident: "503 Supabase Connection Failed"**
- Check Supabase status page → might be in maintenance
- Wait 15 minutes
- If still failing: Check SUPABASE_SERVICE_ROLE_KEY is valid
- If invalid: Re-generate key in Supabase; update Vercel env vars; redeploy

---

## Workflow: Implement Feature Flag Rollout

**Trigger**: Launching a new feature to subset of users; wants to validate before full rollout

**Steps**:

1. **Add feature to database**
   ```sql
   -- supabase/migrations/TIMESTAMP_add_feature_flag.sql
   ALTER TABLE email_whitelist ADD COLUMN beta_features TEXT[] DEFAULT ARRAY[];
   -- Example data: beta_features = ARRAY['new-dashboard', 'beta-ui']
   ```

2. **Add feature check utility**
   ```typescript
   // lib/features/flags.ts
   export async function isFeatureEnabled(userId: string, feature: string): Promise<boolean> {
     const { data: user } = await supabaseAdmin
       .from('email_whitelist')
       .select('beta_features')
       .eq('user_id', userId)
       .single();
     return user?.beta_features?.includes(feature) ?? false;
   }
   ```

3. **Add conditional UI**
   ```typescript
   // app/components/Dashboard.tsx
   const isBetaUIEnabled = await isFeatureEnabled(userId, 'beta-ui');

   return (
     <>
       {isBetaUIEnabled ? <BetaUIVersion /> : <CurrentUIVersion />}
     </>
   );
   ```

4. **Internal testing** (50% users)
   - Update `beta_features` for internal team members in Supabase
   - Test thoroughly; fix issues

5. **Alpha rollout** (10% users)
   - Update `beta_features` for 10% of user base
   - Monitor error logs and analytics
   - Gather feedback

6. **Beta rollout** (50% users)
   - Expand to 50% if alpha stable
   - Continue monitoring

7. **GA rollout** (100% users)
   - Remove feature flag logic; always show new version
   - Commit code cleanup

---

## Workflow: Optimize Slow API Endpoint

**Trigger**: API response time exceeds target (target: <500ms for typical queries)

**Steps**:

1. **Measure current performance**
   ```bash
   # Chrome DevTools: Network tab → measure endpoint response time
   # Or: curl with verbose timing
   curl -w "\nResponse time: %{time_total}s\n" http://localhost:3000/api/posts
   ```

2. **Identify bottleneck**
   - **Option A: Database query** → Use EXPLAIN ANALYZE (see CLAUDE.md)
   - **Option B: API logic** → Add performance logs; profile with Node profiler
   - **Option C: Instagram API call** → Measure individual requests

3. **Implement optimization**:
   | Bottleneck | Fix |
   |------------|-----|
   | Missing index | `CREATE INDEX` (see CLAUDE.md for schema) |
   | N+1 queries | Batch queries; use JOIN instead of loop |
   | Slow computation | Memoize result; move to background job |
   | External API | Cache response; add timeout; fallback to stale data |

4. **Verify improvement**
   ```bash
   npm run test           # Ensure no regressions
   npm run build          # Check for TypeScript errors
   curl -w "Response time: %{time_total}s\n" http://localhost:3000/api/posts
   # Compare with baseline from step 1
   ```

5. **Deploy with monitoring**
   - Monitor endpoint response time post-deploy
   - Set alert if response time regresses

---

## Workflow: Handle Instagram API Rate Limit

**Trigger**: Instagram API returns error code 368 (rate limit) or 100 (invalid parameter)

**For end users**:
1. Show message: "Publishing temporarily unavailable. Try again in 5 minutes."
2. Automatically retry after delay (backend handles)
3. Log incident for investigation

**For implementation**:
1. Catch error code 368 in `/lib/instagram/publish.ts`
2. Implement exponential backoff retry (wait 60s, then retry)
3. Return 429 status code to frontend with `Retry-After` header
4. Frontend shows user-friendly message + countdown

**Prevention**:
- Cache Instagram Business Account ID (avoid repeated lookups)
- Batch publish requests (don't call API for every single post)
- Monitor rate limit headers; alert if approaching limit
- Add delay between requests during high-load periods

---

## Workflow: Handle Critical Production Issue

**Trigger**: Customer-impacting issue in production; requires immediate fix

**Urgency**: CRITICAL (fix within 30 minutes)

**Steps**:

1. **Triage issue (2 minutes)**
   - Understand: What's broken? How many users affected?
   - Severity: Minor (cosmetic), Major (feature broken), Critical (data loss)

2. **Implement quick fix (10-15 minutes)**
   - Identify root cause from logs
   - Make minimal code change to fix
   - Skip normal testing; jump to deploy

3. **Deploy (5 minutes)**
   - `git commit -m "hotfix: fix critical issue #123"`
   - `git push origin master` (or main branch)
   - Vercel auto-deploys
   - Monitor logs for next 15 minutes

4. **Post-incident** (after crisis over)
   - Create GitHub issue: "Add monitoring for issue X"
   - Add test case to prevent regression
   - Document in postmortem

**Example hotfix scenario**:
- **Issue**: Auth tokens invalid after midnight UTC
- **Root cause**: Token expiry calculation bug
- **Fix**: Update expiry check logic; simple 2-line change
- **Deploy**: `git push origin main`; done

---

## Workflow: Add Comprehensive Tests for Feature

**Trigger**: Adding new feature or modifying critical logic; wants high test coverage

**Test matrix**:
| Test Type | Coverage | Tools |
|-----------|----------|-------|
| Unit | Logic, utilities, functions | Vitest |
| Integration | API endpoints with mocked Supabase | Vitest + MSW |
| E2E | Full user flow (UI → API → DB) | Playwright |

**Steps**:

1. **Unit tests** (for utilities)
   ```typescript
   // __tests__/lib/validateEmail.test.ts
   describe('validateEmail', () => {
     it('validates correct email', () => {
       expect(validateEmail('user@example.com')).toBe(true);
     });
     it('rejects invalid email', () => {
       expect(validateEmail('not-an-email')).toBe(false);
     });
   });
   ```

2. **Integration tests** (for API endpoints)
   ```typescript
   // __tests__/api/schedule.test.ts
   describe('POST /api/schedule', () => {
     it('creates scheduled post', async () => {
       const response = await request(app).post('/api/schedule').send({ ... });
       expect(response.status).toBe(200);
     });
     it('validates input', async () => {
       const response = await request(app).post('/api/schedule').send({});
       expect(response.status).toBe(400);
     });
   });
   ```

3. **E2E tests** (for user flows)
   ```typescript
   // tests/e2e/schedule-flow.spec.ts
   test('user can schedule and publish post', async ({ page }) => {
     await page.goto('/');
     await page.fill('input[name="caption"]', 'Test post');
     await page.click('button[type="submit"]');
     await expect(page).toHaveText('Post scheduled');
   });
   ```

4. **Run full suite**
   ```bash
   npm run test              # Unit + integration
   npm run test:e2e          # E2E
   npm run test:coverage     # Coverage report
   ```

5. **Target coverage**:
   - **Critical paths**: 90%+ coverage (auth, publishing, scheduling)
   - **Business logic**: 80%+ coverage
   - **Utilities**: 70%+ coverage
   - **UI components**: 50%+ coverage (focus on logic, not rendering)

---

## Workflow: Troubleshoot Development Environment Setup

**Trigger**: Developer reports: "My dev environment is broken"

**Diagnostic steps**:

1. **Verify Node version**
   ```bash
   node --version        # Should be 18+
   npm --version         # Should be 9+
   ```

2. **Verify environment variables**
   ```bash
   # Check .env.local exists and has required vars
   cat .env.local | grep NEXT_PUBLIC_SUPABASE_URL
   ```

3. **Verify Supabase**
   ```bash
   supabase status       # Should show "OK"
   supabase start        # May need to restart
   ```

4. **Clear caches & reinstall**
   ```bash
   npm run clean         # Clear build artifacts
   rm -rf node_modules
   npm install
   npm run dev
   ```

5. **Check `/debug` page**
   - Visit `http://localhost:3000/debug`
   - Should show green checkmarks for: Auth, Supabase, Instagram Token
   - If any red: specific error message will indicate what's wrong

6. **Nuclear option: Reset everything**
   ```bash
   supabase stop
   supabase reset        # WARNING: Deletes local DB data
   supabase start
   npm run dev
   ```

**If still broken**: Get logs output and investigate specific error message

---

## Workflow: Update Dependencies Safely

**Trigger**: Security patch available; or want to upgrade library

**Risk levels**:

### Patch Updates (1.0.0 → 1.0.1) - Low Risk
```bash
npm update          # Update all packages to latest patch
npm run test        # Quick test
# Deploy immediately if tests pass
```

### Minor Updates (1.0.0 → 1.1.0) - Medium Risk
```bash
npm install next@latest  # Update specific package
npm run build           # Check for TypeScript errors
npm run test            # Run full test suite
npm run test:e2e        # Run E2E tests
# Review changes; deploy after code review
```

### Major Updates (1.0.0 → 2.0.0) - High Risk
```bash
# 1. Read changelog/migration guide
# 2. Update incrementally:
npm install react@latest
npm run build           # Fix TypeScript errors
npm run test            # Fix broken tests
npm run test:e2e        # Fix broken E2E tests
# 3. Check functionality manually on staging
# 4. Deploy to production
```

**Vulnerability handling**:
```bash
npm audit               # Shows vulnerabilities
npm audit fix           # Auto-fixes if possible
npm audit fix --force   # Force major version updates (risky!)
```

---

## Quick Reference: Common Commands

```bash
# Development
npm run dev              # Start dev server with hot reload
npm run build            # Build for production
npm run start            # Run production build locally

# Testing
npm run test             # Run unit tests once
npm run test:watch       # Watch mode
npm run test:e2e         # Run E2E tests headless
npm run test:e2e:ui      # Run E2E with UI
npm run test:coverage    # Generate coverage report

# Database
supabase start           # Start local Supabase
supabase stop            # Stop Supabase
supabase reset           # Reset database to initial state
supabase db pull         # Pull latest schema from remote

# Utilities
npm run lint             # Check for linting issues
git log --oneline        # View recent commits
git status              # Check changed files
```

---

This workflows document is a living resource. As new patterns emerge or workflows evolve, update this document and communicate changes to the team.
