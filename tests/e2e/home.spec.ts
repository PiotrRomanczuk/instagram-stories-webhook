import { test, expect } from '@playwright/test';

test.describe('Homepage', () => {
  test('should load the homepage', async ({ page }) => {
    await page.goto('/');
    
    // Check for a common element on your homepage
    // Based on README, there should be a "Connect Facebook" button or similar
    // We'll just check for the title/heading for now
    await expect(page).toHaveTitle(/Instagram/i);
  });

  test('should show login options when not authenticated', async ({ page }) => {
    await page.goto('/');
    
    // Check if the page contains "Sign in" or "Connect"
    const bodyText = await page.innerText('body');
    expect(bodyText).toMatch(/Sign in|Connect|Login/i);
  });
});
