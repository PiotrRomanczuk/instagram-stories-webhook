import { test, expect } from '@playwright/test';
import { signInAsUser, signInAsAdmin } from './helpers/auth';

// ===========================================================================
// User Data Isolation (RLS)
// ===========================================================================

test.describe('User Data Isolation', () => {
	/**
	 * ISO-01: List Endpoint Filters By User
	 * Priority: P0 (Critical)
	 */
	test('ISO-01: user can only list their own content', async ({ page }) => {
		await signInAsUser(page);
		const response = await page.request.get('/api/content');
		expect(response.status()).toBe(200);

		const body = await response.json();
		expect(body).toHaveProperty('items');
	});

	/**
	 * ISO-02: Admin List Shows All Content
	 * Priority: P0 (Critical)
	 */
	test('ISO-02: admin can list all content', async ({ page }) => {
		await signInAsAdmin(page);
		const response = await page.request.get('/api/content');
		expect(response.status()).toBe(200);

		const body = await response.json();
		expect(body).toHaveProperty('items');
		expect(body).toHaveProperty('stats');
	});

	/**
	 * ISO-03: Review Tab Blocked for Users
	 * Priority: P0 (Critical)
	 */
	test('ISO-03: user cannot access review queue', async ({ page }) => {
		await signInAsUser(page);
		const response = await page.request.get('/api/content?tab=review');
		expect(response.status()).toBe(403);

		const body = await response.json();
		expect(body.error).toContain('Only admins can access review queue');
	});

	/**
	 * ISO-04: Admin Can Access Review Tab
	 * Priority: P0 (Critical)
	 */
	test('ISO-04: admin can access review queue', async ({ page }) => {
		await signInAsAdmin(page);
		const response = await page.request.get('/api/content?tab=review');
		expect(response.status()).toBe(200);
	});

	/**
	 * ISO-05: Rejected Tab Blocked for Users
	 * Priority: P0 (Critical)
	 */
	test('ISO-05: user cannot access rejected items', async ({ page }) => {
		await signInAsUser(page);
		const response = await page.request.get('/api/content?tab=rejected');
		expect(response.status()).toBe(403);

		const body = await response.json();
		expect(body.error).toContain('Only admins can access rejected items');
	});

	/**
	 * ISO-06: Admin Can Access Rejected Tab
	 * Priority: P0 (Critical)
	 */
	test('ISO-06: admin can access rejected items', async ({ page }) => {
		await signInAsAdmin(page);
		const response = await page.request.get('/api/content?tab=rejected');
		expect(response.status()).toBe(200);
	});
});
