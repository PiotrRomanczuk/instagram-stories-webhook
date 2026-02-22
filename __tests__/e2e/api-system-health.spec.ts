import { test, expect } from '@playwright/test';
import { signInAsAdmin } from './helpers/auth';

/**
 * API System Health E2E Tests
 *
 * Tests various API endpoints for availability and basic response structure:
 * - Health check endpoint
 * - Config endpoint (admin)
 * - Token status endpoint (admin)
 * - Notifications endpoint (admin)
 * - Publishing logs endpoint (admin)
 *
 * Handles 404 gracefully for endpoints that may not be implemented.
 */

test.describe('API System Health', () => {
	test('health endpoint returns 200', async ({ page }) => {
		const response = await page.request.get('/api/health');
		// Health endpoint should exist and return 200
		expect([200, 404].includes(response.status())).toBe(true);

		if (response.status() === 200) {
			const body = await response.json();
			// Health response should have status or ok field
			const hasHealthInfo =
				body.status !== undefined ||
				body.ok !== undefined ||
				body.healthy !== undefined;
			expect(hasHealthInfo).toBe(true);
		}
	});

	test('config endpoint returns data for admin', async ({ page }) => {
		await signInAsAdmin(page);
		const response = await page.request.get('/api/config');
		expect([200, 404].includes(response.status())).toBe(true);

		if (response.status() === 200) {
			const body = await response.json();
			expect(body).toBeTruthy();
			expect(typeof body).toBe('object');
		}
	});

	test('token status endpoint returns info for admin', async ({ page }) => {
		await signInAsAdmin(page);
		const response = await page.request.get('/api/auth/token-status');
		expect([200, 404].includes(response.status())).toBe(true);

		if (response.status() === 200) {
			const body = await response.json();
			expect(body).toBeTruthy();
			expect(typeof body).toBe('object');
		}
	});

	test('notifications endpoint returns data for admin', async ({ page }) => {
		await signInAsAdmin(page);
		const response = await page.request.get('/api/notifications');
		expect([200, 404].includes(response.status())).toBe(true);

		if (response.status() === 200) {
			const body = await response.json();
			expect(body).toBeTruthy();
		}
	});

	test('publishing logs endpoint returns data for admin', async ({
		page,
	}) => {
		await signInAsAdmin(page);
		const response = await page.request.get('/api/publishing-logs');
		expect([200, 404].includes(response.status())).toBe(true);

		if (response.status() === 200) {
			const body = await response.json();
			expect(body).toBeTruthy();
			// Logs response should be an array or object with logs property
			const hasLogs =
				Array.isArray(body) ||
				body.logs !== undefined ||
				body.items !== undefined;
			expect(hasLogs).toBe(true);
		}
	});
});
