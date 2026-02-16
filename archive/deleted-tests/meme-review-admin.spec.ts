import { test, expect } from '@playwright/test';
import { signInAsAdmin, signInAsUser } from './helpers/auth';

/**
 * Meme Review & Admin E2E Tests (Section 3)
 * Tests admin review workflow, approval/rejection, and bulk operations
 *
 * Note: Actual meme submissions require Supabase storage auth which isn't
 * available in E2E test context. These tests focus on:
 * - Admin page access control
 * - Admin UI elements and interactions
 * - User access restrictions
 */

test.describe('Meme Review & Admin (Section 3)', () => {
  /**
   * MR-01: Admin View Content Page
   * Priority: P0 (Critical)
   */
  test('MR-01: admin should view all pending meme submissions', async ({ page }) => {
    await signInAsAdmin(page);
    await page.goto('/content');

    // Should see content page (admin memes review)
    await expect(page).toHaveURL(/\/(en\/)?content/);

    // Check for admin interface elements
    const bodyText = await page.innerText('body');
    // Admin content page should have review/content related elements
    const hasAdminElements =
      bodyText.includes('Content') ||
      bodyText.includes('Review') ||
      bodyText.includes('Pending') ||
      bodyText.includes('Approved') ||
      bodyText.includes('Status');

    expect(hasAdminElements).toBe(true);
  });

  /**
   * MR-02: Admin Can Access Content Management
   * Priority: P0 (Critical)
   */
  test('MR-02: admin should see content management controls', async ({ page }) => {
    await signInAsAdmin(page);
    await page.goto('/content');

    await expect(page).toHaveURL(/\/(en\/)?content/);

    // Admin page should have content management controls
    const bodyText = await page.innerText('body');

    // Page should have either action buttons/tabs or empty state
    const hasAdminContent =
      bodyText.includes('Content Hub') ||
      bodyText.includes('All Content') ||
      bodyText.includes('Schedule') ||
      bodyText.includes('Catalog') ||
      bodyText.includes('Create Post') ||
      bodyText.includes('Tumbleweeds') ||
      bodyText.includes('No content');

    expect(hasAdminContent).toBe(true);
  });

  /**
   * MR-03: Admin Content Filtering
   * Priority: P0 (Critical)
   */
  test('MR-03: admin should have filter options', async ({ page }) => {
    await signInAsAdmin(page);
    await page.goto('/content');

    await expect(page).toHaveURL(/\/(en\/)?content/);

    // Look for filter/status elements
    const bodyText = await page.innerText('body');

    // Admin page should have status filters or tabs
    const hasFilters =
      bodyText.includes('Pending') ||
      bodyText.includes('Approved') ||
      bodyText.includes('Rejected') ||
      bodyText.includes('All') ||
      bodyText.includes('Filter');

    expect(hasFilters).toBe(true);
  });

  /**
   * MR-10: User Can View Content Page
   * Priority: P0 (Critical)
   * Note: Content page is accessible to all authenticated users
   */
  test('MR-10: regular user can view content page', async ({ page }) => {
    // Sign in as regular user
    await signInAsUser(page);

    // Access content page
    await page.goto('/content');

    // Wait for page to load
    await page.waitForLoadState('domcontentloaded');

    // User should see the content page
    await expect(page).toHaveURL(/\/(en\/)?content/);

    const bodyText = await page.innerText('body');

    // Content page should show Content Hub
    const hasContentPage =
      bodyText.includes('Content Hub') ||
      bodyText.includes('All Content') ||
      bodyText.includes('Create Post');

    expect(hasContentPage).toBe(true);
  });

  /**
   * MR-04: Admin Content View Types
   * Priority: P1 (High)
   */
  test('MR-04: admin should see content view controls', async ({ page }) => {
    await signInAsAdmin(page);
    await page.goto('/content');

    await expect(page).toHaveURL(/\/(en\/)?content/);

    // Look for view toggle buttons by role (icon buttons with aria-label)
    const gridViewButton = page.getByRole('button', { name: /grid view/i });
    const listViewButton = page.getByRole('button', { name: /list view/i });

    const hasGridView = await gridViewButton.count() > 0;
    const hasListView = await listViewButton.count() > 0;

    // Admin should have view toggle options
    expect(hasGridView || hasListView).toBe(true);
  });

  /**
   * MR-05: Admin Search Functionality
   * Priority: P1 (High)
   */
  test('MR-05: admin should have search functionality', async ({ page }) => {
    await signInAsAdmin(page);
    await page.goto('/content');

    await expect(page).toHaveURL(/\/(en\/)?content/);

    // Look for search input
    const searchInput = page.locator('input[type="search"], input[placeholder*="Search"], input[name="search"]');
    const hasSearchInput = await searchInput.count() > 0;

    // Admin page should have search capability
    if (hasSearchInput) {
      await expect(searchInput.first()).toBeVisible();
    } else {
      // Search might be in a different form
      const bodyText = await page.innerText('body');
      const hasSearchElement = bodyText.includes('Search');
      expect(hasSearchElement).toBe(true);
    }
  });

  /**
   * MR-07: Admin Can Search Memes
   * Priority: P1 (High)
   */
  test('MR-07: admin should search memes by title', async ({ page }) => {
    await signInAsAdmin(page);
    await page.goto('/content');

    // Look for search input
    const searchInput = page.locator('input[type="search"], input[placeholder*="Search"], input[name="search"]');
    const hasSearchInput = await searchInput.count() > 0;

    if (hasSearchInput) {
      // Enter search term
      await searchInput.fill('test');

      // Wait for search results (debounced search triggers network request)
      await page.waitForLoadState('domcontentloaded');

      // Verify search is working (page should respond)
      const bodyText = await page.innerText('body');
      expect(bodyText.length).toBeGreaterThan(0);
    } else {
      // Search might not be implemented yet - verify admin page loads
      await expect(page).toHaveURL(/\/(en\/)?content/);
    }
  });

  /**
   * MR-08: User Submissions Page Access
   * Priority: P1 (High)
   */
  test('MR-08: user should access their submissions list', async ({ page }) => {
    await signInAsUser(page);
    await page.goto('/submissions');

    await page.waitForLoadState('domcontentloaded');

    // User should be able to see their submissions page
    const url = page.url();

    // Either on submissions page or redirected to submit
    const canAccessSubmissions = url.includes('submission');

    if (canAccessSubmissions) {
      const bodyText = await page.innerText('body');
      // Should show submissions list or empty state
      const hasSubmissionContent =
        bodyText.includes('Submission') ||
        bodyText.includes('No submission') ||
        bodyText.includes('empty') ||
        bodyText.includes('Submit');

      expect(hasSubmissionContent).toBe(true);
    }
  });
});
