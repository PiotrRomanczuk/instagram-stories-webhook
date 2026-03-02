import { test, expect } from '@playwright/test';

/**
 * Minimal Production Health Check Tests
 *
 * These tests verify basic production functionality WITHOUT authentication.
 * No test fixtures, no login required - just basic health checks.
 *
 * RUN:
 *   BASE_URL=https://stories-webhook.vercel.app \
 *     npx playwright test production-minimal.spec.ts
 */

test.describe('Production Minimal Health Checks', () => {
	// Skip if not testing production
	test.skip(
		() => !process.env.BASE_URL || process.env.BASE_URL.includes('localhost'),
		'Production tests require BASE_URL to be set to deployed site'
	);

	/**
	 * TEST 1: Production site loads and redirects properly
	 */
	test('production site is accessible', async ({ page }) => {
		await page.goto('/');

		// Should redirect to signin since we're not authenticated
		await page.waitForURL(/\/auth\/signin/, { timeout: 10000 });

		// Verify we're on the signin page
		expect(page.url()).toContain('/auth/signin');

		console.log('✅ Production site redirects to signin correctly');
	});

	/**
	 * TEST 2: Login page loads completely
	 */
	test('login page renders correctly', async ({ page }) => {
		await page.goto('/auth/signin');
		await page.waitForLoadState('domcontentloaded');

		// Check for Google sign-in button or auth UI
		const bodyText = await page.innerText('body');

		// Should have some auth-related text
		const hasAuthUI =
			bodyText.toLowerCase().includes('sign in') ||
			bodyText.toLowerCase().includes('login') ||
			bodyText.toLowerCase().includes('google');

		expect(hasAuthUI).toBe(true);

		console.log('✅ Login page renders with authentication UI');
	});

	/**
	 * TEST 3: Static assets load
	 */
	test('static assets and CSS load', async ({ page }) => {
		const failedRequests: string[] = [];

		page.on('requestfailed', request => {
			failedRequests.push(request.url());
		});

		await page.goto('/auth/signin');
		await page.waitForLoadState('networkidle', { timeout: 15000 });

		// Should not have critical failures
		const hasCriticalFailures = failedRequests.some(url =>
			url.includes('.css') || url.includes('.js')
		);

		expect(hasCriticalFailures).toBe(false);

		if (failedRequests.length > 0) {
			console.log('⚠️ Some requests failed:', failedRequests);
		} else {
			console.log('✅ All static assets loaded successfully');
		}
	});

	/**
	 * TEST 4: Page metadata is correct
	 */
	test('page has correct metadata', async ({ page }) => {
		await page.goto('/auth/signin');

		const title = await page.title();

		// Should have a title (not empty)
		expect(title.length).toBeGreaterThan(0);

		console.log(`✅ Page title: "${title}"`);
	});

	/**
	 * TEST 5: No JavaScript errors on page load
	 */
	test('no console errors on page load', async ({ page }) => {
		const errors: string[] = [];

		page.on('console', msg => {
			if (msg.type() === 'error') {
				errors.push(msg.text());
			}
		});

		await page.goto('/auth/signin');
		await page.waitForLoadState('domcontentloaded');

		// Filter out known acceptable errors
		const criticalErrors = errors.filter(error =>
			!error.includes('favicon') && // Favicon missing is OK
			!error.includes('googletagmanager') && // Analytics is OK
			!error.toLowerCase().includes('third-party') // Third-party errors OK
		);

		if (criticalErrors.length > 0) {
			console.log('⚠️ Console errors:', criticalErrors);
		}

		// Should have no critical errors
		expect(criticalErrors.length).toBe(0);

		console.log('✅ No critical JavaScript errors');
	});

	/**
	 * TEST 6: Response time is acceptable
	 */
	test('site responds quickly', async ({ page }) => {
		const startTime = Date.now();

		await page.goto('/auth/signin');
		await page.waitForLoadState('domcontentloaded');

		const loadTime = Date.now() - startTime;

		// Should load in under 5 seconds
		expect(loadTime).toBeLessThan(5000);

		console.log(`✅ Page loaded in ${loadTime}ms`);
	});
});

/**
 * API Health Checks (no auth required)
 */
test.describe('Production API Health Checks', () => {
	test.skip(
		() => !process.env.BASE_URL || process.env.BASE_URL.includes('localhost'),
		'Production tests require BASE_URL'
	);

	/**
	 * TEST 7: Health endpoint (if exists)
	 */
	test('API health endpoint responds', async ({ request }) => {
		const response = await request.get('/api/health');

		// 200 = exists and works, 404 = not implemented (both OK)
		expect([200, 404]).toContain(response.status());

		if (response.status() === 200) {
			console.log('✅ API health endpoint exists and responds');
		} else {
			console.log('ℹ️ No /api/health endpoint (not required)');
		}
	});

	/**
	 * TEST 8: Protected API returns proper auth error
	 */
	test('protected API requires authentication', async ({ request }) => {
		const response = await request.get('/api/content');

		// Should return 401 or 403 (unauthorized/forbidden) or redirect
		expect([401, 403, 307]).toContain(response.status());

		console.log(`✅ Protected API correctly blocks unauthenticated access (${response.status()})`);
	});
});
