import { test, expect } from '@playwright/test';
import { signInAsUser, signInAsAdmin } from './helpers/auth';

/**
 * Concurrent Edit E2E Tests
 * Tests basic page loading and navigation for concurrent access scenarios
 *
 * Note: Full concurrent edit testing requires actual data in the database
 * These tests verify the infrastructure for concurrent access
 */

test.describe('Concurrent Edit Protection', () => {
  /**
   * CE-01: Multiple Sessions Can Access Memes Page
   * Priority: P0 (Critical)
   */
  test('CE-01: should allow multiple sessions to access memes page', async ({
    browser,
  }) => {
    // Create two separate browser contexts (simulating two tabs/sessions)
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();

    const page1 = await context1.newPage();
    const page2 = await context2.newPage();

    // Both sign in as the same user (sequentially to avoid race conditions)
    await signInAsUser(page1);
    await signInAsUser(page2);

    // Navigate pages sequentially to avoid timeout issues
    await page1.goto('/memes', { waitUntil: 'domcontentloaded' });
    await page1.waitForLoadState('domcontentloaded');

    await page2.goto('/memes', { waitUntil: 'domcontentloaded' });
    await page2.waitForLoadState('domcontentloaded');

    // Verify both pages load correctly
    await expect(page1).toHaveURL(/\/memes/);
    await expect(page2).toHaveURL(/\/memes/);

    // Both should have content
    const body1 = await page1.innerText('body');
    const body2 = await page2.innerText('body');

    expect(body1.length).toBeGreaterThan(0);
    expect(body2.length).toBeGreaterThan(0);

    await context1.close();
    await context2.close();
  });

  /**
   * CE-02: Content Page Concurrent Access
   * Priority: P1 (High)
   */
  test('CE-02: should allow admin concurrent content page access', async ({
    browser,
  }) => {
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();

    const page1 = await context1.newPage();
    const page2 = await context2.newPage();

    // Both sign in as admin
    await signInAsAdmin(page1);
    await signInAsAdmin(page2);

    // Both navigate to content page
    await page1.goto('/content');
    await page2.goto('/content');

    // Both should load correctly
    await expect(page1).toHaveURL(/\/(en\/)?content/);
    await expect(page2).toHaveURL(/\/(en\/)?content/);

    await context1.close();
    await context2.close();
  });

  /**
   * CE-03: Concurrent Submissions Page Access
   * Priority: P1 (High)
   */
  test('CE-03: should allow concurrent submissions page access', async ({
    browser,
  }) => {
    // Create contexts and sign in sequentially to avoid auth conflicts
    const context1 = await browser.newContext();
    const page1 = await context1.newPage();
    await signInAsUser(page1);

    const context2 = await browser.newContext();
    const page2 = await context2.newPage();
    await signInAsUser(page2);

    // Both navigate to submissions page
    await page1.goto('/submissions', { waitUntil: 'domcontentloaded' });
    await page2.goto('/submissions', { waitUntil: 'domcontentloaded' });

    // Both should load correctly (with or without locale prefix)
    await expect(page1).toHaveURL(/\/(en\/)?submissions/);
    await expect(page2).toHaveURL(/\/(en\/)?submissions/);

    await context1.close();
    await context2.close();
  });
});
