# Production Testing - Quick Start

## 🚀 Test Your Deployed Site in 30 Seconds

### 1. Set Production URL
```bash
export BASE_URL=https://your-app.vercel.app
```

### 2. Run Smoke Tests (REAL Instagram)
```bash
ENABLE_REAL_IG_TESTS=true \
ENABLE_LIVE_IG_PUBLISH=true \
  npm run test:e2e:production:smoke
```

### 3. Watch Tests Run Against Production ✨
```
✅ SMOKE-01: Production site loads
✅ SMOKE-02: Authentication works
✅ SMOKE-03: Instagram connected
✅ SMOKE-04: Video publishes to Instagram (CRITICAL)
✅ SMOKE-05: Content API works
✅ SMOKE-06: Health check passes
```

---

## ⚡ One-Liner

```bash
BASE_URL=https://your-app.vercel.app \
ENABLE_REAL_IG_TESTS=true \
ENABLE_LIVE_IG_PUBLISH=true \
  npm run test:e2e:production:smoke
```

---

## 🎯 What Gets Tested?

| Test | What It Does |
|------|--------------|
| SMOKE-01 | Site loads and is accessible |
| SMOKE-02 | Real Instagram auth works |
| SMOKE-03 | Instagram account connected |
| **SMOKE-04** | **Publishes real video to @www_hehe_pl** |
| SMOKE-05 | Content API returns data |
| SMOKE-06 | Health check endpoint |

**Duration**: ~2-3 minutes (video publishing takes longest)

---

## 📁 Files Created

1. ✅ `playwright.config.production.ts` - Production test config
2. ✅ `__tests__/e2e/production-smoke.spec.ts` - 6 smoke tests
3. ✅ `package.json` - Added npm scripts

---

## 🔑 Environment Variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `BASE_URL` | ✅ Yes | Your deployed site URL |
| `ENABLE_REAL_IG_TESTS` | ✅ Yes | Enable Instagram tests |
| `ENABLE_LIVE_IG_PUBLISH` | ✅ Yes | Allow real publishing |

---

## ⚠️ Important Notes

### Uses REAL Instagram Account
- Account: `p.romanczuk@gmail.com`
- Instagram: `@www_hehe_pl`
- Actually publishes to Instagram
- Uses production database

### 24-Hour De-duplication
- Won't publish same video twice in 24h
- Prevents Instagram rate limiting
- Tests skip gracefully if recently published

### When to Run
- ✅ After deployment
- ✅ Before major release
- ✅ Scheduled nightly
- ❌ Not on every commit (too expensive)

---

## 🐛 Troubleshooting

### Test Fails with "BASE_URL not set"
```bash
# Make sure to set BASE_URL
export BASE_URL=https://your-app.vercel.app
```

### Video Publishing Fails
- Check Instagram tokens in production Supabase
- Verify account `p.romanczuk@gmail.com` is connected
- Check if video was published in last 24 hours

### Site Not Loading
- Verify production URL is correct
- Check site is deployed and accessible
- Try opening URL in browser first

---

## 📚 Full Documentation

See **`PRODUCTION_TESTING_GUIDE.md`** for:
- CI/CD integration
- Multi-environment testing
- Debugging guide
- Best practices
- Security considerations

---

**That's it!** Your production site is now testable with Playwright. 🎉
