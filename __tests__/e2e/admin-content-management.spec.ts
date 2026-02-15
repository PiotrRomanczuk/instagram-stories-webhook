import { test, expect, Page } from '@playwright/test';
import { signInAsAdmin, signInAsUser } from './helpers/auth';
import {
	createContent,
	createPendingContent,
	createApprovedContent,
	createScheduledContent,
	createFailedContent,
	getContentById,
	getTestMediaUrl,
	cleanupTestContent,
	approveContent,
	rejectContent,
} from './helpers/seed';

// Admin Content Management E2E Tests (ACM-01 through ACM-19)
// Covers editing, deleting, review state machine, validation, and optimistic locking.

test.describe.configure({ retries: 2 });

async function signInAdminAndVerify(page: Page) {
	await signInAsAdmin(page);
	await expect(page).not.toHaveURL(/\/auth\/signin/, { timeout: 5000 });
}

// --- Content Editing (PATCH /api/content/[id]) ---

test.describe('Content Editing', () => {
	const createdIds: string[] = [];

	test.afterAll(async ({ browser }) => {
		if (createdIds.length === 0) return;
		const ctx = await browser.newContext();
		const page = await ctx.newPage();
		await signInAdminAndVerify(page);
		await cleanupTestContent(page, createdIds);
		await ctx.close();
	});

	test('ACM-01: cannot edit published content', async ({ page }) => {
		await signInAdminAndVerify(page);
		const id = await createScheduledContent(page, Date.now() - 3600000, {
			title: `ACM01 Published ${Date.now()}`,
		});
		createdIds.push(id);
		const item = await getContentById(page, id);
		expect(item).not.toBeNull();
		const pubRes = await page.request.patch(`/api/content/${id}`, {
			data: { publishingStatus: 'published', version: item!.version },
		});
		expect(pubRes.ok()).toBeTruthy();
		const published = await getContentById(page, id);
		const editRes = await page.request.patch(`/api/content/${id}`, {
			data: { caption: 'Should fail', version: published!.version },
		});
		expect(editRes.status()).toBe(400);
		expect((await editRes.json()).error).toBe('Cannot edit published content');
	});

	test('ACM-02: version field is required', async ({ page }) => {
		await signInAdminAndVerify(page);
		const id = await createPendingContent(page, { title: `ACM02 ${Date.now()}` });
		createdIds.push(id);
		const res = await page.request.patch(`/api/content/${id}`, {
			data: { caption: 'No version field' },
		});
		expect(res.status()).toBe(400);
		expect((await res.json()).error).toBe('version field is required for optimistic locking');
	});

	test('ACM-03: version must be a number', async ({ page }) => {
		await signInAdminAndVerify(page);
		const id = await createPendingContent(page, { title: `ACM03 ${Date.now()}` });
		createdIds.push(id);
		const res = await page.request.patch(`/api/content/${id}`, {
			data: { caption: 'Bad version', version: 'abc' },
		});
		expect(res.status()).toBe(400);
		expect((await res.json()).error).toBe('version must be a number');
	});

	test('ACM-04: version conflict detection', async ({ page }) => {
		await signInAdminAndVerify(page);
		const id = await createPendingContent(page, { title: `ACM04 ${Date.now()}` });
		createdIds.push(id);
		const item = await getContentById(page, id);
		expect(item).not.toBeNull();
		const staleVersion = item!.version!;
		const res1 = await page.request.patch(`/api/content/${id}`, {
			data: { caption: 'First edit', version: staleVersion },
		});
		expect(res1.ok()).toBeTruthy();
		const res2 = await page.request.patch(`/api/content/${id}`, {
			data: { caption: 'Stale edit', version: staleVersion },
		});
		expect(res2.status()).toBe(409);
		expect((await res2.json()).error).toContain('Version conflict');
	});

	test('ACM-05: caption length validation', async ({ page }) => {
		await signInAdminAndVerify(page);
		const id = await createPendingContent(page, { title: `ACM05 ${Date.now()}` });
		createdIds.push(id);
		const item = await getContentById(page, id);
		expect(item).not.toBeNull();
		const res = await page.request.patch(`/api/content/${id}`, {
			data: { caption: 'x'.repeat(2201), version: item!.version },
		});
		expect(res.status()).toBe(400);
		expect((await res.json()).error).toBe('Caption exceeds 2200 character limit');
	});

	// TODO: Re-enable after implementing error field RBAC
	// This test is currently skipped because the feature it tests doesn't exist.
	// The PATCH /api/content/[id] route doesn't accept or handle an 'error' field.
	// To fix:
	// 1. Add 'error?: string' to UpdateContentInput type (lib/types/posts.ts)
	// 2. Add RBAC check in PATCH route: only admin/developer can set error field
	// 3. Update updateContentItem function to handle error field (lib/content-db/mutations.ts)
	// Tracked in: https://linear.app/bms95/issue/INS-XXX (create Linear ticket)
	test.skip('ACM-06: only admins can set error field', async ({ page }) => {
		// Create content as user (so user owns it), then try setting error field
		await signInAsUser(page);
		await expect(page).not.toHaveURL(/\/auth\/signin/, { timeout: 5000 });
		const id = await createPendingContent(page, { title: `ACM06 ${Date.now()}` });
		createdIds.push(id);
		const item = await getContentById(page, id);
		expect(item).not.toBeNull();

		// User owns the content but should be denied setting error field
		const userRes = await page.request.patch(`/api/content/${id}`, {
			data: { error: 'user-set error', version: item!.version },
		});
		expect(userRes.status()).toBe(403);
		expect((await userRes.json()).error).toBe('Only admins can set the error field');

		// Admin can set error field on same content
		await signInAdminAndVerify(page);
		const freshItem = await getContentById(page, id);
		const adminRes = await page.request.patch(`/api/content/${id}`, {
			data: { error: 'admin-set error', version: freshItem!.version },
		});
		expect(adminRes.ok()).toBeTruthy();
	});
});

// --- Content Deletion (DELETE /api/content/[id]) ---

test.describe('Content Deletion', () => {
	test('ACM-07: cannot delete published content', async ({ page }) => {
		await signInAdminAndVerify(page);
		const id = await createScheduledContent(page, Date.now() - 3600000, {
			title: `ACM07 ${Date.now()}`,
		});
		const item = await getContentById(page, id);
		expect(item).not.toBeNull();
		await page.request.patch(`/api/content/${id}`, {
			data: { publishingStatus: 'published', version: item!.version },
		});
		const delRes = await page.request.delete(`/api/content/${id}`);
		expect(delRes.status()).toBe(400);
		expect((await delRes.json()).error).toBe('Cannot delete published content');
	});

	test('ACM-08: admin can delete draft content', async ({ page }) => {
		await signInAdminAndVerify(page);
		const id = await createApprovedContent(page, { title: `ACM08 ${Date.now()}` });
		const delRes = await page.request.delete(`/api/content/${id}`);
		expect(delRes.ok()).toBeTruthy();
		expect(await getContentById(page, id)).toBeNull();
	});

	test('ACM-09: admin can delete scheduled content', async ({ page }) => {
		await signInAdminAndVerify(page);
		const id = await createScheduledContent(page, Date.now() + 86400000, {
			title: `ACM09 ${Date.now()}`,
		});
		const delRes = await page.request.delete(`/api/content/${id}`);
		expect(delRes.ok()).toBeTruthy();
		expect(await getContentById(page, id)).toBeNull();
	});

	test('ACM-10: admin can delete failed content', async ({ page }) => {
		await signInAdminAndVerify(page);
		const id = await createFailedContent(page, { title: `ACM10 ${Date.now()}` });
		const delRes = await page.request.delete(`/api/content/${id}`);
		expect(delRes.ok()).toBeTruthy();
		expect(await getContentById(page, id)).toBeNull();
	});
});

// --- Review State Machine (POST /api/content/[id]/review) ---

test.describe('Review State Machine', () => {
	const createdIds: string[] = [];

	test.afterAll(async ({ browser }) => {
		if (createdIds.length === 0) return;
		const ctx = await browser.newContext();
		const page = await ctx.newPage();
		await signInAdminAndVerify(page);
		await cleanupTestContent(page, createdIds);
		await ctx.close();
	});

	test('ACM-11: cannot review non-submission content', async ({ page }) => {
		await signInAdminAndVerify(page);
		const id = await createContent(page, {
			source: 'direct',
			mediaUrl: getTestMediaUrl(11),
			mediaType: 'IMAGE',
			caption: `ACM11 Direct ${Date.now()}`,
		});
		createdIds.push(id);
		const res = await page.request.post(`/api/content/${id}/review`, {
			data: { action: 'approve' },
		});
		expect(res.status()).toBe(400);
		expect((await res.json()).error).toBe('Can only review submissions');
	});

	test('ACM-12: cannot approve already-approved submission', async ({ page }) => {
		await signInAdminAndVerify(page);
		const id = await createPendingContent(page, { title: `ACM12 ${Date.now()}` });
		createdIds.push(id);
		await approveContent(page, id);
		const res = await page.request.post(`/api/content/${id}/review`, {
			data: { action: 'approve' },
		});
		expect(res.status()).toBe(400);
		expect((await res.json()).error).toContain('already approved');
	});

	test('ACM-13: cannot reject already-rejected submission', async ({ page }) => {
		await signInAdminAndVerify(page);
		const id = await createPendingContent(page, { title: `ACM13 ${Date.now()}` });
		createdIds.push(id);
		await rejectContent(page, id, 'First rejection reason');
		const res = await page.request.post(`/api/content/${id}/review`, {
			data: { action: 'reject', rejectionReason: 'Second reason' },
		});
		expect(res.status()).toBe(400);
		expect((await res.json()).error).toContain('already rejected');
	});

	test('ACM-14: reject without reason returns 400', async ({ page }) => {
		await signInAdminAndVerify(page);
		const id = await createPendingContent(page, { title: `ACM14 ${Date.now()}` });
		createdIds.push(id);
		const res = await page.request.post(`/api/content/${id}/review`, {
			data: { action: 'reject' },
		});
		expect(res.status()).toBe(400);
		expect((await res.json()).error).toBe('rejectionReason is required when rejecting');
	});

	test('ACM-15: invalid action returns 400', async ({ page }) => {
		await signInAdminAndVerify(page);
		const id = await createPendingContent(page, { title: `ACM15 ${Date.now()}` });
		createdIds.push(id);
		const res = await page.request.post(`/api/content/${id}/review`, {
			data: { action: 'invalid' },
		});
		expect(res.status()).toBe(400);
		expect((await res.json()).error).toBe('action must be "approve" or "reject"');
	});

	test('ACM-16: approve changes submissionStatus to approved', async ({ page }) => {
		await signInAdminAndVerify(page);
		const id = await createPendingContent(page, { title: `ACM16 ${Date.now()}` });
		createdIds.push(id);
		await approveContent(page, id);
		const item = await getContentById(page, id);
		expect(item).not.toBeNull();
		expect(item!.submissionStatus).toBe('approved');
	});
});

// --- Content Creation Validation (POST /api/content) ---

test.describe('Content Creation Validation', () => {
	test('ACM-17: missing required fields returns 400', async ({ page }) => {
		await signInAdminAndVerify(page);
		const res = await page.request.post('/api/content', { data: {} });
		expect(res.status()).toBe(400);
		expect((await res.json()).error).toBe('Missing required fields: source, mediaUrl, mediaType');
	});

	test('ACM-18: invalid source returns 400', async ({ page }) => {
		await signInAdminAndVerify(page);
		const res = await page.request.post('/api/content', {
			data: { source: 'invalid', mediaUrl: getTestMediaUrl(18), mediaType: 'IMAGE' },
		});
		expect(res.status()).toBe(400);
		expect((await res.json()).error).toContain('Invalid source');
	});

	test('ACM-19: caption too long on creation returns 400', async ({ page }) => {
		await signInAdminAndVerify(page);
		const res = await page.request.post('/api/content', {
			data: {
				source: 'submission',
				mediaUrl: getTestMediaUrl(19),
				mediaType: 'IMAGE',
				caption: 'y'.repeat(2201),
			},
		});
		expect(res.status()).toBe(400);
		expect((await res.json()).error).toBe('Caption exceeds 2200 character limit');
	});
});
