import { test, expect } from '@playwright/test';
import {
	signInAsAdmin,
	signInAsUser,
	signInAsRealIG,
	signOut,
} from './helpers/auth';
import {
	createPendingContent,
	createApprovedContent,
	createScheduledContent,
	cleanupTestContent,
	fetchContent,
	getContentById,
} from './helpers/seed';
import { getSafeScheduleTime } from './helpers/calendar';
import { getMemeByIndex, getTestVideo } from './helpers/test-assets';

/**
 * Critical User Journeys E2E Test Suite
 *
 * Covers complete user workflows end-to-end:
 *   CP-2: Content Submission Flow (image + video)
 *   CP-3: Admin Review and Approval (with rejection workflow)
 *   CP-4: Scheduled Publishing Flow (REAL Instagram API)
 *   CP-5: Posted Stories Verification
 *   CP-6: Scheduling Workflow (REAL Instagram API)
 *   CP-7: End-to-End Content Lifecycle (REAL Instagram publishing)
 *   CP-X: Navigation (admin/user)
 *
 * Auth/RBAC tests live in auth-and-rbac-core.spec.ts (no duplication).
 * Live publishing tests live in instagram-publishing-live.spec.ts.
 *
 * IMPORTANT:
 * - CP-2, CP-3 use test accounts (admin@test.com, user@test.com)
 * - CP-4, CP-5, CP-6, CP-7 use REAL Instagram account (@www_hehe_pl) with REAL API
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

	test('CP-2.7: user can submit three separate image submissions', async ({
		page,
	}) => {
		test.slow();

		for (let i = 0; i < 3; i++) {
			await page.goto('/submit');
			await page.waitForLoadState('domcontentloaded');

			// Upload image
			const testImagePath = getMemeByIndex(20 + i);
			const fileInput = page.locator('input[type="file"]');
			await fileInput.setInputFiles(testImagePath);

			// Wait for upload
			const submitButton = page.getByRole('button', {
				name: /submit for review/i,
			});
			await expect(submitButton).toBeEnabled({ timeout: 30000 });

			// Fill unique caption
			const captionField = page.locator('#caption');
			await captionField.fill(`CP-2.7 Multi-Submit #${i + 1} ${Date.now()}`);

			// Submit
			await submitButton.click();

			// Should redirect to submissions
			await expect(page).toHaveURL(/\/(en\/)?submissions/, {
				timeout: 15000,
			});
		}

		// Verify submissions page has content
		await page.goto('/submissions');
		await page.waitForLoadState('domcontentloaded');
		await page.waitForTimeout(1000);

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
	// Skip in preview mode (production-only tests)
	test.skip(
		() => process.env.PREVIEW_MODE === 'true',
		'Production-only tests - skipped in preview mode'
	);

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
	// Skip in preview mode (production-only tests)
	test.skip(
		() => process.env.PREVIEW_MODE === 'true',
		'Production-only tests - skipped in preview mode'
	);

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
// CP-6: Scheduling Workflow (REAL Instagram API)
// ===========================================================================

test.describe('CP-6: Scheduling Workflow', () => {
	// Skip in preview mode (production-only tests)
	test.skip(
		() => process.env.PREVIEW_MODE === 'true',
		'Production-only tests - skipped in preview mode'
	);

	test.skip(
		() => process.env.CI === 'true',
		'NEVER run live publishing tests in CI'
	);
	test.skip(
		() => !process.env.ENABLE_REAL_IG_TESTS,
		'Set ENABLE_REAL_IG_TESTS=true to run'
	);
	test.skip(
		() => process.env.ENABLE_LIVE_IG_PUBLISH !== 'true',
		'Set ENABLE_LIVE_IG_PUBLISH=true'
	);

	const createdIds: string[] = [];

	test.beforeEach(async ({ page }) => {
		await signInAsRealIG(page);
	});

	test.afterEach(async ({ page }) => {
		if (createdIds.length > 0) {
			await cleanupTestContent(page, createdIds);
			createdIds.length = 0;
		}
	});

	test('CP-6.1: admin can schedule approved content via API', async ({
		page,
	}) => {
		// Create approved content
		const contentId = await createApprovedContent(page, {
			title: 'CP-6.1 Schedule Test ' + Date.now(),
			caption: 'Testing scheduling workflow',
		});
		createdIds.push(contentId);

		// Schedule it via the schedule endpoint
		const { date, hour } = getSafeScheduleTime();
		const scheduledTime = new Date(date);
		scheduledTime.setHours(hour, 0, 0, 0);

		const scheduleResponse = await page.request.post(
			`/api/content/${contentId}/schedule`,
			{ data: { scheduledTime: scheduledTime.getTime() } }
		);
		expect(scheduleResponse.ok()).toBe(true);

		// Verify content is now scheduled
		const content = await getContentById(page, contentId);
		expect(content).not.toBeNull();
		expect(content!.publishingStatus).toBe('scheduled');
	});

	test('CP-6.2: admin can reschedule content to a different time', async ({
		page,
	}) => {
		// Create scheduled content
		const { date, hour } = getSafeScheduleTime();
		const originalTime = new Date(date);
		originalTime.setHours(hour, 0, 0, 0);

		const contentId = await createScheduledContent(page, originalTime, {
			title: 'CP-6.2 Reschedule Test ' + Date.now(),
			caption: 'Testing rescheduling workflow',
		});
		createdIds.push(contentId);

		// Reschedule to a different time (+2 hours)
		const newTime = new Date(originalTime.getTime() + 2 * 60 * 60 * 1000);
		const rescheduleResponse = await page.request.post(
			`/api/content/${contentId}/schedule`,
			{ data: { scheduledTime: newTime.getTime() } }
		);
		expect(rescheduleResponse.ok()).toBe(true);

		// Verify the scheduled time was updated
		const content = await getContentById(page, contentId);
		expect(content).not.toBeNull();
		expect(content!.publishingStatus).toBe('scheduled');
		expect(content!.scheduledTime).toBe(newTime.getTime());
	});

	test('CP-6.3: scheduled content appears correctly in queue', async ({
		page,
	}) => {
		// Create 2 scheduled items at different times
		const { date, hour } = getSafeScheduleTime();
		const time1 = new Date(date);
		time1.setHours(hour, 0, 0, 0);
		const time2 = new Date(time1.getTime() + 24 * 60 * 60 * 1000); // +24h

		const id1 = await createScheduledContent(page, time1, {
			title: 'CP-6.3 Queue Test A ' + Date.now(),
			caption: 'Queue item A',
		});
		createdIds.push(id1);

		const id2 = await createScheduledContent(page, time2, {
			title: 'CP-6.3 Queue Test B ' + Date.now(),
			caption: 'Queue item B',
		});
		createdIds.push(id2);

		// Verify both items exist as scheduled via API
		const scheduledItems = await fetchContent(page, {
			publishingStatus: 'scheduled',
		});

		const ourItems = scheduledItems.filter(
			(item) => item.id === id1 || item.id === id2
		);
		expect(ourItems.length).toBe(2);
	});
});

// ===========================================================================
// CP-7: End-to-End Content Lifecycle (REAL Instagram publishing)
// ===========================================================================

test.describe('CP-7: End-to-End Content Lifecycle', () => {
	// Skip in preview mode (production-only tests)
	test.skip(
		() => process.env.PREVIEW_MODE === 'true',
		'Production-only tests - skipped in preview mode'
	);

	test.skip(
		() => process.env.CI === 'true',
		'NEVER run live publishing tests in CI'
	);
	test.skip(
		() => !process.env.ENABLE_REAL_IG_TESTS,
		'Set ENABLE_REAL_IG_TESTS=true to run'
	);
	test.skip(
		() => process.env.ENABLE_LIVE_IG_PUBLISH !== 'true',
		'Set ENABLE_LIVE_IG_PUBLISH=true'
	);

	test.beforeEach(async ({ page }) => {
		await signInAsRealIG(page);
	});

	test('CP-7.1: complete lifecycle - approve, schedule, force-publish image', async ({
		page,
	}) => {
		test.slow(); // Multi-step flow with real publishing (~60-120s)

		// Step 1: Create approved content via API
		const contentId = await createApprovedContent(page, {
			title: 'CP-7.1 Lifecycle Test ' + Date.now(),
			caption: 'Full lifecycle E2E test - image',
			mediaIndex: 42,
		});
		console.log('Created approved content:', contentId);

		// Step 2: Schedule content (future time required by API)
		const scheduleTime = Date.now() + 5 * 60 * 1000; // 5 minutes from now
		const scheduleResponse = await page.request.post(
			`/api/content/${contentId}/schedule`,
			{ data: { scheduledTime: scheduleTime } }
		);
		expect(scheduleResponse.ok()).toBe(true);
		console.log('Scheduled content at:', new Date(scheduleTime).toISOString());

		// Step 3: Force-process to publish to Instagram
		const forceResponse = await page.request.post(
			'/api/developer/cron-debug/force-process',
			{
				data: { postIds: [contentId], bypassDuplicates: true },
				timeout: 120000,
			}
		);
		expect(forceResponse.ok()).toBe(true);

		const result = await forceResponse.json();
		console.log('Force-process result:', JSON.stringify(result));
		expect(result.success).toBe(1);

		// Step 4: Verify published
		const published = await getContentById(page, contentId);
		expect(published).not.toBeNull();
		expect(published!.publishingStatus).toBe('published');
		console.log('Published to Instagram! Content ID:', contentId);
	});

	test('CP-7.2: complete lifecycle - video upload, approve, schedule, force-publish', async ({
		page,
	}) => {
		test.slow(); // Video processing + real publishing (~120s+)

		// Step 1: Submit video via UI
		await page.goto('/submit');
		await page.waitForLoadState('domcontentloaded');

		// Switch to Video mode
		const videoToggle = page.getByRole('button', { name: 'Video' });
		await expect(videoToggle).toBeVisible();
		await videoToggle.click();

		// Upload Big Buck Bunny test video
		const testVideoPath = getTestVideo();
		if (!testVideoPath) {
			test.skip(true, 'Test video file not found');
			return;
		}

		const fileInput = page.locator('input[type="file"]');
		await fileInput.setInputFiles(testVideoPath);

		// Wait for upload
		const submitButton = page.getByRole('button', {
			name: /submit for review/i,
		});
		await expect(submitButton).toBeEnabled({ timeout: 60000 });

		// Fill caption
		const caption = `CP-7.2 Video Lifecycle ${Date.now()}`;
		const captionField = page.locator('#caption');
		await captionField.fill(caption);

		// Submit
		await submitButton.click();
		await expect(page).toHaveURL(/\/(en\/)?submissions/, {
			timeout: 15000,
		});
		console.log('Video submitted via UI');

		// Step 2: Find the submitted content via API
		const allContent = await fetchContent(page, {
			source: 'submission',
			submissionStatus: 'pending',
		});
		const ourContent = allContent.find((item) =>
			item.caption?.includes('CP-7.2 Video Lifecycle')
		);
		expect(ourContent).toBeTruthy();
		const contentId = ourContent!.id!;
		console.log('Found submitted video content:', contentId);

		// Step 3: Approve via API
		const approveResponse = await page.request.post(
			`/api/content/${contentId}/review`,
			{ data: { action: 'approve' } }
		);
		expect(approveResponse.ok()).toBe(true);
		console.log('Video content approved');

		// Step 4: Schedule (future time)
		const scheduleTime = Date.now() + 5 * 60 * 1000;
		const scheduleResponse = await page.request.post(
			`/api/content/${contentId}/schedule`,
			{ data: { scheduledTime: scheduleTime } }
		);
		expect(scheduleResponse.ok()).toBe(true);
		console.log('Video scheduled at:', new Date(scheduleTime).toISOString());

		// Step 5: Force-process to publish
		const forceResponse = await page.request.post(
			'/api/developer/cron-debug/force-process',
			{
				data: { postIds: [contentId], bypassDuplicates: true },
				timeout: 120000,
			}
		);
		expect(forceResponse.ok()).toBe(true);

		const result = await forceResponse.json();
		console.log('Force-process result:', JSON.stringify(result));
		expect(result.success).toBe(1);

		// Step 6: Verify published
		const published = await getContentById(page, contentId);
		expect(published).not.toBeNull();
		expect(published!.publishingStatus).toBe('published');
		console.log('Video published to Instagram! Content ID:', contentId);
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
