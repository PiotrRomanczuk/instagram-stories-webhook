# CLAUDE.md - Project Guidelines

**instagram-stories-webhook** is a Next.js app for programmatic Instagram Stories publishing via Meta Graph API. Integrates Google auth, Supabase, and cron-based scheduling.

---

## Project Status & Linear Integration

**Linear Project**: [Instagram Stories Webhook](https://linear.app/bms95/project/instagram-stories-webhook-ea21e56e20bf) | **Team**: BMS

- All task tracking, milestones, and backlog management happens in Linear
- Issues: ISW-137 through ISW-186 (50 issues across 4 phases)
- Coordination: Claim Linear issues before starting work to avoid conflicts

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
# 1. Get Linear ticket (ISW-XXX)
# 2. Create branch: feature/ISW-XXX-description
# 3. Make changes and commit
# 4. Run quality gates
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

| Layer | Tool | Instagram API Handling |
|-------|------|------------------------|
| Unit | Vitest + MSW | **Mock with MSW** |
| Integration | Vitest + Supabase | **Mock with MSW** |
| E2E | Playwright | **NEVER MOCK - Use real account** |

**CRITICAL**: E2E tests use REAL Instagram account (`@www_hehe_pl`). Never mock Meta API in E2E.

→ **For detailed testing patterns**: delegate to `test-engineer` agent

---

## Specialized Agents

| Agent | Use When |
|-------|----------|
| **`git-workflow`** | Git operations, branching, versioning, PR lifecycle |
| **`pr-manager`** | Creating PRs, Linear linking, release management |
| **`test-engineer`** | Writing/reviewing tests, MSW setup, E2E flows |
| **`security-reviewer`** | Security audits, RLS validation, secret leak checks |
| **`database-ops`** | Migrations, RLS policies, query optimization |
| **`instagram-api-specialist`** | Instagram API integration, publishing flow, error handling |
| **`feature-developer`** | Implementing features with Next.js patterns |
| **`ui-engineer`** | shadcn/ui components, responsive design, accessibility |
| **`deployment-ops`** | Vercel deployments, CI/CD, rollbacks, incidents |
| **`observability-engineer`** | Monitoring, logging, Sentry, analytics |
| **`refactoring-specialist`** | File splitting, eliminating `any`, tech debt |
| **`pr-reviewer`** | Code review, quality checks, convention validation |
| **`linear-coordinator`** | Sprint planning, issue triage, backlog grooming |
| **`supabase-realtime-optimizer`** | Realtime performance, WebSocket debugging |
| **`supabase-schema-architect`** | Schema design, complex migrations, RLS architecture |

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

**Document**: `docx`, `pdf`, `xlsx` | **UI/UX**: `frontend-design`, `interface-design`, `theme-factory`
**Dev Tools**: `git-cleanup`, `webapp-testing` | **Meta**: `mcp-builder`, `skill-creator`

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
