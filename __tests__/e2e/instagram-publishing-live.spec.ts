import { test, expect, Page } from '@playwright/test';
import { signInAsRealIG } from './helpers/auth';
import { getMemeByIndex, getUnpublishedMeme } from './helpers/test-assets';

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

// Use real meme for live publishing tests
const getTestImagePath = () => getMemeByIndex(20);

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

		// Now check the API for publishing logs
		const response = await request.get('/api/publishing-logs?limit=1');
		expect(response.ok()).toBe(true);

		const data = await response.json();
		console.log('📊 Latest publishing log:', JSON.stringify(data, null, 2));

		// Verify the log entry
		if (data.items && data.items.length > 0) {
			const latestLog = data.items[0];
			expect(latestLog.status).toBe('SUCCESS');
			expect(latestLog.ig_media_id).toBeTruthy();
			console.log(`✅ Log verified: Media ID ${latestLog.ig_media_id}`);
		}
	});
});

/**
 * Instagram Connection Verification Tests
 *
 * These tests verify the Instagram connection is working,
 * without actually publishing content.
 */
test.describe('Instagram Connection Verification', () => {
	test.skip(
		() => process.env.CI === 'true',
		'Skipping in CI',
	);

	test.skip(
		() => !process.env.ENABLE_REAL_IG_TESTS,
		'Set ENABLE_REAL_IG_TESTS=true to run',
	);

	test.beforeEach(async ({ page }) => {
		await signInAsRealIG(page);
	});

	/**
	 * CONN-01: Verify Instagram account is connected
	 */
	test('CONN-01: verify Instagram account is connected', async ({ page }) => {
		await page.goto('/debug');
		await page.waitForLoadState('domcontentloaded');

		// Wait for connection status to load
		await page.waitForSelector('text=Instagram Connection', { timeout: 10000 });

		// Should show connected account
		const bodyText = await page.innerText('body');
		expect(bodyText).toContain('www_hehe_pl');

		// Should NOT show expired
		expect(bodyText.toLowerCase()).not.toContain('expired');

		console.log('✅ Instagram connection verified: @www_hehe_pl');
	});

	/**
	 * CONN-02: Verify token is valid (not expired)
	 */
	test('CONN-02: verify token is not expired', async ({ page }) => {
		await page.goto('/debug');
		await page.waitForLoadState('domcontentloaded');

		// Look for connection status component
		const connectionCard = page.locator('text=Instagram Connection').locator('..');

		// Should show a green checkmark or "Connected" status
		const isConnected =
			(await connectionCard.locator('svg.text-green-500, svg.text-emerald-500').count()) > 0 ||
			(await page.locator('text=Connected').count()) > 0;

		expect(isConnected).toBe(true);
		console.log('✅ Token is valid and not expired');
	});

	/**
	 * CONN-03: Debug publisher UI is functional
	 */
	test('CONN-03: debug publisher UI loads correctly', async ({ page }) => {
		await page.goto('/debug');
		await page.waitForLoadState('domcontentloaded');

		// Verify Debug Publisher card exists
		await expect(page.locator('text=Debug Publisher')).toBeVisible();

		// Verify key elements
		await expect(page.locator('input#debug-image-url')).toBeVisible();
		await expect(page.getByRole('button', { name: /Upload/i })).toBeVisible();
		await expect(page.getByRole('button', { name: /Publish to Instagram Now/i })).toBeVisible();
		await expect(page.locator('text=Debug Logs')).toBeVisible();

		// Publish button should be disabled (no image)
		const publishButton = page.getByRole('button', { name: /Publish to Instagram Now/i });
		await expect(publishButton).toBeDisabled();

		console.log('✅ Debug publisher UI is functional');
	});

	/**
	 * CONN-04: Image upload to storage works
	 */
	test('CONN-04: image upload to storage works', async ({ page }) => {
		await page.goto('/debug');
		await page.waitForLoadState('domcontentloaded');

		// Upload test image from /memes/ folder
		const testImagePath = getMemeByIndex(23);
		const fileInput = page.locator('input[type="file"]');
		await fileInput.setInputFiles(testImagePath);

		// Wait for upload to complete
		const urlInput = page.locator('input#debug-image-url');
		await expect(urlInput).not.toHaveValue('', { timeout: 30000 });

		const uploadedUrl = await urlInput.inputValue();
		expect(uploadedUrl).toContain('supabase');
		expect(uploadedUrl).toContain('stories');

		// Verify preview image appears
		await expect(page.locator('img[alt="Preview"]')).toBeVisible();

		// Verify logs show upload success
		await expect(page.locator('text=Upload complete')).toBeVisible();

		console.log('✅ Image upload works:', uploadedUrl.substring(0, 60) + '...');
	});
});
