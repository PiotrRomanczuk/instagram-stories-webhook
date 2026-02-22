import { test, expect } from '@playwright/test';
import { signInAsAdmin } from './helpers/auth';

/**
 * Schedule Mobile Page E2E Tests
 *
 * Covers:
 * - Page loads at /schedule-mobile on mobile viewport (390x844)
 * - Content or timeline elements render
 * - No horizontal scroll
 * - Touch targets meet 44px minimum
 */

test.describe('Schedule Mobile Page', () => {
	test.beforeEach(async ({ page }) => {
		await page.setViewportSize({ width: 390, height: 844 });
	});

	test('page loads at /schedule-mobile on mobile viewport', async ({ page }) => {
		await signInAsAdmin(page);
		await page.goto('/schedule-mobile');
		await page.waitForLoadState('domcontentloaded');

		await expect(page).toHaveURL(/\/(en\/)?schedule-mobile/);

		const bodyText = await page.innerText('body');
		expect(bodyText.length).toBeGreaterThan(50);
	});

	test('content or timeline elements render', async ({ page }) => {
		await signInAsAdmin(page);
		await page.goto('/schedule-mobile');
		await page.waitForLoadState('domcontentloaded');
		await page.waitForTimeout(2000);

		// Should render without error boundary
		await expect(page.locator('text=Something went wrong')).not.toBeVisible();

		const bodyText = await page.innerText('body');
		const hasScheduleContent =
			bodyText.match(/schedule|timeline|content|calendar|story|stories|queue/i) !== null;
		expect(hasScheduleContent).toBe(true);
	});

	test('no horizontal scroll', async ({ page }) => {
		await signInAsAdmin(page);
		await page.goto('/schedule-mobile');
		await page.waitForLoadState('domcontentloaded');
		await page.waitForTimeout(2000);

		const hasHorizontalScroll = await page.evaluate(() => {
			return document.documentElement.scrollWidth > document.documentElement.clientWidth;
		});
		expect(hasHorizontalScroll).toBe(false);
	});

	test('touch targets meet 44px minimum', async ({ page }) => {
		await signInAsAdmin(page);
		await page.goto('/schedule-mobile');
		await page.waitForLoadState('domcontentloaded');
		await page.waitForTimeout(2000);

		const elements = page.locator('button:visible, a:visible, [role="button"]:visible');
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
	});
});
