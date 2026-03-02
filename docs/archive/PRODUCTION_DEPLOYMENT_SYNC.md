# Production Deployment Sync Guide

**Issue**: Production site is out of sync with latest local changes

---

## 🚨 Current Situation

### Production Deployment
- **Last Deployed**: ~15 hours ago (Feb 5, 00:51 UTC)
- **URL**: https://stories-webhook.vercel.app
- **Status**: ⚠️ Out of date

### Local Code
- **Latest Commit**: Feb 5, 15:37 (today)
- **Changes Since Deploy**:
  - Video publishing E2E tests
  - Production testing configuration
  - User whitelist management
  - Multiple bug fixes and improvements

**Gap**: ~15 hours of changes NOT in production

---

## ⚠️ Why This Matters for Testing

### Tests Will Fail If:

1. **New Features Not Deployed**
   - Production doesn't have video upload UI changes
   - New API endpoints missing
   - Database migrations not applied

2. **Test Expectations Mismatch**
   - Tests expect new components that don't exist yet
   - Tests use new API routes not deployed
   - UI selectors changed but production has old UI

3. **Environment Variables Missing**
   - New env vars in .env.local not in Vercel
   - Feature flags not enabled in production

---

## ✅ Solution Options

### Option 1: Deploy Latest Changes First (Recommended)

**Step 1: Verify everything works locally**
```bash
# Run pre-commit checks
npm run lint && npx tsc && npm run test

# Run E2E tests locally
npm run test:e2e
```

**Step 2: Deploy to production**
```bash
# Deploy to production
npx vercel --prod

# Or with confirmation
npx vercel deploy --prod
```

**Step 3: Wait for deployment**
```bash
# Monitor deployment
npx vercel ls --prod

# Should see new deployment at top with "Ready" status
```

**Step 4: Run production smoke tests**
```bash
BASE_URL=https://stories-webhook.vercel.app \
ENABLE_REAL_IG_TESTS=true \
ENABLE_LIVE_IG_PUBLISH=true \
  npm run test:e2e:production:smoke
```

---

### Option 2: Use Staging Environment

**Create preview deployment for testing**
```bash
# Deploy to preview (not production)
npx vercel

# Get preview URL
npx vercel ls
# Example: https://stories-webhook-git-main-user.vercel.app

# Test against preview
BASE_URL=https://stories-webhook-git-main-user.vercel.app \
ENABLE_REAL_IG_TESTS=true \
ENABLE_LIVE_IG_PUBLISH=true \
  npm run test:e2e:production:smoke
```

**Benefits:**
- Test without affecting production
- Can test multiple branches
- Safer for experimentation

---

### Option 3: Run Subset of Tests

**Only run tests that match current production**

**Step 1: Identify safe tests**
```typescript
// Production has these features (deployed 15h ago)
✅ Basic publishing
✅ Instagram connection
✅ Content API
✅ Authentication

// Production DOESN'T have (added since)
❌ Video publishing tests (new today)
❌ User whitelist tests (new today)
❌ New UI components
```

**Step 2: Create production-only test file**
```bash
# Create minimal smoke tests for current production
cp __tests__/e2e/production-smoke.spec.ts \
   __tests__/e2e/production-smoke-minimal.spec.ts
```

**Step 3: Comment out new tests**
```typescript
// In production-smoke-minimal.spec.ts
// test.skip('SMOKE-04: video publishing', ...) // Skip - not in prod yet
```

---

### Option 4: Check Deployment Status First

**Create deployment verification script**

```bash
#!/bin/bash
# check-production-sync.sh

echo "🔍 Checking Production Deployment Status"
echo ""

# Get latest local commit
LOCAL_COMMIT=$(git log -1 --format="%h %s")
echo "📝 Latest Local: $LOCAL_COMMIT"

# Get production deployment info
echo "🌍 Production Status:"
npx vercel ls --prod | head -5

echo ""
echo "⚠️ Check if production deployment matches latest commit"
echo "If not, deploy first: npx vercel --prod"
```

---

## 🎯 Recommended Workflow

### For Development
```bash
1. Make changes locally
2. Test locally: npm run test:e2e
3. Commit changes: git commit -m "..."
4. Push to GitHub: git push
5. Deploy to preview: npx vercel
6. Test preview: BASE_URL=<preview-url> npm run test:e2e:production:smoke
7. If tests pass, deploy to prod: npx vercel --prod
8. Test production: npm run test:e2e:production:smoke
```

### For CI/CD (Automated)
```yaml
# .github/workflows/production-deploy.yml
name: Deploy and Test Production

on:
  push:
    branches: [main]

jobs:
  deploy-and-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3

      # Step 1: Deploy to production
      - name: Deploy to Vercel
        run: npx vercel deploy --prod --token=${{ secrets.VERCEL_TOKEN }}
        id: deploy

      # Step 2: Wait for deployment
      - name: Wait for deployment
        run: sleep 30

      # Step 3: Run production smoke tests
      - name: Test Production
        env:
          BASE_URL: https://stories-webhook.vercel.app
          ENABLE_REAL_IG_TESTS: true
          ENABLE_LIVE_IG_PUBLISH: true
        run: npm run test:e2e:production:smoke

      # Step 4: Rollback if tests fail
      - name: Rollback on failure
        if: failure()
        run: npx vercel rollback
```

---

## 🐛 Common Issues

### Issue 1: Tests Fail Immediately
**Cause**: New features not deployed
**Solution**: Deploy first, then test

### Issue 2: Some Tests Pass, Others Fail
**Cause**: Partial feature deployment
**Solution**: Check which features are in production

### Issue 3: Environment Variables Missing
**Cause**: .env.local not synced to Vercel
**Solution**: Add to Vercel dashboard (Settings → Environment Variables)

### Issue 4: Database Schema Mismatch
**Cause**: Migrations not run on production DB
**Solution**: Run migrations via Supabase dashboard

---

## 📊 Deployment Checklist

Before running production tests:

- [ ] Local tests pass (`npm run test:e2e`)
- [ ] Code committed and pushed
- [ ] Deployed to production (`npx vercel --prod`)
- [ ] Environment variables synced to Vercel
- [ ] Database migrations applied to production
- [ ] Deployment shows "Ready" status
- [ ] Manual smoke test in browser (open site, click around)
- [ ] Now safe to run automated production tests

---

## 🎓 Best Practice

**Never test production without knowing what's deployed**

```bash
# WRONG: Blindly test production
npm run test:e2e:production:smoke

# RIGHT: Check deployment first
npx vercel ls --prod  # Check what's deployed
git log --oneline -5   # Check recent changes
# If mismatched → Deploy first → Then test
```

---

## 🚀 Quick Commands

```bash
# Check what's deployed
npx vercel ls --prod

# Check latest local commit
git log -1 --oneline

# Deploy to production
npx vercel --prod

# Test production (after deploy)
BASE_URL=https://stories-webhook.vercel.app \
ENABLE_REAL_IG_TESTS=true \
ENABLE_LIVE_IG_PUBLISH=true \
  npm run test:e2e:production:smoke
```

---

## 📝 Summary

**Current State**: Production is 15 hours behind local changes

**Next Steps**:
1. ✅ Deploy latest changes to production
2. ✅ Verify deployment completes
3. ✅ Then run production smoke tests

**Remember**: Production tests validate what's DEPLOYED, not what's LOCAL.
