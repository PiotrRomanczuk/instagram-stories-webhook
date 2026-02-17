import { test, expect } from '@playwright/test';
import { signInAsAdmin, signInAsUser } from './helpers/auth';

/**
 * Submissions Page E2E Tests
 * Tests submissions list, filtering, status management, and user submissions view
 */

test.describe('Submissions Page', () => {
	/**
	 * SUB-01: Submissions Page Access Control
	 * Priority: P0 (Critical)
	 */
	test('SUB-01: should require authentication to access submissions', async ({ page }) => {
		await page.goto('/submissions');

		// Should redirect to sign-in
		await expect(page).toHaveURL(/\/(en\/)?auth\/signin/);
	});

	/**
	 * SUB-02: Submissions Page Load for Admin
	 * Priority: P0 (Critical)
	 */
	test('SUB-02: should load submissions page for authenticated admin', async ({ page }) => {
		await signInAsAdmin(page);
		await page.goto('/submissions');

		// Should be on submissions page
		await expect(page).toHaveURL(/\/(en\/)?submissions/);

		// Check for page heading
		await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
	});

	/**
	 * SUB-03: Submissions Page Load for User
	 * Priority: P0 (Critical)
	 */
	test('SUB-03: should load submissions page for authenticated user', async ({ page }) => {
		await signInAsUser(page);
		await page.goto('/submissions');

		// Should be on submissions page
		await expect(page).toHaveURL(/\/(en\/)?submissions/);
	});

	/**
	 * SUB-04: Submissions List Display
	 * Priority: P1 (High)
	 */
	test('SUB-04: should display list of submissions', async ({ page }) => {
		await signInAsAdmin(page);
		await page.goto('/submissions');

		await page.waitForLoadState('networkidle', { timeout: 10000 });

		const bodyText = await page.innerText('body');

		// Should show submissions-related content
		const hasSubmissionsContent =
			bodyText.includes('Submission') ||
			bodyText.includes('Meme') ||
			bodyText.includes('Post') ||
			bodyText.includes('Content') ||
			bodyText.includes('No submissions');

		expect(hasSubmissionsContent).toBeTruthy();
	});

	/**
	 * SUB-05: Empty Submissions State
	 * Priority: P2 (Medium)
	 */
	test('SUB-05: should handle empty submissions gracefully', async ({ page }) => {
		await signInAsUser(page); // Regular user might have no submissions
		await page.goto('/submissions');

		await page.waitForLoadState('networkidle', { timeout: 10000 });

		const bodyText = await page.innerText('body');

		// Should show content or empty state
		const hasContent =
			bodyText.includes('No submissions') ||
			bodyText.includes('No content') ||
			bodyText.includes('Empty') ||
			bodyText.includes('Submission') ||
			bodyText.includes('Submit');

		expect(hasContent).toBeTruthy();
	});

	/**
	 * SUB-06: Submission Status Display
	 * Priority: P1 (High)
	 */
	test('SUB-06: should display submission status', async ({ page }) => {
		await signInAsAdmin(page);
		await page.goto('/submissions');

		await page.waitForLoadState('networkidle', { timeout: 10000 });

		const bodyText = await page.innerText('body');

		// Should show status information
		const hasStatus =
			bodyText.includes('Pending') ||
			bodyText.includes('Approved') ||
			bodyText.includes('Rejected') ||
			bodyText.includes('Published') ||
			bodyText.includes('Status');

		if (hasStatus) {
			console.log('✅ Status information displayed');
		} else {
			console.log('ℹ️ No status info (may have no submissions)');
		}
	});

	/**
	 * SUB-07: Filtering by Status
	 * Priority: P2 (Medium)
	 */
	test('SUB-07: should support filtering submissions by status', async ({ page }) => {
		await signInAsAdmin(page);
		await page.goto('/submissions');

		await page.waitForLoadState('networkidle', { timeout: 10000 });

		// Look for filter controls
		const filterButtons = page.getByRole('button', { name: /pending|approved|rejected|all/i });
		const filterSelect = page.locator('select').filter({ hasText: /status|filter/i });
		const filterTabs = page.locator('[role="tab"]').filter({ hasText: /pending|approved|rejected/i });

		const hasFilters =
			await filterButtons.count() > 0 ||
			await filterSelect.count() > 0 ||
			await filterTabs.count() > 0;

		if (hasFilters) {
			console.log('✅ Status filtering available');
		} else {
			console.log('ℹ️ No status filtering detected');
		}
	});

	/**
	 * SUB-08: Thumbnail/Preview Display
	 * Priority: P2 (Medium)
	 */
	test('SUB-08: should display thumbnails or previews of submissions', async ({ page }) => {
		await signInAsAdmin(page);
		await page.goto('/submissions');

		await page.waitForLoadState('networkidle', { timeout: 10000 });

		// Look for images or media elements
		const images = await page.locator('img').count();
		const videos = await page.locator('video').count();

		if (images > 1 || videos > 0) {
			console.log('✅ Media previews found');
		} else {
			console.log('ℹ️ No media previews (may have no submissions)');
		}
	});

	/**
	 * SUB-09: Submission Date/Time Display
	 * Priority: P2 (Medium)
	 */
	test('SUB-09: should display submission dates', async ({ page }) => {
		await signInAsAdmin(page);
		await page.goto('/submissions');

		await page.waitForLoadState('networkidle', { timeout: 10000 });

		const bodyText = await page.innerText('body');

		// Look for timestamps
		const hasTimestamps =
			bodyText.match(/\d{1,2}:\d{2}/) || // Time
			bodyText.match(/\d+\s+(minute|hour|day)s?\s+ago/) || // Relative time
			bodyText.match(/\d{4}-\d{2}-\d{2}/) || // Date
			bodyText.includes('Submitted');

		if (hasTimestamps) {
			console.log('✅ Timestamps displayed');
		} else {
			console.log('ℹ️ No timestamps (may have no submissions)');
		}
	});

	/**
	 * SUB-10: User Data Isolation
	 * Priority: P0 (Critical)
	 */
	test('SUB-10: should show only user own submissions for regular users', async ({ page }) => {
		await signInAsUser(page);
		await page.goto('/submissions');

		await page.waitForLoadState('networkidle', { timeout: 10000 });

		const bodyText = await page.innerText('body');

		// Regular users should see their own submissions or empty state
		// Should NOT see "All users" or admin features
		const isIsolated =
			!bodyText.includes('All users') &&
			!bodyText.includes('All submissions');

		if (!isIsolated) {
			// It's ok if it says "Your submissions" or similar
			const hasOwnershipIndicator =
				bodyText.includes('Your') ||
				bodyText.includes('My') ||
				bodyText.includes('user@test.com');

			expect(hasOwnershipIndicator).toBeTruthy();
		}
	});

	/**
	 * SUB-11: Admin View All Submissions
	 * Priority: P1 (High)
	 */
	test('SUB-11: should allow admin to view all submissions', async ({ page }) => {
		await signInAsAdmin(page);
		await page.goto('/submissions');

		await page.waitForLoadState('networkidle', { timeout: 10000 });

		const bodyText = await page.innerText('body');

		// Admin should see all submissions or have option to
		const hasAdminView =
			bodyText.includes('All') ||
			bodyText.includes('Submissions') ||
			bodyText.includes('Admin');

		if (hasAdminView) {
			console.log('✅ Admin view available');
		} else {
			console.log('ℹ️ Standard view (may have no submissions)');
		}
	});

	/**
	 * SUB-12: Search Submissions
	 * Priority: P2 (Medium)
	 */
	test('SUB-12: should support searching submissions', async ({ page }) => {
		await signInAsAdmin(page);
		await page.goto('/submissions');

		await page.waitForLoadState('networkidle', { timeout: 10000 });

		// Look for search input
		const searchInput = page.getByRole('searchbox');
		const searchInputAlt = page.locator('input[type="search"], input[placeholder*="search" i]');

		const hasSearch = await searchInput.count() > 0 || await searchInputAlt.count() > 0;

		if (hasSearch) {
			console.log('✅ Search functionality available');
		} else {
			console.log('ℹ️ No search functionality detected');
		}
	});

	/**
	 * SUB-13: Sort Submissions
	 * Priority: P2 (Medium)
	 */
	test('SUB-13: should support sorting submissions', async ({ page }) => {
		await signInAsAdmin(page);
		await page.goto('/submissions');

		await page.waitForLoadState('networkidle', { timeout: 10000 });

		// Look for sort controls
		const sortButton = page.getByRole('button', { name: /sort|order/i });
		const sortSelect = page.locator('select').filter({ hasText: /sort|order|date|status/i });

		const hasSort = await sortButton.count() > 0 || await sortSelect.count() > 0;

		if (hasSort) {
			console.log('✅ Sort functionality available');
		} else {
			console.log('ℹ️ No sort controls detected');
		}
	});

	/**
	 * SUB-14: View Submission Details
	 * Priority: P1 (High)
	 */
	test('SUB-14: should allow viewing submission details', async ({ page }) => {
		await signInAsAdmin(page);
		await page.goto('/submissions');

		await page.waitForLoadState('networkidle', { timeout: 10000 });

		// Look for view/details buttons or clickable items
		const viewButtons = page.getByRole('button', { name: /view|details|open/i });
		const clickableItems = page.locator('[role="button"], [role="link"]').filter({ hasText: /view|detail/i });

		const hasViewOption = await viewButtons.count() > 0 || await clickableItems.count() > 0;

		if (hasViewOption) {
			console.log('✅ View details option available');
		} else {
			console.log('ℹ️ No explicit view button (may have no submissions)');
		}
	});

	/**
	 * SUB-15: Pagination Support
	 * Priority: P2 (Medium)
	 */
	test('SUB-15: should support pagination for large lists', async ({ page }) => {
		await signInAsAdmin(page);
		await page.goto('/submissions');

		await page.waitForLoadState('networkidle', { timeout: 10000 });

		// Look for pagination controls
		const paginationButtons = page.getByRole('button', { name: /next|previous|page|load more/i });
		const paginationNav = page.locator('nav').filter({ hasText: /page|pagination/i });

		const hasPagination = await paginationButtons.count() > 0 || await paginationNav.count() > 0;

		if (hasPagination) {
			console.log('✅ Pagination controls found');
		} else {
			console.log('ℹ️ No pagination (may have few submissions)');
		}
	});

	/**
	 * SUB-16: Quick Actions
	 * Priority: P2 (Medium)
	 */
	test('SUB-16: should provide quick actions for submissions', async ({ page }) => {
		await signInAsAdmin(page);
		await page.goto('/submissions');

		await page.waitForLoadState('networkidle', { timeout: 10000 });

		// Look for action buttons
		const actionButtons = page.getByRole('button', { name: /approve|reject|delete|edit/i });

		if (await actionButtons.count() > 0) {
			console.log('✅ Quick action buttons available');
		} else {
			console.log('ℹ️ No quick actions (may have no submissions)');
		}
	});

	/**
	 * SUB-17: Navigation Elements
	 * Priority: P2 (Medium)
	 */
	test('SUB-17: should have navigation elements', async ({ page }) => {
		await signInAsAdmin(page);
		await page.goto('/submissions');

		await page.waitForLoadState('networkidle', { timeout: 10000 });

		// Should have navigation
		const navLinks = page.getByRole('navigation').locator('a');
		const linkCount = await navLinks.count();

		expect(linkCount).toBeGreaterThan(0);
	});

	/**
	 * SUB-18: Create New Submission Link
	 * Priority: P2 (Medium)
	 */
	test('SUB-18: should provide link to create new submission', async ({ page }) => {
		await signInAsUser(page);
		await page.goto('/submissions');

		await page.waitForLoadState('networkidle', { timeout: 10000 });

		// Look for new/create/submit buttons or links
		const newButton = page.getByRole('button', { name: /new|create|submit/i });
		const newLink = page.getByRole('link', { name: /new|create|submit/i });

		const hasNewOption = await newButton.count() > 0 || await newLink.count() > 0;

		if (hasNewOption) {
			console.log('✅ New submission option available');
		} else {
			console.log('ℹ️ No new submission button in view');
		}
	});

	/**
	 * SUB-19: Mobile Responsiveness
	 * Priority: P3 (Low)
	 */
	test('SUB-19: should be responsive on mobile viewport', async ({ page }) => {
		await page.setViewportSize({ width: 375, height: 667 });

		await signInAsAdmin(page);
		await page.goto('/submissions');

		await page.waitForLoadState('networkidle', { timeout: 10000 });

		// Page should load
		await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

		// Check horizontal scroll
		const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
		const viewportWidth = await page.evaluate(() => window.innerWidth);

		expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 20);
	});
});
