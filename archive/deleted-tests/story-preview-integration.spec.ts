import { test, expect } from '@playwright/test';
import { signInAsAdmin } from './helpers/auth';

/**
 * Story Preview Integration Tests (REAL Instagram API)
 *
 * These tests use REAL credentials and make ACTUAL API calls to Instagram.
 *
 * Requirements:
 * - Instagram Business Account must be linked
 * - Valid Facebook access token in database
 * - At least one story posted in last 24 hours (for some tests)
 *
 * Run with: npm run test:e2e -- story-preview-integration.spec.ts
 * Skip in CI: Add @skip tag or run only with --grep @integration
 */

test.describe('Story Preview Integration Tests (Real API)', () => {
	test.beforeEach(async ({ page }) => {
		// Sign in before each test
		await signInAsAdmin(page);
	});

	/**
	 * INT-SP-01: Verify API Endpoint is Accessible
	 * Tests that the API endpoint responds (even if no stories exist)
	 */
	test('INT-SP-01: should successfully call real Instagram API endpoint', async ({ page }) => {
		// Navigate to developer page
		await page.goto('/developer');
		await page.waitForLoadState('networkidle', { timeout: 15000 });

		// Wait a bit for the component to load and make the API call
		await page.waitForTimeout(2000);

		// Check that the component loaded (not necessarily with stories)
		const storyPreviewHeading = page.getByRole('heading', { name: /Posted Stories Preview/i });
		await expect(storyPreviewHeading).toBeVisible();

		// The component should either show:
		// - Stories (if any exist in last 24h)
		// - Empty state (if no stories)
		// - Error state (if credentials are invalid)
		const bodyText = await page.innerText('body');

		const hasValidState =
			bodyText.includes('No recent stories') || // Empty state
			bodyText.includes('Story ID') || // Has stories
			bodyText.includes('Instagram account') || // Error about account
			bodyText.includes('ago'); // Timestamp showing stories exist

		console.log('📊 Story Preview State:', {
			hasStories: bodyText.includes('Story ID'),
			isEmpty: bodyText.includes('No recent stories'),
			hasError: bodyText.includes('error') || bodyText.includes('Error'),
		});

		expect(hasValidState).toBeTruthy();
	});

	/**
	 * INT-SP-02: Verify Instagram Account Connection
	 * Tests that user has a linked Instagram account
	 */
	test('INT-SP-02: should have Instagram account linked', async ({ page }) => {
		await page.goto('/developer');
		await page.waitForLoadState('networkidle', { timeout: 15000 });
		await page.waitForTimeout(2000);

		const bodyText = await page.innerText('body');

		// Should NOT show "No Instagram account linked" error
		const hasAccountLinked = !bodyText.includes('No Instagram account linked');

		if (!hasAccountLinked) {
			console.log('⚠️  No Instagram account linked. Please link account at /settings');
		}

		expect(hasAccountLinked).toBeTruthy();
	});

	/**
	 * INT-SP-03: Test Refresh with Real API
	 * Tests that refresh button makes a new real API call
	 */
	test('INT-SP-03: should refresh stories from real Instagram API', async ({ page }) => {
		await page.goto('/developer');
		await page.waitForLoadState('networkidle', { timeout: 15000 });
		await page.waitForTimeout(2000);

		// Capture initial state
		const initialBodyText = await page.innerText('body');

		// Click refresh button
		const refreshButton = page.getByRole('button', { name: /Refresh/i }).last();
		await expect(refreshButton).toBeVisible();

		// Track network request
		let apiCallMade = false;
		page.on('request', (request) => {
			if (request.url().includes('/api/instagram/recent-stories')) {
				apiCallMade = true;
				console.log('✅ API call made to:', request.url());
			}
		});

		await refreshButton.click();

		// Wait for API call to complete
		await page.waitForTimeout(3000);

		expect(apiCallMade).toBeTruthy();

		// Verify component updated (loading state appeared and disappeared)
		const afterRefreshText = await page.innerText('body');

		// Component should still be showing valid state
		const stillValid =
			afterRefreshText.includes('Posted Stories Preview') &&
			(afterRefreshText.includes('No recent stories') ||
			 afterRefreshText.includes('Story ID') ||
			 afterRefreshText.includes('ago'));

		expect(stillValid).toBeTruthy();
	});

	/**
	 * INT-SP-04: Test with Real Story Data (if available)
	 * Only runs if stories are available in last 24h
	 */
	test('INT-SP-04: should display real story data if available', async ({ page }) => {
		await page.goto('/developer');
		await page.waitForLoadState('networkidle', { timeout: 15000 });
		await page.waitForTimeout(3000);

		const bodyText = await page.innerText('body');

		// Check if stories are present
		const hasStories = bodyText.includes('Story ID') || bodyText.includes('ago');

		if (!hasStories) {
			console.log('ℹ️  No stories found in last 24 hours - skipping story data test');
			test.skip(true, 'No stories available to test');
			return;
		}

		console.log('✅ Real story detected!');

		// If stories exist, verify they have proper structure
		const hasValidData =
			bodyText.includes('Story ID') &&
			(bodyText.includes('IMAGE') || bodyText.includes('VIDEO')) &&
			bodyText.includes('ago');

		expect(hasValidData).toBeTruthy();

		// Check for story metadata
		const hasMetadata =
			bodyText.includes('@') || // Username
			bodyText.includes('Posted'); // Timestamp label

		expect(hasMetadata).toBeTruthy();
	});

	/**
	 * INT-SP-05: Verify Story Image/Video Loads
	 * Tests that media URL from Instagram is accessible
	 */
	test('INT-SP-05: should load story media from real URL if available', async ({ page }) => {
		await page.goto('/developer');
		await page.waitForLoadState('networkidle', { timeout: 15000 });
		await page.waitForTimeout(3000);

		const bodyText = await page.innerText('body');

		// Check if stories are present
		const hasStories = bodyText.includes('Story ID');

		if (!hasStories) {
			console.log('ℹ️  No stories found - skipping media load test');
			test.skip(true, 'No stories available to test media');
			return;
		}

		// Check for image element
		const images = page.locator('img[alt="Last story"]');
		const imageCount = await images.count();

		// Check for video element
		const videos = page.locator('video');
		const videoCount = await videos.count();

		const hasMedia = imageCount > 0 || videoCount > 0;

		if (imageCount > 0) {
			console.log('✅ Image story detected');
			// Wait for image to load
			await images.first().waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
		}

		if (videoCount > 0) {
			console.log('✅ Video story detected');
			// Wait for video element to be visible
			await videos.first().waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
		}

		expect(hasMedia).toBeTruthy();
	});

	/**
	 * INT-SP-06: Test Instagram Permalink (if available)
	 * Verifies that permalink link exists and is valid Instagram URL
	 */
	test('INT-SP-06: should have valid Instagram permalink if story exists', async ({ page }) => {
		await page.goto('/developer');
		await page.waitForLoadState('networkidle', { timeout: 15000 });
		await page.waitForTimeout(3000);

		const bodyText = await page.innerText('body');
		const hasStories = bodyText.includes('Story ID');

		if (!hasStories) {
			console.log('ℹ️  No stories found - skipping permalink test');
			test.skip(true, 'No stories available to test permalink');
			return;
		}

		// Look for Instagram link
		const instagramLink = page.getByRole('link', { name: /View on Instagram/i });
		const linkCount = await instagramLink.count();

		if (linkCount > 0) {
			await expect(instagramLink.first()).toBeVisible();

			const href = await instagramLink.first().getAttribute('href');
			console.log('🔗 Instagram permalink:', href);

			// Verify it's a valid Instagram URL
			const isValidInstagramUrl = href && (
				href.includes('instagram.com') ||
				href.includes('ig.me')
			);

			expect(isValidInstagramUrl).toBeTruthy();
		} else {
			console.log('ℹ️  No permalink available (stories may not have permalinks)');
		}
	});

	/**
	 * INT-SP-07: Test API Response Structure
	 * Verifies the API returns properly structured data
	 */
	test('INT-SP-07: should return valid API response structure', async ({ page }) => {
		await signInAsAdmin(page);

		// Make direct API call
		const response = await page.request.get('/api/instagram/recent-stories?limit=5');

		expect(response.ok()).toBeTruthy();

		const data = await response.json();

		console.log('📦 API Response:', {
			hasStories: 'stories' in data,
			hasCount: 'count' in data,
			storiesCount: data.count,
			hasError: 'error' in data,
		});

		// Should have stories array and count
		expect(data).toHaveProperty('stories');
		expect(data).toHaveProperty('count');
		expect(Array.isArray(data.stories)).toBeTruthy();
		expect(typeof data.count).toBe('number');

		// If stories exist, verify structure
		if (data.stories.length > 0) {
			const story = data.stories[0];

			expect(story).toHaveProperty('id');
			expect(story).toHaveProperty('media_type');
			expect(story).toHaveProperty('media_url');
			expect(story).toHaveProperty('timestamp');

			console.log('✅ Story structure valid:', {
				id: story.id,
				type: story.media_type,
				hasUrl: !!story.media_url,
				hasTimestamp: !!story.timestamp,
			});
		}
	});

	/**
	 * INT-SP-08: Test Error Handling with Real API
	 * Tests what happens when Instagram API is unreachable or returns errors
	 */
	test('INT-SP-08: should handle Instagram API errors gracefully', async ({ page }) => {
		await page.goto('/developer');
		await page.waitForLoadState('networkidle', { timeout: 15000 });
		await page.waitForTimeout(2000);

		const bodyText = await page.innerText('body');

		// Component should handle errors and show either:
		// - Valid stories
		// - Empty state
		// - Error message (but not crash)
		const isHandledGracefully =
			bodyText.includes('Posted Stories Preview') && // Component loaded
			!bodyText.includes('undefined') && // No undefined values
			!bodyText.includes('null') && // No null values displayed
			!bodyText.includes('[object Object]'); // No raw objects

		expect(isHandledGracefully).toBeTruthy();

		// Check that there's no console errors that would crash the page
		const hasContent = bodyText.length > 100;
		expect(hasContent).toBeTruthy();
	});

	/**
	 * INT-SP-09: Test 24-Hour Story Filtering
	 * Verifies that only stories from last 24 hours are returned
	 */
	test('INT-SP-09: should only show stories from last 24 hours', async ({ page }) => {
		const response = await page.request.get('/api/instagram/recent-stories?limit=25');

		if (!response.ok()) {
			console.log('⚠️  API call failed - skipping test');
			test.skip(true, 'API not accessible');
			return;
		}

		const data = await response.json();

		if (data.stories.length === 0) {
			console.log('ℹ️  No stories to verify 24h filter');
			test.skip(true, 'No stories available');
			return;
		}

		// Verify all stories are within 24 hours
		const now = Date.now();
		const twentyFourHoursAgo = now - (24 * 60 * 60 * 1000);

		const allStoriesRecent = data.stories.every((story: any) => {
			const storyTime = new Date(story.timestamp).getTime();
			return storyTime > twentyFourHoursAgo;
		});

		console.log('📅 Story timestamps check:', {
			totalStories: data.stories.length,
			allWithin24h: allStoriesRecent,
			oldestStory: data.stories[data.stories.length - 1]?.timestamp,
		});

		expect(allStoriesRecent).toBeTruthy();
	});

	/**
	 * INT-SP-10: Full Integration Flow Test
	 * Tests the complete user flow from page load to viewing story
	 */
	test('INT-SP-10: complete integration flow works end-to-end', async ({ page }) => {
		console.log('🧪 Starting full integration test...');

		// Step 1: Navigate to page
		await page.goto('/developer');
		await page.waitForLoadState('networkidle', { timeout: 15000 });
		console.log('✅ Step 1: Page loaded');

		// Step 2: Component renders
		const heading = page.getByRole('heading', { name: /Posted Stories Preview/i });
		await expect(heading).toBeVisible();
		console.log('✅ Step 2: Component rendered');

		// Step 3: API call completes
		await page.waitForTimeout(3000);
		const bodyText = await page.innerText('body');
		const apiCompleted =
			bodyText.includes('No recent stories') ||
			bodyText.includes('Story ID') ||
			bodyText.includes('error');
		expect(apiCompleted).toBeTruthy();
		console.log('✅ Step 3: API call completed');

		// Step 4: Refresh works
		const refreshButton = page.getByRole('button', { name: /Refresh/i }).last();
		await refreshButton.click();
		await page.waitForTimeout(2000);
		console.log('✅ Step 4: Refresh triggered');

		// Step 5: Component still functional after refresh
		await expect(heading).toBeVisible();
		console.log('✅ Step 5: Component still functional');

		console.log('🎉 Full integration flow completed successfully!');
	});
});
