## 🎯 Summary
<!-- Brief description of what this PR does -->

## 📋 Related Issue(s)
Fixes #[issue number]

## 🔍 Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update
- [ ] Performance improvement
- [ ] Refactoring
- [ ] Security enhancement

## 📝 Changes Made
<!-- Describe the changes in detail -->
-
-
-

## 🧪 Testing
<!-- How was this tested? -->
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] E2E tests added/updated
- [ ] Manual testing completed on: staging / production
- [ ] Edge cases tested

### Test Coverage
- New test files: (list files)
- Coverage impact: (before % → after %)

## 📚 Documentation
- [ ] Code comments added for non-obvious logic
- [ ] CLAUDE.md updated (if new patterns established)
- [ ] WORKFLOWS.md updated (if new workflow needed)
- [ ] README.md updated (if user-facing change)
- [ ] Inline documentation clear and complete

## 🔐 Security Checklist
Use [CLAUDE.md - Pre-Deployment Security Audit Checklist](../CLAUDE.md#pre-deployment-security-audit-checklist)

- [ ] No hardcoded secrets or credentials
- [ ] Input validation on user-provided data
- [ ] Authentication/authorization verified
- [ ] Database RLS policies correct (if applicable)
- [ ] Error responses don't leak sensitive info
- [ ] No breaking security changes
- [ ] Dependency audit passed (`npm audit`)

## 🎨 Code Quality
Use [CLAUDE.md - Code Review Guidelines](../CLAUDE.md#code-review-guidelines)

- [ ] Code follows project style (see CLAUDE.md)
- [ ] No `any` types; proper TypeScript
- [ ] Functions keep SRP (Single Responsibility)
- [ ] No unnecessary complexity
- [ ] DRY principle followed (no code duplication)
- [ ] Linting passes: `npm run lint`

## 📊 Performance
- [ ] No N+1 database queries
- [ ] No memory leaks (cleanup in useEffect)
- [ ] No unnecessary re-renders (useCallback/useMemo)
- [ ] Bundle size impact: negligible / minimal / needs review
- [ ] Database migration performance tested (if applicable)

## 🚀 Deployment Notes
<!-- Any special deployment considerations? -->

### Breaking Changes
<!-- If any, describe migration path for users -->

### Database Migrations
<!-- If applicable, reference migration file and rollback plan -->

### Environment Variables
<!-- If new env vars needed, list them and defaults -->

## ✅ Reviewer Checklist
<!-- For reviewers to verify -->

- [ ] Code changes are well-explained
- [ ] Tests are comprehensive and meaningful
- [ ] No security vulnerabilities introduced
- [ ] Performance implications understood
- [ ] Documentation is clear and complete
- [ ] Breaking changes properly documented

## 🔗 Related Workflows
Relevant workflows from [WORKFLOWS.md](../WORKFLOWS.md):
- [ ] Pre-Deployment Security Audit (before merge)
- [ ] Add Comprehensive Tests for Feature (if new feature)
- [ ] Create & Deploy Database Migration (if DB changes)
- [ ] Implement Feature Flag Rollout (if needs staged rollout)

## 📸 Screenshots (if applicable)
<!-- Add screenshots of UI changes -->

## 🎓 Context for Reviewer
<!-- Any additional context that helps review? -->

---

**PR Author**: @
**Assigned Reviewers**: @
**Status**: 🟡 Ready for Review / 🔴 Draft / 🟢 Approved
