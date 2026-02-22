import { test, expect } from '@playwright/test';
import { signInAsUser, signInAsAdmin } from './helpers/auth';

// ===========================================================================
// API Endpoint Permissions
// ===========================================================================

test.describe('API Endpoint Permissions', () => {
	/**
	 * API-01: Unauthenticated Requests Rejected
	 * Priority: P0 (Critical)
	 */
	test('API-01: unauthenticated request returns 401', async ({ page }) => {
		const response = await page.request.get('/api/content');
		expect(response.status()).toBe(401);
	});

	/**
	 * API-02: User Can Create Submissions
	 * Priority: P0 (Critical)
	 */
	test('API-02: user can create submission', async ({ page }) => {
		await signInAsUser(page);

		const response = await page.request.post('/api/content', {
			data: {
				source: 'submission',
				mediaUrl: `https://picsum.photos/id/90/1080/1920`,
				mediaType: 'IMAGE',
				title: `API-02 Test ${Date.now()}`,
				caption: 'Permission test',
			},
		});

		expect(response.status()).toBe(201);
	});

	/**
	 * API-03: User Cannot Create Direct Posts
	 * Priority: P0 (Critical)
	 */
	test('API-03: user cannot create direct scheduled post', async ({ page }) => {
		await signInAsUser(page);

		const response = await page.request.post('/api/content', {
			data: {
				source: 'direct',
				mediaUrl: `https://picsum.photos/id/91/1080/1920`,
				mediaType: 'IMAGE',
				title: `API-03 Test ${Date.now()}`,
				caption: 'Direct post test',
			},
		});

		expect(response.status()).toBe(403);
		const body = await response.json();
		expect(body.error).toContain('Only admins can create direct scheduled posts');
	});

	/**
	 * API-04: Admin Can Create Direct Posts
	 * Priority: P0 (Critical)
	 */
	test('API-04: admin can create direct post', async ({ page }) => {
		await signInAsAdmin(page);

		const response = await page.request.post('/api/content', {
			data: {
				source: 'direct',
				mediaUrl: `https://picsum.photos/id/92/1080/1920`,
				mediaType: 'IMAGE',
				title: `API-04 Test ${Date.now()}`,
				caption: 'Admin direct post',
			},
		});

		expect(response.status()).toBe(201);
	});

	/**
	 * API-05: User Cannot List Other Users
	 * Priority: P0 (Critical)
	 */
	test('API-05: user cannot list users', async ({ page }) => {
		await signInAsUser(page);

		const response = await page.request.get('/api/users');
		expect(response.status()).toBe(403);

		const body = await response.json();
		expect(body.error).toContain('Admin access required');
	});

	/**
	 * API-06: Admin Can List Users
	 * Priority: P0 (Critical)
	 */
	test('API-06: admin can list users', async ({ page }) => {
		await signInAsAdmin(page);

		const response = await page.request.get('/api/users');
		expect(response.status()).toBe(200);

		const body = await response.json();
		expect(body).toHaveProperty('users');
	});
});
