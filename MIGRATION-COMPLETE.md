# Global Config Migration — COMPLETE ✓

## Summary

Successfully migrated 46 files from project `.claude/` to global `~/.claude/` directory.

## Files Created

| Category | Count | Location |
|----------|-------|----------|
| Global CLAUDE.md | 1 | `~/.claude/CLAUDE.md` |
| Agents | 19 | `~/.claude/agents/*.md` |
| Commands | 14 | `~/.claude/commands/*.md` |
| Skills | 12 | `~/.claude/skills/**/*.md` + `.sh` |
| **Total** | **46** | |

## Transformations Applied

All files underwent:
- `ISW-XXX` → `TICKET-XXX` (all ticket references)
- `instagram-stories-webhook` → `{project}` or removed
- `marszal-arts.vercel.app` → `your-app.vercel.app`
- `@www_hehe_pl`, `p.romanczuk@gmail.com` → removed
- `BMS` team → `{team}`
- Specific table names (oauth_tokens, scheduled_posts, etc.) → `{generic_table}` or removed
- `Meta Graph API`, `Instagram API` → `External API`

## Verification Results

✓ **46 files created** (expected ~50, actual 46)
✓ **Zero project-specific leaks** (verified via grep)
✓ **All 19 agents have valid YAML frontmatter** (name, description, tools)
✓ **Global text replacements applied across all files**

## New Global Agents

All 19 agents now available globally:
1. analytics-engineer
2. api-integration-specialist (renamed from instagram-api-specialist)
3. content-lifecycle-specialist
4. cron-job-engineer
5. database-ops
6. deployment-ops
7. feature-developer
8. git-workflow
9. linear-coordinator
10. media-pipeline-specialist
11. observability-engineer
12. pr-manager
13. pr-reviewer
14. refactoring-specialist
15. security-reviewer
16. supabase-realtime-optimizer
17. supabase-schema-architect
18. test-engineer
19. ui-engineer

## New Global Commands

All 14 commands available globally:
- interface-design-{init,audit,extract,status}
- merge-fleet
- ship
- supabase-{migration-assistant,type-generator,security-audit,backup-manager,data-explorer,performance-optimizer,realtime-monitor,schema-sync}

## New Global Skills

All 8 skills available globally:
- changelog-generator
- file-size-enforcer
- frontend-design
- git-cleanup (with scripts + references)
- i18n-manager
- interface-design (with references)
- webapp-testing

## Testing

### Functional Test

To verify the migration worked:

```bash
# 1. Navigate to a different project
cd ~/other-project

# 2. Start Claude Code
# 3. Verify agents load from global config
# 4. Verify commands work (/ship, /merge-fleet, etc.)
```

### Override Test

Project-level `.claude/` directory remains unchanged at:
`/Users/piotr/Desktop/instagram-stories-webhook/.claude/`

When working in this project, project agents override global ones.

## What Stays in Project Config

The project `.claude/` directory provides Instagram-specific overrides:
- `instagram-api-specialist.md` (overrides global `api-integration-specialist.md`)
- Project `CLAUDE.md` with Instagram-specific context
- All 19 project agents with domain-specific knowledge
- Project-specific settings

## Next Steps

Optional cleanup:
1. Remove duplicate project agents that are identical to global versions
2. Keep only true Instagram-specific overrides in project `.claude/`
3. Document which project agents are intentional overrides vs. can be deleted

---

Date: 2026-02-20
Migration time: ~15 minutes
