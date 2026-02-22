import { test, expect } from '@playwright/test';
import { signInAsAdmin } from './helpers/auth';

/**
 * Content Filtering & Search E2E Tests
 *
 * Tests the /api/content endpoint filtering capabilities:
 * - Filtering by submission status (pending, approved)
 * - Search with non-existent query returns empty
 * - Limit parameter returns bounded results
 * - Default response structure (items array + stats)
 *
 * All tests use admin auth for full content access.
 */

test.describe('Content Filtering & Search', () => {
	test.beforeEach(async ({ page }) => {
		await signInAsAdmin(page);
	});

	test('filter by pending status returns 200', async ({ page }) => {
		const response = await page.request.get(
			'/api/content?submissionStatus=pending'
		);
		expect(response.status()).toBe(200);

		const body = await response.json();
		expect(body).toHaveProperty('items');
		expect(Array.isArray(body.items)).toBe(true);
	});

	test('filter by approved status returns 200', async ({ page }) => {
		const response = await page.request.get(
			'/api/content?submissionStatus=approved'
		);
		expect(response.status()).toBe(200);

		const body = await response.json();
		expect(body).toHaveProperty('items');
		expect(Array.isArray(body.items)).toBe(true);
	});

	test('search with non-existent query returns empty items', async ({
		page,
	}) => {
		const response = await page.request.get(
			'/api/content?search=NONEXISTENT_QUERY_12345'
		);
		expect(response.status()).toBe(200);

		const body = await response.json();
		expect(body).toHaveProperty('items');
		expect(body.items.length).toBe(0);
	});

	test('limit parameter returns bounded results', async ({ page }) => {
		const response = await page.request.get('/api/content?limit=2');
		expect(response.status()).toBe(200);

		const body = await response.json();
		expect(body).toHaveProperty('items');
		expect(body.items.length).toBeLessThanOrEqual(2);
	});

	test('default content response has items and stats', async ({ page }) => {
		const response = await page.request.get('/api/content');
		expect(response.status()).toBe(200);

		const body = await response.json();
		expect(body).toHaveProperty('items');
		expect(body).toHaveProperty('stats');
		expect(Array.isArray(body.items)).toBe(true);
	});
});
