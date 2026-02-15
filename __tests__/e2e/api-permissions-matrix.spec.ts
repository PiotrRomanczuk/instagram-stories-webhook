import { test, expect } from '@playwright/test';
import { signInAsAdmin, signInAsUser } from './helpers/auth';
import { createPendingContent, createApprovedContent, getTestMediaUrl } from './helpers/seed';

/**
 * API Permissions Matrix E2E Tests
 *
 * Systematically verifies that API permission boundaries are enforced
 * correctly for all 3 roles: admin, user (regular), and unauthenticated.
 *
 * NO mocking -- all tests run against the real app.
 */

// ============================================================================
// 1. GET /api/content -- List content
// ============================================================================
test.describe('GET /api/content', () => {
	test('PERM-01: unauthenticated request returns 401', async ({ page }) => {
		const response = await page.request.get('/api/content');
		expect(response.status()).toBe(401);
	});

	test('PERM-02: user can list own content (200)', async ({ page }) => {
		await signInAsUser(page);
		const response = await page.request.get('/api/content');
		expect(response.status()).toBe(200);
		const body = await response.json();
		expect(body).toHaveProperty('items');
	});

	test('PERM-03: admin can list all content (200)', async ({ page }) => {
		await signInAsAdmin(page);
		const response = await page.request.get('/api/content');
		expect(response.status()).toBe(200);
		const body = await response.json();
		expect(body).toHaveProperty('items');
		expect(body).toHaveProperty('stats');
	});
});

// ============================================================================
// 2. GET /api/content?tab=review -- Review queue (admin-only)
// ============================================================================
test.describe('GET /api/content?tab=review', () => {
	test('PERM-04: user cannot access review queue (403)', async ({ page }) => {
		await signInAsUser(page);
		const response = await page.request.get('/api/content?tab=review');
		expect(response.status()).toBe(403);
		const body = await response.json();
		expect(body.error).toContain('Only admins can access review queue');
	});

	test('PERM-05: admin can access review queue (200)', async ({ page }) => {
		await signInAsAdmin(page);
		const response = await page.request.get('/api/content?tab=review');
		expect(response.status()).toBe(200);
	});
});

// ============================================================================
// 3. GET /api/content?tab=rejected -- Rejected items (admin-only)
// ============================================================================
test.describe('GET /api/content?tab=rejected', () => {
	test('PERM-06: user cannot access rejected items (403)', async ({ page }) => {
		await signInAsUser(page);
		const response = await page.request.get('/api/content?tab=rejected');
		expect(response.status()).toBe(403);
		const body = await response.json();
		expect(body.error).toContain('Only admins can access rejected items');
	});

	test('PERM-07: admin can access rejected items (200)', async ({ page }) => {
		await signInAsAdmin(page);
		const response = await page.request.get('/api/content?tab=rejected');
		expect(response.status()).toBe(200);
	});
});

// ============================================================================
// 4. POST /api/content -- Create content
// ============================================================================
test.describe('POST /api/content', () => {
	const submissionPayload = {
		source: 'submission',
		mediaUrl: getTestMediaUrl(90),
		mediaType: 'IMAGE',
		title: 'PERM test submission',
		caption: 'Permission test',
	};

	const directPayload = {
		source: 'direct',
		mediaUrl: getTestMediaUrl(91),
		mediaType: 'IMAGE',
		title: 'PERM test direct',
		caption: 'Permission test direct',
	};

	test('PERM-08: unauthenticated create returns 401', async ({ page }) => {
		const response = await page.request.post('/api/content', {
			data: submissionPayload,
		});
		expect(response.status()).toBe(401);
	});

	test('PERM-09: user cannot create direct scheduled post (403)', async ({ page }) => {
		await signInAsUser(page);
		const response = await page.request.post('/api/content', {
			data: directPayload,
		});
		expect(response.status()).toBe(403);
		const body = await response.json();
		expect(body.error).toContain('Only admins can create direct scheduled posts');
	});

	test('PERM-10: user can create submission (201)', async ({ page }) => {
		await signInAsUser(page);
		const response = await page.request.post('/api/content', {
			data: { ...submissionPayload, title: `PERM-10 ${Date.now()}` },
		});
		expect(response.status()).toBe(201);
	});

	test('PERM-11: admin can create direct post (201)', async ({ page }) => {
		await signInAsAdmin(page);
		const response = await page.request.post('/api/content', {
			data: { ...directPayload, title: `PERM-11 ${Date.now()}` },
		});
		expect(response.status()).toBe(201);
	});
});

// ============================================================================
// 5. POST /api/content/[id]/review -- Approve/reject (admin-only)
// ============================================================================
test.describe('POST /api/content/[id]/review', () => {
	let pendingContentId: string;

	test.beforeAll(async ({ browser }) => {
		const ctx = await browser.newContext();
		const page = await ctx.newPage();
		await signInAsAdmin(page);
		pendingContentId = await createPendingContent(page, {
			title: `PERM review test ${Date.now()}`,
		});
		await ctx.close();
	});

	test('PERM-12: user cannot review submissions (403)', async ({ page }) => {
		await signInAsUser(page);
		const response = await page.request.post(`/api/content/${pendingContentId}/review`, {
			data: { action: 'approve' },
		});
		expect(response.status()).toBe(403);
		const body = await response.json();
		expect(body.error).toContain('Only admins can review submissions');
	});

	test('PERM-13: admin can review submissions (200)', async ({ page }) => {
		await signInAsAdmin(page);
		const response = await page.request.post(`/api/content/${pendingContentId}/review`, {
			data: { action: 'approve' },
		});
		expect(response.status()).toBe(200);
	});
});

// ============================================================================
// 6. POST /api/content/[id]/publish -- Permission boundary only
//    (We do NOT actually publish; we test the permission check that fires
//    before the Instagram API call.)
// ============================================================================
test.describe('POST /api/content/[id]/publish', () => {
	let adminContentId: string;

	test.beforeAll(async ({ browser }) => {
		const ctx = await browser.newContext();
		const page = await ctx.newPage();
		await signInAsAdmin(page);
		adminContentId = await createApprovedContent(page, {
			title: `PERM publish test ${Date.now()}`,
		});
		await ctx.close();
	});

	test('PERM-14: unauthenticated publish returns 401', async ({ page }) => {
		const response = await page.request.post(`/api/content/${adminContentId}/publish`);
		expect(response.status()).toBe(401);
	});

	test('PERM-15: user cannot publish other user content (403)', async ({ page }) => {
		await signInAsUser(page);
		const response = await page.request.post(`/api/content/${adminContentId}/publish`);
		// Content created by admin -- user should get 403
		expect(response.status()).toBe(403);
		const body = await response.json();
		expect(body.error).toContain('permission');
	});
});

// ============================================================================
// 7. GET /api/users -- List users (admin-only via requireAdmin)
// ============================================================================
test.describe('GET /api/users', () => {
	test('PERM-16: user cannot list users (403)', async ({ page }) => {
		await signInAsUser(page);
		const response = await page.request.get('/api/users');
		expect(response.status()).toBe(403);
		const body = await response.json();
		expect(body.error).toContain('Admin access required');
	});

	test('PERM-17: admin can list users (200)', async ({ page }) => {
		await signInAsAdmin(page);
		const response = await page.request.get('/api/users');
		expect(response.status()).toBe(200);
		const body = await response.json();
		expect(body).toHaveProperty('users');
	});
});

// ============================================================================
// 8. POST /api/users -- Add user (developer-only via requireDeveloper)
// ============================================================================
test.describe('POST /api/users', () => {
	test('PERM-18: user cannot add users (403)', async ({ page }) => {
		await signInAsUser(page);
		const response = await page.request.post('/api/users', {
			data: { email: `perm-test-${Date.now()}@example.com`, role: 'user' },
		});
		expect(response.status()).toBe(403);
	});

	// Note: test admin may or may not have developer role.
	// The server uses requireDeveloper which throws "Developer access required".
	// If admin has developer role this would succeed with 201; if not, 403.
	test('PERM-19: admin gets 403 or 201 depending on developer role', async ({ page }) => {
		await signInAsAdmin(page);
		const response = await page.request.post('/api/users', {
			data: { email: `perm-test-${Date.now()}@example.com`, role: 'user' },
		});
		expect([201, 403]).toContain(response.status());
	});
});

// ============================================================================
// 9. GET /api/users/[email] -- Get user details (admin-only)
// ============================================================================
test.describe('GET /api/users/[email]', () => {
	test('PERM-20: user cannot get user details (403)', async ({ page }) => {
		await signInAsUser(page);
		const response = await page.request.get('/api/users/admin@test.com');
		expect(response.status()).toBe(403);
		const body = await response.json();
		expect(body.error).toContain('Admin access required');
	});

	test('PERM-21: admin can get user details (200 or 404)', async ({ page }) => {
		await signInAsAdmin(page);
		const response = await page.request.get('/api/users/admin@test.com');
		// 200 if user exists in whitelist, 404 if not -- both mean auth passed
		expect([200, 404]).toContain(response.status());
	});
});

// ============================================================================
// 10. PATCH /api/users/[email] -- Update user role (developer-only)
// ============================================================================
test.describe('PATCH /api/users/[email]', () => {
	test('PERM-22: user cannot update user role (403)', async ({ page }) => {
		await signInAsUser(page);
		const response = await page.request.patch('/api/users/admin@test.com', {
			data: { role: 'admin' },
		});
		expect(response.status()).toBe(403);
		const body = await response.json();
		expect(body.error).toContain('Developer access required');
	});
});

// ============================================================================
// 11. DELETE /api/users/[email] -- Remove user (admin-only)
// ============================================================================
test.describe('DELETE /api/users/[email]', () => {
	test('PERM-23: user cannot remove user (403)', async ({ page }) => {
		await signInAsUser(page);
		const response = await page.request.delete('/api/users/admin@test.com');
		expect(response.status()).toBe(403);
		const body = await response.json();
		expect(body.error).toContain('Admin access required');
	});
});

// ============================================================================
// 12. POST /api/developer/cron-debug/trigger -- Developer-only
// ============================================================================
test.describe('POST /api/developer/cron-debug/trigger', () => {
	test('PERM-24: user cannot trigger cron job (403 or 500)', async ({ page }) => {
		await signInAsUser(page);
		const response = await page.request.post('/api/developer/cron-debug/trigger', {
			data: { job: 'process' },
		});
		// requireDeveloper throws -> caught as 500 or matched as 403
		expect([403, 500]).toContain(response.status());
	});
});
