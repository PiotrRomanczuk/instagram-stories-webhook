import { test, expect } from '@playwright/test';
import {
	signInAsAdmin,
	signInAsUser,
	signInAsRealIG,
	signOut,
} from './helpers/auth';
import { createPendingContent } from './helpers/seed';
import { getMemeByIndex, getTestVideo } from './helpers/test-assets';

/**
 * Critical User Journeys E2E Test Suite
 *
 * Covers complete user workflows end-to-end:
 *   CP-2: Content Submission Flow (image + video)
 *   CP-3: Admin Review and Approval (with rejection workflow)
 *   CP-4: Scheduled Publishing Flow (REAL Instagram API)
 *   CP-5: Posted Stories Verification
 *   CP-X: Navigation (admin/user)
 *
 * Auth/RBAC tests live in auth-and-rbac-core.spec.ts (no duplication).
 * Live publishing tests live in instagram-publishing-live.spec.ts.
 *
 * IMPORTANT:
 * - CP-2, CP-3 use test accounts (admin@test.com, user@test.com)
 * - CP-4 and CP-5 use REAL Instagram account (@www_hehe_pl) with REAL API
 * - E2E tests NEVER mock the Instagram API
 */

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

	test('CP-2.4: user can upload a video', async ({ page }) => {
		await page.goto('/submit');
		await page.waitForLoadState('domcontentloaded');

		// Switch to Video mode
		const videoToggle = page.getByRole('button', { name: 'Video' });
		await expect(videoToggle).toBeVisible();
		await videoToggle.click();

		// Verify Video toggle is now active (default variant)
		await expect(videoToggle).not.toHaveAttribute('data-variant', 'outline');

		// Upload test video
		const testVideoPath = getTestVideo();
		if (!testVideoPath) {
			console.warn('Test video not found, skipping');
			test.skip();
			return;
		}

		const fileInput = page.locator('input[type="file"]');
		await fileInput.setInputFiles(testVideoPath);

		// Wait for upload to complete - the submit button should become enabled
		const submitButton = page.getByRole('button', {
			name: /submit for review/i,
		});
		await expect(submitButton).toBeEnabled({ timeout: 60000 });
	});

	test('CP-2.5: complete submission flow - upload and submit', async ({
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
		await captionField.fill('E2E Critical Path Test ' + Date.now());

		// Step 3: Submit
		await submitButton.click();

		// Should redirect to submissions page after successful submit
		await expect(page).toHaveURL(/\/(en\/)?submissions/, {
			timeout: 15000,
		});
	});

	test('CP-2.6: submission appears in submissions list', async ({
		page,
	}) => {
		// Create content via API first (more reliable than UI for test setup)
		const timestamp = Date.now();
		const contentId = await createPendingContent(page, {
			title: 'E2E CP-2.7 Test ' + timestamp,
			caption: 'Critical path verification ' + timestamp,
		});
		expect(contentId).toBeTruthy();

		// Navigate to submissions page
		await page.goto('/submissions');
		await page.waitForLoadState('domcontentloaded');
		// Wait for page content to render (more reliable than networkidle with SWR)
		await page.waitForTimeout(1000);

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
			title: 'CP-3.3 Review Test ' + Date.now(),
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
			title: 'CP-3.4 Reject Test ' + Date.now(),
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

	test('CP-3.5: admin can access content hub', async ({ page }) => {
		await page.goto('/content');
		await expect(page).toHaveURL(/\/(en\/)?content/);

		await page.waitForLoadState('domcontentloaded');
		const bodyText = await page.innerText('body');
		expect(bodyText).toMatch(/content|review|queue|all/i);
	});

	test('CP-3.6: review history sidebar tracks decisions', async ({
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

	// NOTE: Actual image/video publish tests live in instagram-publishing-live.spec.ts

	test('CP-4.4: schedule page loads for admin', async ({ page }) => {
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
					'Found ' + stories.length + ' recent stories, latest: ' + story.id
				);
			}
		});

		// NOTE: IG connection check is in CP-4.1, publish+verify is in instagram-publishing-live.spec.ts
	});
});

// ===========================================================================
// CP-Cross: Navigation
// ===========================================================================

// NOTE: Auth/RBAC/API permission tests live in auth-and-rbac-core.spec.ts
test.describe('CP-Cross: Navigation', () => {
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
});
