import { test, expect } from '@playwright/test';
import { signInAsAdmin } from './helpers/auth';

/**
 * Content Hub Advanced E2E Tests
 *
 * Tests the /content page for admin users:
 * - Page loading and rendering
 * - View switching (kanban/list)
 * - Status filtering tabs
 * - Search functionality
 * - Error boundary checks
 * - Mobile responsive layout
 */

test.describe('Content Hub Advanced', () => {
	test.beforeEach(async ({ page }) => {
		await signInAsAdmin(page);
	});

	test('content hub loads at /content', async ({ page }) => {
		await page.goto('/content');
		await page.waitForLoadState('domcontentloaded');
		await expect(page).toHaveURL(/\/(en\/)?content/);
		const bodyText = await page.innerText('body');
		expect(bodyText).toMatch(/content|all|queue/i);
	});

	test('content page renders data or empty state', async ({ page }) => {
		await page.goto('/content');
		await page.waitForLoadState('domcontentloaded');
		await page.waitForTimeout(2000);
		const bodyText = await page.innerText('body');
		expect(bodyText.length).toBeGreaterThan(50);
	});

	test('view switching works if available', async ({ page }) => {
		await page.goto('/content');
		await page.waitForLoadState('domcontentloaded');
		await page.waitForTimeout(1000);
		// Look for view toggle buttons (kanban/list)
		const viewButtons = page
			.locator('button')
			.filter({ hasText: /kanban|list|grid|board/i });
		if ((await viewButtons.count()) > 0) {
			await viewButtons.first().click();
			await page.waitForTimeout(500);
			// Should not crash
			await expect(
				page.locator('text=Something went wrong')
			).not.toBeVisible();
		}
	});

	test('content filtering by status tab works', async ({ page }) => {
		await page.goto('/content');
		await page.waitForLoadState('domcontentloaded');
		await page.waitForTimeout(1000);
		// Look for status tabs
		const tabs = page
			.locator('[role="tab"], button')
			.filter({ hasText: /pending|approved|scheduled|all/i });
		if ((await tabs.count()) > 0) {
			await tabs.first().click();
			await page.waitForTimeout(500);
			await expect(
				page.locator('text=Something went wrong')
			).not.toBeVisible();
		}
	});

	test('content search works if available', async ({ page }) => {
		await page.goto('/content');
		await page.waitForLoadState('domcontentloaded');
		const searchInput = page.locator(
			'input[type="search"], input[placeholder*="search" i]'
		);
		if ((await searchInput.count()) > 0) {
			await searchInput.first().fill('test');
			await page.waitForTimeout(1000);
			await expect(
				page.locator('text=Something went wrong')
			).not.toBeVisible();
		}
	});

	test('no error boundary on content page', async ({ page }) => {
		await page.goto('/content');
		await page.waitForLoadState('domcontentloaded');
		await page.waitForTimeout(2000);
		await expect(
			page.locator('text=Something went wrong')
		).not.toBeVisible();
	});

	test('content page no horizontal scroll on mobile', async ({ page }) => {
		await page.setViewportSize({ width: 390, height: 844 });
		await page.goto('/content');
		await page.waitForLoadState('domcontentloaded');
		await page.waitForTimeout(1000);
		const overflow = await page.evaluate(() => {
			return (
				document.documentElement.scrollWidth >
				document.documentElement.clientWidth
			);
		});
		expect(overflow).toBe(false);
	});
});
