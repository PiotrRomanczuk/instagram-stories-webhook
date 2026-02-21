# Global Config Migration — Remaining Work

## Status: ~33 of ~50 files done

---

## Completed

### Global CLAUDE.md
- [x] `~/.claude/CLAUDE.md` — universal coding standards

### Commands (14/14)
- [x] 12 copied as-is (supabase-*, interface-design-*)
- [x] `ship.md` — generalized (ISW→TICKET)
- [x] `merge-fleet.md` — generalized

### Skills (~15/15)
- [x] `interface-design/SKILL.md` + 3 references — copied
- [x] `i18n-manager/SKILL.md` — copied
- [x] `git-cleanup/scripts/analyze-branches.sh` — copied
- [x] `git-cleanup/SKILL.md` — generalized
- [x] `git-cleanup/README.md` — generalized
- [x] `git-cleanup/references/git-patterns.md` — generalized
- [x] `changelog-generator/SKILL.md` — generalized (BMS-42→PROJ-42)
- [x] `file-size-enforcer/SKILL.md` — generalized
- [x] `webapp-testing/SKILL.md` — generalized
- [x] `frontend-design/SKILL.md` — generalized

### Agents (2/19)
- [x] `supabase-realtime-optimizer.md` — copied as-is
- [x] `supabase-schema-architect.md` — copied as-is

---

## Remaining: 17 Agent Files

### Light Agents (5) — copy + minor edits

Source files already read. Apply global text replacements + remove project-specific sections.

| # | Source File | Target | Changes Needed |
|---|-----------|--------|----------------|
| 1 | `database-ops.md` | `~/.claude/agents/database-ops.md` | Remove specific table schemas (oauth_tokens, scheduled_posts, email_whitelist, meme_submissions). Remove "Debug Scheduled Post Failures" and "Check Token Status" sections. Keep all generic Supabase patterns. |
| 2 | `feature-developer.md` | `~/.claude/agents/feature-developer.md` | Remove "Instagram Graph API" from research examples. Replace with generic "External API". Remove `scheduled_posts` reference in workflow matrix. |
| 3 | `security-reviewer.md` | `~/.claude/agents/security-reviewer.md` | Remove `FB_APP_SECRET`, `WEBHOOK_SECRET` specifics → `{API_SECRET}`. Remove `app/api/webhook/story/route.ts` path. Remove entire "Meta API Error Codes" table. Keep HTTP status codes and generic audit workflow. |
| 4 | `ui-engineer.md` | `~/.claude/agents/ui-engineer.md` | Remove specific paths `app/components/schedule/`, `app/components/schedule-mobile/`. Keep all shadcn/ui, Radix, Tailwind, Framer Motion patterns. |
| 5 | `refactoring-specialist.md` | `~/.claude/agents/refactoring-specialist.md` | Remove "Current Violators" table (specific file paths). Remove "Resolved Violators" table. Replace with empty template. Remove Instagram module names from Logger Modules table. |

### Medium Agents (5) — section rewrites

Need to read source files first, then apply transformations.

| # | Source File | Target | Changes Needed |
|---|-----------|--------|----------------|
| 6 | `git-workflow.md` | `~/.claude/agents/git-workflow.md` | Replace ALL `ISW-XXX/ISW-123/ISW-124/ISW-125` → `TICKET-XXX/TICKET-YYY/TICKET-ZZZ`. Remove project name refs. |
| 7 | `linear-coordinator.md` | `~/.claude/agents/linear-coordinator.md` | Remove project URL `https://linear.app/bms95/...`. Remove team `BMS` → `{team}`. Remove issue range `ISW-137..186`. Remove Phase 1-4 milestone dates. |
| 8 | `pr-manager.md` | `~/.claude/agents/pr-manager.md` | Remove `ISW-XXX` → `TICKET-XXX`. Remove Linear URL/team `BMS` → `{team}`. Remove project name + milestone dates. |
| 9 | `pr-reviewer.md` | `~/.claude/agents/pr-reviewer.md` | Remove `@www_hehe_pl`. Generalize Instagram API "Pass 6" → "External API Integration". Remove `BMS` → `{team}`. |
| 10 | `observability-engineer.md` | `~/.claude/agents/observability-engineer.md` | Remove `ig:publish`, `ig:container` → generic modules. Remove `marszal-arts.vercel.app` → `your-app.vercel.app`. Remove specific health endpoints. |

### Heavy Agents (7) — significant rewrites

These require reading source + rebuilding content generically while preserving workflow structure.

| # | Source File | Target (renamed?) | Changes Needed |
|---|-----------|-------------------|----------------|
| 11 | `instagram-api-specialist.md` | **`api-integration-specialist.md`** (RENAME) | Full rewrite. Remove Meta API specifics (3-step publish, codes 190/100/368). Rebuild as generic external API agent: research-first protocol, error handling patterns, token management, rate limiting, retry strategies, 8-step debug workflow. |
| 12 | `test-engineer.md` | `test-engineer.md` | Remove `@www_hehe_pl`, `p.romanczuk@gmail.com`, LIVE-PUB IDs, Instagram-specific test patterns. Preserve "never mock in E2E" philosophy, 3-layer strategy, MSW patterns, E2E test limits. |
| 13 | `deployment-ops.md` | `deployment-ops.md` | Remove `marszal-arts.vercel.app`, 5 specific cron jobs, specific env vars, debug endpoints. Keep deployment workflow, rollback procedures, incident response. |
| 14 | `cron-job-engineer.md` | `cron-job-engineer.md` | Remove 5 specific job defs, `/api/developer/cron-debug/*`, URLs. Keep job registry pattern, distributed locking, quota gates, fail-open design. |
| 15 | `content-lifecycle-specialist.md` | `content-lifecycle-specialist.md` | Remove Instagram publishing refs, `marszal-arts.vercel.app`, table names. Keep state machine, processing locks, retry logic, bulk ops. |
| 16 | `media-pipeline-specialist.md` | `media-pipeline-specialist.md` | Remove 1080x1920/9:16 Instagram specs, specific storage buckets. Keep FFmpeg patterns, validation pipeline, perceptual hashing. |
| 17 | `analytics-engineer.md` | `analytics-engineer.md` | Remove Instagram Insights API, `v21.0`, `api_quota_history`, component paths. Keep dashboard patterns, metrics architecture, quota monitoring. |

---

## Post-Migration Verification

Run after all files are written:

```bash
# 1. File count (~50 expected)
find ~/.claude/{agents,commands,skills} -type f | wc -l

# 2. No project-specific leaks
grep -ri "instagram\|ISW-\|marszal-arts\|@www_hehe_pl\|oauth_tokens\|scheduled_posts\|meme_submissions" \
  ~/.claude/agents/ ~/.claude/commands/ ~/.claude/skills/
# Expected: zero matches

# 3. Valid YAML frontmatter on all agents
for f in ~/.claude/agents/*.md; do
  head -1 "$f" | grep -q "^---" || echo "MISSING frontmatter: $f"
done

# 4. Functional test: open a DIFFERENT project directory, verify agents/commands/skills load
# 5. Override test: open instagram-stories-webhook, verify project agents take precedence
```

---

## Global Text Replacement Reference

Apply to ALL remaining files:

| Find | Replace |
|------|---------|
| `ISW-XXX` or `ISW-\d+` | `TICKET-XXX` |
| `instagram-stories-webhook` | remove or `{project}` |
| `Instagram Stories Webhook` | remove or `{Project Name}` |
| `marszal-arts.vercel.app` | `your-app.vercel.app` |
| `@www_hehe_pl` | remove |
| `p.romanczuk@gmail.com` | remove |
| `BMS` (team name) | `{team}` |
| Specific tables (oauth_tokens, scheduled_posts, etc.) | remove |
| `graph.instagram.com`, `Meta Graph API` | "external API" |
| `FB_APP_SECRET`, `WEBHOOK_SECRET` | `{API_SECRET}`, `{WEBHOOK_SECRET}` |
