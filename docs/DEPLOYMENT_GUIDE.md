# Preview Deployment Layer - Deployment Guide

## Overview

The preview deployment layer has been successfully implemented! This guide will help you complete the deployment and start using the new three-tier system.

## ✅ What's Been Implemented

### Code Changes
- ✅ **Preview Guard Utility** (`lib/preview-guard.ts`) - Prevents writes on preview deployments
- ✅ **Cron Guards** - Added to 5 cron routes to disable on preview deployments
- ✅ **Staging E2E Workflow** (`.github/workflows/staging-e2e.yml`) - Full E2E tests on staging
- ✅ **Production Deployment Workflow** (`.github/workflows/deploy.yml`) - Gates + auto-rollback
- ✅ **E2E Workflow Triggers** - Updated to run on staging PRs instead of main
- ✅ **Staging Playwright Config** (`playwright.config.staging.ts`) - For deployed tests
- ✅ **Production Smoke Test** - Already exists from previous work

### Git
- ✅ Staging branch created locally
- ✅ All changes committed to staging branch
- ⚠️ **Not yet pushed** (GitHub OAuth scope issue - see below)

---

## 🚀 Deployment Steps

### Step 1: Push Changes to GitHub

**Issue**: The current git authentication doesn't have `workflow` scope permission, which is required to push workflow file changes.

**Options**:

**A. Use GitHub CLI (Recommended)**
```bash
cd ~/Desktop/instagram-stories-webhook

# Authenticate with workflow scope
gh auth login --scopes workflow

# Push staging branch
git push -u origin staging

# Push master branch (with test fixes)
git checkout master
git push origin master
```

**B. Use SSH Authentication**
```bash
# If you have SSH keys set up
git remote set-url origin git@github.com:PiotrRomanczuk/instagram-stories-webhook.git
git push -u origin staging
git push origin master
```

**C. Push via GitHub Web UI**
```bash
# Create a patch file
git format-patch origin/master --stdout > deployment-layer.patch

# Upload this patch to GitHub as a new PR manually
```

---

### Step 2: Configure Vercel Environment Variables

Run these commands to set up environment variables for preview and staging deployments:

```bash
# Install Vercel CLI (if not already installed)
npm install -g vercel

# Link to your Vercel project
cd ~/Desktop/instagram-stories-webhook
vercel link

# Configure PREVIEW deployments (all branches except staging)
vercel env add DISABLE_CRON preview
# When prompted, enter: true

vercel env add PREVIEW_MODE preview
# When prompted, enter: true

vercel env add ENABLE_LIVE_IG_PUBLISH preview
# When prompted, enter: false

# Configure STAGING branch (override preview defaults)
vercel env add STAGING_MODE preview staging
# When prompted, enter: true

vercel env add DISABLE_CRON preview staging
# When prompted, enter: false

vercel env add ENABLE_REAL_IG_TESTS preview staging
# When prompted, enter: true

vercel env add ENABLE_LIVE_IG_PUBLISH preview staging
# When prompted, enter: true
```

**Verify Configuration**:
```bash
vercel env ls
```

You should see:
- Preview env: `DISABLE_CRON=true`, `PREVIEW_MODE=true`, `ENABLE_LIVE_IG_PUBLISH=false`
- Staging preview env: `STAGING_MODE=true`, `DISABLE_CRON=false`, etc.

---

### Step 3: Set Up GitHub Branch Protection Rules

Go to GitHub: **Settings → Branches**

#### For `staging` Branch:
1. Click "Add rule"
2. Branch name pattern: `staging`
3. Enable:
   - ✅ Require a pull request before merging
   - ✅ Require status checks to pass before merging
     - Select: `CI`, `E2E Tests`
   - ✅ Require approvals: 1
   - ✅ Dismiss stale pull request approvals when new commits are pushed
4. Save changes

#### For `main` / `master` Branch:
1. Click "Add rule" (or edit existing)
2. Branch name pattern: `master` (or `main`)
3. Enable:
   - ✅ Require a pull request before merging
   - ✅ Require status checks to pass before merging
     - Select: `Verify From Staging`, `Quality Gates`
   - ✅ Require approvals: 1 (from admin)
   - ✅ Restrict who can push to matching branches
     - Add: Administrators only
4. Save changes

---

### Step 4: Verify Secrets in GitHub

Go to GitHub: **Settings → Secrets and variables → Actions**

Ensure these secrets exist:
- `VERCEL_TOKEN` - Vercel deployment token
- `VERCEL_ORG_ID` - Your Vercel organization ID
- `VERCEL_PROJECT_ID` - Your Vercel project ID
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anon key
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key
- `NEXTAUTH_SECRET` - NextAuth secret

If any are missing, add them now.

---

### Step 5: Test the New Workflow

#### Test Preview Deployment
```bash
# Create a test feature branch
git checkout -b feature/test-deployment

# Make a small change (e.g., add a comment to a file)
echo "// Test comment" >> lib/preview-guard.ts

# Commit and push
git add -A
git commit -m "test: verify preview deployment"
git push -u origin feature/test-deployment
```

**Expected Behavior**:
- Vercel automatically deploys to preview URL
- Cron jobs are DISABLED (verify by checking `/api/cron/process` - should return `skipped: true`)
- Publishing is DISABLED
- No CI workflows run (preview only)

#### Test Staging Deployment
```bash
# Create PR to staging
gh pr create --base staging --head feature/test-deployment \
  --title "Test deployment layer" \
  --body "Testing the new preview deployment layer"
```

**Expected Behavior**:
- CI workflow runs (lint, test, typecheck)
- Staging E2E workflow runs:
  1. Deploys to Vercel preview
  2. Waits 60s for deployment
  3. Runs full E2E test suite with REAL Instagram
  4. Tests take ~20-30 minutes (live publishing)
- If all pass, you can merge the PR

#### Test Production Deployment
```bash
# Create PR from staging to master
gh pr create --base master --head staging \
  --title "Release: preview deployment layer" \
  --body "Deploying the new three-tier deployment system"
```

**Expected Behavior**:
1. **Gate 1**: Verify merged from staging ✓
2. **Gate 2**: Quality gates (lint, tsc, tests) ✓
3. **Deploy**: Production deployment to stories-webhook.vercel.app
4. **Gate 3**: Smoke tests (5-minute critical path tests)
5. **Rollback**: If smoke tests fail, auto-rollback to previous version

---

## 🎯 New Developer Workflow

### For Feature Development
```bash
# 1. Create feature branch from master
git checkout master
git pull origin master
git checkout -b feature/my-feature

# 2. Develop and test locally
npm run dev
npm run test

# 3. Push to create preview deployment
git push origin feature/my-feature

# 4. Create PR to staging (not master!)
gh pr create --base staging --title "feat: my feature"

# 5. Wait for CI + Staging E2E tests (~25 min)
# 6. Merge after approval
```

### For Production Release
```bash
# 1. Create PR from staging to master
gh pr create --base master --head staging \
  --title "Release: v1.2.3" \
  --body "Production release with features X, Y, Z"

# 2. Request admin approval (required by branch protection)

# 3. Merge (triggers production deployment)
gh pr merge --admin

# 4. Monitor deployment
vercel logs --prod --follow

# 5. Verify smoke tests pass (automatic)
# 6. If fails → auto-rollback (automatic)
```

---

## 📊 Environment Comparison

| Environment | Branch | Cron Jobs | Publishing | E2E Tests | Duration |
|-------------|--------|-----------|------------|-----------|----------|
| **Preview** | feature/* | ❌ OFF | ❌ OFF | ❌ Skip | ~5 min |
| **Staging** | staging | ✅ ON | ✅ ON | ✅ Full Suite | ~25 min |
| **Production** | master | ✅ ON | ✅ ON | ✅ Smoke Only | ~10 min |

---

## 🔍 Verification Checklist

After completing all steps, verify:

- [ ] Staging branch exists on GitHub
- [ ] Master branch has latest test fixes
- [ ] Vercel environment variables configured
- [ ] GitHub branch protection rules set
- [ ] GitHub secrets exist
- [ ] Preview deployment works (cron disabled)
- [ ] Staging deployment works (E2E tests pass)
- [ ] Production deployment workflow configured
- [ ] Smoke tests work
- [ ] Auto-rollback tested (optional)

---

## 🐛 Troubleshooting

### Preview Cron Not Disabled
**Symptom**: Cron jobs run on preview deployments

**Solution**:
```bash
# Verify Vercel env vars
vercel env ls

# Should show DISABLE_CRON=true for preview
# If not, add it:
vercel env add DISABLE_CRON preview
# Enter: true
```

### Staging E2E Tests Fail
**Symptom**: E2E tests fail on staging deployment

**Check**:
1. Instagram tokens valid in Supabase `oauth_tokens` table
2. `ENABLE_REAL_IG_TESTS=true` in staging workflow
3. Preview URL is accessible (wait 60s after deploy)
4. No rate limiting from Instagram

### Production Deployment Blocked
**Symptom**: Cannot merge PR to master

**Solution**:
1. Verify merged from staging (not a direct PR)
2. Check all status checks passed
3. Request admin approval if required

### Auto-Rollback Not Working
**Symptom**: Smoke tests fail but no rollback

**Check**:
1. Verify `VERCEL_TOKEN` secret has correct permissions
2. Check `vercel ls --prod` shows previous deployments
3. Review GitHub Actions logs for rollback job

---

## 📝 Next Steps

1. **Push changes to GitHub** (see Step 1)
2. **Configure Vercel env vars** (see Step 2)
3. **Set up branch protection** (see Step 3)
4. **Test the workflow** (see Step 5)
5. **Update team documentation** with new workflow
6. **Train team members** on new deployment process

---

## 🎉 Benefits

- **Safety**: No accidental production deployments
- **Testing**: Full E2E tests before production
- **Rollback**: Automatic on failure
- **Isolation**: Cron jobs disabled on preview
- **Visibility**: Clear status checks and gates
- **Control**: Admin approval required for production

---

## 📚 Additional Resources

- **Vercel Docs**: https://vercel.com/docs/deployments/environments
- **GitHub Branch Protection**: https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches
- **Playwright CI**: https://playwright.dev/docs/ci

---

**Need Help?**
- Check the plan file: `/home/piotr/.claude/projects/-home-piotr/c94a26bb-b34e-4703-806a-a715153e7998.jsonl`
- Review commit history: `git log --oneline`
- Check workflow runs: GitHub Actions tab

Happy Deploying! 🚀
