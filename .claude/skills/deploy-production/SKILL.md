# Deploy to Production

**Trigger**: `/deploy-production` or `/deploy` or `/prod`

**Description**: Complete production deployment workflow - creates release tag, triggers production E2E tests, and verifies deployment.

---

## What This Skill Does

Handles the full production deployment workflow after a PR has been merged to `master`:

1. **Pre-flight checks**
   - Verify current branch is `master`
   - Verify working tree is clean
   - Pull latest changes from origin

2. **Quality verification**
   - Run lint checks
   - Run TypeScript compilation
   - Run unit/integration tests (optional - can skip if already verified)

3. **Release tagging**
   - Create git tag using `npm run release`
   - Push tag to GitHub (triggers GitHub release)

4. **Production E2E tests** (optional)
   - Trigger production E2E workflow via GitHub Actions
   - Wait for workflow to complete (with timeout)

5. **Deployment verification**
   - Check Vercel production deployment status
   - Verify production URL is accessible
   - Run smoke tests against production

---

## Usage

### Basic Usage (Default) - Comprehensive Verification
```bash
/deploy
```
Runs all quality gates, creates release tag, triggers production E2E tests, **waits for completion** (~15-20 min).

### Fast Mode - Don't Wait for E2E
```bash
/deploy --no-wait
```
Triggers E2E tests but continues without waiting (~5-7 min). E2E results can be monitored separately.

### Skip Tests - Fastest
```bash
/deploy --skip-tests
```
Creates release tag only, skips E2E workflow trigger entirely (~2-3 min).

### Smoke Tests Only
```bash
/deploy --smoke-only
```
Creates release tag, skips full E2E suite, runs only production smoke tests (~4-5 min).

---

## Prerequisites

- ✅ PR already merged to `master`
- ✅ Version already bumped in `package.json` (via `/ship`)
- ✅ All CI checks passing on `master`
- ✅ No uncommitted changes

---

## Workflow Steps

### Step 1: Pre-flight Checks
```bash
# Verify on master branch
git branch --show-current
# Expected: master

# Verify clean working tree
git status --short
# Expected: empty (no changes)

# Pull latest changes
git pull origin master
```

### Step 2: Quality Gates (Optional)
```bash
# Run linting
npm run lint

# Run TypeScript compilation
npx tsc

# Run unit/integration tests
npm run test
```

### Step 3: Create Release Tag
```bash
# Create and push git tag (triggers GitHub release)
npm run release

# Expected output:
# - Tag created (e.g., v0.24.0)
# - Tag pushed to origin
# - GitHub release created
```

### Step 4: Trigger Production E2E (Optional)
```bash
# Trigger production E2E workflow via GitHub CLI
gh workflow run e2e-production.yml

# Wait for workflow to complete (optional)
gh run watch
```

### Step 5: Verify Production Deployment
```bash
# Check Vercel deployment status
vercel inspect --prod

# Verify production URL is accessible
curl -I https://instagram-stories-webhook.vercel.app/api/health

# Run production smoke tests
VERCEL_ENV=production npx playwright test production-smoke.spec.ts
```

---

## Success Criteria

All of these must pass for successful production deployment:

- [ ] Current branch is `master`
- [ ] Working tree is clean
- [ ] All quality gates pass (if not skipped)
- [ ] Git tag created and pushed successfully
- [ ] GitHub release created
- [ ] Production E2E workflow triggered (if not skipped)
- [ ] Production E2E tests pass (if triggered)
- [ ] Production URL returns 200 OK
- [ ] Production smoke tests pass

---

## Error Handling

### Error: Not on master branch
**Solution**: Switch to master first
```bash
git checkout master
```

### Error: Uncommitted changes
**Solution**: Commit or stash changes
```bash
git stash
# or
git add . && git commit -m "chore: cleanup before release"
```

### Error: No version bump detected
**Solution**: Version was not bumped in the PR
```bash
# Manually bump if needed (rare)
npm version patch --no-git-tag-version
git add package.json package-lock.json
git commit -m "chore: bump version"
git push origin master
```

### Error: Production E2E tests fail
**Solution**: Investigate failures, fix, and re-run
```bash
# View failed test details
gh run view --log-failed

# Fix issues and re-run
gh workflow run e2e-production.yml
```

### Error: Vercel deployment failed
**Solution**: Check Vercel dashboard and logs
```bash
# Check deployment logs
vercel logs --prod

# Rollback if needed
vercel rollback
```

---

## Rollback Procedure

If production deployment fails:

1. **Delete the release tag** (if created)
   ```bash
   git tag -d v0.24.0
   git push origin :refs/tags/v0.24.0
   ```

2. **Rollback Vercel deployment** (if needed)
   ```bash
   vercel rollback
   ```

3. **Create hotfix branch** (if needed)
   ```bash
   git checkout -b hotfix/production-issue
   # Fix the issue
   # Follow normal PR workflow
   ```

---

## Environment Variables

The skill uses these environment variables:

- `VERCEL_ENV=production` - Set for production verification
- `ENABLE_REAL_IG_TESTS=true` - Enable real Instagram API tests
- `ENABLE_LIVE_IG_PUBLISH=true` - Enable live publishing tests

---

## GitHub Actions Integration

This skill integrates with the following workflows:

- `.github/workflows/e2e-production.yml` - Production E2E tests
- Vercel deployment (automatic on push to master)
- GitHub Releases (automatic on tag push)

---

## Timing Expectations

| Step | Duration | Can Skip? |
|------|----------|-----------|
| Pre-flight checks | <1 min | No |
| Quality gates | 2-3 min | Yes (--skip-tests) |
| Create release tag | <1 min | No |
| Trigger E2E workflow | <1 min | Yes (--skip-tests) |
| Wait for E2E completion | 10-12 min | Yes (--no-wait) |
| Verify deployment | 1-2 min | No |
| **Total (default)** | **15-20 min** | - |
| **Total (--no-wait)** | **5-7 min** | - |
| **Total (--skip-tests)** | **2-3 min** | - |

---

## Examples

### Example 1: Standard Production Deployment (Default - Comprehensive)
```bash
# After PR merged to master
git checkout master
git pull

# Deploy to production (waits for E2E completion)
/deploy

# Output:
# ✅ On master branch
# ✅ Working tree clean
# ✅ Latest changes pulled
# ✅ Quality gates passed
# ✅ Git tag v0.24.0 created
# ✅ Tag pushed to GitHub
# ✅ GitHub release created
# ✅ Production E2E workflow triggered
# 🔄 Workflow running (ID: 123456789)
# ⏳ Waiting for completion (~10 min)...
# ✅ Production E2E tests passed (113/113)
# ✅ Production URL responding (200 OK)
# ✅ Deployment complete! 🚀
```

### Example 2: Fast Deployment (Don't Wait for E2E)
```bash
# Deploy quickly, trigger E2E but don't wait
/deploy --no-wait

# Output:
# ✅ On master branch
# ✅ Working tree clean
# ✅ Quality gates passed
# ✅ Git tag v0.24.0 created
# ✅ Tag pushed to GitHub
# ✅ Production E2E workflow triggered (ID: 123456789)
# ℹ️  View at: https://github.com/.../actions/runs/123456789
# ⏭️  Not waiting for completion (monitor manually)
# ✅ Production URL responding (200 OK)
# ✅ Deployment complete! 🚀
```

### Example 3: Fastest Deployment (Skip E2E Entirely)
```bash
# Deploy without any E2E tests
/deploy --skip-tests

# Output:
# ✅ On master branch
# ✅ Working tree clean
# ✅ Git tag v0.24.0 created
# ✅ Tag pushed to GitHub
# ✅ Production URL responding (200 OK)
# ⚠️  E2E tests skipped (run manually if needed)
# ✅ Deployment complete! 🚀
```

### Example 3: Smoke Tests Only
```bash
# Deploy with quick smoke tests only
/deploy --smoke-only

# Output:
# ✅ On master branch
# ✅ Git tag v0.24.0 created
# ✅ Running production smoke tests...
# ✅ Smoke tests passed (6/6)
# ✅ Deployment complete! 🚀
```

---

## Post-Deployment Checklist

After successful deployment:

- [ ] Verify production URL: https://instagram-stories-webhook.vercel.app
- [ ] Check `/api/health` endpoint
- [ ] Monitor Sentry for errors (first 15 minutes)
- [ ] Check Vercel Analytics for traffic
- [ ] Verify scheduled cron jobs execute properly
- [ ] Monitor Instagram API usage quotas
- [ ] Update Linear issues with "Released in v0.X.X" comments

---

## Integration with /ship

This skill complements the `/ship` skill:

1. **During PR**: Use `/ship` to create PR, run preview E2E, update Linear
2. **After merge**: Use `/deploy` to create release tag and deploy to production

**Workflow**:
```
/ship → PR created → Merge PR → /deploy → Production released
```

---

## Notes

- This skill assumes version was already bumped during `/ship` workflow
- Production E2E tests use REAL Instagram API - check rate limits
- Scheduled production E2E runs daily at 2 AM UTC (separate from manual trigger)
- GitHub release is automatically created when tag is pushed
- Vercel deploys automatically when master is updated
- This skill just coordinates the release tagging and verification

---

## Related Skills

- `/ship` - Create PR with version bump, tests, and Linear updates
- `/merge-fleet` - Bulk merge PRs with CI fixes

---

## See Also

- `.github/workflows/e2e-production.yml` - Production E2E workflow
- `scripts/release.sh` - Release tagging script
- `CLAUDE.md` - Project versioning guidelines
