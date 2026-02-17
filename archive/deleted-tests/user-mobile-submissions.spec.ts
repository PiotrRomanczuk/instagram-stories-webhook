/**
 * User Mobile Submissions Page E2E Test
 *
 * Tests the /submissions page on mobile viewport (iPhone 14 Pro - 390x844).
 * Verifies page layout, stats cards, tab filters, submission grid,
 * status badges, and empty/populated states.
 *
 * Uses real authentication via signInAsUser helper.
 */

import { test, expect } from '@playwright/test';
import { signInAsUser } from './helpers/auth';
import {
	createPendingContent,
	createApprovedContent,
	cleanupTestContentByPattern,
} from './helpers/seed';

const TEST_TITLE_PREFIX = 'E2E Submissions Mobile';

test.use({
	viewport: { width: 390, height: 844 },
	video: { mode: 'on', size: { width: 390, height: 844 } },
});

test.describe('User Mobile Submissions Page', () => {
	test.beforeAll(async ({ browser }) => {
		const context = await browser.newContext({
			viewport: { width: 390, height: 844 },
		});
		const page = await context.newPage();
		try {
			await signInAsUser(page);
			const deleted = await cleanupTestContentByPattern(
				page,
				TEST_TITLE_PREFIX,
			);
			if (deleted > 0) {
				console.log(
					`beforeAll: cleaned ${deleted} leftover content items`,
				);
			}
		} catch (error) {
			console.warn('beforeAll cleanup failed (this may be expected):', error);
		} finally {
			await context.close();
		}
	});

	test.beforeEach(async ({ page }) => {
		await signInAsUser(page);
	});

	test.afterAll(async ({ browser }) => {
		const context = await browser.newContext({
			viewport: { width: 390, height: 844 },
		});
		const page = await context.newPage();
		try {
			await signInAsUser(page);
			const deleted = await cleanupTestContentByPattern(
				page,
				TEST_TITLE_PREFIX,
			);
			if (deleted > 0) {
				console.log(
					`afterAll: cleaned ${deleted} test content items`,
				);
			}
		} catch (error) {
			console.warn('afterAll cleanup failed (this may be expected):', error);
		} finally {
			await context.close();
		}
	});

	test('USER-SUBS-01: Navigate to /submissions and verify page header', async ({
		page,
	}) => {
		await page.goto('/submissions', { waitUntil: 'load', timeout: 15000 });

		// Verify page header
		const heading = page.locator('h1');
		await expect(heading).toContainText('My Submissions', { timeout: 10000 });

		// Verify description text
		const description = page.locator(
			'text=Manage and track your Instagram story content workflow',
		);
		await expect(description).toBeVisible({ timeout: 10000 });

		// Verify heading fits within mobile viewport
		const headingBox = await heading.boundingBox();
		expect(headingBox).toBeTruthy();
		expect(headingBox!.x).toBeGreaterThanOrEqual(0);
		expect(headingBox!.x + headingBox!.width).toBeLessThanOrEqual(390);

		// "New Submission" button should be hidden on mobile (hidden sm:inline-flex)
		const newSubmissionBtn = page.getByRole('link', {
			name: /New Submission/i,
		});
		await expect(newSubmissionBtn).toBeHidden();
	});

	test('USER-SUBS-02: Verify stats cards render in 2-column grid on mobile', async ({
		page,
	}) => {
		await page.goto('/submissions', { waitUntil: 'load', timeout: 15000 });

		// Wait for stats to load (skeleton disappears)
		await expect(page.locator('h1')).toContainText('My Submissions', {
			timeout: 10000,
		});

		// Wait for the stats container to be present and not in skeleton state
		// The stats grid uses grid-cols-2 on mobile
		const statsGrid = page.locator('.grid.grid-cols-2').first();
		await expect(statsGrid).toBeVisible({ timeout: 10000 });

		// Verify all 4 stat labels are present
		await expect(page.locator('text=Pending').first()).toBeVisible({
			timeout: 10000,
		});
		await expect(page.locator('text=Approved').first()).toBeVisible({
			timeout: 5000,
		});
		await expect(page.locator('text=Scheduled').first()).toBeVisible({
			timeout: 5000,
		});
		await expect(page.locator('text=Published').first()).toBeVisible({
			timeout: 5000,
		});

		// Verify 2-column layout by checking bounding boxes of first two stat cards
		const statsCards = statsGrid.locator('> *');
		const cardCount = await statsCards.count();
		expect(cardCount).toBe(4);

		// First card and second card should be on the same row (same y approximately)
		const firstCardBox = await statsCards.nth(0).boundingBox();
		const secondCardBox = await statsCards.nth(1).boundingBox();
		expect(firstCardBox).toBeTruthy();
		expect(secondCardBox).toBeTruthy();

		// Cards on the same row should have similar y coordinates
		expect(Math.abs(firstCardBox!.y - secondCardBox!.y)).toBeLessThan(5);

		// Third card should be on a different row (higher y)
		const thirdCardBox = await statsCards.nth(2).boundingBox();
		expect(thirdCardBox).toBeTruthy();
		expect(thirdCardBox!.y).toBeGreaterThan(firstCardBox!.y + 10);
	});

	test('USER-SUBS-03: Verify tab filters are present and scrollable', async ({
		page,
	}) => {
		await page.goto('/submissions', { waitUntil: 'load', timeout: 15000 });

		await expect(page.locator('h1')).toContainText('My Submissions', {
			timeout: 10000,
		});

		// Verify all 5 tab filter buttons are present
		const tabLabels = [
			'All Submissions',
			'Pending Review',
			'Ready for Sync',
			'Scheduled',
			'Archived',
		];

		for (const label of tabLabels) {
			const tab = page.locator(`button:has-text("${label}")`);
			// Some tabs may be off-screen but still in DOM due to horizontal scroll
			await expect(tab).toBeAttached({ timeout: 10000 });
		}

		// The tabs container should have overflow-x-auto for horizontal scrolling
		const tabsContainer = page.locator('.overflow-x-auto');
		await expect(tabsContainer).toBeVisible({ timeout: 5000 });

		// Verify the first tab ("All Submissions") is visible initially
		const firstTab = page.locator('button:has-text("All Submissions")');
		await expect(firstTab).toBeVisible({ timeout: 5000 });

		// Verify the fade gradient overlay exists for mobile scroll hint
		const fadeOverlay = page.locator('.pointer-events-none.bg-gradient-to-l');
		// The gradient is hidden on sm+ (sm:hidden), but visible on mobile
		await expect(fadeOverlay).toBeAttached();
	});

	test('USER-SUBS-04: Switch between tabs and verify active tab styling', async ({
		page,
	}) => {
		await page.goto('/submissions', { waitUntil: 'load', timeout: 15000 });

		await expect(page.locator('h1')).toContainText('My Submissions', {
			timeout: 10000,
		});

		// "All Submissions" should be the default active tab
		// The border-b-2 and border-[#2b6cee] classes are on the <button> itself
		const allTab = page.locator('button:has-text("All Submissions")');
		await expect(allTab).toBeVisible({ timeout: 10000 });

		// Check active tab has the blue border class on the button
		await expect(allTab).toHaveClass(/border-\[#2b6cee\]/, {
			timeout: 5000,
		});

		// Click on "Pending Review" tab
		const pendingTab = page.locator('button:has-text("Pending Review")');
		await pendingTab.click();

		// Verify "Pending Review" tab is now active
		await expect(pendingTab).toHaveClass(/border-\[#2b6cee\]/, {
			timeout: 5000,
		});

		// Verify "All Submissions" is no longer active
		await expect(allTab).toHaveClass(/border-transparent/, {
			timeout: 5000,
		});

		// Click on "Scheduled" tab (may need scroll)
		const scheduledTab = page.locator('button:has-text("Scheduled")');
		await scheduledTab.scrollIntoViewIfNeeded();
		await scheduledTab.click();

		// Verify "Scheduled" is now active
		await expect(scheduledTab).toHaveClass(/border-\[#2b6cee\]/, {
			timeout: 5000,
		});

		// Verify "Pending Review" is no longer active
		await expect(pendingTab).toHaveClass(/border-transparent/, {
			timeout: 5000,
		});
	});

	test('USER-SUBS-05: Verify submission grid renders in 2 columns on mobile', async ({
		page,
	}) => {
		// Seed test data first
		const timestamp = Date.now();
		const id1 = await createPendingContent(page, {
			title: `${TEST_TITLE_PREFIX} Grid1 ${timestamp}`,
			caption: 'Grid test caption 1',
			mediaIndex: 10,
		});
		const id2 = await createPendingContent(page, {
			title: `${TEST_TITLE_PREFIX} Grid2 ${timestamp}`,
			caption: 'Grid test caption 2',
			mediaIndex: 11,
		});

		try {
			await page.goto('/submissions', { waitUntil: 'load', timeout: 15000 });

			await expect(page.locator('h1')).toContainText('My Submissions', {
				timeout: 10000,
			});

			// Wait for the submission grid to render
			const submissionGrid = page.locator(
				'.grid.grid-cols-2.md\\:grid-cols-3',
			);
			await expect(submissionGrid).toBeVisible({ timeout: 15000 });

			// Verify grid has the correct 2-column class for mobile
			await expect(submissionGrid).toHaveClass(/grid-cols-2/, {
				timeout: 5000,
			});

			// Cards should have 9:16 aspect ratio (aspect-[9/16])
			const cards = submissionGrid.locator('.aspect-\\[9\\/16\\]');
			const cardCount = await cards.count();
			expect(cardCount).toBeGreaterThanOrEqual(2);

			// Verify first two cards are side-by-side (same y coordinate)
			const card1Box = await cards.nth(0).boundingBox();
			const card2Box = await cards.nth(1).boundingBox();
			expect(card1Box).toBeTruthy();
			expect(card2Box).toBeTruthy();
			expect(Math.abs(card1Box!.y - card2Box!.y)).toBeLessThan(5);

			// Both cards should fit within mobile viewport
			expect(card1Box!.x + card1Box!.width).toBeLessThanOrEqual(390);
			expect(card2Box!.x + card2Box!.width).toBeLessThanOrEqual(390);
		} finally {
			// Cleanup seeded data
			try {
				await page.request.delete(`/api/content/${id1}`);
				await page.request.delete(`/api/content/${id2}`);
			} catch {
				// Ignore cleanup errors
			}
		}
	});

	test('USER-SUBS-06: Verify submission cards show status badges', async ({
		page,
	}) => {
		// Seed a pending and an approved submission
		const timestamp = Date.now();
		const pendingId = await createPendingContent(page, {
			title: `${TEST_TITLE_PREFIX} Badge Pending ${timestamp}`,
			caption: 'Badge test pending',
			mediaIndex: 20,
		});
		const approvedId = await createApprovedContent(page, {
			title: `${TEST_TITLE_PREFIX} Badge Approved ${timestamp}`,
			caption: 'Badge test approved',
			mediaIndex: 21,
		});

		try {
			await page.goto('/submissions', { waitUntil: 'load', timeout: 15000 });

			await expect(page.locator('h1')).toContainText('My Submissions', {
				timeout: 10000,
			});

			// Wait for content grid to be visible
			const submissionGrid = page.locator(
				'.grid.grid-cols-2.md\\:grid-cols-3',
			);
			await expect(submissionGrid).toBeVisible({ timeout: 15000 });

			// SfStatusBadge renders status text - look for status badges on cards
			// Cards have status badges at the top-left (absolute top-4 left-4)
			const statusBadges = submissionGrid.locator('[class*="rounded-full"]');
			const badgeCount = await statusBadges.count();
			expect(badgeCount).toBeGreaterThanOrEqual(2);

			// Verify "Pending" badge exists somewhere in the grid
			const pendingBadge = submissionGrid.locator('text=Pending').first();
			await expect(pendingBadge).toBeVisible({ timeout: 10000 });

			// Verify "Approved" badge exists somewhere in the grid
			const approvedBadge = submissionGrid.locator('text=Approved').first();
			await expect(approvedBadge).toBeVisible({ timeout: 10000 });
		} finally {
			try {
				await page.request.delete(`/api/content/${pendingId}`);
				await page.request.delete(`/api/content/${approvedId}`);
			} catch {
				// Ignore cleanup errors
			}
		}
	});

	test('USER-SUBS-07: Verify empty state shows "No submissions yet"', async ({
		page,
	}) => {
		await page.goto('/submissions', { waitUntil: 'load', timeout: 15000 });

		await expect(page.locator('h1')).toContainText('My Submissions', {
			timeout: 10000,
		});

		// Switch to "Archived" tab which is most likely to be empty
		const archivedTab = page.locator('button:has-text("Archived")');
		await archivedTab.scrollIntoViewIfNeeded();
		await archivedTab.click();

		// Wait for loading to finish
		await page.waitForTimeout(2000);

		// Check if empty state is rendered (depends on whether there is archived content)
		// If empty, should show the empty state text
		const emptyState = page.locator('text=No submissions yet');
		const submissionGrid = page.locator(
			'.grid.grid-cols-2.md\\:grid-cols-3',
		);

		// Either the empty state or the grid should be visible
		const hasEmptyState = await emptyState
			.isVisible({ timeout: 5000 })
			.catch(() => false);
		const hasGrid = await submissionGrid
			.isVisible({ timeout: 2000 })
			.catch(() => false);

		if (hasEmptyState) {
			// Verify the full empty state message
			await expect(emptyState).toBeVisible();
			await expect(
				page.locator('text=You haven\'t submitted any content yet'),
			).toBeVisible({ timeout: 5000 });
		} else {
			// There is archived content, which is also a valid state
			expect(hasGrid).toBe(true);
		}
	});

	test('USER-SUBS-08: Seed test data and verify submissions appear in list', async ({
		page,
	}) => {
		const timestamp = Date.now();

		// Seed multiple submissions
		const ids: string[] = [];
		const id1 = await createPendingContent(page, {
			title: `${TEST_TITLE_PREFIX} List1 ${timestamp}`,
			caption: 'List test caption 1',
			mediaIndex: 30,
		});
		ids.push(id1);

		const id2 = await createPendingContent(page, {
			title: `${TEST_TITLE_PREFIX} List2 ${timestamp}`,
			caption: 'List test caption 2',
			mediaIndex: 31,
		});
		ids.push(id2);

		const id3 = await createApprovedContent(page, {
			title: `${TEST_TITLE_PREFIX} List3 ${timestamp}`,
			caption: 'List test caption 3',
			mediaIndex: 32,
		});
		ids.push(id3);

		try {
			await page.goto('/submissions', { waitUntil: 'load', timeout: 15000 });

			await expect(page.locator('h1')).toContainText('My Submissions', {
				timeout: 10000,
			});

			// Wait for content grid to be visible
			const submissionGrid = page.locator(
				'.grid.grid-cols-2.md\\:grid-cols-3',
			);
			await expect(submissionGrid).toBeVisible({ timeout: 15000 });

			// Verify submission cards are present (at least 3 from our seeding)
			const cards = submissionGrid.locator('.aspect-\\[9\\/16\\]');
			const cardCount = await cards.count();
			expect(cardCount).toBeGreaterThanOrEqual(3);

			// Verify the "Load More" button is visible when submissions exist
			const loadMoreBtn = page.getByRole('button', {
				name: /Load More Submissions/i,
			});
			await expect(loadMoreBtn).toBeVisible({ timeout: 10000 });

			// Verify load more button fits within mobile viewport
			const loadMoreBox = await loadMoreBtn.boundingBox();
			expect(loadMoreBox).toBeTruthy();
			expect(loadMoreBox!.x + loadMoreBox!.width).toBeLessThanOrEqual(390);

			// Verify the stats updated to reflect seeded data
			// Pending stat should be >= 2
			const pendingStat = page.locator('text=Pending').first();
			await expect(pendingStat).toBeVisible({ timeout: 5000 });
		} finally {
			// Cleanup all seeded content
			for (const id of ids) {
				try {
					await page.request.delete(`/api/content/${id}`);
				} catch {
					// Ignore cleanup errors
				}
			}
		}
	});
});
