---
description: Combined testing procedure (Vitest + Playwright)
---

Follow these steps to ensure the application is correctly tested.

// turbo
1. Run Unit/Integration Tests.
   ```bash
   npm run test
   ```
   If this fails, analyze which mock or logic broke. Update `tests/mocks/handlers.ts` if the API interface changed.

2. Run E2E Tests (Local).
   Ensure the dev server is NOT already running if you want Playwright to manage it, or keep it running for faster execution.
   ```bash
   npm run test:e2e
   ```
   
3. Interactive Testing (Optional).
   If E2E tests fail and you need to debug visually:
   ```bash
   npm run test:e2e:ui
   ```

4. Verify Mock Coverage.
   Ensure any new external requests made in the code are captured by MSW in `tests/setup.ts` to prevent "real" network leakage during unit tests.
