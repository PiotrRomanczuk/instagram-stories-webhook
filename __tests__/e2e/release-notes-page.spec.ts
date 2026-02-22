import { test, expect } from '@playwright/test';
import { signInAsAdmin } from './helpers/auth';

/**
 * Release Notes Page E2E Tests
 *
 * Covers:
 * - Admin access to /release-notes page
 * - Release notes display content (versions, features)
 * - Unauthenticated user redirect to sign-in
 */

test.describe('Release Notes Page', () => {
	test('admin can access release notes page', async ({ page }) => {
		await signInAsAdmin(page);
		await page.goto('/release-notes');
		await page.waitForLoadState('domcontentloaded');

		await expect(page).toHaveURL(/\/(en\/)?release-notes/);

		const bodyText = await page.innerText('body');
		expect(bodyText.length).toBeGreaterThan(50);
	});

	test('release notes display content', async ({ page }) => {
		await signInAsAdmin(page);
		await page.goto('/release-notes');
		await page.waitForLoadState('domcontentloaded');
		await page.waitForTimeout(2000);

		// Should render without error boundary
		await expect(page.locator('text=Something went wrong')).not.toBeVisible();

		const bodyText = await page.innerText('body');
		const hasReleaseContent =
			bodyText.match(/release|version|feature|update|changelog|v\d+\.\d+/i) !== null;
		expect(hasReleaseContent).toBe(true);
	});

	test('unauthenticated user redirected to sign-in', async ({ page }) => {
		await page.goto('/release-notes');
		await expect(page).toHaveURL(/\/(en\/)?auth\/signin/);
	});
});
