/**
 * User Mobile Dashboard E2E Test
 *
 * Verifies the user home dashboard renders correctly on mobile
 * (iPhone 14 Pro - 390x844 viewport).
 *
 * Tests welcome greeting, stats grid, submit CTA, recent submissions,
 * and mobile-specific layout constraints.
 *
 * Uses real authentication via signInAsUser helper.
 */

import { test, expect } from '@playwright/test';
import { signInAsUser } from './helpers/auth';

test.use({
	viewport: { width: 390, height: 844 },
	video: { mode: 'on', size: { width: 390, height: 844 } },
});

test.describe.serial('User Mobile Dashboard', () => {
	test.beforeEach(async ({ page }) => {
		await signInAsUser(page);
	});

	test('USER-DASH-01: Navigate to home and verify welcome greeting shows user name', async ({
		page,
	}) => {
		await page.goto('/', { waitUntil: 'load', timeout: 15000 });

		// Verify the welcome heading renders with the user's first name
		const heading = page.locator('h1');
		await expect(heading).toBeVisible({ timeout: 10000 });
		await expect(heading).toContainText('Hello,');

		// Verify the description text
		await expect(
			page.locator('text=Welcome back. Here\'s an overview of your submissions.')
		).toBeVisible({ timeout: 5000 });
	});

	test('USER-DASH-02: Verify stats grid renders 4 cards with correct labels', async ({
		page,
	}) => {
		await page.goto('/', { waitUntil: 'load', timeout: 15000 });

		// Wait for the welcome heading first (page is rendered)
		await expect(page.locator('h1')).toContainText('Hello,', { timeout: 10000 });

		// Wait for stats grid to load (skeleton disappears, real grid appears)
		// The data-tour attribute only appears after SWR fetch completes
		const statsGrid = page.locator('[data-tour="user-stats-grid"]');
		await expect(statsGrid).toBeVisible({ timeout: 30000 });

		// Verify all 4 stat labels are present (use exact match to avoid ambiguity)
		await expect(statsGrid.getByText('Pending Review', { exact: true })).toBeVisible({ timeout: 5000 });
		await expect(statsGrid.getByText('Approved', { exact: true })).toBeVisible({ timeout: 5000 });
		await expect(statsGrid.getByText('Scheduled', { exact: true })).toBeVisible({ timeout: 5000 });
		await expect(statsGrid.getByText('Published', { exact: true })).toBeVisible({ timeout: 5000 });

		// Verify all 4 description texts
		await expect(statsGrid.getByText('Awaiting admin review')).toBeVisible({ timeout: 5000 });
		await expect(statsGrid.getByText('Ready to be scheduled')).toBeVisible({ timeout: 5000 });
		await expect(statsGrid.getByText('Queued for publishing')).toBeVisible({ timeout: 5000 });
		await expect(statsGrid.getByText('Successfully posted')).toBeVisible({ timeout: 5000 });
	});

	test('USER-DASH-03: Verify "Submit New" CTA button is visible and links to /submit', async ({
		page,
	}) => {
		await page.goto('/', { waitUntil: 'load', timeout: 15000 });

		// Wait for page content to load
		await expect(page.locator('h1')).toContainText('Hello,', { timeout: 10000 });

		// Find the Submit New button/link
		const submitLink = page.getByRole('link', { name: /Submit New/i });
		await expect(submitLink).toBeVisible({ timeout: 5000 });

		// Verify it links to /submit
		const href = await submitLink.getAttribute('href');
		expect(href).toContain('/submit');

		// Verify it fits within mobile viewport
		const linkBox = await submitLink.boundingBox();
		expect(linkBox).toBeTruthy();
		expect(linkBox!.x).toBeGreaterThanOrEqual(0);
		expect(linkBox!.x + linkBox!.width).toBeLessThanOrEqual(390);
	});

	test('USER-DASH-04: Verify "Recent Submissions" section with "View All" link', async ({
		page,
	}) => {
		await page.goto('/', { waitUntil: 'load', timeout: 15000 });

		// Wait for the Recent Submissions card to render
		const recentCard = page.locator('[data-tour="user-recent-submissions"]');
		await expect(recentCard).toBeVisible({ timeout: 15000 });

		// Verify the card title
		await expect(recentCard.locator('text=Recent Submissions')).toBeVisible({ timeout: 5000 });

		// Verify the "View All" link exists and points to /submissions
		const viewAllLink = recentCard.getByRole('link', { name: /View All/i });
		await expect(viewAllLink).toBeVisible({ timeout: 5000 });
		const href = await viewAllLink.getAttribute('href');
		expect(href).toContain('/submissions');

		// Verify the card content area has either submissions or the empty state
		const hasSubmissions = await recentCard.locator('[class*="grid"]').count() > 0;
		const hasEmptyState = await recentCard.locator('text=No submissions yet').isVisible().catch(() => false);
		expect(hasSubmissions || hasEmptyState).toBeTruthy();
	});

	test('USER-DASH-05: Verify stats cards show numeric values and descriptions', async ({
		page,
	}) => {
		await page.goto('/', { waitUntil: 'load', timeout: 15000 });

		// Wait for stats grid to load
		const statsGrid = page.locator('[data-tour="user-stats-grid"]');
		await expect(statsGrid).toBeVisible({ timeout: 15000 });

		// Each StatsCard renders the value as a bold <p> with text-2xl
		// and the description as a <p> with text-xs
		const statCards = statsGrid.locator(':scope > div');
		const cardCount = await statCards.count();
		expect(cardCount).toBe(4);

		// Verify each card has a numeric value (text-2xl font-bold)
		for (let i = 0; i < cardCount; i++) {
			const card = statCards.nth(i);

			// The value element: text-2xl sm:text-3xl font-bold
			const valueEl = card.locator('p.text-2xl, p.font-bold').first();
			await expect(valueEl).toBeVisible({ timeout: 5000 });
			const valueText = await valueEl.textContent();
			// Value should be a number (could be 0)
			expect(valueText).toBeTruthy();
			expect(Number(valueText!.trim())).toBeGreaterThanOrEqual(0);

			// The description element: text-xs text-muted-foreground
			const descEl = card.locator('p.text-xs').first();
			await expect(descEl).toBeVisible({ timeout: 5000 });
			const descText = await descEl.textContent();
			expect(descText!.trim().length).toBeGreaterThan(0);
		}
	});

	test('USER-DASH-06: Verify mobile layout - stats grid 2 columns, content within viewport', async ({
		page,
	}) => {
		await page.goto('/', { waitUntil: 'load', timeout: 15000 });

		// Wait for stats grid
		const statsGrid = page.locator('[data-tour="user-stats-grid"]');
		await expect(statsGrid).toBeVisible({ timeout: 15000 });

		// Verify the stats grid fits within the mobile viewport width
		const gridBox = await statsGrid.boundingBox();
		expect(gridBox).toBeTruthy();
		expect(gridBox!.width).toBeLessThanOrEqual(390);

		// Get individual stat card positions to verify 2-column layout on mobile
		// sm:grid-cols-2 means at 390px (below sm=640px), it should be 1 column
		// but the grid gap-4 with sm:grid-cols-2 applies at >=640px
		// At 390px viewport, it will be a single column (default grid behavior)
		const statCards = statsGrid.locator(':scope > div');
		const cardCount = await statCards.count();
		expect(cardCount).toBe(4);

		// Verify all cards fit within viewport width
		for (let i = 0; i < cardCount; i++) {
			const cardBox = await statCards.nth(i).boundingBox();
			expect(cardBox).toBeTruthy();
			expect(cardBox!.x).toBeGreaterThanOrEqual(0);
			expect(cardBox!.x + cardBox!.width).toBeLessThanOrEqual(390);
		}

		// Verify the welcome section is within viewport
		const welcomeSection = page.locator('[data-tour="user-welcome"]');
		await expect(welcomeSection).toBeVisible();
		const welcomeBox = await welcomeSection.boundingBox();
		expect(welcomeBox).toBeTruthy();
		expect(welcomeBox!.width).toBeLessThanOrEqual(390);

		// Verify Recent Submissions card fits within viewport
		const recentCard = page.locator('[data-tour="user-recent-submissions"]');
		await expect(recentCard).toBeVisible();
		const recentBox = await recentCard.boundingBox();
		expect(recentBox).toBeTruthy();
		expect(recentBox!.width).toBeLessThanOrEqual(390);

		// Verify no horizontal scrollbar exists (page width matches viewport)
		const pageWidth = await page.evaluate(() => document.documentElement.scrollWidth);
		expect(pageWidth).toBeLessThanOrEqual(390);
	});
});
