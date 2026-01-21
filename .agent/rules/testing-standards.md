# Testing Standards

This rule defines how testing should be handled in the Instagram Stories Webhook project to manage the complexity of Meta and Google authorizations.

## Principles
1.  **Test-Driven Execution**: Whenever a new feature or API route is developed, corresponding tests MUST be created or updated.
2.  **Mocking Policy**:
    -   Use **MSW** (Mock Service Worker) for all unit/integration tests that involve network requests (Meta Graph API, Supabase, etc.).
    -   Do NOT make real network calls in `tests/unit`.
    -   Update `tests/mocks/handlers.ts` whenever new API endpoints are integrated.
3.  **End-to-End (E2E) Policy**:
    -   Use **Playwright** for critical user flows (Login, Linking Account, Scheduling).
    -   Use `storageState` to reuse authentication sessions and avoid redundant login steps.
    -   Tests should be independent and clean up any created data if possible.

## Technical Details
-   **Vitest**: The primary runner for fast feedback. Located in `tests/unit`.
-   **Playwright**: The runner for UI and cross-browser flows. Located in `tests/e2e`.
-   **MSW**: Global setup is in `tests/setup.ts`.

## Agent Instructions
-   Before proposing major changes, run `npm run test` to ensure no regressions.
-   If the project has an active dev server, use `npm run test:e2e` for verification.
-   Always check `docs/TESTING.md` for specific implementation details.
