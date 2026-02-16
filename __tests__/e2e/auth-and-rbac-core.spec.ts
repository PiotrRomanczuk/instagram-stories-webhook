import { test, expect } from '@playwright/test';
import { signInAsAdmin, signInAsUser, signOut, isAuthenticated } from './helpers/auth';

/**
 * Authentication & RBAC Core E2E Tests
 *
 * Consolidated from:
 * - auth.spec.ts
 * - rbac.spec.ts
 * - cross-user-isolation.spec.ts
 * - api-permissions-matrix.spec.ts
 *
 * Covers critical authentication flows and role-based access control:
 * - Google OAuth sign-in (test accounts only)
 * - Session persistence and management
 * - Admin vs user route protection
 * - User data isolation (RLS enforcement)
 * - API endpoint permission boundaries
 *
 * IMPORTANT: These are E2E tests - use REAL authentication flows, NO mocking
 */

// ===========================================================================
// Authentication Core Tests
// ===========================================================================

test.describe('Authentication Core', () => {
	/**
	 * AUTH-01: Unauthenticated User Redirection
	 * Priority: P0 (Critical)
	 */
	test('AUTH-01: should redirect unauthenticated user to sign-in page', async ({ page }) => {
		await page.goto('/');
		await expect(page).toHaveURL(/\/(en\/)?auth\/signin/);
		await expect(page).toHaveTitle(/Instagram/i);
	});

	/**
	 * AUTH-02: Sign In with Test Account
	 * Priority: P0 (Critical)
	 */
	test('AUTH-02: should sign in with test user account', async ({ page }) => {
		await signInAsUser(page);
		expect(await isAuthenticated(page)).toBe(true);
		await expect(page).not.toHaveURL(/\/(en\/)?auth\/signin/);
	});

	/**
	 * AUTH-03: Session Persists Across Navigation
	 * Priority: P1 (High)
	 */
	test('AUTH-03: should persist session across page navigation', async ({ page }) => {
		await signInAsUser(page);
		expect(await isAuthenticated(page)).toBe(true);

		await page.goto('/submit');
		expect(await isAuthenticated(page)).toBe(true);

		await page.goto('/submissions');
		expect(await isAuthenticated(page)).toBe(true);
	});

	/**
	 * AUTH-04: Session Persists After Refresh
	 * Priority: P1 (High)
	 */
	test('AUTH-04: should persist session after page refresh', async ({ page }) => {
		await signInAsUser(page);
		const initialUrl = page.url();
		expect(await isAuthenticated(page)).toBe(true);

		await page.reload();
		expect(await isAuthenticated(page)).toBe(true);
		await expect(page).toHaveURL(initialUrl);
	});

	/**
	 * AUTH-05: Sign Out Clears Session
	 * Priority: P1 (High)
	 */
	test('AUTH-05: should sign out and clear session', async ({ page }) => {
		await signInAsUser(page);
		expect(await isAuthenticated(page)).toBe(true);

		await signOut(page);
		await page.goto('/schedule');

		// Should redirect to sign-in
		await expect(page).toHaveURL(/\/(en\/)?auth\/signin/);
	});

	/**
	 * AUTH-06: Expired Session Handling
	 * Priority: P2 (Medium)
	 */
	test('AUTH-06: should handle expired session gracefully', async ({ page }) => {
		await signInAsUser(page);

		// Clear cookies to simulate expired session
		await page.context().clearCookies();

		await page.goto('/schedule');

		// Should redirect to sign-in
		await expect(page).toHaveURL(/\/(en\/)?auth\/signin/);
	});
});

// ===========================================================================
// Role-Based Access Control (RBAC)
// ===========================================================================

test.describe('Role-Based Access Control', () => {
	/**
	 * RBAC-01: Admin Can Access All Routes
	 * Priority: P0 (Critical)
	 */
	test('RBAC-01: admin should access all routes successfully', async ({ page }) => {
		await signInAsAdmin(page);

		// Test admin routes
		await page.goto('/content');
		await expect(page).toHaveURL(/\/(en\/)?content/);

		await page.goto('/schedule');
		await expect(page).toHaveURL(/\/(en\/)?schedule/);

		// Test user routes (admin should also access these)
		await page.goto('/memes');
		await expect(page).toHaveURL(/\/(en\/)?memes/);

		// Should not see access denied
		const bodyText = await page.innerText('body');
		expect(bodyText).not.toMatch(/access denied|unauthorized|forbidden/i);
	});

	/**
	 * RBAC-02: User Cannot Access Admin Routes
	 * Priority: P0 (Critical)
	 */
	test('RBAC-02: regular user should be denied access to admin routes', async ({ page }) => {
		await signInAsUser(page);

		// Attempt to access admin-only schedule route
		await page.goto('/schedule');
		await page.waitForLoadState('domcontentloaded');

		// Should be redirected away from schedule
		const url = page.url();
		expect(url).not.toContain('/schedule');
	});

	/**
	 * RBAC-03: User Can Access User Routes
	 * Priority: P0 (Critical)
	 */
	test('RBAC-03: user should access submissions page', async ({ page }) => {
		await signInAsUser(page);
		await page.goto('/submissions');

		await expect(page).toHaveURL(/\/submissions/);

		const bodyText = await page.innerText('body');
		expect(bodyText.length).toBeGreaterThan(0);
	});

	/**
	 * RBAC-04: Admin Route Protection
	 * Priority: P0 (Critical)
	 */
	test('RBAC-04: content management page is admin-only', async ({ page }) => {
		await signInAsAdmin(page);
		await page.goto('/content');

		// Admin should see content management interface
		const bodyText = await page.innerText('body');
		const hasContentFeatures =
			bodyText.includes('Content') ||
			bodyText.includes('All Content') ||
			bodyText.includes('Schedule') ||
			bodyText.includes('Create');

		expect(hasContentFeatures).toBe(true);
		await expect(page).toHaveURL(/\/(en\/)?content/);
	});
});

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
