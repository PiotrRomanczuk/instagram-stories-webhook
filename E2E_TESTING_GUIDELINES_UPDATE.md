# E2E Testing Guidelines - CLAUDE.md Update

**Date**: 2026-02-05
**Update**: Added comprehensive E2E testing guidelines emphasizing REAL Instagram account usage

---

## 🚨 Key Principle Added

### **E2E tests ALWAYS use REAL Instagram accounts. NEVER mock Meta API in E2E tests.**

This principle is now prominently documented in `CLAUDE.md` with multiple examples and explanations.

---

## 📝 What Was Added to CLAUDE.md

### 1. Critical E2E Testing Policy Section

**New Section**: `🚨 CRITICAL: E2E Testing Policy`

**Key Points:**
- E2E tests MUST use real Instagram account (`@www_hehe_pl`)
- NEVER mock Meta API in E2E tests
- If you can't use real Instagram → Don't write E2E test → Write unit test instead
- 6 specific reasons why real accounts are required

### 2. Clear Test Layer Boundaries

**New Table**: Test Layers with Mocking Rules

| Layer | Tool | Instagram API Handling |
|-------|------|------------------------|
| Unit Tests | Vitest + MSW | ✅ **Mock Allowed** |
| Integration Tests | Vitest + Supabase | ✅ **Mock Allowed** |
| E2E Tests | Playwright | ❌ **NEVER MOCK** |

### 3. Comprehensive Do's and Don'ts

**Added Code Examples:**

✅ **CORRECT E2E Test:**
```typescript
// Uses real Instagram account
await signInAsRealIG(page);
// Waits for real API response (120s for video)
await expect(page.locator('text=Published Successfully!'))
  .toBeVisible({ timeout: 120000 });
```

❌ **WRONG E2E Test:**
```typescript
// ❌ NEVER DO THIS IN E2E TESTS
await page.route('**/graph.instagram.com/**', (route) => {
  route.fulfill({ status: 200, body: JSON.stringify({ id: 'fake' }) });
});
```

### 4. Decision Tree

**Added Quick Reference:**
```
Need to test publishing flow?
├─ Full user workflow (UI → API → Instagram)?
│  └─ YES → E2E test with REAL Instagram
├─ Function/module logic?
│  └─ YES → Unit test with MSW mock
└─ Database/API route integration?
   └─ YES → Integration test with MSW mock
```

### 5. Test File Organization

**Added Directory Structure:**
```
__tests__/
├── unit/          # ✅ Mock Instagram API (MSW)
├── integration/   # ✅ Mock Instagram API (MSW)
└── e2e/           # ❌ NEVER mock - REAL account only
```

### 6. E2E Test Safety Features

**Documented:**
- 24-hour de-duplication to prevent rate limiting
- Extended timeouts for real API (30s-120s)
- Graceful test skipping when recently published

### 7. Updated Test Execution Order

**Clarified:**
- All 4 live publishing tests now documented (3 image + 1 video)
- Dependency chain explained (prerequisite → main tests)
- Real Instagram account usage emphasized

---

## 🎯 Why This Matters

### Real Instagram API Behavior

**Cannot be mocked accurately:**
1. **Variable Processing Time** - Instagram video transcoding takes 30-90s, varies by load
2. **Container Status Polling** - Real async behavior with unpredictable timing
3. **Rate Limiting** - Production rate limits can't be simulated
4. **Token Expiration** - Real token refresh flows need testing
5. **Error Codes** - Instagram returns specific codes (190, 100, 368) in production
6. **Network Latency** - Real upload speeds and timeouts matter

### False Confidence Problem

**Mocked E2E tests give false sense of security:**
- ✅ Test passes with mocked API
- ❌ Production breaks because real API behaves differently
- 😱 Users can't publish stories

**Example:**
```typescript
// Mock says video uploads instantly
route.fulfill({ status: 200, body: { id: '12345' } });

// Reality: Instagram video processing takes 30-90 seconds
// Your test doesn't catch timeout issues!
```

---

## 📊 Changes Summary

| Section | Changes |
|---------|---------|
| Testing Strategy | ✅ Completely rewritten |
| E2E Policy | ✅ New critical section added |
| Do's and Don'ts | ✅ Code examples added |
| Decision Tree | ✅ Visual guide added |
| File Organization | ✅ Directory structure documented |
| Safety Features | ✅ De-duplication explained |
| Test Layers | ✅ Clear boundaries defined |

**Lines Added**: ~200 lines of comprehensive guidelines

---

## 🔍 Key Phrases to Search in CLAUDE.md

Find these phrases to quickly locate the guidelines:

1. `🚨 CRITICAL: E2E Testing Policy`
2. `NEVER mock Meta API in E2E tests`
3. `E2E Testing Do's and Don'ts`
4. `Quick Decision Tree`
5. `Remember: E2E = End-to-End = Real Everything`

---

## ✅ Guidelines Now Enforce

### Rule 1: No Mocking in E2E
**If you mock Instagram API → It's NOT an E2E test → Write a unit test**

### Rule 2: Real Account Required
**E2E tests MUST use p.romanczuk@gmail.com → @www_hehe_pl**

### Rule 3: Real Timeouts
**Use generous timeouts for real API delays (60s-120s)**

### Rule 4: 24-Hour De-duplication
**Check if content was published recently before running test**

### Rule 5: Fail Fast
**If live publishing test fails → Skip all other E2E tests**

---

## 🎓 Developer Guidance

### When Writing New E2E Tests

**Ask yourself:**
1. Does this test need to verify the ENTIRE system works end-to-end?
2. Does this test need to catch real Instagram API issues?
3. Does this test need to verify real upload/processing timing?

**If YES to any → Use real Instagram account, no mocking**
**If NO to all → Write a unit/integration test instead**

### Common Mistakes to Avoid

❌ **"E2E tests take too long, let's mock Instagram"**
- Wrong: That defeats the purpose of E2E testing
- Right: Make E2E tests run less frequently (only on PR, not every commit)

❌ **"I don't have access to Instagram account"**
- Wrong: Creating fake E2E tests with mocks
- Right: Write unit tests with mocks, request Instagram access for E2E

❌ **"Instagram API quota is limited"**
- Wrong: Mocking to save quota
- Right: Use 24-hour de-duplication, run E2E tests strategically

---

## 📚 Related Documentation

- **CLAUDE.md** - Full project guidelines (now updated)
- **VIDEO_PUBLISHING_TEST_IMPLEMENTATION.md** - Video E2E test details
- **QUICK_START_VIDEO_TEST.md** - Quick reference for running tests
- **playwright.config.ts** - E2E test configuration

---

## 🚀 Impact

### Before This Update
- Testing strategy was ambiguous about mocking
- Developers might create E2E tests with mocked Instagram
- False confidence from passing tests that don't test real API

### After This Update
- ✅ Crystal clear: E2E = Real Instagram, always
- ✅ Decision tree helps choose right test type
- ✅ Examples show correct vs incorrect approaches
- ✅ File organization shows where mocking is appropriate
- ✅ Safety features documented (de-duplication, timeouts)

---

**Status**: ✅ Complete
**File Updated**: `CLAUDE.md` (Testing Strategy section)
**Lines Added**: ~200 lines of guidelines
**Emphasis**: E2E tests ALWAYS use real Instagram account, NEVER mock
