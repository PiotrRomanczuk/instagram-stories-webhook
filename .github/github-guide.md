# GitHub Issue & PR Guide

This guide explains how to use GitHub issues and pull requests effectively with the project's documentation and workflows.

## 📋 Issue Templates

When creating a new issue, choose the appropriate template:

### 1. 🐛 [Bug Report](.github/ISSUE_TEMPLATE/01-bug-report.md)
Use for reporting bugs, unexpected behavior, or errors.

**Best for**:
- "This feature isn't working"
- "I got an error when I..."
- "This behaves differently than expected"

**Related documentation**: Common Debugging Tasks in CLAUDE.md

---

### 2. ✨ [Feature Request](.github/ISSUE_TEMPLATE/02-feature-request.md)
Use for proposing new features or enhancements.

**Best for**:
- "We should add..."
- "It would be useful if..."
- New capability suggestions

**Related documentation**: Feature Flags & A/B Testing in CLAUDE.md

---

### 3. 🗄️ [Database Schema Change](.github/ISSUE_TEMPLATE/03-database-schema.md)
Use for any database modifications (columns, tables, indexes, RLS policies).

**Best for**:
- "I need to add a column to..."
- "We need to optimize this query with an index"
- "The RLS policy for X needs to change"

**Related workflow**: "Create & Deploy Database Migration" in WORKFLOWS.md

**Key sections in CLAUDE.md**:
- Database Schema & Relationships
- Database Migrations
- Performance Profiling (for index decisions)

---

### 4. ⚡ [Performance Issue](.github/ISSUE_TEMPLATE/04-performance.md)
Use for reporting slow endpoints/components or optimization opportunities.

**Best for**:
- "This page loads slowly"
- "The API endpoint is timing out"
- "We should optimize this query"

**Related workflow**: "Optimize Slow API Endpoint" in WORKFLOWS.md

---

### 5. 🚨 [Production Incident](.github/ISSUE_TEMPLATE/05-production-incident.md)
Use for critical production issues requiring immediate attention.

**Best for**:
- Service is down
- Data loss occurring
- Widespread user impact

**Related workflow**: "Handle Critical Production Issue" in WORKFLOWS.md

**Key sections in CLAUDE.md**:
- Troubleshooting Decision Tree
- Monitoring & Alerting Strategy

---

### 6. 📚 [Documentation](.github/ISSUE_TEMPLATE/06-documentation.md)
Use for documentation improvements or clarifications.

**Best for**:
- "CLAUDE.md should explain..."
- "We need a workflow for..."
- "The README is unclear about..."

---

### 7. ❓ [Question / Support](.github/ISSUE_TEMPLATE/07-question.md)
Use for asking questions about the codebase or requesting help.

**Best for**:
- "How do I debug this?"
- "What's the pattern for...?"
- "I'm stuck on..."

**Links to**:
- CLAUDE.md sections
- WORKFLOWS.md playbooks
- Similar code examples

---

## 🔄 Pull Request Template

All PRs should use the [Pull Request Template](.github/pull_request_template.md).

### Key Sections

**1. Summary** - What does this PR do?

**2. Related Issues** - Link the issue(s) it fixes

**3. Type of Change** - Bug fix? Feature? Performance?

**4. Testing** - How was this tested?
- Unit tests added?
- E2E tests?
- Manual testing on staging?

**5. Security Checklist** - Verify all security requirements
Reference: [Pre-Deployment Security Audit Checklist](../CLAUDE.md#pre-deployment-security-audit-checklist)

**6. Code Quality** - Follow project standards
Reference: [Code Review Guidelines](../CLAUDE.md#code-review-guidelines)

**7. Related Workflows** - Which workflows apply?

### PR Review Process

**Reviewer responsibilities**:
1. ✅ Verify tests pass (unit + E2E)
2. ✅ Check security checklist
3. ✅ Verify code follows patterns in CLAUDE.md
4. ✅ Ensure documentation is clear
5. ✅ Approve and request changes as needed

**Before merging to main**:
- [ ] Pre-Deployment Security Audit Checklist completed (see CLAUDE.md)
- [ ] All reviewers approved
- [ ] Tests passing
- [ ] No merge conflicts

---

## 🚀 Workflow Integration

### When creating an issue, consider which workflow applies:

| What You're Doing | Issue Template | Workflow |
|---|---|---|
| Reporting a bug | Bug Report | Various (see issue description) |
| Proposing a feature | Feature Request | Add Comprehensive Tests for Feature |
| Modifying database | Database Schema | Create & Deploy Database Migration |
| Slow endpoint | Performance | Optimize Slow API Endpoint |
| Production down | Incident | Handle Critical Production Issue |
| Need help | Question | Check CLAUDE.md / WORKFLOWS.md |

### When creating a PR:

1. **Before starting**: Read relevant section in CLAUDE.md or workflow in WORKFLOWS.md
2. **While coding**: Follow patterns documented in CLAUDE.md
3. **Before submitting PR**: Complete PR template checklist
4. **Before merging**: Complete Pre-Deployment Security Audit Checklist
5. **After merging**: Monitor for issues

---

## 💡 Tips for Effective Issues & PRs

### Issue Title Format
```
[CATEGORY] Brief description
[BUG] Auth tokens not refreshing
[FEATURE] Add scheduled post analytics
[DB] Add priority column to posts
[PERF] Optimize email_whitelist lookup
[INCIDENT] Publishing endpoint returning 503
```

### Good Issue Description
1. Clear problem statement
2. Steps to reproduce (for bugs)
3. Expected vs actual behavior
4. Environment details
5. Links to relevant docs/code

### Good PR Description
1. Clear summary of changes
2. Link to issue(s) being fixed
3. Testing performed
4. Breaking changes (if any)
5. Security implications (if any)

### Asking for Help
- Search existing issues first
- Check CLAUDE.md and WORKFLOWS.md
- Use Question template
- Provide context and what you've tried

---

## 🔗 Quick Links

**Documentation**:
- [CLAUDE.md](../CLAUDE.md) - Development guide & patterns
- [WORKFLOWS.md](../WORKFLOWS.md) - Task playbooks
- [README.md](../README.md) - Project overview

**Templates**:
- [Issue Templates](.github/ISSUE_TEMPLATE/)
- [PR Template](.github/pull_request_template.md)
- [This Guide](.github/github-guide.md)

---

## 📞 Support

- **General questions**: Use [Question template](.github/ISSUE_TEMPLATE/07-question.md)
- **Bugs**: Use [Bug Report template](.github/ISSUE_TEMPLATE/01-bug-report.md)
- **Documentation issues**: Use [Documentation template](.github/ISSUE_TEMPLATE/06-documentation.md)

**For urgent production issues**: Create [Production Incident](.github/ISSUE_TEMPLATE/05-production-incident.md) and notify team immediately.
