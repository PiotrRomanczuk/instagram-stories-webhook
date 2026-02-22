import { test, expect } from '@playwright/test';
import { signInAsAdmin } from './helpers/auth';

/**
 * Schedule Calendar Advanced E2E Tests
 *
 * Tests the /schedule page for admin users:
 * - Page loading and rendering
 * - Calendar/timeline view rendering
 * - View switching (month/week/list)
 * - Calendar navigation (next/prev)
 * - Error boundary checks
 * - Tablet responsive layout
 */

test.describe('Schedule Calendar Advanced', () => {
	test.beforeEach(async ({ page }) => {
		await signInAsAdmin(page);
	});

	test('schedule page loads at /schedule', async ({ page }) => {
		await page.goto('/schedule');
		await page.waitForLoadState('domcontentloaded');
		await expect(page).toHaveURL(/\/(en\/)?schedule/);
		const bodyText = await page.innerText('body');
		expect(bodyText).toMatch(/schedule|calendar|timeline|content/i);
	});

	test('calendar or timeline renders content', async ({ page }) => {
		await page.goto('/schedule');
		await page.waitForLoadState('domcontentloaded');
		await page.waitForTimeout(2000);
		const bodyText = await page.innerText('body');
		expect(bodyText.length).toBeGreaterThan(50);
	});

	test('view switching works if buttons exist', async ({ page }) => {
		await page.goto('/schedule');
		await page.waitForLoadState('domcontentloaded');
		await page.waitForTimeout(1000);
		// Look for view toggle buttons (month/week/day/list)
		const viewButtons = page
			.locator('button')
			.filter({ hasText: /month|week|day|list/i });
		if ((await viewButtons.count()) > 0) {
			await viewButtons.first().click();
			await page.waitForTimeout(500);
			await expect(
				page.locator('text=Something went wrong')
			).not.toBeVisible();
		}
	});

	test('calendar navigation works if buttons exist', async ({ page }) => {
		await page.goto('/schedule');
		await page.waitForLoadState('domcontentloaded');
		await page.waitForTimeout(1000);
		// Look for next/prev navigation buttons (chevrons or arrows)
		const navButtons = page.locator(
			'button:has(.lucide-chevron-right), button:has(.lucide-chevron-left), button:has(.lucide-arrow-right), button:has(.lucide-arrow-left)'
		);
		if ((await navButtons.count()) > 0) {
			await navButtons.first().click();
			await page.waitForTimeout(500);
			await expect(
				page.locator('text=Something went wrong')
			).not.toBeVisible();
		}
	});

	test('no error boundary on schedule page', async ({ page }) => {
		await page.goto('/schedule');
		await page.waitForLoadState('domcontentloaded');
		await page.waitForTimeout(2000);
		await expect(
			page.locator('text=Something went wrong')
		).not.toBeVisible();
	});

	test('calendar no horizontal scroll on tablet', async ({ page }) => {
		await page.setViewportSize({ width: 768, height: 1024 });
		await page.goto('/schedule');
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
