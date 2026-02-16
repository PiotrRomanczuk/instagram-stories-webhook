import { test, expect } from '@playwright/test';

test.describe('Homepage', () => {
  test('should load the sign-in page when unauthenticated', async ({ page }) => {
    await page.goto('/');

    // It should redirect to /auth/signin
    await expect(page).toHaveURL(/\/auth\/signin/);
    await expect(page).toHaveTitle(/Instagram/i);
  });

  test('should show login options on the sign-in page', async ({ page }) => {
    await page.goto('/auth/signin');

    // Check if the page contains "Google" or "Sign in"
    const bodyText = await page.innerText('body');
    expect(bodyText).toMatch(/Google|Sign in|Welcome/i);
  });
});
