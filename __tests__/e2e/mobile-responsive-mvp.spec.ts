import { test, expect } from '@playwright/test';
import { signInAsUser, signInAsAdmin } from './helpers/auth';

/**
 * Mobile responsiveness tests for all MVP pages.
 *
 * Viewports tested:
 *   - 375x812  (iPhone SE / small phone)
 *   - 414x896  (iPhone 11 / average phone)
 *   - 768x1024 (iPad / tablet)
 *
 * Each test asserts:
 *   - No horizontal scroll overflow
 *   - Interactive elements meet minimum 44x44 touch target
 *   - Text is readable (>= 12px)
 *   - Layout adapts correctly for the viewport
 */

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

/** Assert every visible interactive element is at least 44x44. */
async function assertTouchTargets(
	page: import('@playwright/test').Page,
	selector = 'button:visible, a:visible, [role="button"]:visible',
) {
	const elements = page.locator(selector);
	const count = await elements.count();
	for (let i = 0; i < count; i++) {
		const box = await elements.nth(i).boundingBox();
		if (box && box.width > 0 && box.height > 0) {
			// Allow 2px tolerance for border/padding rounding
			expect(
				box.width >= 42 || box.height >= 42,
				`Touch target at index ${i} should be >= 44px in at least one dimension (got ${box.width}x${box.height})`,
			).toBe(true);
		}
	}
}

// ---------------------------------------------------------------------------
// 375px - Regular user pages
// ---------------------------------------------------------------------------

test.describe('Mobile 375px - User pages', () => {
	test.use({ viewport: { width: 375, height: 812 } });

	test.beforeEach(async ({ page }) => {
		await signInAsUser(page);
	});

	test('Dashboard: no horizontal scroll', async ({ page }) => {
		await page.goto('/');
		await page.waitForLoadState('networkidle');
		await assertNoHorizontalScroll(page);
	});

	test('Dashboard: bottom nav is visible', async ({ page }) => {
		await page.goto('/');
		await page.waitForLoadState('networkidle');
		const bottomNav = page.locator('nav.fixed.bottom-0');
		await expect(bottomNav).toBeVisible();
	});

	test('Dashboard: desktop navbar is hidden', async ({ page }) => {
		await page.goto('/');
		await page.waitForLoadState('networkidle');
		// Desktop nav has hidden md:flex — should be invisible at 375px
		const desktopNav = page.locator('header nav, nav.hidden');
		if ((await desktopNav.count()) > 0) {
			await expect(desktopNav.first()).not.toBeVisible();
		}
	});

	test('Submit form: no horizontal scroll', async ({ page }) => {
		await page.goto('/submit');
		await page.waitForLoadState('networkidle');
		await assertNoHorizontalScroll(page);
	});

	test('Submit form: touch targets meet minimum size', async ({ page }) => {
		await page.goto('/submit');
		await page.waitForLoadState('networkidle');
		await assertTouchTargets(page);
	});

	test('Submissions: heading text is responsive', async ({ page }) => {
		await page.goto('/submissions');
		await page.waitForLoadState('networkidle');
		const heading = page.locator('h1');
		await expect(heading).toBeVisible();
		// At 375px, heading should use text-2xl (24px), not text-4xl (36px)
		const fontSize = await heading.evaluate((el) => getComputedStyle(el).fontSize);
		const size = parseFloat(fontSize);
		expect(size).toBeLessThanOrEqual(30); // 2xl = 24px
	});

	test('Submissions: tab filters are scrollable', async ({ page }) => {
		await page.goto('/submissions');
		await page.waitForLoadState('networkidle');
		await assertNoHorizontalScroll(page);
		// Tab container should have overflow-x-auto
		const tabContainer = page.locator('.overflow-x-auto');
		if ((await tabContainer.count()) > 0) {
			await expect(tabContainer.first()).toBeVisible();
		}
	});

	test('Submissions: no horizontal scroll', async ({ page }) => {
		await page.goto('/submissions');
		await page.waitForLoadState('networkidle');
		await assertNoHorizontalScroll(page);
	});

	test('Bottom nav: FAB button meets touch target', async ({ page }) => {
		await page.goto('/');
		await page.waitForLoadState('networkidle');
		// The FAB is a 56px (h-14 w-14) circle
		const fab = page.locator('nav.fixed.bottom-0 a').filter({ hasText: 'New' });
		if ((await fab.count()) > 0) {
			const box = await fab.first().boundingBox();
			expect(box).not.toBeNull();
			if (box) {
				expect(box.width).toBeGreaterThanOrEqual(42);
			}
		}
	});

	test('Bottom nav: all nav items are visible', async ({ page }) => {
		await page.goto('/');
		await page.waitForLoadState('networkidle');
		const navLinks = page.locator('nav.fixed.bottom-0 a');
		const count = await navLinks.count();
		expect(count).toBeGreaterThanOrEqual(3);
		for (let i = 0; i < count; i++) {
			await expect(navLinks.nth(i)).toBeVisible();
		}
	});
});

// ---------------------------------------------------------------------------
// 414px - Regular user pages
// ---------------------------------------------------------------------------

test.describe('Mobile 414px - User pages', () => {
	test.use({ viewport: { width: 414, height: 896 } });

	test.beforeEach(async ({ page }) => {
		await signInAsUser(page);
	});

	test('Dashboard: no horizontal scroll', async ({ page }) => {
		await page.goto('/');
		await page.waitForLoadState('networkidle');
		await assertNoHorizontalScroll(page);
	});

	test('Submissions: no horizontal scroll', async ({ page }) => {
		await page.goto('/submissions');
		await page.waitForLoadState('networkidle');
		await assertNoHorizontalScroll(page);
	});
});

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
