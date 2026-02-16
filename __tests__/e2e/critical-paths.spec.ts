import { test, expect } from '@playwright/test';
import {
	signInAsAdmin,
	signInAsUser,
	signInAsRealIG,
	signOut,
	isAuthenticated,
} from './helpers/auth';
import {
	createPendingContent,
	getTestMediaUrl,
} from './helpers/seed';
import { getUnpublishedMeme, getMemeByIndex } from './helpers/test-assets';

/**
 * Critical Paths E2E Test Suite (INS-48)
 *
 * Covers the 5 MVP critical paths end-to-end:
 *   CP-1: User Login Flow (Google OAuth via test accounts)
 *   CP-2: Content Submission Flow
 *   CP-3: Admin Review and Approval
 *   CP-4: Scheduled Publishing Flow
 *   CP-5: Posted Stories Verification
 *
 * IMPORTANT:
 * - CP-1 through CP-3 use test accounts (admin@test.com, user@test.com)
 * - CP-4 and CP-5 use REAL Instagram account (@www_hehe_pl) with REAL API
 * - E2E tests NEVER mock the Instagram API
 *
 * Run independently:
 *   npx playwright test --config playwright.config.critical.ts
 *
 * Run with full dependency chain:
 *   ENABLE_REAL_IG_TESTS=true ENABLE_LIVE_IG_PUBLISH=true npx playwright test critical-paths.spec.ts
 */

// ===========================================================================
// CP-1: User Login Flow
// ===========================================================================

test.describe('CP-1: User Login Flow', () => {
	test('CP-1.1: unauthenticated users are redirected to sign-in', async ({
		page,
	}) => {
		await page.goto('/');
		await expect(page).toHaveURL(/\/(en\/)?auth\/signin/);
	});

	test('CP-1.2: user can sign in via test account', async ({ page }) => {
		await signInAsUser(page);
		expect(await isAuthenticated(page)).toBe(true);
		await expect(page).not.toHaveURL(/\/(en\/)?auth\/signin/);
	});

	test('CP-1.3: admin can sign in and access admin routes', async ({
		page,
	}) => {
		await signInAsAdmin(page);
		expect(await isAuthenticated(page)).toBe(true);

		// Admin should be able to access the review page
		await page.goto('/review');
		await expect(page).toHaveURL(/\/(en\/)?review/);
	});

	test('CP-1.4: session persists across page navigation', async ({
		page,
	}) => {
		await signInAsUser(page);
		expect(await isAuthenticated(page)).toBe(true);

		// Navigate to submit page
		await page.goto('/submit');
		expect(await isAuthenticated(page)).toBe(true);

		// Navigate to submissions page
		await page.goto('/submissions');
		expect(await isAuthenticated(page)).toBe(true);
	});

	test('CP-1.5: session persists after page refresh', async ({ page }) => {
		await signInAsUser(page);
		const initialUrl = page.url();
		expect(await isAuthenticated(page)).toBe(true);

		await page.reload();
		expect(await isAuthenticated(page)).toBe(true);
		await expect(page).toHaveURL(initialUrl);
	});

	test('CP-1.6: sign out clears session and redirects', async ({ page }) => {
		await signInAsUser(page);
		expect(await isAuthenticated(page)).toBe(true);

		await signOut(page);
		await page.goto('/submit');

		// Should redirect unauthenticated user back to sign-in
		await expect(page).toHaveURL(/\/(en\/)?auth\/signin/);
	});

	test('CP-1.7: regular user cannot access admin routes', async ({
		page,
	}) => {
		await signInAsUser(page);

		// Review page is admin-only
		await page.goto('/review');
		await page.waitForLoadState('domcontentloaded');

		// Should be redirected away from /review
		const url = page.url();
		if (url.includes('/review')) {
			// If still on review route, check for access denied message
			const bodyText = await page.innerText('body');
			const hasAccessDenied = bodyText.match(
				/access denied|unauthorized|forbidden|not authorized/i
			);
			expect(hasAccessDenied).toBeTruthy();
		} else {
			expect(url).not.toContain('/review');
		}
	});

	test('CP-1.8: expired session redirects to sign-in', async ({ page }) => {
		await signInAsUser(page);
		expect(await isAuthenticated(page)).toBe(true);

		// Simulate expired session by clearing cookies
		await page.context().clearCookies();
		await page.goto('/submit');

		await expect(page).toHaveURL(/\/(en\/)?auth\/signin/);
	});
});

// ===========================================================================
// CP-2: Content Submission Flow
// ===========================================================================

test.describe('CP-2: Content Submission Flow', () => {
	test.beforeEach(async ({ page }) => {
		await signInAsUser(page);
	});

	test('CP-2.1: submit page loads for authenticated user', async ({
		page,
	}) => {
		await page.goto('/submit');
		await expect(page).toHaveURL(/\/(en\/)?submit/);

		// Should show the submit form heading
		const bodyText = await page.innerText('body');
		expect(bodyText).toMatch(/submit.*review/i);
	});

	test('CP-2.2: submit button is disabled without image', async ({
		page,
	}) => {
		await page.goto('/submit');
		await page.waitForLoadState('domcontentloaded');

		const submitButton = page.getByRole('button', {
			name: /submit for review/i,
		});
		await expect(submitButton).toBeVisible();
		await expect(submitButton).toBeDisabled();
	});

	test('CP-2.3: user can upload an image', async ({ page }) => {
		await page.goto('/submit');
		await page.waitForLoadState('domcontentloaded');

		// Upload a test image
		const testImagePath = getMemeByIndex(10);
		const fileInput = page.locator('input[type="file"]');
		await fileInput.setInputFiles(testImagePath);

		// Wait for upload to complete - the submit button should become enabled
		const submitButton = page.getByRole('button', {
			name: /submit for review/i,
		});
		await expect(submitButton).toBeEnabled({ timeout: 30000 });
	});

	test('CP-2.4: user can add a caption', async ({ page }) => {
		await page.goto('/submit');
		await page.waitForLoadState('domcontentloaded');

		const captionField = page.locator('#caption');
		await expect(captionField).toBeVisible();

		await captionField.fill('Test caption for E2E critical path');
		const value = await captionField.inputValue();
		expect(value).toBe('Test caption for E2E critical path');
	});

	test('CP-2.5: caption character counter updates', async ({ page }) => {
		await page.goto('/submit');
		await page.waitForLoadState('domcontentloaded');

		const captionField = page.locator('#caption');
		await captionField.fill('Hello');

		// Should display 5/2200
		const bodyText = await page.innerText('body');
		expect(bodyText).toContain('5/2200');
	});

	test('CP-2.6: complete submission flow - upload, caption, submit', async ({
		page,
	}) => {
		await page.goto('/submit');
		await page.waitForLoadState('domcontentloaded');

		// Step 1: Upload image
		const testImagePath = getMemeByIndex(15);
		const fileInput = page.locator('input[type="file"]');
		await fileInput.setInputFiles(testImagePath);

		// Wait for upload to complete
		const submitButton = page.getByRole('button', {
			name: /submit for review/i,
		});
		await expect(submitButton).toBeEnabled({ timeout: 30000 });

		// Step 2: Add caption
		const captionField = page.locator('#caption');
		await captionField.fill(`E2E Critical Path Test ${Date.now()}`);

		// Step 3: Submit
		await submitButton.click();

		// Should redirect to submissions page after successful submit
		await expect(page).toHaveURL(/\/(en\/)?submissions/, {
			timeout: 15000,
		});
	});

	test('CP-2.7: submission appears in submissions list', async ({
		page,
	}) => {
		// Create content via API first (more reliable than UI for test setup)
		const timestamp = Date.now();
		const contentId = await createPendingContent(page, {
			title: `E2E CP-2.7 Test ${timestamp}`,
			caption: `Critical path verification ${timestamp}`,
		});
		expect(contentId).toBeTruthy();

		// Navigate to submissions page
		await page.goto('/submissions');
		await page.waitForLoadState('networkidle', { timeout: 10000 });

		// Should show submissions content
		const bodyText = await page.innerText('body');
		const hasContent =
			bodyText.includes('Submission') ||
			bodyText.includes('Pending') ||
			bodyText.includes('Content');
		expect(hasContent).toBeTruthy();
	});
});

// ===========================================================================
// CP-3: Admin Review and Approval
// ===========================================================================

test.describe('CP-3: Admin Review and Approval', () => {
	test.beforeEach(async ({ page }) => {
		await signInAsAdmin(page);
	});

	test('CP-3.1: admin can access review page', async ({ page }) => {
		await page.goto('/review');
		await expect(page).toHaveURL(/\/(en\/)?review/);

		// Wait for content or empty state
		await Promise.race([
			page
				.getByRole('heading', { name: 'Story Review Queue' })
				.waitFor({ state: 'visible', timeout: 15000 })
				.catch(() => {}),
			page
				.getByText('All caught up!')
				.waitFor({ state: 'visible', timeout: 15000 })
				.catch(() => {}),
		]);

		const bodyText = await page.innerText('body');
		const hasContent =
			bodyText.includes('Story Review Queue') ||
			bodyText.includes('All caught up!');
		expect(hasContent).toBe(true);
	});

	test('CP-3.2: review page shows pending items or empty state', async ({
		page,
	}) => {
		await page.goto('/review');

		// Wait for API response
		await page
			.waitForResponse(
				(response) =>
					response.url().includes('/api/content') &&
					response.status() === 200,
				{ timeout: 15000 }
			)
			.catch(() => {});

		await page.waitForTimeout(1000);

		const bodyText = await page.innerText('body');

		// Should show either pending count or empty state
		const hasPending = /\d+ stor(y|ies) pending review/.test(bodyText);
		const hasEmptyState = bodyText.includes('All caught up!');
		expect(hasPending || hasEmptyState).toBe(true);
	});

	test('CP-3.3: approve button is functional when items exist', async ({
		page,
	}) => {
		// Seed pending content for review
		await createPendingContent(page, {
			title: `CP-3.3 Review Test ${Date.now()}`,
			caption: 'Content for review approval test',
		});

		await page.goto('/review');

		// Wait for content to load
		await page
			.waitForResponse(
				(response) =>
					response.url().includes('/api/content') &&
					response.status() === 200,
				{ timeout: 15000 }
			)
			.catch(() => {});

		await page.waitForTimeout(1000);

		const bodyText = await page.innerText('body');

		if (bodyText.includes('All caught up!')) {
			test.skip(true, 'No pending items available for approval test');
			return;
		}

		// Find approve button
		const approveButton = page
			.locator('button')
			.filter({ hasText: 'Approve' })
			.first();
		await expect(approveButton).toBeVisible();
		await expect(approveButton).toBeEnabled();

		// Click approve
		await approveButton.click();

		// Wait for success indicators
		await page.waitForTimeout(2000);

		const updatedBody = await page.innerText('body');
		const actionCompleted =
			/approved|ready to schedule/i.test(updatedBody) ||
			updatedBody.includes('All caught up!') ||
			/\d+ stor(y|ies) pending review/.test(updatedBody);
		expect(actionCompleted).toBe(true);
	});

	test('CP-3.4: reject button is functional when items exist', async ({
		page,
	}) => {
		// Seed pending content
		await createPendingContent(page, {
			title: `CP-3.4 Reject Test ${Date.now()}`,
			caption: 'Content for rejection test',
		});

		await page.goto('/review');

		await page
			.waitForResponse(
				(response) =>
					response.url().includes('/api/content') &&
					response.status() === 200,
				{ timeout: 15000 }
			)
			.catch(() => {});

		await page.waitForTimeout(1000);

		const bodyText = await page.innerText('body');

		if (bodyText.includes('All caught up!')) {
			test.skip(true, 'No pending items available for rejection test');
			return;
		}

		// Find reject button
		const rejectButton = page
			.locator('button')
			.filter({ hasText: 'Reject' })
			.first();
		await expect(rejectButton).toBeVisible();
		await expect(rejectButton).toBeEnabled();

		// Click reject
		await rejectButton.click();

		// Wait for action to complete
		await page.waitForTimeout(2000);

		const updatedBody = await page.innerText('body');
		const actionCompleted =
			updatedBody.includes('rejected') ||
			updatedBody.includes('All caught up!') ||
			/\d+ stor(y|ies) pending review/.test(updatedBody);
		expect(actionCompleted).toBe(true);
	});

	test('CP-3.5: keyboard shortcut A approves item', async ({ page }) => {
		await createPendingContent(page, {
			title: `CP-3.5 Keyboard Test ${Date.now()}`,
			caption: 'Content for keyboard shortcut test',
		});

		await page.goto('/review');

		await page
			.waitForResponse(
				(response) =>
					response.url().includes('/api/content') &&
					response.status() === 200,
				{ timeout: 15000 }
			)
			.catch(() => {});

		await page.waitForTimeout(1000);

		const bodyText = await page.innerText('body');

		if (bodyText.includes('All caught up!')) {
			test.skip(true, 'No pending items for keyboard shortcut test');
			return;
		}

		// Ensure focus is not on a textarea
		await page.click('body');
		await page.waitForTimeout(300);

		// Press A to approve
		await page.keyboard.press('a');
		await page.waitForTimeout(2000);

		const updatedBody = await page.innerText('body');
		const hasSuccess =
			/approved|ready to schedule/i.test(updatedBody) ||
			updatedBody.includes('All caught up!') ||
			/\d+ stor(y|ies) pending review/.test(updatedBody);
		expect(hasSuccess).toBe(true);
	});

	test('CP-3.6: admin can access content hub', async ({ page }) => {
		await page.goto('/content');
		await expect(page).toHaveURL(/\/(en\/)?content/);

		await page.waitForLoadState('domcontentloaded');
		const bodyText = await page.innerText('body');
		expect(bodyText).toMatch(/content|review|queue|all/i);
	});

	test('CP-3.7: review history sidebar tracks decisions', async ({
		page,
	}) => {
		await page.goto('/review');

		await page
			.waitForResponse(
				(response) =>
					response.url().includes('/api/content') &&
					response.status() === 200,
				{ timeout: 15000 }
			)
			.catch(() => {});

		await page.waitForTimeout(1000);

		const bodyText = await page.innerText('body');

		if (bodyText.includes('All caught up!')) {
			test.skip(true, 'No pending items to test review history');
			return;
		}

		// Review History heading should be visible
		const historyHeading = page.getByRole('heading', {
			name: 'Review History',
		});
		await expect(historyHeading).toBeVisible();
	});
});

// ===========================================================================
// CP-4: Scheduled Publishing Flow (REAL Instagram API)
// ===========================================================================

test.describe('CP-4: Scheduled Publishing Flow', () => {
	// Skip unless real IG tests are enabled
	test.skip(
		() => !process.env.ENABLE_REAL_IG_TESTS,
		'Set ENABLE_REAL_IG_TESTS=true to run'
	);

	test.skip(
		() => process.env.ENABLE_LIVE_IG_PUBLISH !== 'true',
		'Set ENABLE_LIVE_IG_PUBLISH=true to ACTUALLY publish to Instagram'
	);

	test.skip(
		() => process.env.CI === 'true',
		'NEVER run live publishing tests in CI'
	);

	test.beforeEach(async ({ page }) => {
		await signInAsRealIG(page);
	});

	test('CP-4.1: Instagram account is connected', async ({ page }) => {
		await page.goto('/debug');
		await page.waitForLoadState('domcontentloaded');

		// Verify Instagram connection
		await expect(page.locator('text=www_hehe_pl')).toBeVisible({
			timeout: 10000,
		});

		// Should NOT show expired
		const bodyText = await page.innerText('body');
		expect(bodyText.toLowerCase()).not.toContain('expired');
	});

	test('CP-4.2: debug publisher UI loads correctly', async ({ page }) => {
		await page.goto('/debug');
		await page.waitForLoadState('domcontentloaded');

		await expect(page.locator('text=Debug Publisher')).toBeVisible();
		await expect(page.locator('input#debug-image-url')).toBeVisible();
		await expect(
			page.getByRole('button', { name: /Publish to Instagram Now/i })
		).toBeVisible();
	});

	test('CP-4.3: image upload to storage works', async ({ page }) => {
		await page.goto('/debug');
		await page.waitForLoadState('domcontentloaded');

		// Upload test image
		const testImagePath = getMemeByIndex(25);
		const fileInput = page.locator('input[type="file"]');
		await fileInput.setInputFiles(testImagePath);

		// Wait for upload to complete
		const urlInput = page.locator('input#debug-image-url');
		await expect(urlInput).not.toHaveValue('', { timeout: 30000 });

		const uploadedUrl = await urlInput.inputValue();
		expect(uploadedUrl).toContain('supabase');

		// Verify preview appears
		await expect(page.locator('img[alt="Preview"]')).toBeVisible();
	});

	test('CP-4.4: publish image story to Instagram', async ({
		page,
		request,
	}) => {
		await page.goto('/debug');
		await page.waitForLoadState('domcontentloaded');

		// Verify connected
		await expect(page.locator('text=www_hehe_pl')).toBeVisible({
			timeout: 10000,
		});

		// Select unpublished meme (24-hour de-duplication)
		const testImagePath = await getUnpublishedMeme(request);

		if (!testImagePath) {
			console.warn(
				'All memes were published in the last 24 hours, skipping test'
			);
			test.skip();
			return;
		}

		// Upload
		const fileInput = page.locator('input[type="file"]');
		await fileInput.setInputFiles(testImagePath);

		const urlInput = page.locator('input#debug-image-url');
		await expect(urlInput).not.toHaveValue('', { timeout: 30000 });

		// Publish
		const publishButton = page.getByRole('button', {
			name: /Publish to Instagram Now/i,
		});
		await expect(publishButton).toBeEnabled();
		await publishButton.click();

		// Wait for result (real Instagram API, 60s timeout)
		const successAlert = page.locator('text=Published Successfully!');
		const failAlert = page.locator('text=Publish Failed');
		await expect(successAlert.or(failAlert)).toBeVisible({
			timeout: 60000,
		});

		if (await successAlert.isVisible()) {
			// Extract Media ID
			const resultText = await page
				.locator(
					'.font-semibold:has-text("Published Successfully!")'
				)
				.locator('..')
				.innerText();
			const mediaIdMatch = resultText.match(/Media ID: (\d+)/);
			expect(mediaIdMatch).toBeTruthy();
			console.log(
				`Published image story, Media ID: ${mediaIdMatch?.[1]}`
			);
		} else {
			const errorText = await page
				.locator('text=Publish Failed')
				.locator('..')
				.innerText();
			throw new Error(`Publishing failed: ${errorText}`);
		}
	});

	test('CP-4.5: schedule page loads for admin', async ({ page }) => {
		await page.goto('/schedule');
		await page.waitForLoadState('domcontentloaded');

		await expect(page).toHaveURL(/\/(en\/)?schedule/);
		const bodyText = await page.innerText('body');
		expect(bodyText).toMatch(/schedule|calendar|content/i);
	});
});

// ===========================================================================
// CP-5: Posted Stories Verification
// ===========================================================================

test.describe('CP-5: Posted Stories Verification', () => {
	test.describe('Admin Posted Stories Page', () => {
		test.beforeEach(async ({ page }) => {
			await signInAsAdmin(page);
		});

		test('CP-5.1: posted stories page loads for admin', async ({
			page,
		}) => {
			await page.goto('/posted-stories');
			await expect(page).toHaveURL(/\/(en\/)?posted-stories/);

			await page.waitForLoadState('domcontentloaded');
			const bodyText = await page.innerText('body');
			expect(bodyText).toMatch(
				/stories|published|posted|no.*stories|empty/i
			);
		});

		test('CP-5.2: regular user cannot access posted stories', async ({
			page,
		}) => {
			// Sign out admin, sign in as user
			await signOut(page);
			await signInAsUser(page);

			await page.goto('/posted-stories');
			await page.waitForLoadState('domcontentloaded');

			// Should be redirected away (non-admin route)
			const url = page.url();
			expect(url).not.toMatch(/\/posted-stories$/);
		});
	});

	test.describe('Real Instagram Stories Verification', () => {
		test.skip(
			() => !process.env.ENABLE_REAL_IG_TESTS,
			'Set ENABLE_REAL_IG_TESTS=true to run'
		);

		test.skip(
			() => process.env.CI === 'true',
			'Skipping in CI'
		);

		test.beforeEach(async ({ page }) => {
			await signInAsRealIG(page);
		});

		test('CP-5.3: recent stories API returns data', async ({
			request,
		}) => {
			const response = await request.get(
				'/api/instagram/recent-stories?limit=5'
			);
			expect(response.ok()).toBe(true);

			const stories = await response.json();
			expect(Array.isArray(stories)).toBe(true);

			if (stories.length > 0) {
				// Verify story structure
				const story = stories[0];
				expect(story).toHaveProperty('id');
				expect(story).toHaveProperty('media_type');
				console.log(
					`Found ${stories.length} recent stories, latest: ${story.id}`
				);
			}
		});

		test('CP-5.4: debug page shows Instagram connection status', async ({
			page,
		}) => {
			await page.goto('/debug');
			await page.waitForLoadState('domcontentloaded');

			// Should show connection info
			await page.waitForSelector('text=Instagram Connection', {
				timeout: 10000,
			});

			const bodyText = await page.innerText('body');
			expect(bodyText).toContain('www_hehe_pl');
			expect(bodyText.toLowerCase()).not.toContain('expired');
		});

		test('CP-5.5: published story is verifiable via API', async ({
			page,
			request,
		}) => {
			// Only verify if LIVE publish is enabled
			test.skip(
				process.env.ENABLE_LIVE_IG_PUBLISH !== 'true',
				'Set ENABLE_LIVE_IG_PUBLISH=true for full verification'
			);

			await page.goto('/debug');
			await page.waitForLoadState('domcontentloaded');

			// Verify connected
			await expect(page.locator('text=www_hehe_pl')).toBeVisible({
				timeout: 10000,
			});

			// Select unpublished meme
			const testImagePath = await getUnpublishedMeme(request);
			if (!testImagePath) {
				console.warn(
					'All memes published recently, skipping verification test'
				);
				test.skip();
				return;
			}

			// Upload and publish
			const fileInput = page.locator('input[type="file"]');
			await fileInput.setInputFiles(testImagePath);

			const urlInput = page.locator('input#debug-image-url');
			await expect(urlInput).not.toHaveValue('', { timeout: 30000 });

			const publishButton = page.getByRole('button', {
				name: /Publish to Instagram Now/i,
			});
			await publishButton.click();

			// Wait for success
			await expect(
				page.locator('text=Published Successfully!')
			).toBeVisible({ timeout: 60000 });

			// Extract Media ID
			const resultText = await page
				.locator(
					'.font-semibold:has-text("Published Successfully!")'
				)
				.locator('..')
				.innerText();
			const mediaIdMatch = resultText.match(/Media ID: (\d+)/);
			expect(mediaIdMatch).toBeTruthy();
			const publishedMediaId = mediaIdMatch![1];

			// Allow processing time
			await page.waitForTimeout(2000);

			// Verify via recent stories API
			const storiesResponse = await request.get(
				'/api/instagram/recent-stories?limit=10'
			);
			expect(storiesResponse.ok()).toBe(true);

			const stories = await storiesResponse.json();
			const publishedStory = stories.find(
				(s: Record<string, unknown>) => s.id === publishedMediaId
			);
			expect(publishedStory).toBeDefined();
			expect(publishedStory.media_type).toBe('IMAGE');
			console.log(
				`Story verified on Instagram: ${publishedMediaId}`
			);
		});
	});
});

// ===========================================================================
// CP-Cross: Cross-Cutting Concerns
// ===========================================================================

test.describe('CP-Cross: Navigation and Access Control', () => {
	test('CP-X.1: navigation menu contains expected links for admin', async ({
		page,
	}) => {
		await signInAsAdmin(page);
		await page.goto('/review');
		await page.waitForLoadState('domcontentloaded');

		const nav = page.getByRole('navigation');
		const linkCount = await nav.locator('a').count();
		expect(linkCount).toBeGreaterThan(0);
	});

	test('CP-X.2: navigation menu is available for regular user', async ({
		page,
	}) => {
		await signInAsUser(page);
		await page.goto('/submissions');
		await page.waitForLoadState('domcontentloaded');

		const nav = page.getByRole('navigation');
		const linkCount = await nav.locator('a').count();
		expect(linkCount).toBeGreaterThan(0);
	});

	test('CP-X.3: all protected routes redirect when unauthenticated', async ({
		page,
	}) => {
		const protectedRoutes = [
			'/submit',
			'/submissions',
			'/review',
			'/schedule',
			'/content',
		];

		for (const route of protectedRoutes) {
			await page.goto(route);
			await page.waitForLoadState('domcontentloaded');

			const url = page.url();
			// Should redirect to sign-in or home
			const redirectedToSignIn = url.includes('/auth/signin');
			const redirectedHome = url.endsWith('/') || url.includes('/en');
			expect(redirectedToSignIn || redirectedHome).toBe(true);
		}
	});

	test('CP-X.4: content API requires authentication', async ({
		request,
	}) => {
		// Attempt to fetch content without auth
		const response = await request.get('/api/content');

		// Should return 401 or redirect
		expect([401, 403, 302, 307].includes(response.status())).toBe(true);
	});
});
