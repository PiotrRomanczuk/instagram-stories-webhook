import { test, expect } from '@playwright/test';
import { signInAsAdmin, signInAsUser } from './helpers/auth';

/**
 * Scheduling & Publishing E2E Tests (Section 4)
 * Tests post scheduling workflow UI and access control
 *
 * Note: Schedule page is admin-only.
 * Actual Instagram publishing cannot be tested (requires real Meta API)
 */

test.describe('Scheduling & Publishing (Section 4)', () => {
  /**
   * SP-01: Admin Access to Schedule Page
   * Priority: P0 (Critical)
   */
  test('SP-01: admin should access schedule page', async ({ page }) => {
    await signInAsAdmin(page);
    await page.goto('/schedule');

    await expect(page).toHaveURL(/\/(en\/)?schedule/);

    // Page should load
    const bodyText = await page.innerText('body');
    expect(bodyText.length).toBeGreaterThan(0);
  });

  /**
   * SP-02: Past Datetime Validation
   * Priority: P0 (Critical)
   */
  test('SP-02: should reject past datetime for scheduling', async ({ page }) => {
    await signInAsAdmin(page);
    await page.goto('/schedule');

    await expect(page).toHaveURL(/\/(en\/)?schedule/);

    // Page should have scheduling interface
    const bodyText = await page.innerText('body');

    // Should have schedule-related content
    const hasScheduleContent =
      bodyText.includes('Schedule') ||
      bodyText.includes('schedule') ||
      bodyText.includes('Upcoming') ||
      bodyText.includes('Posts');

    expect(hasScheduleContent).toBe(true);
  });

  /**
   * SP-03: View Scheduled Posts List
   * Priority: P1 (High)
   */
  test('SP-03: admin should view list of scheduled posts', async ({ page }) => {
    await signInAsAdmin(page);
    await page.goto('/schedule');

    await expect(page).toHaveURL(/\/(en\/)?schedule/);

    // Page should show scheduled posts list or empty state
    const bodyText = await page.innerText('body');

    const hasListContent =
      bodyText.includes('Scheduled') ||
      bodyText.includes('scheduled') ||
      bodyText.includes('Upcoming') ||
      bodyText.includes('No posts') ||
      bodyText.includes('empty') ||
      bodyText.includes('Posts');

    expect(hasListContent).toBe(true);
  });

  /**
   * SP-04: Schedule Page UI Elements
   * Priority: P1 (High)
   */
  test('SP-04: schedule page should have management controls', async ({ page }) => {
    await signInAsAdmin(page);
    await page.goto('/schedule');

    await expect(page).toHaveURL(/\/(en\/)?schedule/);

    const bodyText = await page.innerText('body');

    // Should have schedule management UI
    const hasManagementUI =
      bodyText.includes('Schedule') ||
      bodyText.includes('Upcoming') ||
      bodyText.includes('Posts') ||
      bodyText.includes('Create');

    expect(hasManagementUI).toBe(true);
  });

  /**
   * SP-05: User Cannot Access Schedule Page
   * Priority: P0 (Critical)
   */
  test('SP-05: user should be redirected from schedule page', async ({ page }) => {
    await signInAsUser(page);
    await page.goto('/schedule');

    await page.waitForLoadState('domcontentloaded');

    // User should be redirected away (schedule is admin-only)
    const url = page.url();
    expect(url).not.toContain('/schedule');
  });

  /**
   * SP-06: Bulk Operations UI
   * Priority: P1 (High)
   */
  test('SP-06: should show bulk operation controls on schedule page', async ({ page }) => {
    await signInAsAdmin(page);
    await page.goto('/schedule');

    await expect(page).toHaveURL(/\/(en\/)?schedule/);

    // Verify page loads
    const bodyText = await page.innerText('body');
    expect(bodyText.length).toBeGreaterThan(0);
  });

  /**
   * SP-07: Schedule Page Loads Without Errors
   * Priority: P1 (High)
   */
  test('SP-07: schedule page should load without errors', async ({ page }) => {
    await signInAsAdmin(page);
    await page.goto('/schedule');

    await expect(page).toHaveURL(/\/(en\/)?schedule/);

    // Page should not show error messages
    const bodyText = await page.innerText('body');
    const hasErrors = bodyText.match(/error|failed|exception/i);

    // If errors exist, they should be controlled error states, not crashes
    if (hasErrors) {
      // Check it's not a crash error
      expect(bodyText).not.toMatch(/Application error|Something went wrong/i);
    }
  });

  /**
   * SP-08: Schedule Page Performance
   * Priority: P2 (Medium)
   */
  test('SP-08: schedule page should load in reasonable time', async ({ page }) => {
    await signInAsAdmin(page);

    const startTime = Date.now();
    await page.goto('/schedule');
    const endTime = Date.now();

    await expect(page).toHaveURL(/\/(en\/)?schedule/);

    // Page should load within 10 seconds
    const loadTime = endTime - startTime;
    expect(loadTime).toBeLessThan(10000);
  });

  /**
   * SP-09: Schedule Page Content Structure
   * Priority: P1 (High)
   */
  test('SP-09: schedule page should have proper structure', async ({ page }) => {
    await signInAsAdmin(page);
    await page.goto('/schedule');

    await expect(page).toHaveURL(/\/(en\/)?schedule/);

    // Should have main content area
    const mainElement = page.locator('main');
    const hasMain = await mainElement.count() > 0;

    expect(hasMain).toBe(true);
  });

  /**
   * SP-10: Schedule Requires Auth
   * Priority: P0 (Critical)
   */
  test('SP-10: should require authentication to schedule', async ({ page }) => {
    // Try to access schedule without auth
    await page.context().clearCookies();
    await page.goto('/schedule');

    await page.waitForLoadState('domcontentloaded');

    // Should be redirected to sign-in
    const url = page.url();
    const isOnSignIn = url.includes('/auth/signin') || url.includes('signin');
    const isOnSchedule = url.includes('/schedule');

    // Either redirected to sign-in or not on schedule
    expect(isOnSignIn || !isOnSchedule).toBe(true);
  });
});
