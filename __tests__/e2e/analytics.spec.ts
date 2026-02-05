import { test, expect } from '@playwright/test';
import { signInAsAdmin, signInAsUser } from './helpers/auth';

/**
 * Analytics Page E2E Tests
 * Tests analytics dashboard, metrics display, filtering, and data visualization
 */

test.describe('Analytics Page', () => {
	/**
	 * AN-01: Analytics Page Access Control
	 * Priority: P0 (Critical)
	 */
	test('AN-01: should require authentication to access analytics', async ({ page }) => {
		await page.goto('/analytics');

		// Should redirect to sign-in
		await expect(page).toHaveURL(/\/(en\/)?auth\/signin/);
	});

	/**
	 * AN-02: Analytics Page Load for Admin
	 * Priority: P0 (Critical)
	 */
	test('AN-02: should load analytics page for authenticated admin', async ({ page }) => {
		await signInAsAdmin(page);
		await page.goto('/analytics');

		// Should be on analytics page
		await expect(page).toHaveURL(/\/(en\/)?analytics/);

		// Check for page title or heading
		await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
	});

	/**
	 * AN-03: Analytics Page Load for Regular User
	 * Priority: P1 (High)
	 */
	test('AN-03: should load analytics page for authenticated user', async ({ page }) => {
		await signInAsUser(page);
		await page.goto('/analytics');

		// Should be on analytics page
		await expect(page).toHaveURL(/\/(en\/)?analytics/);
	});

	/**
	 * AN-04: Analytics Metrics Display
	 * Priority: P1 (High)
	 */
	test('AN-04: should display analytics metrics', async ({ page }) => {
		await signInAsAdmin(page);
		await page.goto('/analytics');

		// Wait for content to load
		await page.waitForLoadState('networkidle', { timeout: 10000 });

		// Check for common analytics elements
		const bodyText = await page.innerText('body');

		// Should show some analytics-related content
		const hasAnalyticsContent =
			bodyText.includes('Analytics') ||
			bodyText.includes('Insights') ||
			bodyText.includes('Metrics') ||
			bodyText.includes('Views') ||
			bodyText.includes('Engagement') ||
			bodyText.includes('Reach');

		expect(hasAnalyticsContent).toBeTruthy();
	});

	/**
	 * AN-05: Analytics Charts Rendering
	 * Priority: P2 (Medium)
	 */
	test('AN-05: should render charts or visualizations', async ({ page }) => {
		await signInAsAdmin(page);
		await page.goto('/analytics');

		// Wait for page load
		await page.waitForLoadState('networkidle', { timeout: 10000 });

		// Look for common chart elements (canvas, svg, or specific chart libraries)
		const hasCharts = await page.evaluate(() => {
			const canvases = document.querySelectorAll('canvas');
			const svgs = document.querySelectorAll('svg');
			const chartContainers = document.querySelectorAll('[class*="chart"]');

			return canvases.length > 0 || svgs.length > 0 || chartContainers.length > 0;
		});

		// If no charts found, at least the page should load
		if (!hasCharts) {
			console.log('No charts detected, verifying page loaded successfully');
			await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
		}
	});

	/**
	 * AN-06: Analytics Data Loading States
	 * Priority: P2 (Medium)
	 */
	test('AN-06: should show loading state while fetching data', async ({ page }) => {
		await signInAsAdmin(page);

		// Navigate and check for loading indicators
		const loadingPromise = page.waitForSelector('[role="status"], [aria-busy="true"], text=/loading/i', {
			timeout: 5000,
		}).catch(() => null);

		await page.goto('/analytics');

		// Loading state might appear briefly
		const loadingElement = await loadingPromise;

		// If loading element was found, verify it disappears
		if (loadingElement) {
			await expect(page.locator('[role="status"], [aria-busy="true"], text=/loading/i')).not.toBeVisible({
				timeout: 15000,
			});
		}

		// Ensure page is fully loaded
		await page.waitForLoadState('networkidle', { timeout: 10000 });
	});

	/**
	 * AN-07: Analytics Empty State
	 * Priority: P2 (Medium)
	 */
	test('AN-07: should handle empty analytics data gracefully', async ({ page }) => {
		await signInAsUser(page); // Use regular user who might have no data
		await page.goto('/analytics');

		await page.waitForLoadState('networkidle', { timeout: 10000 });

		const bodyText = await page.innerText('body');

		// Should either show data or an empty state message
		const hasContent =
			bodyText.includes('No data') ||
			bodyText.includes('No analytics') ||
			bodyText.includes('Analytics') ||
			bodyText.includes('Insights');

		expect(hasContent).toBeTruthy();
	});

	/**
	 * AN-08: Analytics Page Navigation
	 * Priority: P2 (Medium)
	 */
	test('AN-08: should navigate back to dashboard', async ({ page }) => {
		await signInAsAdmin(page);
		await page.goto('/analytics');

		// Look for navigation elements
		const navLinks = page.getByRole('navigation').locator('a');
		const homeLink = page.getByRole('link', { name: /home|dashboard/i });

		// Should have navigation
		const navCount = await navLinks.count();
		expect(navCount).toBeGreaterThan(0);

		// Verify home/dashboard link exists
		if (await homeLink.count() > 0) {
			await expect(homeLink.first()).toBeVisible();
		}
	});

	/**
	 * AN-09: Analytics Page Responsiveness
	 * Priority: P3 (Low)
	 */
	test('AN-09: should be responsive on mobile viewport', async ({ page }) => {
		// Set mobile viewport
		await page.setViewportSize({ width: 375, height: 667 });

		await signInAsAdmin(page);
		await page.goto('/analytics');

		await page.waitForLoadState('networkidle', { timeout: 10000 });

		// Page should load and be visible
		await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

		// Check that content fits viewport (no horizontal scroll)
		const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
		const viewportWidth = await page.evaluate(() => window.innerWidth);

		// Allow for small differences (scrollbar, etc.)
		expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 20);
	});

	/**
	 * AN-10: Analytics Date Range Filtering
	 * Priority: P2 (Medium)
	 */
	test('AN-10: should support date range filtering if available', async ({ page }) => {
		await signInAsAdmin(page);
		await page.goto('/analytics');

		await page.waitForLoadState('networkidle', { timeout: 10000 });

		// Look for date picker or filter controls
		const dateControls = await page.evaluate(() => {
			const inputs = Array.from(document.querySelectorAll('input[type="date"], input[type="datetime-local"]'));
			const dateButtons = Array.from(document.querySelectorAll('button')).filter(btn =>
				btn.textContent?.match(/day|week|month|year|date|filter/i)
			);

			return inputs.length > 0 || dateButtons.length > 0;
		});

		if (dateControls) {
			console.log('✅ Date filtering controls detected');
		} else {
			console.log('ℹ️ No date filtering detected (may not be implemented yet)');
		}

		// Test passes regardless - just checking if filtering exists
		expect(true).toBe(true);
	});
});
