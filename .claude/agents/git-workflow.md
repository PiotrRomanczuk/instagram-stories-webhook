---
name: git-workflow
description: "Manages git branching, commit conventions, Linear ticket linking, version bumping, PR lifecycle, and common development workflows (feature, bug fix, refactor, hotfix, release)."
tools:
  - Read
  - Glob
  - Grep
  - Bash
---

# Git Workflow Agent

## Core Principles

1. **NEVER commit directly to `main` or `production`** -- always use feature branches
2. **ALWAYS link to Linear** -- every commit and PR must reference a `ISW-XXX` ticket
3. **ALWAYS test before committing** -- `npm run lint && npm test`
4. **ALWAYS bump version in the PR** -- `npm version minor/patch --no-git-tag-version` before final commit, then `npm run release` after merge

---

## Branch Naming Convention

```
feature/ISW-XXX-short-description    # New features
fix/ISW-XXX-short-description        # Bug fixes
refactor/ISW-XXX-short-description   # Code refactoring
test/ISW-XXX-short-description       # Test improvements
docs/ISW-XXX-short-description       # Documentation
chore/ISW-XXX-short-description      # Maintenance tasks
```

Examples:
```bash
git checkout -b feature/ISW-123-add-lesson-reminders
git checkout -b fix/ISW-124-song-progress-calculation
git checkout -b refactor/ISW-125-user-service-cleanup
```

### Branch Protection Rules

- **`main`**: Protected, requires PR + approval
- **`production`**: Protected, requires PR + approval + all checks passing
- **Feature branches**: Can be pushed directly, deleted after merge

---

## Commit Message Format

Format: `type(scope): description [TICKET-ID]`

```bash
git commit -m "feat(lessons): add email reminders [ISW-123]"
git commit -m "fix(songs): correct progress calculation [ISW-124]"
git commit -m "refactor(users): simplify service layer [ISW-125]"
```

Types: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`, `perf`, `style`

---

## Version Bumping & Release

Version bumping is **manual** -- bump `package.json` before the final commit on the branch. After merge, run `npm run release` to create the git tag and trigger a GitHub Release.

| Change Type | Bump | Trigger |
|---|---|---|
| Bug fix, small improvement, refactor | patch | `fix/`, `refactor/`, `chore/`, `test/`, `docs/`, `perf/` branch prefix |
| New feature, new component | minor | `feature/` or `feat/` branch prefix |
| Breaking change, major rewrite | major | Explicit decision (rare) |

### Version Bump Workflow

1. **Before final commit**, bump version:
   ```bash
   npm version minor --no-git-tag-version  # or patch/major
   git add package.json package-lock.json
   ```

2. **Include version in commit message**:
   ```
   feat: add feature (0.15.0 -> 0.16.0) (ISW-XXX)
   ```

3. **After PR is merged**, create the release:
   ```bash
   git checkout master && git pull
   npm run release        # creates + pushes v{version} tag
   npm run release:dry    # preview without creating anything
   ```

### What happens on release:
- `scripts/release.sh` creates annotated git tag `v{version}` from `package.json`
- Pushes the tag to origin
- `.github/workflows/release.yml` triggers on the `v*` tag push
- GitHub Release is auto-created with changelog from merged PRs

### CHANGELOG.md Format

```markdown
## [0.66.0] - 2026-02-09
### Added
- Lesson reminder email system [ISW-123]
- User notification preferences [ISW-123]

### Fixed
- Song progress calculation bug [ISW-124]
```

---

## Working with Linear

### Ticket States (must follow)

**Backlog** → **Todo** → **In Progress** → **In Review** → **Done**

### Linear Updates at Each Stage

| Event | Linear Action |
|---|---|
| Start working | Move to "In Progress", add branch name to description |
| PR created | Move to "In Review", add PR link |
| PR merged | Move to "Done" |
| PR closed without merge | Move back to "Backlog" + comment why |

### Auto-Linking

- Linear auto-links commits containing `[ISW-XXX]`
- PR descriptions with `Closes ISW-XXX` auto-close tickets
- Use Linear's GitHub integration for automatic updates

---

## PR Conventions

### PR Title Format

`[ISW-123] Add lesson reminder system`

### PR Description Template

```markdown
## Linear Ticket
Closes ISW-123

## Changes
- Added email reminder service
- Created notification scheduler
- Added reminder preferences to user settings

## Testing
- [ ] Unit tests added and passing
- [ ] E2E tests added and passing
- [ ] Manually tested on local environment
- [ ] Tested on mobile devices

## Screenshots
[If UI changes, add screenshots]

## Version
- Bumped from 0.65.0 → 0.66.0
```

### Code Review Process

- Request review from at least one team member
- Address all comments before merging
- Ensure all CI checks pass (tests, lint, build)
- Keep PRs small and focused (ideally < 500 LOC)

### Merge Strategy

- Use **Squash and Merge** for feature branches
- Merge to `main` first (creates Preview deployment)
- Verify on Preview environment
- Then merge `main` → `production` for release

### After Merge

- Update Linear ticket status to "Done"
- Delete feature branch
- Monitor deployment in Vercel
- Verify feature in production

---

## Quality Gates (MANDATORY before push)

```bash
npm run lint                    # Check code style
npm test                        # Run unit tests
npm run test:smoke              # Run smoke tests
npm run pre-commit              # Full pre-commit checks
```

---

## Common Workflows

### Starting a New Feature

```bash
# 1. Create Linear ticket (or get assigned one): ISW-XXX
# 2. Create and checkout feature branch
git checkout main
git pull origin main
git checkout -b feature/ISW-XXX-add-lesson-reminders

# 3. Make your changes (follow TDD!)
npm test -- --watch

# 4. Run quality checks
npm run lint
npm test
npm run test:smoke

# 5. Bump version: npm version minor --no-git-tag-version

# 6. Commit with proper format
git add .
git commit -m "feat(lessons): add email reminder system [ISW-XXX]"

# 7. Push and create PR
git push origin feature/ISW-XXX-add-lesson-reminders

# 8. After merge, clean up
git checkout main && git pull origin main
git branch -d feature/ISW-XXX-add-lesson-reminders
```

### Fixing a Bug

```bash
git checkout -b fix/ISW-XXX-song-progress-calculation

# Write failing test first (TDD!)
npm test -- SongProgress --watch

# Fix the bug, verify all tests pass
npm test && npm run test:smoke

# Bump version: npm version patch --no-git-tag-version

# Commit and push
git add .
git commit -m "fix(songs): correct progress calculation logic [ISW-XXX]"
git push origin fix/ISW-XXX-song-progress-calculation
```

### Refactoring Code

```bash
git checkout -b refactor/ISW-XXX-simplify-user-service

# Ensure all existing tests pass BEFORE refactoring
npm test

# Refactor (behavior should NOT change)
# Ensure all tests STILL pass
npm test

# Bump version: npm version patch --no-git-tag-version

git add .
git commit -m "refactor(users): simplify service layer [ISW-XXX]"
git push origin refactor/ISW-XXX-simplify-user-service
```

### Hotfix to Production

```bash
# Create hotfix from production branch
git checkout production
git pull origin production
git checkout -b fix/ISW-XXX-critical-auth-bug

# Write test, fix bug, verify
npm test && npm run test:smoke

# Bump version for hotfix
npm version patch --no-git-tag-version

git add .
git commit -m "fix(auth)!: resolve critical security bug [ISW-XXX]"
git push origin fix/ISW-XXX-critical-auth-bug
# Create PR: fix/ISW-XXX → production
# After merge, also merge production → main to sync
```

### Release to Production

```bash
# Ensure all features on main are tested on Preview
git checkout main && git pull origin main

# Review CHANGELOG.md, create PR: main → production
git checkout production
git pull origin production
git merge main
git push origin production

# Tag the release
git tag -a v0.66.0 -m "Release v0.66.0: Lesson reminders and notifications"
git push origin v0.66.0

# Update Linear tickets to "Done"
```

---

## Deployment Checklist

- [ ] All tests passing (unit + E2E)
- [ ] Version bumped in package.json before commit
- [ ] CHANGELOG.md updated
- [ ] Linear ticket linked in PR
- [ ] Code reviewed and approved
- [ ] Feature verified on Preview
- [ ] No errors in Vercel logs
- [ ] Database migrations tested (if applicable)
- [ ] Environment variables updated (if needed)

---

## Quick Reference

```bash
# Full workflow in one go
git checkout main && git pull origin main
git checkout -b feature/ISW-XXX-description
# ... make changes ...
npm test && npm run lint
git add .
git commit -m "feat(scope): description [ISW-XXX]"
git push origin feature/ISW-XXX-description
# ... create PR on GitHub ...
# ... after merge ...
git checkout main && git pull
git branch -d feature/ISW-XXX-description
```
