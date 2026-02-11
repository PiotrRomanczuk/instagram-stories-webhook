# CLAUDE.md - Project Guidelines

**instagram-stories-webhook** is a Next.js app for programmatic Instagram Stories publishing via Meta Graph API. Integrates Google auth, Supabase, and cron-based scheduling.

---

## Project Status & Backlog

All project status, milestones, backlogs, and task tracking live in **Linear**:

- **Project**: [Instagram Stories Webhook](https://linear.app/bms95/project/instagram-stories-webhook-ea21e56e20bf)
- **Team**: BMS
- **Milestones**: Phase 1 (Feb 26), Phase 2 (Mar 19), Phase 3 (Apr 9), Phase 4 (Apr 28)
- **Issues**: 50 issues (BMS-137 through BMS-186) covering bugs, security, testing, features

Use Linear for all status checks, task claiming, and progress tracking. Do not create or maintain markdown status files.

---

## Quick Start

**Dev**: `npm run dev` | **Build**: `npm run build` | **Tests**: `npm run test` | **Lint**: `npm run lint`

### Pre-Commit Checklist (MANDATORY)
```bash
npm run lint && npx tsc && npm run test
```
**DO NOT COMMIT** if any command fails. Zero exceptions.

### PR Workflow (MANDATORY — never push directly to master)
1. Create branch: `git checkout -b feature/my-change`
2. Push branch: `git push -u origin feature/my-change`
3. Create PR: `gh pr create --title "..." --body "..."`
4. Watch checks: `gh pr checks --watch`
5. Review Vercel preview URL (posted as PR comment)
6. **MUST PASS**: Lint, TypeScript, Tests, Build
7. Merge PR → Vercel auto-deploys to production

---

## Versioning (MANDATORY)

Semantic Versioning via `version` in `package.json`:

| Change Type | Bump | Command |
|-------------|------|---------|
| Bug fix | PATCH (0.1.0 -> 0.1.1) | `npm version patch --no-git-tag-version` |
| New feature | MINOR (0.1.0 -> 0.2.0) | `npm version minor --no-git-tag-version` |
| Breaking change | MAJOR (0.2.0 -> 1.0.0) | `npm version major --no-git-tag-version` |

- Every feature branch must bump version before merging
- Use `--no-git-tag-version` (version bump goes in your feature commit)
- Include in commit message: `feat: add dark mode (0.2.0 -> 0.3.0)`
- Pre-1.0: breaking changes can use MINOR bumps

---

## Architecture

### Authentication
- Google OAuth via NextAuth (`lib/auth.ts`) | JWT via Supabase | Middleware: `proxy.ts`
- Roles: admin/user from `email_whitelist` table

### Instagram API
- Graph API v24.0 at `lib/instagram/publish.ts`
- 3-step flow: create container -> wait ready -> publish
- Tokens: server-side only in Supabase `oauth_tokens`
- Error codes: 190 (expired), 100 (invalid), 368 (rate limit)

### Data Layer (Supabase)
- Tables: `oauth_tokens`, `scheduled_posts`, `email_whitelist`, `meme_submissions`
- RLS enforced on all tables

### Scheduler
- Cron: Vercel (prod) or node-cron (dev) | Entry: `/api/cron/process`
- Lock mechanism prevents concurrent processing | Auto token refresh

### Media
- Validation: `lib/media/validator.ts` | AI analysis bucket: `ai-analysis`

---

## Key Patterns

- **Validation**: Zod schemas + early returns; error responses as JSON (400/500)
- **API response naming**: NEVER use `data` as response field name (avoids `data.data.data` with SWR/React Query)
- **Database**: `supabaseAdmin` server-side only; `.single()` for one row; prefer column selection over `select('*')`
- **Meta API**: try/catch + `axios.isAxiosError()`; handle codes 190, 100, 368; mask tokens in logs
- **Env vars**: Secrets = no `NEXT_PUBLIC_` prefix; Public = `NEXT_PUBLIC_` prefix; Fallback to `data/app-config.json`

---

## Code Standards

- Functional > classes | SRP | Keep files <150 lines | Descriptive names (`isLoading`, `hasError`)
- **No `any` types** -- use `unknown` if type is truly unknown
- Minimize `'use client'` and `useEffect`; prefer Server Components
- Dynamic imports for code splitting
- Early returns + guard clauses; validate at boundaries
- Validate webhook/cron secrets every request; never log full tokens; store tokens server-side only
- **Quality gates (every commit)**: `npm run lint && npx tsc && npm run test`

---

## Testing Rules (CRITICAL)

**E2E tests ALWAYS use REAL Instagram accounts. NEVER mock Meta API in E2E tests.**

| Layer | Tool | Instagram API |
|-------|------|---------------|
| Unit | Vitest + MSW | Mock with MSW |
| Integration | Vitest + Supabase | Mock with MSW |
| E2E | Playwright | **NEVER MOCK** |

- Real account: `p.romanczuk@gmail.com` / `@www_hehe_pl`
- If you can't test with real Instagram -> write a unit test with MSW, not an E2E test

**For detailed testing strategy, patterns, and examples**: delegate to `test-engineer` agent.

---

## Parallel Execution Coordination

When multiple Claude Code sessions run in parallel, use **Linear issue assignment** for coordination:

1. **Check Linear** -- browse the project's issues to find available work
2. **Claim via Linear** -- assign the issue to yourself before starting
3. **Ask user** which task to work on if multiple are available
4. **Mark complete** in Linear when done

Conflict resolution: if an issue is already assigned, ask the user before taking over.

---

## Database & Migrations

```
oauth_tokens: id, user_id, access_token, expires_at, instagram_business_id
scheduled_posts: id, user_id, media_id, caption, scheduled_at, status, error_message
email_whitelist: id, email, user_id, role (admin/user)
meme_submissions: id, user_id, media_url, status (pending/approved/rejected)
```

**RLS**: Users see own data; admins see all via JWT role check.

**Migration workflow**: `supabase migration new name` -> write SQL -> test locally -> deploy via Dashboard -> rollback = reverse migration. Never edit existing migrations. Add nullable -> backfill -> add NOT NULL.

**For detailed database patterns**: delegate to `database-ops` agent.

---

## Security Essentials

- All protected routes use `getServerSession()`; admin endpoints verify JWT role
- Webhook endpoints validate `Authorization` header; cron endpoints require `API_KEY` header
- No hardcoded secrets; token masking in logs; RLS on all tables
- Input validation on all POST/PUT bodies; sanitize URLs before Meta API calls
- CORS + CSP headers in `next.config.ts`; `npm audit --production` must pass

**For full security audit workflow**: delegate to `security-reviewer` agent.

---

## Operational Reference

### Debugging

| Issue | How to Debug |
|-------|-------------|
| Auth failing | Visit `/debug` - shows token validity, auth status |
| Publishing broken | Check `scheduled_posts` status; review `error_message` |
| Cron not running | Check Vercel logs; verify `vercel.json` schedule |
| High latency | Profile with Chrome DevTools; check DB queries |
| Token refresh failing | Verify `oauth_tokens.expires_at` being updated |

### File Naming

| Type | Convention | Example |
|------|-----------|---------|
| Components | PascalCase | `ScheduleForm.tsx` |
| Utilities | camelCase | `validateEmail.ts` |
| Hooks | `use` prefix | `useScheduledPosts.ts` |
| Types | PascalCase | `lib/types/Post.ts` |
| Tests | `.test.ts` suffix | `__tests__/lib/validate.test.ts` |
| API Routes | kebab-case | `app/api/schedule/route.ts` |
| Env Vars | SCREAMING_SNAKE_CASE | `WEBHOOK_SECRET` |
| Docs | `/docs` + `YYYY-MM-DD_name.md` | `docs/2024-03-15_feature-timeline.md` |

### Folder Structure

```
app/                    # Next.js routes
  api/                  # API endpoints (feature-organized)
  components/           # React components
  middleware.ts         # Auth middleware
lib/                    # Shared logic (auth, config, instagram, scheduler, media, types, validations)
docs/                   # Project documentation
scripts/                # Utility scripts
screenshots/            # Playwright failure screenshots
__tests__/              # Unit tests (Vitest)
tests/e2e/              # E2E tests (Playwright)
supabase/               # Migrations + seeds
public/                 # Static assets
```

### Deployment Workflow

**PR-based workflow with Vercel preview deployments. Never push directly to master.**

```
git checkout -b feature/my-change
# ... make changes ...
git push -u origin feature/my-change
gh pr create
# Review Vercel preview URL → approve → merge → production deploy
```

| Step | What happens |
|------|-------------|
| Push to feature branch | CI runs (lint, typecheck, tests, build) |
| PR created | Vercel creates a preview deployment with unique URL |
| Review | Test the preview URL, verify CI passes |
| Merge to master | Vercel auto-deploys to production |

**Safety nets:**
- `.githooks/pre-push` blocks direct pushes to master (bypass: `git push --no-verify`)
- CI is decoupled from deploy — GitHub Actions runs lint/test/build only, Vercel Git Integration handles all deployments
- Emergency deploy: `git push --no-verify` or manual Vercel deploy

**Config:**
- Environment vars: Vercel Dashboard | Security headers: `next.config.ts` | Cron: `vercel.json` | Migrations: Supabase Dashboard

### Breaking Changes
1. Adding required param -> create `/api/v2/*` endpoint; keep old for 2 releases
2. Removing column -> backfill -> deprecate -> remove across releases
3. Component props -> add warning -> deprecate -> remove

### Monitoring
- Stack: Sentry (errors), Vercel Analytics (perf), Vercel Logs
- Alert thresholds: Auth failures >5/5min, Publishing failures >10/hr, Error rate >1%

### Important Links
- Auth: `lib/auth.ts` | Publishing: `lib/instagram/publish.ts` | Scheduler: `lib/scheduler/process-service.ts`
- Debug dashboard: `/debug` | Media validator: `lib/media/validator.ts`

---

## Specialized Agents

| Agent | Purpose | When to Delegate |
|-------|---------|-----------------|
| `test-engineer` | Testing strategy, E2E/unit test writing, MSW mocking | Writing or reviewing tests |
| `security-reviewer` | Security audits, secret leak checks, RLS validation | Security reviews, pre-deployment |
| `instagram-api-specialist` | Graph API integration, publishing flow, error codes | Instagram API work, debugging publishing |
| `feature-developer` | Next.js patterns, API routes, components, research-first protocol | Implementing new features |
| `database-ops` | Schema changes, migrations, RLS policies, query optimization | Database work, migrations |
| `pr-manager` | Creates PRs on new branches, links to Linear issues, syncs status | Creating PRs, branch management |
| `pr-reviewer` | Reviews PRs for code quality, security, testing, Linear tracking | Reviewing pull requests |
| `deployment-ops` | Vercel deployments, CI/CD, cron health, rollbacks, incident response | Deployments, production issues |
| `refactoring-specialist` | File splitting, `any` elimination, logging consistency, tech debt | Refactoring, code quality |
| `observability-engineer` | Monitoring, Sentry, Vercel Analytics, health checks, logging | Monitoring, debugging production |
| `ui-engineer` | shadcn/ui, Radix UI, responsive design, accessibility | UI components, design system |
| `linear-coordinator` | Linear project management, sprint planning, issue triage | Project coordination, backlog grooming |

Agent files: `.claude/agents/*.md`

---

**Remember**: Quality over speed. Every commit must pass linting, type-checking, and tests. CI/CD verification is mandatory before PR merge.
