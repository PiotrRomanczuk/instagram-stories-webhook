import { test, expect } from '@playwright/test';
import { signInAsAdmin, signInAsUser } from './helpers/auth';
import {
	createContent,
	createPendingContent,
	getTestMediaUrl,
	cleanupTestContent,
	getContentById,
} from './helpers/seed';

/**
 * Cross-User Data Isolation E2E Tests
 *
 * Verifies that data isolation between users is strictly enforced:
 * - Users can only see/edit/delete their own content
 * - Admins can access everything
 * - Tab-level permissions (review, rejected) are admin-only
 */
test.describe.serial('Cross-User Data Isolation', () => {
	let adminContentId: string;
	let userContentId: string;
	const createdIds: string[] = [];

	test.beforeAll(async ({ browser }) => {
		// Create admin content
		const adminCtx = await browser.newContext();
		const adminPage = await adminCtx.newPage();
		await signInAsAdmin(adminPage);

		adminContentId = await createContent(adminPage, {
			title: 'Admin Isolation Test Content',
			caption: 'Created by admin for isolation testing',
			mediaUrl: getTestMediaUrl(80),
			mediaType: 'IMAGE',
			source: 'submission',
			submissionStatus: 'approved',
			publishingStatus: 'draft',
		});
		createdIds.push(adminContentId);

		await adminCtx.close();

		// Create user content
		const userCtx = await browser.newContext();
		const userPage = await userCtx.newPage();
		await signInAsUser(userPage);

		userContentId = await createContent(userPage, {
			title: 'User Isolation Test Content',
			caption: 'Created by user for isolation testing',
			mediaUrl: getTestMediaUrl(81),
			mediaType: 'IMAGE',
			source: 'submission',
		});
		createdIds.push(userContentId);

		await userCtx.close();
	});

	test.afterAll(async ({ browser }) => {
		const ctx = await browser.newContext();
		const page = await ctx.newPage();
		await signInAsAdmin(page);
		await cleanupTestContent(page, createdIds);
		await ctx.close();
	});

	test('ISO-01: Admin can view any content item', async ({ page }) => {
		await signInAsAdmin(page);
		const res = await page.request.get(`/api/content/${adminContentId}`);
		expect(res.status()).toBe(200);
		const body = await res.json();
		expect(body.item.id).toBe(adminContentId);
	});

	test('ISO-02: User cannot view admin content', async ({ page }) => {
		await signInAsUser(page);
		const res = await page.request.get(`/api/content/${adminContentId}`);
		expect(res.status()).toBe(403);
	});

	test('ISO-03: User can view their own content', async ({ page }) => {
		await signInAsUser(page);
		const res = await page.request.get(`/api/content/${userContentId}`);
		expect(res.status()).toBe(200);
		const body = await res.json();
		expect(body.item.id).toBe(userContentId);
	});

	test('ISO-04: User cannot edit admin content', async ({ page }) => {
		await signInAsUser(page);
		const res = await page.request.patch(`/api/content/${adminContentId}`, {
			data: { caption: 'hacked', version: 0 },
		});
		expect(res.status()).toBe(403);
	});

	test('ISO-05: Admin can edit any content', async ({ page }) => {
		await signInAsAdmin(page);

		// Get current version first
		const getRes = await page.request.get(`/api/content/${userContentId}`);
		const { item } = await getRes.json();

		const res = await page.request.patch(`/api/content/${userContentId}`, {
			data: { caption: 'Admin edited this', version: item.version },
		});
		expect(res.status()).toBe(200);
		const body = await res.json();
		expect(body.item.caption).toBe('Admin edited this');
	});

	test('ISO-06: User cannot delete admin content', async ({ page }) => {
		await signInAsUser(page);
		const res = await page.request.delete(`/api/content/${adminContentId}`);
		expect(res.status()).toBe(403);
	});

	test('ISO-07: List endpoint filters by user', async ({ page }) => {
		await signInAsUser(page);
		const res = await page.request.get('/api/content');
		expect(res.status()).toBe(200);
		const body = await res.json();

		const ids = body.items.map((i: { id: string }) => i.id);
		expect(ids).not.toContain(adminContentId);
	});

	test('ISO-08: Queue tab scoped to own content for users', async ({ page }) => {
		await signInAsUser(page);
		const res = await page.request.get('/api/content?tab=queue');
		expect(res.status()).toBe(200);
		const body = await res.json();

		// All items in queue (if any) must not include admin content
		const ids = body.items.map((i: { id: string }) => i.id);
		expect(ids).not.toContain(adminContentId);
	});

	test('ISO-09: Review tab blocked for users', async ({ page }) => {
		await signInAsUser(page);
		const res = await page.request.get('/api/content?tab=review');
		expect(res.status()).toBe(403);
	});

	test('ISO-10: Rejected tab blocked for users', async ({ page }) => {
		await signInAsUser(page);
		const res = await page.request.get('/api/content?tab=rejected');
		expect(res.status()).toBe(403);
	});

	test('ISO-11: Admin list shows all content', async ({ page }) => {
		await signInAsAdmin(page);
		const res = await page.request.get('/api/content');
		expect(res.status()).toBe(200);
		const body = await res.json();

		const ids = body.items.map((i: { id: string }) => i.id);
		// Admin should see both admin and user content
		expect(ids).toContain(adminContentId);
		expect(ids).toContain(userContentId);
	});
});
