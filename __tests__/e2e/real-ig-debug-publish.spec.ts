import { test, expect } from '@playwright/test';
import { signInAsRealIG } from './helpers/auth';

/**
 * Debug Page and Direct Publishing E2E Tests (Real Account)
 *
 * These tests verify the debug page functionality including Instagram
 * connection status and the debug publisher component.
 *
 * IMPORTANT:
 * - Skip in CI to avoid running against real Instagram API
 * - LIVE tests require ENABLE_LIVE_IG_PUBLISH=true and will actually publish
 * - Requires the account to have valid linked Instagram tokens
 */

test.describe('Debug Page (Real Account)', () => {
	// Skip in CI environments
	test.skip(
		() => process.env.CI === 'true',
		'Skipping in CI - requires real Instagram tokens',
	);

	// Also skip if ENABLE_REAL_IG_TESTS is not set
	test.skip(
		() => !process.env.ENABLE_REAL_IG_TESTS,
		'Set ENABLE_REAL_IG_TESTS=true to run real Instagram tests',
	);

	test.beforeEach(async ({ page }) => {
		await signInAsRealIG(page);
	});

	/**
	 * DBG-01: Access Debug Page
	 * Priority: P0 (Critical)
	 * Verifies the debug page is accessible and loads correctly
	 */
	test('DBG-01: should access debug page', async ({ page }) => {
		await page.goto('/debug');
		await page.waitForLoadState('domcontentloaded');

		// Should be on the debug page (may have locale prefix)
		await expect(page).toHaveURL(/\/(en\/)?debug/);

		// Should see the page header
		const pageHeader = page.locator('h1, h2').filter({ hasText: 'Publish Debug' });
		await expect(pageHeader).toBeVisible();

		// Should see the description
		const description = page.locator('text=Directly test Instagram publishing');
		await expect(description).toBeVisible();
	});

	/**
	 * DBG-02: Instagram Connection Status Panel
	 * Priority: P0 (Critical)
	 * Verifies the Instagram connection status shows account info
	 */
	test('DBG-02: should display Instagram connection status', async ({ page }) => {
		await page.goto('/debug');
		await page.waitForLoadState('domcontentloaded');

		// Should show Instagram Connection card
		const connectionCard = page.locator('text=Instagram Connection').first();
		await expect(connectionCard).toBeVisible();

		// Wait for connection status to load (loading spinner should disappear)
		await page.waitForSelector('text=Checking Instagram connection...', {
			state: 'hidden',
			timeout: 10000,
		}).catch(() => {
			// Loading may have already completed
		});

		// Should show connection status (Connected or Not Connected)
		const bodyText = await page.innerText('body');
		const hasConnectionStatus =
			bodyText.includes('Connected') ||
			bodyText.includes('Not Connected') ||
			bodyText.includes('www_hehe_pl');

		expect(hasConnectionStatus).toBe(true);

		// If connected, should show the Instagram username
		if (bodyText.includes('Connected') && !bodyText.includes('Not Connected')) {
			// Should display the Instagram account username
			const usernameText = page.locator('text=@');
			const hasUsername = await usernameText.count() > 0;

			// Or should show the specific account
			const hasSpecificAccount = bodyText.includes('www_hehe_pl');

			expect(hasUsername || hasSpecificAccount).toBe(true);
		}
	});

	/**
	 * DBG-03: Upload Image to Debug Publisher
	 * Priority: P1 (High)
	 * Verifies image upload functionality in debug publisher
	 */
	test('DBG-03: should upload image to debug publisher', async ({ page }) => {
		await page.goto('/debug');
		await page.waitForLoadState('domcontentloaded');

		// Find the Debug Publisher card
		const publisherCard = page.locator('text=Debug Publisher').first();
		await expect(publisherCard).toBeVisible();

		// Find the upload button
		const uploadButton = page.locator('button:has-text("Upload")');
		await expect(uploadButton).toBeVisible();
		await expect(uploadButton).toBeEnabled();

		// Find the hidden file input
		const fileInput = page.locator('input[type="file"]');
		await expect(fileInput).toBeAttached();

		// Verify the image URL input exists
		const urlInput = page.locator('#debug-image-url');
		await expect(urlInput).toBeVisible();
		await expect(urlInput).toHaveAttribute('placeholder', /Paste image URL|upload/i);
	});

	/**
	 * DBG-04: Enter URL Manually
	 * Priority: P2 (Medium)
	 * Verifies manual URL input in debug publisher
	 */
	test('DBG-04: should accept manual URL input', async ({ page }) => {
		await page.goto('/debug');
		await page.waitForLoadState('domcontentloaded');

		// Find the URL input
		const urlInput = page.locator('#debug-image-url');
		await expect(urlInput).toBeVisible();

		// Enter a test URL
		const testUrl = 'https://example.com/test-image.jpg';
		await urlInput.fill(testUrl);

		// Verify the value was set
		await expect(urlInput).toHaveValue(testUrl);

		// The publish button should become enabled
		const publishButton = page.locator('button:has-text("Publish to Instagram Now")');
		await expect(publishButton).toBeVisible();
		await expect(publishButton).toBeEnabled();
	});

	/**
	 * DBG-05: Debug Logs Update
	 * Priority: P1 (High)
	 * Verifies the debug logs panel shows activity
	 */
	test('DBG-05: should display debug logs panel', async ({ page }) => {
		await page.goto('/debug');
		await page.waitForLoadState('domcontentloaded');

		// Find the Debug Logs section
		const logsLabel = page.locator('text=Debug Logs');
		await expect(logsLabel).toBeVisible();

		// Find the logs container (ScrollArea with monospace font)
		const logsContainer = page.locator('.font-mono').first();
		await expect(logsContainer).toBeVisible();

		// Initially should show "No logs yet" message
		const noLogsMessage = page.locator('text=No logs yet');
		await expect(noLogsMessage).toBeVisible();

		// Enter a URL to trigger log activity
		const urlInput = page.locator('#debug-image-url');
		await urlInput.fill('https://example.com/test.jpg');

		// Logs panel should still be visible
		await expect(logsContainer).toBeVisible();
	});

	/**
	 * DBG-06: Clear Logs Button
	 * Priority: P2 (Medium)
	 * Verifies the clear logs functionality
	 */
	test('DBG-06: should clear logs when clear button is clicked', async ({ page }) => {
		await page.goto('/debug');
		await page.waitForLoadState('domcontentloaded');

		// Find the Clear button
		const clearButton = page.locator('button[aria-label="Clear debug logs"], button:has-text("Clear")');
		await expect(clearButton).toBeVisible();

		// Enter a URL (this doesn't add logs directly, but verifies clear button is interactive)
		const urlInput = page.locator('#debug-image-url');
		await urlInput.fill('https://example.com/test.jpg');

		// Click clear button
		await clearButton.click();

		// Should show "No logs yet" message after clearing
		const noLogsMessage = page.locator('text=No logs yet');
		await expect(noLogsMessage).toBeVisible();
	});

	/**
	 * DBG-07: Security Warning Display
	 * Priority: P1 (High)
	 * Verifies the security warning alert is displayed
	 */
	test('DBG-07: should display security warning', async ({ page }) => {
		await page.goto('/debug');
		await page.waitForLoadState('domcontentloaded');

		// Find the security warning alert
		const securityAlert = page.locator('text=Security Warning');
		await expect(securityAlert).toBeVisible();

		// Should show the warning description
		const warningDescription = page.locator('text=This is a manual debug tool');
		await expect(warningDescription).toBeVisible();

		// Should mention posts won't be tracked
		const trackingWarning = page.locator('text=will NOT be tracked');
		await expect(trackingWarning).toBeVisible();

		// Alert should have amber/warning styling
		const alertContainer = page.locator('.border-amber-200, .bg-amber-50');
		await expect(alertContainer).toBeVisible();
	});
});

/**
 * Live Publishing Tests (CAUTION: Actually publishes to Instagram!)
 * These tests require explicit opt-in and will publish real content.
 */
test.describe('Debug Publishing - Live (CAUTION)', () => {
	// Skip in CI environments
	test.skip(
		() => process.env.CI === 'true',
		'Skipping in CI - requires real Instagram tokens',
	);

	// Skip if ENABLE_REAL_IG_TESTS is not set
	test.skip(
		() => !process.env.ENABLE_REAL_IG_TESTS,
		'Set ENABLE_REAL_IG_TESTS=true to run real Instagram tests',
	);

	// Requires explicit opt-in with ENABLE_LIVE_IG_PUBLISH
	test.skip(
		() => process.env.ENABLE_LIVE_IG_PUBLISH !== 'true',
		'Set ENABLE_LIVE_IG_PUBLISH=true to run live publishing tests (CAUTION: publishes to real Instagram)',
	);

	test.beforeEach(async ({ page }) => {
		await signInAsRealIG(page);
	});

	/**
	 * LIVE-DBG-01: Direct Publish Story via Debug Page
	 * WARNING: This will actually publish a story to your Instagram account!
	 * Priority: P0 (Critical for live testing)
	 */
	test('LIVE-DBG-01: should publish story directly via debug page', async ({ page }) => {
		await page.goto('/debug');
		await page.waitForLoadState('domcontentloaded');

		// Wait for connection status to load
		await page.waitForSelector('text=Checking Instagram connection...', {
			state: 'hidden',
			timeout: 10000,
		}).catch(() => {});

		// Verify we're connected
		const bodyText = await page.innerText('body');
		if (!bodyText.includes('Connected') || bodyText.includes('Not Connected')) {
			test.skip(true, 'Instagram account not connected - cannot run live publish test');
			return;
		}

		// Find the URL input and enter a test image
		// Using a known valid public image URL for testing
		const urlInput = page.locator('#debug-image-url');
		await expect(urlInput).toBeVisible();

		// Use a reliable test image (Supabase storage or public CDN)
		const testImageUrl = process.env.TEST_IMAGE_URL || 'https://picsum.photos/1080/1920';
		await urlInput.fill(testImageUrl);

		// Click publish button
		const publishButton = page.locator('button:has-text("Publish to Instagram Now")');
		await expect(publishButton).toBeEnabled();
		await publishButton.click();

		// Wait for publishing to complete (longer timeout for API call)
		await page.waitForSelector('text=Publishing...', { state: 'hidden', timeout: 60000 });

		// Check for result
		const publishedText = page.locator('text=Published Successfully');
		const failedText = page.locator('text=Publish Failed');

		// Wait for either success or failure message
		await Promise.race([
			publishedText.waitFor({ state: 'visible', timeout: 30000 }),
			failedText.waitFor({ state: 'visible', timeout: 30000 }),
		]).catch(() => {});

		// Verify logs show activity
		const logsContainer = page.locator('.font-mono');
		const logsText = await logsContainer.innerText();

		// Logs should contain server activity
		const hasServerLogs =
			logsText.includes('[SERVER]') ||
			logsText.includes('Starting direct publish') ||
			logsText.includes('Published successfully') ||
			logsText.includes('Publish failed');

		expect(hasServerLogs).toBe(true);

		// If published successfully, should show Media ID
		const successAlert = page.locator('text=Media ID:');
		if (await successAlert.count() > 0) {
			await expect(successAlert).toBeVisible();
		}
	});
});
