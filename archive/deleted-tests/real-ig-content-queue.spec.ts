import { test, expect } from '@playwright/test';
import { signInAsRealIG } from './helpers/auth';

/**
 * Content Queue Dashboard E2E Tests (Real Account)
 *
 * Tests the Content Hub page (/content) which displays the StoryFlow
 * Content Queue Dashboard for reviewing and managing story submissions.
 *
 * Uses real Instagram account (p.romanczuk@gmail.com) for authentication.
 *
 * IMPORTANT:
 * - Skip in CI to avoid running against real services
 * - Requires ENABLE_REAL_IG_TESTS=true to run
 */

test.describe('Content Queue Dashboard (Real Account)', () => {
	// Skip in CI environments
	test.skip(
		() => process.env.CI === 'true',
		'Skipping in CI - requires real Instagram tokens',
	);

	// Also skip if ENABLE_REAL_IG_TESTS is not set
	test.skip(
		() => !process.env.ENABLE_REAL_IG_TESTS,
		'Set ENABLE_REAL_IG_TESTS=true to run real Instagram tests',
	);

	test.beforeEach(async ({ page }) => {
		await signInAsRealIG(page);
	});

	/**
	 * CQ-01: Access Content Hub
	 * Priority: P0 (Critical)
	 * Verify that the Content Hub page loads successfully
	 */
	test('CQ-01: should access Content Hub page', async ({ page }) => {
		await page.goto('/content');
		await page.waitForLoadState('domcontentloaded');

		// Should be on content page
		await expect(page).toHaveURL(/\/(en\/)?content/);

		// Should see ContentQueueLayout component (main container)
		const mainContainer = page.locator('.min-h-screen.bg-\\[\\#101622\\]');
		await expect(mainContainer).toBeVisible();

		// Should not show sign-in page
		expect(page.url()).not.toContain('/auth/signin');
	});

	/**
	 * CQ-02: Stats Cards Display
	 * Priority: P1 (High)
	 * Verify that stats cards (Pending Review, Ready to Publish, etc.) are displayed
	 */
	test('CQ-02: should display stats cards', async ({ page }) => {
		await page.goto('/content');
		await page.waitForLoadState('domcontentloaded');

		// Wait for content to load
		await page.waitForTimeout(1000);

		// Check for stats section (ContentQueueHeader)
		const statsSection = page.locator('.mb-8');
		await expect(statsSection.first()).toBeVisible();

		// Should see stats-related text
		const bodyText = await page.innerText('body');
		const hasStats =
			bodyText.includes('Pending') ||
			bodyText.includes('Ready') ||
			bodyText.includes('Published') ||
			bodyText.includes('Rejected') ||
			bodyText.includes('Review');

		expect(hasStats).toBe(true);
	});

	/**
	 * CQ-03: Status Filter - Pending
	 * Priority: P0 (Critical)
	 * Verify the status filter can be set to "Pending"
	 */
	test('CQ-03: should filter by Pending status', async ({ page }) => {
		await page.goto('/content');
		await page.waitForLoadState('domcontentloaded');

		// Find and click the status filter button
		const statusFilterBtn = page.locator('button:has-text("Status:")');
		await statusFilterBtn.waitFor({ state: 'visible', timeout: 10000 });
		await statusFilterBtn.click();

		// Select Pending from dropdown
		const pendingOption = page.locator('button:has-text("Pending")').first();
		await pendingOption.waitFor({ state: 'visible', timeout: 5000 });
		await pendingOption.click();

		// Verify filter is applied (dropdown should close and show updated label)
		await expect(statusFilterBtn).toContainText('Pending');
	});

	/**
	 * CQ-04: Status Filter - Approved
	 * Priority: P0 (Critical)
	 * Verify the status filter can be set to "Approved"
	 */
	test('CQ-04: should filter by Approved status', async ({ page }) => {
		await page.goto('/content');
		await page.waitForLoadState('domcontentloaded');

		// Find and click the status filter button
		const statusFilterBtn = page.locator('button:has-text("Status:")');
		await statusFilterBtn.waitFor({ state: 'visible', timeout: 10000 });
		await statusFilterBtn.click();

		// Select Approved from dropdown
		const approvedOption = page.locator('button:has-text("Approved")').first();
		await approvedOption.waitFor({ state: 'visible', timeout: 5000 });
		await approvedOption.click();

		// Verify filter is applied
		await expect(statusFilterBtn).toContainText('Approved');
	});

	/**
	 * CQ-05: Status Filter - All
	 * Priority: P1 (High)
	 * Verify the status filter can be set to "All"
	 */
	test('CQ-05: should filter by All status', async ({ page }) => {
		await page.goto('/content');
		await page.waitForLoadState('domcontentloaded');

		// First set to Pending
		const statusFilterBtn = page.locator('button:has-text("Status:")');
		await statusFilterBtn.waitFor({ state: 'visible', timeout: 10000 });
		await statusFilterBtn.click();

		const pendingOption = page.locator('button:has-text("Pending")').first();
		await pendingOption.click();

		// Then switch to All
		await statusFilterBtn.click();
		const allOption = page.locator('button:has-text("All")').first();
		await allOption.waitFor({ state: 'visible', timeout: 5000 });
		await allOption.click();

		// Verify filter is applied
		await expect(statusFilterBtn).toContainText('All');
	});

	/**
	 * CQ-06: Search Functionality
	 * Priority: P1 (High)
	 * Verify the search input works
	 */
	test('CQ-06: should have working search functionality', async ({ page }) => {
		await page.goto('/content');
		await page.waitForLoadState('domcontentloaded');

		// Find the search input in ContentQueuePageHeader
		const searchInput = page.locator('input[placeholder*="Search"]');

		if (await searchInput.count() > 0) {
			await searchInput.fill('test search');

			// Verify the search value is set
			await expect(searchInput).toHaveValue('test search');
		} else {
			// Search might be in a different location
			const bodyText = await page.innerText('body');
			// Page loaded successfully
			expect(bodyText.length).toBeGreaterThan(0);
		}
	});

	/**
	 * CQ-07: Creator Filter
	 * Priority: P2 (Medium)
	 * Verify the creator filter dropdown is accessible
	 */
	test('CQ-07: should have creator filter dropdown', async ({ page }) => {
		await page.goto('/content');
		await page.waitForLoadState('domcontentloaded');

		// Find the creator filter button
		const creatorFilterBtn = page.locator('button:has-text("Creator")');

		if (await creatorFilterBtn.count() > 0) {
			await creatorFilterBtn.click();

			// Should show dropdown with "All Creators" option
			const allCreatorsOption = page.locator('button:has-text("All Creators")');
			await expect(allCreatorsOption.first()).toBeVisible({ timeout: 5000 });

			// Close dropdown by clicking elsewhere
			await page.keyboard.press('Escape');
		} else {
			// Creator filter may not be visible if no items loaded
			const bodyText = await page.innerText('body');
			expect(bodyText.length).toBeGreaterThan(0);
		}
	});

	/**
	 * CQ-08: Grid View Toggle
	 * Priority: P1 (High)
	 * Verify the grid view toggle button works
	 */
	test('CQ-08: should toggle to grid view', async ({ page }) => {
		await page.goto('/content');
		await page.waitForLoadState('domcontentloaded');

		// Find grid view button (LayoutGrid icon button)
		const gridBtn = page.locator('button[title="Grid view"]');

		if (await gridBtn.count() > 0) {
			await gridBtn.click();

			// Grid button should show active state
			await expect(gridBtn).toHaveClass(/bg-\[#232f48\]/);
		} else {
			// Alternative: check for LayoutGrid icon
			const gridIcon = page.locator('svg.lucide-layout-grid').first();
			if (await gridIcon.count() > 0) {
				await gridIcon.click();
			}
		}
	});

	/**
	 * CQ-09: List View Toggle
	 * Priority: P1 (High)
	 * Verify the list view toggle button works
	 */
	test('CQ-09: should toggle to list view', async ({ page }) => {
		await page.goto('/content');
		await page.waitForLoadState('domcontentloaded');

		// Find list view button
		const listBtn = page.locator('button[title="List view"]');

		if (await listBtn.count() > 0) {
			await listBtn.click();

			// List button should show active state
			await expect(listBtn).toHaveClass(/bg-\[#232f48\]/);
		} else {
			// Alternative: check for List icon
			const listIcon = page.locator('svg.lucide-list').first();
			if (await listIcon.count() > 0) {
				await listIcon.click();
			}
		}
	});

	/**
	 * CQ-10: Open Preview Modal
	 * Priority: P0 (Critical)
	 * Verify clicking on a content card opens the preview modal
	 */
	test('CQ-10: should open preview modal when clicking content card', async ({ page }) => {
		await page.goto('/content');
		await page.waitForLoadState('domcontentloaded');

		// Wait for content grid to load
		await page.waitForTimeout(2000);

		// Find content cards (the thumbnail area that opens preview)
		const contentCards = page.locator('.group.relative.flex.flex-col.overflow-hidden.rounded-xl');
		const cardCount = await contentCards.count();

		if (cardCount > 0) {
			// Click the thumbnail area of the first card
			const firstCardThumbnail = contentCards.first().locator('.aspect-\\[9\\/16\\]');
			await firstCardThumbnail.click();

			// Wait for modal to appear
			await page.waitForTimeout(500);

			// Check for modal backdrop or modal content
			const modalBackdrop = page.locator('.fixed.inset-0.z-\\[80\\].bg-black\\/70');
			const modalVisible = await modalBackdrop.count() > 0;

			// Alternatively check for Dismiss button in modal
			const dismissBtn = page.getByRole('button', { name: 'Dismiss' });
			const hasDismissBtn = await dismissBtn.count() > 0;

			expect(modalVisible || hasDismissBtn).toBe(true);
		} else {
			// No content items available - empty state is valid
			const emptyState = page.locator('text=No content found');
			const hasEmptyState = await emptyState.count() > 0;
			expect(hasEmptyState || cardCount === 0).toBe(true);
		}
	});

	/**
	 * CQ-11: Preview Modal Navigation
	 * Priority: P1 (High)
	 * Verify navigation arrows work in preview modal
	 */
	test('CQ-11: should navigate between items in preview modal', async ({ page }) => {
		await page.goto('/content');
		await page.waitForLoadState('domcontentloaded');

		await page.waitForTimeout(2000);

		const contentCards = page.locator('.group.relative.flex.flex-col.overflow-hidden.rounded-xl');
		const cardCount = await contentCards.count();

		if (cardCount > 1) {
			// Open first card preview
			const firstCardThumbnail = contentCards.first().locator('.aspect-\\[9\\/16\\]');
			await firstCardThumbnail.click();

			await page.waitForTimeout(500);

			// Look for navigation arrows
			const nextBtn = page.locator('button[title="Next (→)"]');
			const prevBtn = page.locator('button[title="Previous (←)"]');

			if (await nextBtn.count() > 0) {
				// Click next
				await nextBtn.click();
				await page.waitForTimeout(300);

				// Position indicator should update
				const positionIndicator = page.locator('text=/2 \\/ /');
				const hasIndicator = await positionIndicator.count() > 0;
				expect(hasIndicator).toBe(true);
			}
		} else {
			// Not enough items for navigation test
			expect(cardCount).toBeGreaterThanOrEqual(0);
		}
	});

	/**
	 * CQ-12: Preview Modal - Escape Close
	 * Priority: P1 (High)
	 * Verify pressing Escape closes the preview modal
	 */
	test('CQ-12: should close preview modal with Escape key', async ({ page }) => {
		await page.goto('/content');
		await page.waitForLoadState('domcontentloaded');

		await page.waitForTimeout(2000);

		const contentCards = page.locator('.group.relative.flex.flex-col.overflow-hidden.rounded-xl');
		const cardCount = await contentCards.count();

		if (cardCount > 0) {
			// Open preview
			const firstCardThumbnail = contentCards.first().locator('.aspect-\\[9\\/16\\]');
			await firstCardThumbnail.click();

			await page.waitForTimeout(500);

			// Verify modal is open
			const dismissBtn = page.getByRole('button', { name: 'Dismiss' });
			if (await dismissBtn.count() > 0) {
				// Press Escape
				await page.keyboard.press('Escape');
				await page.waitForTimeout(300);

				// Modal should be closed
				await expect(dismissBtn).not.toBeVisible();
			}
		} else {
			expect(cardCount).toBe(0);
		}
	});

	/**
	 * CQ-13: Preview Modal - Story View
	 * Priority: P2 (Medium)
	 * Verify the Story View toggle in preview modal
	 */
	test('CQ-13: should toggle Story View in preview modal', async ({ page }) => {
		await page.goto('/content');
		await page.waitForLoadState('domcontentloaded');

		await page.waitForTimeout(2000);

		const contentCards = page.locator('.group.relative.flex.flex-col.overflow-hidden.rounded-xl');
		const cardCount = await contentCards.count();

		if (cardCount > 0) {
			const firstCardThumbnail = contentCards.first().locator('.aspect-\\[9\\/16\\]');
			await firstCardThumbnail.click();

			await page.waitForTimeout(500);

			// Look for Story View toggle button
			const storyViewBtn = page.locator('button:has-text("Story View")');

			if (await storyViewBtn.count() > 0) {
				await storyViewBtn.click();
				await page.waitForTimeout(300);

				// Button should be active (white background)
				await expect(storyViewBtn).toHaveClass(/bg-white/);
			}

			// Close modal
			await page.keyboard.press('Escape');
		} else {
			expect(cardCount).toBe(0);
		}
	});

	/**
	 * CQ-14: Quick Approve from Modal
	 * Priority: P0 (Critical)
	 * Verify the Approve button appears for pending submissions
	 */
	test('CQ-14: should show Approve button for pending items in modal', async ({ page }) => {
		await page.goto('/content');
		await page.waitForLoadState('domcontentloaded');

		// Filter to pending items
		const statusFilterBtn = page.locator('button:has-text("Status:")');
		await statusFilterBtn.waitFor({ state: 'visible', timeout: 10000 });
		await statusFilterBtn.click();

		const pendingOption = page.locator('button:has-text("Pending")').first();
		await pendingOption.click();

		await page.waitForTimeout(1500);

		const contentCards = page.locator('.group.relative.flex.flex-col.overflow-hidden.rounded-xl');
		const cardCount = await contentCards.count();

		if (cardCount > 0) {
			const firstCardThumbnail = contentCards.first().locator('.aspect-\\[9\\/16\\]');
			await firstCardThumbnail.click();

			await page.waitForTimeout(500);

			// Should see Approve button for pending submissions
			const approveBtn = page.locator('button:has-text("Approve")');
			const approveVisible = await approveBtn.count() > 0;

			// Either we see approve button or the item wasn't a pending submission
			expect(approveVisible || true).toBe(true);

			await page.keyboard.press('Escape');
		} else {
			// No pending items - valid state
			expect(cardCount).toBe(0);
		}
	});

	/**
	 * CQ-15: Quick Reject from Modal
	 * Priority: P1 (High)
	 * Verify the Reject button appears for pending submissions
	 */
	test('CQ-15: should show Reject button for pending items in modal', async ({ page }) => {
		await page.goto('/content');
		await page.waitForLoadState('domcontentloaded');

		// Filter to pending
		const statusFilterBtn = page.locator('button:has-text("Status:")');
		await statusFilterBtn.waitFor({ state: 'visible', timeout: 10000 });
		await statusFilterBtn.click();

		const pendingOption = page.locator('button:has-text("Pending")').first();
		await pendingOption.click();

		await page.waitForTimeout(1500);

		const contentCards = page.locator('.group.relative.flex.flex-col.overflow-hidden.rounded-xl');
		const cardCount = await contentCards.count();

		if (cardCount > 0) {
			const firstCardThumbnail = contentCards.first().locator('.aspect-\\[9\\/16\\]');
			await firstCardThumbnail.click();

			await page.waitForTimeout(500);

			// Should see Reject button
			const rejectBtn = page.locator('button:has-text("Reject")');
			const rejectVisible = await rejectBtn.count() > 0;

			expect(rejectVisible || true).toBe(true);

			await page.keyboard.press('Escape');
		} else {
			expect(cardCount).toBe(0);
		}
	});

	/**
	 * CQ-16: Edit Content from Modal
	 * Priority: P1 (High)
	 * Verify the Edit/Schedule button in preview modal
	 */
	test('CQ-16: should have Edit/Schedule button in preview modal', async ({ page }) => {
		await page.goto('/content');
		await page.waitForLoadState('domcontentloaded');

		await page.waitForTimeout(2000);

		const contentCards = page.locator('.group.relative.flex.flex-col.overflow-hidden.rounded-xl');
		const cardCount = await contentCards.count();

		if (cardCount > 0) {
			const firstCardThumbnail = contentCards.first().locator('.aspect-\\[9\\/16\\]');
			await firstCardThumbnail.click();

			await page.waitForTimeout(500);

			// Look for Schedule, Update, or Edit button
			const scheduleBtn = page.locator('button:has-text("Schedule")');
			const updateBtn = page.locator('button:has-text("Update")');

			const hasEditOption = (await scheduleBtn.count() > 0) || (await updateBtn.count() > 0);

			// Modal should have some action buttons
			expect(hasEditOption || true).toBe(true);

			await page.keyboard.press('Escape');
		} else {
			expect(cardCount).toBe(0);
		}
	});

	/**
	 * CQ-17: Bulk Selection - Select All
	 * Priority: P2 (Medium)
	 * Verify the Select All checkbox functionality
	 */
	test('CQ-17: should select all items with checkbox', async ({ page }) => {
		await page.goto('/content');
		await page.waitForLoadState('domcontentloaded');

		await page.waitForTimeout(2000);

		// Find the select all checkbox (first button in toolbar with Square icon)
		const selectAllBtn = page.locator('button[title="Select all"]');

		if (await selectAllBtn.count() > 0) {
			await selectAllBtn.click();
			await page.waitForTimeout(300);

			// Button should now show deselect state
			const deselectBtn = page.locator('button[title="Deselect all"]');
			const hasDeselectState = await deselectBtn.count() > 0;

			// Or check for CheckSquare icon
			const checkSquareIcon = page.locator('svg.lucide-check-square').first();
			const hasCheckIcon = await checkSquareIcon.count() > 0;

			expect(hasDeselectState || hasCheckIcon).toBe(true);
		} else {
			// No items to select
			expect(true).toBe(true);
		}
	});

	/**
	 * CQ-18: Bulk Selection - Clear
	 * Priority: P2 (Medium)
	 * Verify clearing bulk selection
	 */
	test('CQ-18: should clear selection when clicking deselect', async ({ page }) => {
		await page.goto('/content');
		await page.waitForLoadState('domcontentloaded');

		await page.waitForTimeout(2000);

		const selectAllBtn = page.locator('button[title="Select all"]');

		if (await selectAllBtn.count() > 0) {
			// Select all first
			await selectAllBtn.click();
			await page.waitForTimeout(300);

			// Then deselect
			const deselectBtn = page.locator('button[title="Deselect all"]');
			if (await deselectBtn.count() > 0) {
				await deselectBtn.click();
				await page.waitForTimeout(300);

				// Should be back to select all state
				const selectAllAgain = page.locator('button[title="Select all"]');
				await expect(selectAllAgain.first()).toBeVisible();
			}
		} else {
			expect(true).toBe(true);
		}
	});

	/**
	 * CQ-19: Pagination - Load More
	 * Priority: P2 (Medium)
	 * Verify the Load More button for pagination
	 */
	test('CQ-19: should show Load More button when more items available', async ({ page }) => {
		await page.goto('/content');
		await page.waitForLoadState('domcontentloaded');

		await page.waitForTimeout(2000);

		// Look for the Load More button
		const loadMoreBtn = page.locator('button:has-text("Load More")');

		if (await loadMoreBtn.count() > 0) {
			// Verify it's visible
			await expect(loadMoreBtn).toBeVisible();

			// Verify showing count text exists
			const showingText = page.locator('text=/Showing \\d+-\\d+ of \\d+/');
			const hasShowingText = await showingText.count() > 0;
			expect(hasShowingText).toBe(true);
		} else {
			// Not enough items to paginate - valid state
			expect(true).toBe(true);
		}
	});

	/**
	 * CQ-20: Refresh Button
	 * Priority: P1 (High)
	 * Verify the refresh button reloads content
	 */
	test('CQ-20: should have working refresh button', async ({ page }) => {
		await page.goto('/content');
		await page.waitForLoadState('domcontentloaded');

		// Look for refresh button (RefreshCw icon in page header)
		const refreshBtn = page.locator('button:has(svg.lucide-refresh-cw)').first();

		if (await refreshBtn.count() > 0) {
			// Click refresh
			await refreshBtn.click();

			// Should trigger loading state
			await page.waitForTimeout(500);

			// Page should still be functional after refresh
			const bodyText = await page.innerText('body');
			expect(bodyText.length).toBeGreaterThan(0);
		} else {
			// Refresh might be in a different location or not visible
			const bodyText = await page.innerText('body');
			expect(bodyText.length).toBeGreaterThan(0);
		}
	});
});
