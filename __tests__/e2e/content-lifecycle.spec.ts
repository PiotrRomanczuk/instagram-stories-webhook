import { test, expect } from '@playwright/test';
import { signInAsRealIG } from './helpers/auth';
import {
	createApprovedContent,
	fetchContent,
	getContentById,
} from './helpers/seed';
import { getMemeByIndex, getTestVideo } from './helpers/test-assets';

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
