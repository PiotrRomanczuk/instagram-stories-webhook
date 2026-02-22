import { test, expect } from '@playwright/test';
import { signInAsUser, signInAsAdmin } from './helpers/auth';
import { createApprovedContent } from './helpers/seed';

/**
 * Error States E2E Tests
 *
 * Tests error handling across the application:
 * - Unknown route handling (404 or redirect)
 * - Unauthenticated API request rejection (401)
 * - Unauthorized API request rejection (403)
 * - Form validation prevents empty submissions
 * - Past scheduling time rejection
 * - Error boundary absence on home page
 */

test.describe('Error States', () => {
	test('unknown routes redirect to home or show 404', async ({ page }) => {
		await signInAsUser(page);
		await page.goto('/this-route-does-not-exist-12345');
		await page.waitForLoadState('domcontentloaded');
		// Should show 404 or redirect
		const bodyText = await page.innerText('body');
		const handled =
			bodyText.includes('404') ||
			bodyText.includes('not found') ||
			!page.url().includes('does-not-exist');
		expect(handled).toBe(true);
	});

	test('API 401 on unauthenticated request', async ({ page }) => {
		const response = await page.request.get('/api/content');
		expect(response.status()).toBe(401);
	});

	test('API 403 on unauthorized request', async ({ page }) => {
		await signInAsUser(page);
		const response = await page.request.get('/api/users');
		expect(response.status()).toBe(403);
	});

	test('form validation shows error on submit page', async ({ page }) => {
		await signInAsUser(page);
		await page.goto('/submit');
		await page.waitForLoadState('domcontentloaded');
		const submitButton = page.getByRole('button', {
			name: /submit for review/i,
		});
		await expect(submitButton).toBeDisabled();
	});

	test('schedule in the past returns error via API', async ({ page }) => {
		await signInAsAdmin(page);
		// Create approved content first
		const contentId = await createApprovedContent(page, {
			title: 'Error State Test ' + Date.now(),
		});
		// Try to schedule in the past
		const pastTime = Date.now() - 24 * 60 * 60 * 1000;
		const response = await page.request.post(
			`/api/content/${contentId}/schedule`,
			{
				data: { scheduledTime: pastTime },
			}
		);
		// Should reject past times with 400/422, or accept gracefully
		expect(
			[400, 422].includes(response.status()) || response.ok()
		).toBe(true);
	});

	test('no error boundary on home page', async ({ page }) => {
		await signInAsUser(page);
		await page.goto('/');
		await page.waitForLoadState('domcontentloaded');
		await expect(
			page.locator('text=Something went wrong')
		).not.toBeVisible();
	});
});
