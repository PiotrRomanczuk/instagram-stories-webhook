# 🧪 Testing Guide

This project uses a dual-layer testing strategy to handle the complexity of Google and Meta authorizations.

## 1. Mock-Based Testing (Vitest + MSW)
Use this for testing business logic, API routes, and components without needing real Meta accounts.

- **Command**: `npm run test`
- **Watch Mode**: `npm run test:watch`
- **Mocks**: Located in `tests/mocks/handlers.ts`. This is where you mock Meta Graph API responses.
- **Setup**: Global setup in `tests/setup.ts` handles the mock server lifecycle.

## 2. End-to-End Testing (Playwright)
Use this for testing real user flows and validating the UI.

- **Command**: `npm run test:e2e`
- **UI Mode**: `npm run test:e2e:ui`
- **Configuration**: `playwright.config.ts` handles dev server startup and browser settings.
- **Tests**: Located in `tests/e2e/`.

---

### Best Practices for Double-Auth Testing
- **For Vitest**: Use MSW to mock the `getServerSession` response or intercept the fetch calls to Meta.
- **For Playwright**: Use `page.context().storageState({ path: 'auth.json' })` to save authentication states and bypass login screens in subsequent tests.
