
# E2E Tests

## XSS Verification Tests
The XSS tests (`xss.spec.ts`) verify that user inputs are properly sanitized.

### Prerequisites for Running XSS Tests
To run these tests successfully, you need to ensure the Authentication environment is correctly configured:

1. **Test Authentication**: The tests use a `CredentialsProvider` that is only enabled when `NODE_ENV=development` (or `test`).
2. **Environment Variables**: Ensure `NEXTAUTH_SECRET` is set in your `.env` or `.env.local` file and is accessible to the Next.js server.
3. **Session Cookies**: The tests rely on `next-auth.session-token`. If running against `localhost`, ensure your browser context in Playwright can share cookies (default behavior).

### Running the Test
```bash
npx playwright test __tests__/e2e/xss.spec.ts
```

### Troubleshooting 401 Errors
If you receive 401 errors:
- Ensure the Test Login buttons appear on the `/auth/signin` page (navigate there manually to check).
- Ensure the "Test Credentials" provider in `lib/auth.ts` is active (requires `NODE_ENV` to be 'development' or 'test').
- Restart your dev server (`npm run dev`) if you recently changed `.env` files.
