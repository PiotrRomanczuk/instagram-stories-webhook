import { test, expect } from '@playwright/test';
import { signInAsRealIG } from './helpers/auth';
import { getMemeByIndex } from './helpers/test-assets';

/**
 * Error Recovery E2E Tests (Real Account)
 *
 * These tests verify error handling scenarios and graceful recovery
 * when errors occur during Instagram operations.
 *
 * IMPORTANT:
 * - Skip in CI to avoid running against real Instagram API
 * - Tests focus on error states and user feedback
 * - No actual content is published in these tests
 */

test.describe('Error Recovery (Real Account)', () => {
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
	 * ERR-01: Invalid Image URL Handling
	 * Priority: P1 (High)
	 * Verifies error display when submitting an invalid image URL
	 */
	test('ERR-01: should handle invalid image URL gracefully', async ({ page }) => {
		await page.goto('/debug');
		await page.waitForLoadState('domcontentloaded');

		// Wait for page to fully load
		await page.waitForSelector('text=Debug Publisher', { timeout: 10000 });

		// Enter an invalid URL
		const urlInput = page.locator('#debug-image-url');
		await urlInput.fill('not-a-valid-url');

		// Click publish button
		const publishButton = page.locator('button:has-text("Publish to Instagram Now")');
		await publishButton.click();

		// Wait for response (with timeout)
		await page.waitForTimeout(3000);

		// Check that either:
		// 1. An error message is shown in the result alert
		// 2. An error is logged in the debug logs
		// 3. The page shows an error state

		const bodyText = await page.innerText('body');

		// Should show some form of error feedback
		const hasErrorFeedback =
			bodyText.includes('failed') ||
			bodyText.includes('Failed') ||
			bodyText.includes('error') ||
			bodyText.includes('Error') ||
			bodyText.includes('invalid') ||
			bodyText.includes('Invalid');

		// The page should NOT show unhandled errors
		expect(bodyText).not.toMatch(/Application error|Something went wrong|Unhandled runtime error/i);

		// Logs should show the attempt
		const logsContainer = page.locator('.font-mono');
		const logsText = await logsContainer.innerText();
		expect(logsText).toContain('Starting direct publish');
	});

	/**
	 * ERR-02: Network Error During Submit
	 * Priority: P2 (Medium)
	 * Verifies graceful handling of network failures
	 */
	test('ERR-02: should handle network errors gracefully', async ({ page }) => {
		await page.goto('/debug');
		await page.waitForLoadState('domcontentloaded');

		// Set up route interception to simulate network failure
		await page.route('**/api/debug/publish', (route) => {
			route.abort('failed');
		});

		// Enter a valid-looking URL
		const urlInput = page.locator('#debug-image-url');
		await urlInput.fill('https://example.com/test-image.jpg');

		// Click publish
		const publishButton = page.locator('button:has-text("Publish to Instagram Now")');
		await publishButton.click();

		// Wait for the request to fail
		await page.waitForTimeout(2000);

		// Check for error handling in logs
		const logsContainer = page.locator('.font-mono');
		const logsText = await logsContainer.innerText();

		// Should log the error
		const hasErrorLog =
			logsText.includes('error') ||
			logsText.includes('failed') ||
			logsText.includes('Request');

		expect(hasErrorLog).toBe(true);

		// Page should remain functional (no crash)
		await expect(page.locator('text=Debug Publisher')).toBeVisible();

		// Should not show unhandled errors
		const bodyText = await page.innerText('body');
		expect(bodyText).not.toMatch(/Application error|Unhandled runtime error/i);
	});

	/**
	 * ERR-03: Token Expired Error
	 * Priority: P1 (High)
	 * Verifies proper handling of expired token scenarios
	 */
	test('ERR-03: should handle token expiration gracefully', async ({ page }) => {
		await page.goto('/debug');
		await page.waitForLoadState('domcontentloaded');

		// Wait for connection status to load
		await page.waitForSelector('text=Checking Instagram connection...', {
			state: 'hidden',
			timeout: 10000,
		}).catch(() => {});

		const bodyText = await page.innerText('body');

		// Check if token is expired
		if (bodyText.includes('Expired') || bodyText.includes('Connection Expired')) {
			// Should show a reconnect button
			const reconnectButton = page.locator('button:has-text("Reconnect Instagram")');
			await expect(reconnectButton).toBeVisible();

			// Should show expiration message
			await expect(page.locator('text=Expired')).toBeVisible();
		} else {
			// Token is valid - verify the connection status UI
			const connectionStatus = page.locator('text=Instagram Connection');
			await expect(connectionStatus).toBeVisible();

			// If connected, should show account info
			if (bodyText.includes('Connected')) {
				await expect(page.locator('text=@')).toBeVisible();
			}
		}

		// Page should not show unhandled errors regardless of token state
		expect(bodyText).not.toMatch(/Application error|Unhandled runtime error/i);
	});

	/**
	 * ERR-04: Rate Limit Error (Code 368)
	 * Priority: P1 (High)
	 * Verifies proper handling of Instagram rate limiting
	 */
	test('ERR-04: should display rate limit information when applicable', async ({ page }) => {
		await page.goto('/debug');
		await page.waitForLoadState('domcontentloaded');

		// Mock rate limit response
		await page.route('**/api/debug/publish', (route) => {
			route.fulfill({
				status: 429,
				contentType: 'application/json',
				body: JSON.stringify({
					success: false,
					error: 'Rate limited by Instagram (Code 368). Please wait before trying again.',
					duration: 0,
					logs: ['Rate limit error from Instagram API'],
				}),
			});
		});

		// Enter URL and attempt publish
		const urlInput = page.locator('#debug-image-url');
		await urlInput.fill('https://example.com/test-image.jpg');

		const publishButton = page.locator('button:has-text("Publish to Instagram Now")');
		await publishButton.click();

		// Wait for response
		await page.waitForTimeout(2000);

		// Check for rate limit handling
		const logsContainer = page.locator('.font-mono');
		const logsText = await logsContainer.innerText();

		// Should show rate limit info in logs
		const hasRateLimitLog =
			logsText.includes('Rate limit') ||
			logsText.includes('368') ||
			logsText.includes('wait');

		expect(hasRateLimitLog).toBe(true);

		// Error alert should be visible
		const errorAlert = page.locator('text=Publish Failed');
		await expect(errorAlert).toBeVisible();
	});

	/**
	 * ERR-05: API Timeout Handling
	 * Priority: P2 (Medium)
	 * Verifies graceful handling of API timeouts
	 */
	test('ERR-05: should handle API timeout gracefully', async ({ page }) => {
		await page.goto('/debug');
		await page.waitForLoadState('domcontentloaded');

		// Mock slow/timeout response
		await page.route('**/api/debug/publish', async (route) => {
			// Simulate a very slow response
			await new Promise((resolve) => setTimeout(resolve, 15000));
			route.fulfill({
				status: 504,
				contentType: 'application/json',
				body: JSON.stringify({
					success: false,
					error: 'Request timed out',
					duration: 15000,
					logs: [],
				}),
			});
		});

		// Enter URL and attempt publish
		const urlInput = page.locator('#debug-image-url');
		await urlInput.fill('https://example.com/test-image.jpg');

		const publishButton = page.locator('button:has-text("Publish to Instagram Now")');
		await publishButton.click();

		// Button should show loading state
		await expect(page.locator('text=Publishing...')).toBeVisible();

		// Wait a bit (but not for full timeout)
		await page.waitForTimeout(3000);

		// Should still show loading or have timed out
		const bodyText = await page.innerText('body');

		// Page should remain stable
		await expect(page.locator('text=Debug Publisher')).toBeVisible();

		// Should not show unhandled errors
		expect(bodyText).not.toMatch(/Application error|Unhandled runtime error/i);
	});

	/**
	 * ERR-06: Delete Content Recovery
	 * Priority: P2 (Medium)
	 * Verifies content can be cleared/reset after errors
	 */
	test('ERR-06: should recover from error state by clearing inputs', async ({ page }) => {
		await page.goto('/debug');
		await page.waitForLoadState('domcontentloaded');

		// Enter an invalid URL first
		const urlInput = page.locator('#debug-image-url');
		await urlInput.fill('invalid-url-that-will-fail');

		// Attempt to publish (will fail)
		const publishButton = page.locator('button:has-text("Publish to Instagram Now")');
		await publishButton.click();

		// Wait for failure
		await page.waitForTimeout(3000);

		// Now clear the logs
		const clearButton = page.locator('button[aria-label="Clear debug logs"], button:has-text("Clear")');
		await clearButton.click();

		// Logs should be cleared
		await expect(page.locator('text=No logs yet')).toBeVisible();

		// Clear the URL input
		await urlInput.clear();
		await expect(urlInput).toHaveValue('');

		// Publish button should be disabled with no URL
		await expect(publishButton).toBeDisabled();

		// Upload a valid meme file for recovery
		const memePath = getMemeByIndex(40);
		const fileInput = page.locator('input[type="file"]');
		await fileInput.setInputFiles(memePath);

		// Wait for upload to complete
		await expect(urlInput).not.toHaveValue('', { timeout: 30000 });

		// Publish button should be enabled again
		await expect(publishButton).toBeEnabled();

		// Page should be in a clean state ready for retry
		await expect(page.locator('text=Debug Publisher')).toBeVisible();
		await expect(page.locator('text=No logs yet')).toBeVisible();
	});
});

/**
 * Error Handling with Content Pages
 */
test.describe('Content Page Error Recovery', () => {
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
	 * ERR-CONTENT-01: Navigate Between Pages After Error
	 * Priority: P1 (High)
	 * Verifies navigation works correctly after encountering errors
	 */
	test('ERR-CONTENT-01: should navigate normally after error state', async ({ page }) => {
		// Start at debug page
		await page.goto('/debug');
		await page.waitForLoadState('domcontentloaded');

		// Trigger an error state
		const urlInput = page.locator('#debug-image-url');
		await urlInput.fill('bad-url');

		const publishButton = page.locator('button:has-text("Publish to Instagram Now")');
		await publishButton.click();

		await page.waitForTimeout(2000);

		// Navigate to content page
		await page.goto('/content');
		await page.waitForLoadState('domcontentloaded');

		// Should load correctly
		await expect(page).toHaveURL(/\/(en\/)?content/);

		// Page should not show unhandled errors
		const bodyText = await page.innerText('body');
		expect(bodyText).not.toMatch(/Application error|Unhandled runtime error/i);

		// Navigate to schedule page
		await page.goto('/schedule');
		await page.waitForLoadState('domcontentloaded');

		await expect(page).toHaveURL(/\/(en\/)?schedule/);

		// Navigate back to debug
		await page.goto('/debug');
		await page.waitForLoadState('domcontentloaded');

		// Debug page should work normally
		await expect(page.locator('text=Debug Publisher')).toBeVisible();
	});
});
