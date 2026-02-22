import { test, expect } from '@playwright/test';
import { signInAsAdmin } from './helpers/auth';

test.describe('CP-8: Schedule Page Stability', () => {
	test('CP-8.1: schedule page loads without error boundary on desktop', async ({
		page,
	}) => {
		await signInAsAdmin(page);
		await page.goto('/schedule');
		await page.waitForLoadState('domcontentloaded');

		await expect(page).toHaveURL(/\/(en\/)?schedule/);

		// Must NOT show error boundary
		await expect(page.locator('text=Something went wrong')).not.toBeVisible();

		// Should show schedule UI elements
		const bodyText = await page.innerText('body');
		expect(bodyText).toMatch(/scheduled|calendar|ready|timeline/i);
	});

	test('CP-8.2: schedule page loads without error boundary on mobile viewport', async ({
		page,
	}) => {
		await page.setViewportSize({ width: 390, height: 844 }); // iPhone 14
		await signInAsAdmin(page);
		await page.goto('/schedule');
		await page.waitForLoadState('domcontentloaded');

		await expect(page).toHaveURL(/\/(en\/)?schedule/);

		// Must NOT show error boundary (this was the iOS crash)
		await expect(page.locator('text=Something went wrong')).not.toBeVisible();

		// Should show mobile schedule elements
		const bodyText = await page.innerText('body');
		expect(bodyText).toMatch(/scheduled|all|published|failed/i);
	});
});
