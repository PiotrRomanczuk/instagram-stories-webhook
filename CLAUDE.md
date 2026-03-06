# CLAUDE.md - Project Guidelines

**instagram-stories-webhook** is a Next.js app for programmatic Instagram Stories publishing via Meta Graph API. Integrates Google auth, Supabase, and cron-based scheduling.

---

## Branch Safety Protocol (MANDATORY - DO THIS FIRST)

Run `git branch --show-current && git status --short` before any task.

**Rules:**
1. **Never work on `master` directly.** Create a feature branch FIRST before any changes.
2. **If a feature branch already exists**, switch to it before doing anything.
3. **If there are uncommitted changes on the wrong branch**, stash or commit them first.
4. **Branch naming**: `feature/ISW-XXX-description` (or `fix/`, `chore/`, `refactor/`).
5. **Create the branch BEFORE writing code** — prevents file loss across concurrent sessions.

**The check must happen at the very start of every task — no exceptions.**

---

### Parallel Agent Safety Protocol (MANDATORY when spawning 2+ agents)

**The Branch Safety Protocol above assumes sequential execution. For parallel agents, you MUST use one of the following patterns:**

#### Option A: Worktree Isolation (Recommended for all cases)

Use the `isolation: "worktree"` parameter when calling the Task tool:

```
Task(subagent_type="...", isolation="worktree", prompt="...")
```

Each agent gets its own isolated repo copy. No stash sharing, no file collisions, no checkout races. Inside a worktree agent, the Branch Safety Protocol still applies but runs safely in isolation.

```
# ✅ CORRECT: spawn parallel agents with isolation
Task(subagent_type="feature-developer", isolation="worktree", prompt="...")
Task(subagent_type="test-engineer", isolation="worktree", prompt="...")

# ❌ WRONG: agents share the working directory (causes race conditions)
Task(subagent_type="feature-developer", prompt="...")
Task(subagent_type="test-engineer", prompt="...")
```

#### Option B: Pre-Assignment Protocol (When worktrees aren't available)

Before spawning parallel agents:
1. **Ensure clean state**: `git status --short` must be empty. If not: commit first, don't stash.
2. **Create ALL branches upfront** (sequential, in orchestrator):
   ```bash
   git checkout -b feature/ISW-101-thing-a && git checkout master
   git checkout -b feature/ISW-102-thing-b && git checkout master
   ```
3. **Spawn agents with explicit branch names** in the prompt:
   > "Your pre-created branch is `feature/ISW-101-thing-a`. Run `git checkout feature/ISW-101-thing-a` as your FIRST action. Do NOT create branches or run git stash."

**Parallel agents MUST NOT**:
- Run `git stash` or `git stash pop` (shared stash = race condition)
- Run `git checkout -b` (branch creation = possible conflict)
- Assume the working directory state (another agent may have modified it)

---

## Quick Start

```bash
npm run dev          # Start dev server
npm run build        # Production build
npm run test         # Run tests
npm run lint         # Lint code
npm run pre-commit   # Run all quality gates
npm run test:e2e:preview      # Preview suite (~40 tests, 4-5 min)
npm run test:e2e:production   # Production suite (~113 tests, ~10 min)
```

### Pre-Commit Quality Gates (MANDATORY)
```bash
npm run lint && npx tsc && npm run test
```
**DO NOT COMMIT if any command fails.** Zero exceptions.

Use `/ship` for the full PR workflow (branch → changes → version bump → quality gates → push → PR → Linear).

---

## Architecture Overview

| Component | Tech | Key Files |
|-----------|------|-----------|
| **Auth** | NextAuth + Google OAuth | `lib/auth.ts`, `lib/auth-helpers.ts`, `app/api/auth/[...nextauth]/route.ts` |
| **Instagram API** | Meta Graph API v24.0 | `lib/instagram/publish.ts` |
| **Database** | Supabase (Postgres + RLS) | `lib/supabase.ts` |
| **Scheduler** | Vercel Cron + node-cron | `app/api/cron/process/route.ts` |
| **Media** | Validation + AI analysis | `lib/media/validator.ts` |

**Core Tables**: `users`, `email_whitelist`, `linked_accounts`, `content_items`, `scheduled_posts`, `meme_submissions`
**System Tables**: `admin_audit_log`, `auth_events`, `cron_locks`, `api_quota_history`, `api_keys`, `notifications`, `user_preferences`

---

## Code Standards & Patterns

- **TypeScript**: No `any` types (use `unknown` if truly unknown)
- **Components**: Prefer Server Components; minimize `'use client'` and `useEffect`
- **Files**: <150 lines, single responsibility, descriptive names
- **Functions**: Early returns, guard clauses, validate at boundaries
- **Validation**: Zod schemas + early returns
- **API Responses**: Never use `data` as field name (avoids `data.data.data`)
- **Database**: Use `supabaseAdmin` server-side; select specific columns over `select('*')`
- **Meta API**: Handle error codes 190/100/368; mask tokens in logs
- **Security**: Never log tokens; validate webhook/cron secrets; enforce RLS
- **Env Vars**: No `NEXT_PUBLIC_` for secrets; server-side only

---

## Testing

| Layer | Tool | File Count | Test Count | Instagram API Handling |
|-------|------|-----------|-----------|------------------------|
| Unit | Vitest + MSW | ~50 files | ~500 tests | **Mock with MSW** |
| Integration | Vitest + Supabase | ~20 files | ~200 tests | **Mock with MSW** |
| E2E - Preview | Playwright | 43 spec files (filtered) | **~40 tests** | **Environment guards skip production tests** |
| E2E - Production | Playwright | 43 spec files (full) | **~113 tests** | **NEVER MOCK - Use real account** |

**E2E Deployment Matrix**:

| Deployment | Tests | Duration | Trigger | Instagram API | Mobile Tests |
|------------|-------|----------|---------|---------------|--------------|
| **Preview** (PRs, merges) | ~40 tests | 4-5 min | Automatic | ❌ Skipped | ❌ Skipped |
| **Production** (scheduled) | ~113 tests | ~10 min | Manual + Daily 2AM UTC | ✅ Real API | ✅ 5 viewports |

**🚨 CRITICAL E2E TEST LIMIT (MANDATORY)**: Never add more than 10 E2E tests per feature. Add 1-3 E2E tests for the happy path; put edge cases in unit/integration tests. **Reject any PR that adds >10 E2E tests.**

→ For detailed testing patterns: see `TESTING.md` or delegate to `test-engineer` agent.

---

## Agents

| Agent | Use When |
|-------|----------|
| **`git-workflow`** | Git, branching, PR lifecycle |
| **`pr-manager`** | PRs, Linear linking, releases |
| **`test-engineer`** | Tests, MSW, E2E, RLS testing |
| **`security-reviewer`** | Security audits, RLS validation |
| **`database-ops`** | Migrations, RLS, query optimization |
| **`instagram-api-specialist`** | Instagram API integration |
| **`feature-developer`** | Next.js feature implementation |
| **`ui-engineer`** | shadcn/ui, responsive design |
| **`deployment-ops`** | Vercel deployments, CI/CD |
| **`observability-engineer`** | Monitoring, logging, Sentry |
| **`refactoring-specialist`** | File splitting, tech debt |
| **`pr-reviewer`** | Code review, conventions |
| **`linear-coordinator`** | Sprint planning, issue triage |
| **`supabase-realtime-optimizer`** | Realtime performance |
| **`supabase-schema-architect`** | Schema design, migrations |
| **`cron-job-engineer`** | Cron jobs, locking, quotas |
| **`media-pipeline-specialist`** | Media validation, FFmpeg |
| **`content-lifecycle-specialist`** | Content queue, bulk ops |
| **`analytics-engineer`** | Instagram Insights, metrics |

Agent files: `.claude/agents/*.md`

---

## Commands

→ **For available commands and skills**: See global CLAUDE.md (Workflow, Database, Design commands + UI/UX, Dev Tools, Automation skills)
→ **For detailed docs**: See `.claude/commands/*.md` and `.claude/skills/*/SKILL.md`

---

## Versioning (MANDATORY on Every PR)

**Every PR merged to `master` MUST include a version bump.** No exceptions.

```bash
npm version patch --no-git-tag-version   # bug fixes, small improvements
npm version minor --no-git-tag-version   # new features, UX improvements
npm version major --no-git-tag-version   # breaking changes
```

| Change Type | Bump |
|-------------|------|
| Bug fix, small improvement, refactor, chore | `patch` |
| New feature, UX improvement, new page/flow | `minor` |
| Breaking API change, major architecture shift | `major` |

**PR checklist:**
- [ ] Version bumped in `package.json` on the feature branch
- [ ] Quality gates pass (`npm run lint && npx tsc && npm run test`)
- [ ] Linear ticket updated

---

## Deployment

- PRs → Vercel preview deployment with unique URL
- Merge to `master` does NOT auto-deploy to production (disabled in `vercel.json`)
- Production deployment uses `deploy-production.yml` GitHub Actions workflow: quality gates → preview deploy → production promotion (E2E tests run separately via dedicated workflows)
- After merge → Run `npm run release` to tag the version

---

## Debugging & Conventions

**Debugging:**
- Auth failing? → Visit `/debug` for token status
- Publishing broken? → Check `scheduled_posts` table `error_message` column
- Cron not running? → Check Vercel logs + `vercel.json` schedule

**File Conventions:**
- Components: `PascalCase.tsx`
- Utils: `camelCase.ts`
- Hooks: `useCamelCase.ts`
- Tests: `*.test.ts`
- API: `kebab-case/route.ts`

---

**Remember**: Quality over speed. Every commit must pass all quality gates. Use `/ship` for streamlined releases.
