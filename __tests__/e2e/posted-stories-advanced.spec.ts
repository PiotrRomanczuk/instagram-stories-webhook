import { test, expect } from '@playwright/test';
import { signInAsAdmin } from './helpers/auth';

/**
 * Posted Stories Advanced E2E Tests
 *
 * Tests the /posted-stories page for admin users:
 * - Page loading and rendering
 * - Content display or empty state
 * - Responsive grid layout (mobile, tablet, desktop)
 * - Error boundary checks
 */

test.describe('Posted Stories Advanced', () => {
	test.beforeEach(async ({ page }) => {
		await signInAsAdmin(page);
	});

	test('posted stories page loads at /posted-stories', async ({ page }) => {
		await page.goto('/posted-stories');
		await page.waitForLoadState('domcontentloaded');
		await expect(page).toHaveURL(/\/(en\/)?posted-stories/);
		const bodyText = await page.innerText('body');
		expect(bodyText).toMatch(/stories|published|posted|no.*stories|empty/i);
	});

	test('page displays content or empty state', async ({ page }) => {
		await page.goto('/posted-stories');
		await page.waitForLoadState('domcontentloaded');
		await page.waitForTimeout(2000);
		const bodyText = await page.innerText('body');
		// Should have meaningful content regardless of whether stories exist
		expect(bodyText.length).toBeGreaterThan(50);
	});

	test('grid layout is responsive without horizontal overflow', async ({
		page,
	}) => {
		const viewports = [
			{ width: 390, height: 844, label: 'mobile' },
			{ width: 768, height: 1024, label: 'tablet' },
			{ width: 1280, height: 800, label: 'desktop' },
		];

		for (const viewport of viewports) {
			await page.setViewportSize({
				width: viewport.width,
				height: viewport.height,
			});
			await page.goto('/posted-stories');
			await page.waitForLoadState('domcontentloaded');
			await page.waitForTimeout(1000);

			const overflow = await page.evaluate(() => {
				return (
					document.documentElement.scrollWidth >
					document.documentElement.clientWidth
				);
			});
			expect(overflow).toBe(false);
		}
	});

	test('empty state renders without error', async ({ page }) => {
		await page.goto('/posted-stories');
		await page.waitForLoadState('domcontentloaded');
		await page.waitForTimeout(2000);
		// Whether empty or populated, should not show error boundary
		await expect(
			page.locator('text=Something went wrong')
		).not.toBeVisible();
	});

	test('page loads without error on mobile viewport', async ({ page }) => {
		await page.setViewportSize({ width: 390, height: 844 });
		await page.goto('/posted-stories');
		await page.waitForLoadState('domcontentloaded');
		await page.waitForTimeout(2000);

		await expect(
			page.locator('text=Something went wrong')
		).not.toBeVisible();

		const bodyText = await page.innerText('body');
		expect(bodyText).toMatch(/stories|published|posted|no.*stories|empty/i);
	});
});
