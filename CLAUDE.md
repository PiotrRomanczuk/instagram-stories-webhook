# CLAUDE.md - Project Guidelines

**instagram-stories-webhook** is a Next.js app for programmatic Instagram Stories publishing via Meta Graph API. Integrates Google auth, Supabase, and cron-based scheduling.

---

## Project Status & Linear Integration

**Linear Project**: [Instagram Stories Webhook](https://linear.app/bms95/project/instagram-stories-webhook-ea21e56e20bf) | **Team**: BMS

- All task tracking, milestones, and backlog management happens in Linear
- Issues: ISW-137 through ISW-186 (50 issues across 4 phases)
- Coordination: Claim Linear issues before starting work to avoid conflicts

---

## Branch Safety Protocol (MANDATORY - DO THIS FIRST)

**BEFORE starting ANY task**, you MUST check the current git branch and working tree state:

```bash
git branch --show-current && git status --short
```

**Rules:**
1. **Never work on `master` directly.** If you're on `master`, create a feature branch FIRST before making any changes.
2. **If a feature branch already exists for the task**, switch to it before doing anything.
3. **If there are uncommitted changes on the wrong branch**, stash or commit them before switching.
4. **Branch naming**: `feature/ISW-XXX-description` (or `fix/`, `chore/`, `refactor/`).
5. **Create the branch BEFORE writing code**, not after. This prevents file loss when multiple Claude sessions run concurrently.

**The check must happen at the very start of every task — no exceptions.** This applies to all agents and all workflows. If you skip this step and work on the wrong branch, changes may be lost when another session switches branches.

**Quick reference:**
```bash
# Check current state
git branch --show-current && git status --short

# Create and switch to new branch (do this BEFORE any code changes)
git checkout -b feature/ISW-XXX-description

# If you're on master with no changes, just create the branch
git checkout -b feature/ISW-XXX-description

# If you accidentally started on master with uncommitted changes
git stash && git checkout -b feature/ISW-XXX-description && git stash pop
```

---

## Quick Start

```bash
npm run dev          # Start dev server
npm run build        # Production build
npm run test         # Run tests
npm run lint         # Lint code
npm run pre-commit   # Run all quality gates
```

### Pre-Commit Quality Gates (MANDATORY)
```bash
npm run lint && npx tsc && npm run test
```
**DO NOT COMMIT if any command fails.** Zero exceptions.

### PR Workflow (Use `/ship` command)
```bash
# 1. Run Branch Safety Protocol (see above) — ALWAYS FIRST
# 2. Get Linear ticket (ISW-XXX)
# 3. Create branch IMMEDIATELY: git checkout -b feature/ISW-XXX-description
# 4. Make changes and commit
# 5. Run quality gates
/ship                # Validates, tests, pushes, creates PR, updates Linear
```

**Manual alternative**: See `git-workflow` agent for detailed git/PR workflows.

---

## Architecture Overview

| Component | Tech | Key Files |
|-----------|------|-----------|
| **Auth** | NextAuth + Google OAuth | `lib/auth.ts`, `app/middleware.ts` |
| **Instagram API** | Meta Graph API v24.0 | `lib/instagram/publish.ts` |
| **Database** | Supabase (Postgres + RLS) | `lib/supabase.ts` |
| **Scheduler** | Vercel Cron + node-cron | `app/api/cron/process/route.ts` |
| **Media** | Validation + AI analysis | `lib/media/validator.ts` |

**Tables**: `oauth_tokens`, `scheduled_posts`, `email_whitelist`, `meme_submissions`

---

## Key Patterns

- **Validation**: Zod schemas + early returns
- **API Responses**: Never use `data` as field name (avoids `data.data.data`)
- **Database**: Use `supabaseAdmin` server-side; select specific columns over `select('*')`
- **Meta API**: Handle error codes 190/100/368; mask tokens in logs
- **Env Vars**: No `NEXT_PUBLIC_` for secrets; server-side only

---

## Code Standards

- **TypeScript**: No `any` types (use `unknown` if truly unknown)
- **Components**: Prefer Server Components; minimize `'use client'` and `useEffect`
- **Files**: <150 lines, single responsibility, descriptive names
- **Functions**: Early returns, guard clauses, validate at boundaries
- **Security**: Never log tokens; validate webhook/cron secrets; enforce RLS

---

## Testing Strategy

| Layer | Tool | File Count | Test Count | Instagram API Handling |
|-------|------|-----------|-----------|------------------------|
| Unit | Vitest + MSW | ~50 files | ~500 tests | **Mock with MSW** |
| Integration | Vitest + Supabase | ~20 files | ~200 tests | **Mock with MSW** |
| E2E | Playwright | **6 files** | **~172 tests** | **NEVER MOCK - Use real account** |

**E2E Test Philosophy**:
- Test **USER JOURNEYS**, not UI components or implementation details
- Use REAL Instagram account (`@www_hehe_pl`) - NEVER mock in E2E
- Keep test count low (<200) for fast CI feedback (<10 min)
- Mobile-first: 70%+ tests cover mobile viewports (375px, 390px, 414px, 768px)
- Quality over quantity: Detailed edge cases belong in unit tests

**🚨 CRITICAL E2E TEST LIMIT (MANDATORY)**:
- **NEVER add more than 10 E2E tests** for any single feature
- If a feature needs >10 tests, write unit/integration tests instead
- E2E tests are for **critical user flows only**, not feature coverage
- When adding tests for new features:
  - ✅ Add 1-3 E2E tests for the happy path user journey
  - ✅ Add 10-20 unit tests for business logic and edge cases
  - ✅ Add 5-10 integration tests for API/database interactions
  - ❌ NEVER add 20+ E2E tests for UI states, edge cases, or variations
- **Reject any PR that adds >10 E2E tests** - move them to unit/integration layer

**The 6 Core E2E Files**:
1. `critical-user-journeys.spec.ts` (54 tests) - User and admin workflows
2. `instagram-publishing-live.spec.ts` (27 tests) - REAL Instagram API publishing
3. `mobile-responsive-core.spec.ts` (37 tests) - Mobile UX validation
4. `auth-and-rbac-core.spec.ts` (22 tests) - Authentication & RBAC
5. `production-smoke.spec.ts` (10 tests) - Production verification
6. `developer-tools.spec.ts` (22 tests) - Internal tooling

→ **For detailed testing patterns and guidelines**: See `TESTING.md` or delegate to `test-engineer` agent

---

## Specialized Agents

| Agent | Use When |
|-------|----------|
| **`git-workflow`** | Git operations, branching, versioning, PR lifecycle |
| **`pr-manager`** | Creating PRs, Linear linking, release management |
| **`test-engineer`** | Writing/reviewing tests, MSW setup, E2E flows, RLS testing |
| **`security-reviewer`** | Security audits, RLS validation, secret leak checks |
| **`database-ops`** | Migrations, RLS policies, query optimization |
| **`instagram-api-specialist`** | Instagram API integration, publishing flow, error recovery, Meta docs |
| **`feature-developer`** | Implementing features with Next.js patterns |
| **`ui-engineer`** | shadcn/ui components, responsive design, accessibility |
| **`deployment-ops`** | Vercel deployments, CI/CD, Vercel MCP, rollbacks, incidents |
| **`observability-engineer`** | Monitoring, logging, Sentry, analytics |
| **`refactoring-specialist`** | File splitting, eliminating `any`, tech debt, file-size-enforcer |
| **`pr-reviewer`** | Code review, quality checks, convention validation |
| **`linear-coordinator`** | Sprint planning, issue triage, backlog grooming |
| **`supabase-realtime-optimizer`** | Realtime performance, WebSocket debugging |
| **`supabase-schema-architect`** | Schema design, complex migrations, RLS architecture |
| **`cron-job-engineer`** | Cron job development, debugging, locking, quota gates |
| **`media-pipeline-specialist`** | Media validation, video/image processing, FFmpeg, storage |
| **`content-lifecycle-specialist`** | Content queue state machine, bulk ops, processing locks |
| **`analytics-engineer`** | Instagram Insights API, metrics, quota history analysis |

Agent files: `.claude/agents/*.md`

---

## Commands & Skills

### Essential Commands

**Workflow:**
- **`/ship`** - Full release workflow: validate → test → push → PR → Linear update
- **`/merge-fleet`** - Bulk PR fixer/merger with auto-fixing lint/type errors

**Database:**
- **`/supabase-migration-assistant`** - Generate/manage migrations
- **`/supabase-type-generator`** - Generate TypeScript types from schema
- **`/supabase-security-audit`** - Audit RLS policies

**Design:**
- **`/interface-design-init`** - Initialize design system
- **`/interface-design-audit`** - Audit component consistency

### Available Skills

**UI/UX**: `frontend-design`, `interface-design` | **Dev Tools**: `git-cleanup`, `webapp-testing`
**Automation**: `file-size-enforcer`, `i18n-manager`, `changelog-generator`

→ **For detailed command docs**: See `.claude/commands/*.md` and `.claude/skills/*/SKILL.md`

---

## Operational Quick Reference

**Debugging:**
- Auth failing? → Visit `/debug` for token status
- Publishing broken? → Check `scheduled_posts` table `error_message` column
- Cron not running? → Check Vercel logs + `vercel.json` schedule

**Deployment:**
- PRs → Vercel preview deployment with unique URL
- Merge to `master` → Auto-deploys to production
- Version bumping → Manual in PR (`npm version minor/patch --no-git-tag-version`), then `npm run release` after merge

**File Conventions:**
- Components: `PascalCase.tsx`
- Utils: `camelCase.ts`
- Hooks: `useCamelCase.ts`
- Tests: `*.test.ts`
- API: `kebab-case/route.ts`

→ **For detailed operational procedures**: delegate to `deployment-ops` or `observability-engineer` agents

---

## Important Links

**Core Files:**
- Auth: `lib/auth.ts`
- Instagram: `lib/instagram/publish.ts`
- Scheduler: `lib/scheduler/process-service.ts`
- Database: `lib/supabase.ts`
- Validation: `lib/media/validator.ts`

**Dashboards:**
- Debug: `/debug`
- Linear: https://linear.app/bms95/project/instagram-stories-webhook-ea21e56e20bf
- Vercel: https://vercel.com/dashboard

---

**Remember**: Quality over speed. Every commit must pass all quality gates. Use `/ship` for streamlined releases.
