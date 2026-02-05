# Cron Testing - Quick Start

## 🚀 Test a Cron Job in 30 Seconds

### 1. Set your CRON_SECRET
```bash
export CRON_SECRET="your-secret-here"
# Or load from .env.local
source .env.local
```

### 2. Test locally (dev server must be running)
```bash
./scripts/test-cron.sh process local
```

### 3. Test production
```bash
./scripts/test-cron.sh process production
```

---

## 📋 Available Cron Jobs

| Job Name | What It Does |
|----------|--------------|
| `process` | Process scheduled posts |
| `identity-audit` | User identity audit |
| `check-media-health` | Check media health |
| `process-videos` | Process video queue |

---

## ✅ Best Practices

1. **Test core logic with unit tests** (fast, reliable)
2. **Test endpoint locally** during development
3. **Monitor production logs** via Vercel dashboard
4. **Manual triggers** for debugging only

Don't try to test cron schedules - just test the endpoints!

---

**Full guide**: See `CRON_TESTING_GUIDE.md` for complete details.
