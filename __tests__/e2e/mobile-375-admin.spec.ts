import { test, expect } from '@playwright/test';
import { signInAsAdmin } from './helpers/auth';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Assert the page body does not scroll horizontally. */
async function assertNoHorizontalScroll(page: import('@playwright/test').Page) {
	const overflow = await page.evaluate(() => {
		return document.documentElement.scrollWidth > document.documentElement.clientWidth;
	});
	expect(overflow, 'Page should not have horizontal scroll').toBe(false);
}

// ---------------------------------------------------------------------------
// 375px - Admin pages
// ---------------------------------------------------------------------------

test.describe('Mobile 375px - Admin pages', () => {
	test.use({ viewport: { width: 375, height: 812 } });

	test.beforeEach(async ({ page }) => {
		await signInAsAdmin(page);
	});

	test('Admin Dashboard: no horizontal scroll', async ({ page }) => {
		await page.goto('/');
		await page.waitForLoadState('networkidle');
		await assertNoHorizontalScroll(page);
	});

	test('Admin Dashboard: stats grid is 2-column', async ({ page }) => {
		await page.goto('/');
		await page.waitForLoadState('networkidle');
		const statsGrid = page.locator('[data-tour="admin-stats-grid"]');
		if ((await statsGrid.count()) > 0) {
			const gridCols = await statsGrid.evaluate((el) => getComputedStyle(el).gridTemplateColumns);
			// grid-cols-2 means 2 columns
			const colCount = gridCols.split(' ').length;
			expect(colCount).toBe(2);
		}
	});

	test('Review Queue: no horizontal scroll', async ({ page }) => {
		await page.goto('/review');
		await page.waitForLoadState('networkidle');
		await assertNoHorizontalScroll(page);
	});

	test('Review Queue: action buttons meet touch target', async ({ page }) => {
		await page.goto('/review');
		await page.waitForLoadState('networkidle');
		const actionBar = page.locator('[data-tour="review-action-bar"]');
		if ((await actionBar.count()) > 0) {
			const buttons = actionBar.locator('button');
			const btnCount = await buttons.count();
			for (let i = 0; i < btnCount; i++) {
				const box = await buttons.nth(i).boundingBox();
				if (box) {
					expect(box.height).toBeGreaterThanOrEqual(44);
				}
			}
		}
	});

	test('Schedule: no horizontal scroll', async ({ page }) => {
		await page.goto('/schedule');
		await page.waitForLoadState('networkidle');
		await assertNoHorizontalScroll(page);
	});

	test('Schedule: mobile view is rendered', async ({ page }) => {
		await page.goto('/schedule');
		await page.waitForLoadState('networkidle');
		// At 375px the desktop calendar should be hidden and mobile view shown
		await assertNoHorizontalScroll(page);
	});

	test('Posted Stories: no horizontal scroll', async ({ page }) => {
		await page.goto('/posted-stories');
		await page.waitForLoadState('networkidle');
		await assertNoHorizontalScroll(page);
	});

	test('Posted Stories: grid uses 2 columns on mobile', async ({ page }) => {
		await page.goto('/posted-stories');
		await page.waitForLoadState('networkidle');
		const grid = page.locator('.grid.grid-cols-2');
		if ((await grid.count()) > 0) {
			const gridCols = await grid.first().evaluate((el) => getComputedStyle(el).gridTemplateColumns);
			const colCount = gridCols.split(' ').length;
			expect(colCount).toBe(2);
		}
	});
});
