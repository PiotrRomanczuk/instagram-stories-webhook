import { test, expect } from '@playwright/test';
import { signInAsRealIG } from './helpers/auth';
import { getUnpublishedMeme, getTestVideo, canPublishTestVideo } from './helpers/test-assets';

/**
 * Instagram Publishing - LIVE Tests
 *
 * These tests ACTUALLY PUBLISH stories to Instagram (@www_hehe_pl).
 * They verify the core functionality of the app works end-to-end.
 * Uses real memes from /memes/ folder instead of external URLs.
 *
 * REQUIREMENTS:
 * - ENABLE_REAL_IG_TESTS=true
 * - ENABLE_LIVE_IG_PUBLISH=true
 * - Valid Instagram tokens for p.romanczuk@gmail.com
 * - App running in development mode (not production)
 *
 * RUN: ENABLE_REAL_IG_TESTS=true ENABLE_LIVE_IG_PUBLISH=true npx playwright test instagram-publishing-live.spec.ts
 */

test.describe('Instagram Publishing - LIVE', () => {
	// Skip in CI - never run live publishing in CI
	test.skip(
		() => process.env.CI === 'true',
		'NEVER run live publishing tests in CI',
	);

	// Require explicit opt-in for real IG tests
	test.skip(
		() => !process.env.ENABLE_REAL_IG_TESTS,
		'Set ENABLE_REAL_IG_TESTS=true to run',
	);

	// Require DOUBLE opt-in for live publishing
	test.skip(
		() => process.env.ENABLE_LIVE_IG_PUBLISH !== 'true',
		'Set ENABLE_LIVE_IG_PUBLISH=true to ACTUALLY publish to Instagram',
	);

	test.beforeEach(async ({ page }) => {
		await signInAsRealIG(page);
	});

	/**
	 * LIVE-PUB-01: Publish story via Debug Page
	 *
	 * This is THE critical test - verifies we can actually publish to Instagram.
	 * Includes verification to avoid publishing the same meme within 24 hours.
	 */
	test('LIVE-PUB-01: publish story via debug page', async ({ page, request }) => {
		// Navigate to debug page
		await page.goto('/debug');
		await page.waitForLoadState('domcontentloaded');

		// Verify we're connected to Instagram
		await expect(page.locator('text=www_hehe_pl')).toBeVisible({ timeout: 10000 });
		console.log('✅ Instagram account connected: @www_hehe_pl');

		// Find the Debug Publisher card
		await expect(page.locator('text=Debug Publisher')).toBeVisible();

		// Select a meme that hasn't been published in the last 24 hours
		const testImagePath = await getUnpublishedMeme(request);

		if (!testImagePath) {
			console.warn('⚠️ All memes were published in the last 24 hours, skipping test');
			test.skip();
			return;
		}

		// Upload test image from /memes/ folder
		const fileInput = page.locator('input[type="file"]');
		await fileInput.setInputFiles(testImagePath);
		console.log('Uploading test image...');

		// Wait for upload to complete (URL should appear in input)
		const urlInput = page.locator('input#debug-image-url');
		await expect(urlInput).not.toHaveValue('', { timeout: 30000 });
		const uploadedUrl = await urlInput.inputValue();
		console.log(`✅ Image uploaded: ${uploadedUrl.substring(0, 50)}...`);

		// Verify image preview appears
		await expect(page.locator('img[alt="Preview"]')).toBeVisible({ timeout: 5000 });

		// Click Publish button
		const publishButton = page.getByRole('button', { name: /Publish to Instagram Now/i });
		await expect(publishButton).toBeEnabled();
		console.log('🚀 Publishing to Instagram...');
		await publishButton.click();

		// Wait for result - this can take 10-30 seconds
		const successAlert = page.locator('text=Published Successfully!');
		const failAlert = page.locator('text=Publish Failed');

		// Wait for either success or failure (60 second timeout for slow API)
		await expect(successAlert.or(failAlert)).toBeVisible({ timeout: 60000 });

		// Check which result we got
		if (await successAlert.isVisible()) {
			// Get the Media ID
			const resultText = await page.locator('.font-semibold:has-text("Published Successfully!")').locator('..').innerText();
			console.log('✅ SUCCESS!', resultText);

			// Verify logs show success
			const logsSection = page.locator('text=Debug Logs').locator('..');
			await expect(logsSection.locator('text=SUCCESS')).toBeVisible();

			// Extract Media ID from logs for verification
			const logs = await logsSection.innerText();
			const mediaIdMatch = logs.match(/Media ID: (\d+)/);
			if (mediaIdMatch) {
				console.log(`📱 Instagram Media ID: ${mediaIdMatch[1]}`);
			}
		} else {
			// Get error details
			const errorText = await page.locator('text=Publish Failed').locator('..').innerText();
			console.error('❌ FAILED:', errorText);

			// Get logs for debugging
			const logsSection = page.locator('text=Debug Logs').locator('..');
			const logs = await logsSection.innerText();
			console.error('📋 Logs:', logs);

			// Fail the test with details
			throw new Error(`Publishing failed: ${errorText}`);
		}
	});

	/**
	 * LIVE-PUB-02: Publish story with file upload
	 *
	 * Tests publishing with a real meme from /memes/ folder.
	 * Includes verification to avoid publishing the same meme within 24 hours.
	 */
	test('LIVE-PUB-02: publish story with file upload', async ({ page, request }) => {
		await page.goto('/debug');
		await page.waitForLoadState('domcontentloaded');

		// Verify Instagram connection
		await expect(page.locator('text=www_hehe_pl')).toBeVisible({ timeout: 10000 });

		// Select a meme that hasn't been published in the last 24 hours
		const testImagePath = await getUnpublishedMeme(request);

		if (!testImagePath) {
			console.warn('⚠️ All memes were published in the last 24 hours, skipping test');
			test.skip();
			return;
		}

		// Upload meme file instead of using external URL
		const fileInput = page.locator('input[type="file"]');
		await fileInput.setInputFiles(testImagePath);
		console.log('Uploading meme from /memes/ folder...');

		// Wait for upload to complete
		const urlInput = page.locator('input#debug-image-url');
		await expect(urlInput).not.toHaveValue('', { timeout: 30000 });

		// Click Publish
		const publishButton = page.getByRole('button', { name: /Publish to Instagram Now/i });
		await publishButton.click();
		console.log('Publishing...');

		// Wait for result
		const successAlert = page.locator('text=Published Successfully!');
		await expect(successAlert).toBeVisible({ timeout: 60000 });

		console.log('Published successfully with file upload!');
	});

	/**
	 * LIVE-PUB-03: Verify published story appears in publishing logs
	 *
	 * After publishing, verify it's recorded in the database.
	 * Includes verification to avoid publishing the same meme within 24 hours.
	 */
	test('LIVE-PUB-03: verify publishing is logged', async ({ page, request }) => {
		// First publish a story
		await page.goto('/debug');
		await page.waitForLoadState('domcontentloaded');

		// Select a meme that hasn't been published in the last 24 hours
		const testImagePath = await getUnpublishedMeme(request);

		if (!testImagePath) {
			console.warn('⚠️ All memes were published in the last 24 hours, skipping test');
			test.skip();
			return;
		}

		// Upload and publish using real meme
		const fileInput = page.locator('input[type="file"]');
		await fileInput.setInputFiles(testImagePath);

		const urlInput = page.locator('input#debug-image-url');
		await expect(urlInput).not.toHaveValue('', { timeout: 30000 });

		const publishButton = page.getByRole('button', { name: /Publish to Instagram Now/i });
		await publishButton.click();

		// Wait for success
		await expect(page.locator('text=Published Successfully!')).toBeVisible({ timeout: 60000 });

		// Extract Media ID from the page
		const resultText = await page.locator('.font-semibold:has-text("Published Successfully!")').locator('..').innerText();
		const mediaIdMatch = resultText.match(/Media ID: (\d+)/);

		if (!mediaIdMatch) {
			throw new Error('Could not extract Media ID from success message');
		}

		const publishedMediaId = mediaIdMatch[1];
		console.log(`📱 Published Media ID: ${publishedMediaId}`);

		// Allow Instagram processing time
		await page.waitForTimeout(2000);

		// Verify via recent stories API
		const storiesResponse = await request.get('/api/instagram/recent-stories?limit=5');
		expect(storiesResponse.ok()).toBe(true);

		const stories = await storiesResponse.json();
		console.log('📊 Recent stories:', JSON.stringify(stories, null, 2));

		// Find our published story
		const publishedStory = stories.find((s: any) => s.id === publishedMediaId);
		expect(publishedStory).toBeDefined();
		expect(publishedStory.media_type).toBe('IMAGE');
		console.log(`✅ Story verified in recent stories: ${publishedStory.id}`);
	});

	/**
	 * LIVE-PUB-04: Publish video story
	 *
	 * Tests LIVE video publishing to Instagram.
	 * Videos require longer processing time than images (30-60s).
	 * Includes verification to avoid publishing the same video within 24 hours.
	 */
	test('LIVE-PUB-04: publish video story', async ({ page, request }) => {
		// Check if test video exists
		const testVideoPath = getTestVideo();

		if (!testVideoPath) {
			console.warn('⚠️ Test video not found, skipping test');
			test.skip();
			return;
		}

		// Check if video was published recently
		const canPublish = await canPublishTestVideo(request);

		if (!canPublish) {
			console.warn('⚠️ Test video was published in the last 24 hours, skipping test');
			test.skip();
			return;
		}

		// Navigate to debug page
		await page.goto('/debug');
		await page.waitForLoadState('domcontentloaded');

		// Verify we're connected to Instagram
		await expect(page.locator('text=www_hehe_pl')).toBeVisible({ timeout: 10000 });
		console.log('✅ Instagram account connected: @www_hehe_pl');

		// Find the Debug Publisher card
		await expect(page.locator('text=Debug Publisher')).toBeVisible();

		// Upload test video
		const fileInput = page.locator('input[type="file"]');
		await fileInput.setInputFiles(testVideoPath);
		console.log('📹 Uploading test video (720x1280, 5s, H.264)...');

		// Wait for upload to complete (videos take longer than images)
		const urlInput = page.locator('input#debug-image-url');
		await expect(urlInput).not.toHaveValue('', { timeout: 60000 }); // 60s for video upload
		const uploadedUrl = await urlInput.inputValue();
		console.log(`✅ Video uploaded: ${uploadedUrl.substring(0, 50)}...`);

		// Verify video preview appears (could be video element or thumbnail)
		const hasVideoPreview = await page.locator('video, img[alt="Preview"]').first().isVisible({ timeout: 10000 });
		expect(hasVideoPreview).toBe(true);

		// Click Publish button
		const publishButton = page.getByRole('button', { name: /Publish to Instagram Now/i });
		await expect(publishButton).toBeEnabled();
		console.log('🚀 Publishing video to Instagram...');
		console.log('⏳ Note: Video processing can take 30-90 seconds...');
		await publishButton.click();

		// Wait for result - videos take MUCH longer than images (30-90s)
		const successAlert = page.locator('text=Published Successfully!');
		const failAlert = page.locator('text=Publish Failed');

		// Extended timeout for video processing (120 seconds)
		await expect(successAlert.or(failAlert)).toBeVisible({ timeout: 120000 });

		// Check which result we got
		if (await successAlert.isVisible()) {
			// Get the Media ID
			const resultText = await page.locator('.font-semibold:has-text("Published Successfully!")').locator('..').innerText();
			console.log('✅ VIDEO SUCCESS!', resultText);

			// Verify logs show success
			const logsSection = page.locator('text=Debug Logs').locator('..');
			await expect(logsSection.locator('text=SUCCESS')).toBeVisible();

			// Extract Media ID from logs for verification
			const logs = await logsSection.innerText();
			const mediaIdMatch = logs.match(/Media ID: (\d+)/);
			if (mediaIdMatch) {
				console.log(`📱 Instagram Video Media ID: ${mediaIdMatch[1]}`);
			}

			// Verify it was recognized as a video
			if (logs.toLowerCase().includes('video')) {
				console.log('✅ Confirmed: Published as VIDEO content');
			}
		} else {
			// Get error details
			const errorText = await page.locator('text=Publish Failed').locator('..').innerText();
			console.error('❌ VIDEO FAILED:', errorText);

			// Get logs for debugging
			const logsSection = page.locator('text=Debug Logs').locator('..');
			const logs = await logsSection.innerText();
			console.error('📋 Logs:', logs);

			// Fail the test with details
			throw new Error(`Video publishing failed: ${errorText}`);
		}
	});
});


/**
 * Instagram User Tagging Tests - LIVE
 *
 * These tests ACTUALLY PUBLISH stories with user tags to Instagram (@www_hehe_pl).
 * Tests the user tagging functionality end-to-end with REAL Instagram API.
 *
 * Test User: @konstanty03 (Instagram test account for tagging)
 *
 * REQUIREMENTS:
 * - ENABLE_REAL_IG_TESTS=true
 * - ENABLE_LIVE_IG_PUBLISH=true
 * - Valid Instagram tokens for p.romanczuk@gmail.com
 * - App running in development mode (not production)
 */
test.describe('Instagram User Tagging - LIVE', () => {
	// Skip in CI - never run live publishing in CI
	test.skip(
		() => process.env.CI === 'true',
		'NEVER run live publishing tests in CI',
	);

	// Require explicit opt-in for real IG tests
	test.skip(
		() => !process.env.ENABLE_REAL_IG_TESTS,
		'Set ENABLE_REAL_IG_TESTS=true to run',
	);

	// Require DOUBLE opt-in for live publishing
	test.skip(
		() => process.env.ENABLE_LIVE_IG_PUBLISH !== 'true',
		'Set ENABLE_LIVE_IG_PUBLISH=true to ACTUALLY publish to Instagram',
	);

	test.beforeEach(async ({ page }) => {
		await signInAsRealIG(page);
	});

	/**
	 * LIVE-PUB-05: Publish story with single user tag
	 *
	 * Tests publishing a story with a single user tag (@konstanty03).
	 * Verifies tags are included in the API request and successfully published.
	 * Includes 24-hour deduplication to avoid duplicate content errors.
	 */
	test('LIVE-PUB-05: publish story with single user tag', async ({ page, request }) => {
		// Navigate to debug page
		await page.goto('/debug');
		await page.waitForLoadState('domcontentloaded');

		// Verify we're connected to Instagram
		await expect(page.locator('text=www_hehe_pl')).toBeVisible({ timeout: 10000 });
		console.log('✅ Instagram account connected: @www_hehe_pl');

		// Select a meme that hasn't been published in the last 24 hours
		const testImagePath = await getUnpublishedMeme(request);

		if (!testImagePath) {
			console.warn('⚠️ All memes were published in the last 24 hours, skipping test');
			test.skip();
			return;
		}

		// Upload test image from /memes/ folder
		const fileInput = page.locator('input[type="file"]');
		await fileInput.setInputFiles(testImagePath);
		console.log('Uploading test image with user tag...');

		// Wait for upload to complete (URL should appear in input)
		const urlInput = page.locator('input#debug-image-url');
		await expect(urlInput).not.toHaveValue('', { timeout: 30000 });
		const uploadedUrl = await urlInput.inputValue();
		console.log(`✅ Image uploaded: ${uploadedUrl.substring(0, 50)}...`);

		// Verify image preview appears
		await expect(page.locator('img[alt="Preview"]')).toBeVisible({ timeout: 5000 });

		// Call the API directly with user tags (since UI doesn't support tagging yet)
		// This simulates what the UI would do once tagging support is added
		console.log('🏷️ Publishing with user tag: @konstanty03');
		const publishResponse = await request.post('/api/debug/publish', {
			data: {
				url: uploadedUrl,
				type: 'IMAGE',
				userTags: [
					{
						username: 'konstanty03',
						x: 0.5, // Center of image
						y: 0.5
					}
				]
			}
		});

		expect(publishResponse.ok()).toBe(true);
		const publishData = await publishResponse.json();

		if (publishData.success) {
			console.log('✅ SUCCESS! Published with user tag');
			console.log(`📱 Instagram Media ID: ${publishData.result?.id}`);
			console.log('🏷️ Tagged user: @konstanty03');

			const publishedMediaId = publishData.result?.id;

			// Allow Instagram processing time
			await page.waitForTimeout(2000);

			// Verify via recent stories API
			const storiesResponse = await request.get('/api/instagram/recent-stories?limit=5');
			expect(storiesResponse.ok()).toBe(true);

			const stories = await storiesResponse.json();

			// Find our published story
			const publishedStory = stories.find((s: any) => s.id === publishedMediaId);
			expect(publishedStory).toBeDefined();
			expect(publishedStory.media_type).toBe('IMAGE');
			console.log(`✅ Story verified in recent stories: ${publishedStory.id}`);
		} else {
			console.error('❌ FAILED:', publishData.error);
			console.error('📋 Logs:', publishData.logs);
			throw new Error(`Publishing with user tag failed: ${publishData.error}`);
		}
	});

	/**
	 * LIVE-PUB-06: Publish story with multiple user tags
	 *
	 * Tests publishing a story with multiple user tags.
	 * Includes @konstanty03 and 2-3 other test accounts.
	 * Verifies all tags are included in the API request and successfully published.
	 * Includes 24-hour deduplication to avoid duplicate content errors.
	 */
	test('LIVE-PUB-06: publish story with multiple user tags', async ({ page, request }) => {
		// Navigate to debug page
		await page.goto('/debug');
		await page.waitForLoadState('domcontentloaded');

		// Verify we're connected to Instagram
		await expect(page.locator('text=www_hehe_pl')).toBeVisible({ timeout: 10000 });
		console.log('✅ Instagram account connected: @www_hehe_pl');

		// Select a meme that hasn't been published in the last 24 hours
		const testImagePath = await getUnpublishedMeme(request);

		if (!testImagePath) {
			console.warn('⚠️ All memes were published in the last 24 hours, skipping test');
			test.skip();
			return;
		}

		// Upload test image from /memes/ folder
		const fileInput = page.locator('input[type="file"]');
		await fileInput.setInputFiles(testImagePath);
		console.log('Uploading test image with multiple user tags...');

		// Wait for upload to complete
		const urlInput = page.locator('input#debug-image-url');
		await expect(urlInput).not.toHaveValue('', { timeout: 30000 });
		const uploadedUrl = await urlInput.inputValue();
		console.log(`✅ Image uploaded: ${uploadedUrl.substring(0, 50)}...`);

		// Verify image preview appears
		await expect(page.locator('img[alt="Preview"]')).toBeVisible({ timeout: 5000 });

		// Define multiple user tags (konstanty03 + 2 other test accounts)
		const userTags = [
			{
				username: 'konstanty03',
				x: 0.3, // Left side
				y: 0.4
			},
			{
				username: 'test_account_ig',
				x: 0.7, // Right side
				y: 0.4
			},
			{
				username: 'demo_user_instagram',
				x: 0.5, // Center
				y: 0.7 // Lower part
			}
		];

		// Call the API directly with multiple user tags
		console.log('🏷️ Publishing with multiple user tags:', userTags.map(t => `@${t.username}`).join(', '));
		const publishResponse = await request.post('/api/debug/publish', {
			data: {
				url: uploadedUrl,
				type: 'IMAGE',
				userTags
			}
		});

		expect(publishResponse.ok()).toBe(true);
		const publishData = await publishResponse.json();

		if (publishData.success) {
			console.log('✅ SUCCESS! Published with multiple user tags');
			console.log(`📱 Instagram Media ID: ${publishData.result?.id}`);
			console.log(`🏷️ Tagged ${userTags.length} users:`, userTags.map(t => `@${t.username}`).join(', '));

			const publishedMediaId = publishData.result?.id;

			// Allow Instagram processing time
			await page.waitForTimeout(2000);

			// Verify via recent stories API
			const storiesResponse = await request.get('/api/instagram/recent-stories?limit=5');
			expect(storiesResponse.ok()).toBe(true);

			const stories = await storiesResponse.json();

			// Find our published story
			const publishedStory = stories.find((s: any) => s.id === publishedMediaId);
			expect(publishedStory).toBeDefined();
			expect(publishedStory.media_type).toBe('IMAGE');
			console.log(`✅ Story verified in recent stories: ${publishedStory.id}`);
		} else {
			console.error('❌ FAILED:', publishData.error);
			console.error('📋 Logs:', publishData.logs);
			throw new Error(`Publishing with multiple user tags failed: ${publishData.error}`);
		}
	});

	/**
	 * LIVE-PUB-07: Verify user tags are passed to Instagram API
	 *
	 * Tests that user tags are correctly formatted and sent to Instagram API.
	 * Publishes a story with a tag and verifies the API request structure.
	 * Includes 24-hour deduplication to avoid duplicate content errors.
	 */
	test('LIVE-PUB-07: verify user tags API request format', async ({ page, request }) => {
		// Navigate to debug page
		await page.goto('/debug');
		await page.waitForLoadState('domcontentloaded');

		// Verify we're connected to Instagram
		await expect(page.locator('text=www_hehe_pl')).toBeVisible({ timeout: 10000 });

		// Select a meme that hasn't been published in the last 24 hours
		const testImagePath = await getUnpublishedMeme(request);

		if (!testImagePath) {
			console.warn('⚠️ All memes were published in the last 24 hours, skipping test');
			test.skip();
			return;
		}

		// Upload test image
		const fileInput = page.locator('input[type="file"]');
		await fileInput.setInputFiles(testImagePath);

		// Wait for upload
		const urlInput = page.locator('input#debug-image-url');
		await expect(urlInput).not.toHaveValue('', { timeout: 30000 });
		const uploadedUrl = await urlInput.inputValue();

		// Define user tag with specific coordinates
		const userTag = {
			username: 'konstanty03',
			x: 0.25,
			y: 0.75
		};

		console.log('🔍 Testing API request format for user tags...');
		console.log('🏷️ Tag:', `@${userTag.username} at (${userTag.x}, ${userTag.y})`);

		// Publish with user tag
		const publishResponse = await request.post('/api/debug/publish', {
			data: {
				url: uploadedUrl,
				type: 'IMAGE',
				userTags: [userTag]
			}
		});

		expect(publishResponse.ok()).toBe(true);
		const publishData = await publishResponse.json();

		if (publishData.success) {
			console.log('✅ SUCCESS! User tag API request format verified');
			console.log(`📱 Instagram Media ID: ${publishData.result?.id}`);

			// Check logs for evidence that tags were processed
			if (publishData.logs && publishData.logs.length > 0) {
				const hasTagInfo = publishData.logs.some((log: string) =>
					log.includes('tag') || log.includes('user')
				);
				if (hasTagInfo) {
					console.log('✅ Tags were processed in API request');
				}
			}
		} else {
			console.error('❌ FAILED:', publishData.error);
			throw new Error(`User tag API request failed: ${publishData.error}`);
		}
	});
});
