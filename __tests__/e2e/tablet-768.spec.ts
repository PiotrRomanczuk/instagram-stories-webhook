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
// 768px - Tablet
// ---------------------------------------------------------------------------

test.describe('Tablet 768px', () => {
	test.use({ viewport: { width: 768, height: 1024 } });

	test.beforeEach(async ({ page }) => {
		await signInAsAdmin(page);
	});

	test('Dashboard: no horizontal scroll', async ({ page }) => {
		await page.goto('/');
		await page.waitForLoadState('networkidle');
		await assertNoHorizontalScroll(page);
	});

	test('Review Queue: no horizontal scroll', async ({ page }) => {
		await page.goto('/review');
		await page.waitForLoadState('networkidle');
		await assertNoHorizontalScroll(page);
	});

	test('Schedule: no horizontal scroll', async ({ page }) => {
		await page.goto('/schedule');
		await page.waitForLoadState('networkidle');
		await assertNoHorizontalScroll(page);
	});

	test('Submissions: no horizontal scroll', async ({ page }) => {
		await page.goto('/submissions');
		await page.waitForLoadState('networkidle');
		await assertNoHorizontalScroll(page);
	});

	test('Posted Stories: grid uses 3 columns on tablet', async ({ page }) => {
		await page.goto('/posted-stories');
		await page.waitForLoadState('networkidle');
		const grid = page.locator('.grid');
		if ((await grid.count()) > 0) {
			const gridCols = await grid.first().evaluate((el) => getComputedStyle(el).gridTemplateColumns);
			const colCount = gridCols.split(' ').length;
			// sm:grid-cols-3 kicks in at 640px, so at 768px we expect 3+ columns
			expect(colCount).toBeGreaterThanOrEqual(3);
		}
	});

	test('Submit form: no horizontal scroll', async ({ page }) => {
		await page.goto('/submit');
		await page.waitForLoadState('networkidle');
		await assertNoHorizontalScroll(page);
	});
});
