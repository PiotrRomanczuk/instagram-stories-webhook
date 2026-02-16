/**
 * User Mobile Navigation & Auth E2E Tests
 *
 * Tests bottom navigation bar behavior and auth flow on mobile
 * (iPhone 14 Pro - 390x844 viewport).
 *
 * Bottom nav (bottom-nav.tsx):
 * - 5 tabs: Home, Schedule, New (FAB), Review, Profile
 * - Hidden on lg breakpoint (visible on 390px mobile)
 * - "New" tab is a floating action button with elevated styling
 * - Active tab gets blue highlight (#2b6cee)
 * - Hidden on /auth/signin page
 */

import { test, expect } from '@playwright/test';
import { signInAsUser, signOut } from './helpers/auth';

test.use({
	viewport: { width: 390, height: 844 },
	video: { mode: 'on', size: { width: 390, height: 844 } },
});

test.describe('Bottom Navigation', () => {
	test.beforeEach(async ({ page }) => {
		await signInAsUser(page);
	});

	test('USER-NAV-01: Bottom nav is visible on mobile', async ({ page }) => {
		await page.goto('/', { waitUntil: 'load', timeout: 15000 });

		// Bottom nav should be visible on 390px width (has lg:hidden class)
		const bottomNav = page.locator('nav.fixed.bottom-0');
		await expect(bottomNav).toBeVisible({ timeout: 10000 });

		// Verify it's at the bottom of the screen
		const box = await bottomNav.boundingBox();
		expect(box).toBeTruthy();
		// Nav should be near the bottom of the 844px viewport
		expect(box!.y).toBeGreaterThan(700);
	});

	test('USER-NAV-02: Five tab items present with correct labels', async ({
		page,
	}) => {
		await page.goto('/', { waitUntil: 'load', timeout: 15000 });

		const bottomNav = page.locator('nav.fixed.bottom-0');
		await expect(bottomNav).toBeVisible({ timeout: 10000 });

		// Verify all 5 tab labels are present
		const expectedTabs = ['Home', 'Schedule', 'New', 'Review', 'Profile'];
		for (const label of expectedTabs) {
			await expect(bottomNav.getByText(label, { exact: true })).toBeVisible();
		}

		// Verify we have exactly 5 link elements in the nav
		const links = bottomNav.locator('a');
		await expect(links).toHaveCount(5);
	});

	test('USER-NAV-03: "New" tab has FAB styling', async ({ page }) => {
		await page.goto('/', { waitUntil: 'load', timeout: 15000 });

		const bottomNav = page.locator('nav.fixed.bottom-0');
		await expect(bottomNav).toBeVisible({ timeout: 10000 });

		// The FAB link has -mt-5 class (elevated above other tabs)
		const fabLink = bottomNav.locator('a.-mt-5');
		await expect(fabLink).toBeVisible();

		// The FAB has a circular button (h-14 w-14 rounded-full)
		const fabCircle = fabLink.locator('.rounded-full');
		await expect(fabCircle).toBeVisible();

		// Verify the circular button dimensions (h-14 = 56px, w-14 = 56px)
		const circleBox = await fabCircle.boundingBox();
		expect(circleBox).toBeTruthy();
		expect(circleBox!.width).toBeGreaterThanOrEqual(50);
		expect(circleBox!.height).toBeGreaterThanOrEqual(50);

		// FAB should have the blue background when not active (bg-[#2b6cee])
		const fabBgColor = await fabCircle.evaluate(
			(el) => getComputedStyle(el).backgroundColor,
		);
		// #2b6cee in RGB is approximately rgb(43, 108, 238)
		expect(fabBgColor).toContain('43');
	});

	test('USER-NAV-04: Tap Home tab navigates to /', async ({ page }) => {
		// Start from a different page
		await page.goto('/submit', { waitUntil: 'load', timeout: 15000 });

		const bottomNav = page.locator('nav.fixed.bottom-0');
		await expect(bottomNav).toBeVisible({ timeout: 10000 });

		// Dismiss Next.js dev tools overlay if open (it can block bottom nav clicks)
		await page.keyboard.press('Escape');
		await page.waitForTimeout(300);

		// Tap Home tab using evaluate to bypass any overlay interception
		const homeLink = bottomNav.locator('a').filter({ hasText: 'Home' });
		await homeLink.evaluate((el) => (el as HTMLAnchorElement).click());

		// Wait for navigation - home page URL is / or /{locale} or /{locale}/
		await page.waitForURL(
			(url) => {
				const path = url.pathname;
				// Match /, /en, /en/, /pl, /pl/, or any locale root
				return path === '/' || /^\/[a-z]{2}\/?$/.test(path);
			},
			{ timeout: 15000 },
		);

		// Verify we're no longer on /submit
		expect(page.url()).not.toContain('/submit');
	});

	test('USER-NAV-05: Tap "New" FAB navigates to /submit', async ({
		page,
	}) => {
		await page.goto('/', { waitUntil: 'load', timeout: 15000 });

		const bottomNav = page.locator('nav.fixed.bottom-0');
		await expect(bottomNav).toBeVisible({ timeout: 10000 });

		// Tap the New FAB
		await bottomNav.getByText('New', { exact: true }).click();
		await page.waitForURL((url) => url.pathname.includes('/submit'), {
			timeout: 10000,
		});

		expect(page.url()).toContain('/submit');
	});

	test('USER-NAV-06: Tap Profile tab navigates to /submissions', async ({
		page,
	}) => {
		await page.goto('/', { waitUntil: 'load', timeout: 15000 });

		const bottomNav = page.locator('nav.fixed.bottom-0');
		await expect(bottomNav).toBeVisible({ timeout: 10000 });

		// Tap Profile tab
		await bottomNav.getByText('Profile', { exact: true }).click();
		await page.waitForURL((url) => url.pathname.includes('/submissions'), {
			timeout: 10000,
		});

		expect(page.url()).toContain('/submissions');
	});

	test('USER-NAV-07: Active tab gets highlighted with blue color', async ({
		page,
	}) => {
		await page.goto('/', { waitUntil: 'load', timeout: 15000 });

		const bottomNav = page.locator('nav.fixed.bottom-0');
		await expect(bottomNav).toBeVisible({ timeout: 10000 });

		// On the home page, the Home tab should be active with text-[#2b6cee]
		const homeLink = bottomNav.locator('a').filter({ hasText: 'Home' });
		await expect(homeLink).toBeVisible();

		const homeColor = await homeLink.evaluate(
			(el) => getComputedStyle(el).color,
		);
		// #2b6cee in RGB is rgb(43, 108, 238)
		expect(homeColor).toContain('43');

		// Navigate to submit and verify New tab gets highlighted
		await bottomNav.getByText('New', { exact: true }).click();
		await page.waitForURL((url) => url.pathname.includes('/submit'), {
			timeout: 10000,
		});

		// After navigation, the FAB label "New" should be blue
		const newLabel = bottomNav.locator('a.-mt-5 span');
		const newColor = await newLabel.evaluate(
			(el) => getComputedStyle(el).color,
		);
		expect(newColor).toContain('43');

		// Home should no longer be highlighted (should be gray)
		const homeColorAfter = await homeLink.evaluate(
			(el) => getComputedStyle(el).color,
		);
		// Gray-400 is rgb(156, 163, 175) - should NOT contain blue 43
		expect(homeColorAfter).not.toContain('43, 108');
	});
});

test.describe('Mobile Auth Flow', () => {
	test('USER-NAV-08: Sign-in page renders correctly on mobile', async ({
		page,
	}) => {
		await page.goto('/auth/signin', { waitUntil: 'load', timeout: 15000 });

		// Wait for hydration
		const devOnlyText = page.locator('text=Development Only');
		await devOnlyText.waitFor({ state: 'visible', timeout: 20000 });

		// Verify "Welcome Back" heading is visible
		await expect(page.locator('h1')).toContainText('Welcome Back');

		// Verify sign-in card fits within mobile viewport
		const card = page.locator('.max-w-md');
		await expect(card).toBeVisible();
		const cardBox = await card.boundingBox();
		expect(cardBox).toBeTruthy();
		expect(cardBox!.width).toBeLessThanOrEqual(390);

		// Verify test buttons are visible for dev mode
		const testUserBtn = page.getByRole('button', { name: 'Test User' });
		const testAdminBtn = page.getByRole('button', { name: 'Test Admin' });
		await expect(testUserBtn).toBeVisible();
		await expect(testAdminBtn).toBeVisible();

		// Verify Google sign-in button is visible
		await expect(
			page.getByRole('button', { name: /Continue with Google/i }),
		).toBeVisible();
	});

	test('USER-NAV-09: Bottom nav is NOT visible on sign-in page', async ({
		page,
	}) => {
		await page.goto('/auth/signin', { waitUntil: 'load', timeout: 15000 });

		// Wait for page to render
		await page.waitForLoadState('domcontentloaded');

		// Bottom nav should NOT be present (BottomNav returns null on /auth/signin)
		const bottomNav = page.locator('nav.fixed.bottom-0');
		await expect(bottomNav).toBeHidden({ timeout: 5000 });
	});

	test('USER-NAV-10: Sign in and verify redirect to dashboard', async ({
		page,
	}) => {
		await page.goto('/auth/signin', { waitUntil: 'load', timeout: 15000 });

		// Wait for hydration
		const devOnlyText = page.locator('text=Development Only');
		await devOnlyText.waitFor({ state: 'visible', timeout: 20000 });

		// Click Test User button
		const testUserBtn = page.getByRole('button', { name: 'Test User' });
		await testUserBtn.waitFor({ state: 'visible', timeout: 10000 });
		await page.waitForTimeout(1000);
		await testUserBtn.click();

		// Wait for redirect away from sign-in
		await page.waitForURL(
			(url) => !url.pathname.includes('/auth/signin'),
			{ timeout: 30000 },
		);

		// Verify we're on the dashboard (home page)
		const currentUrl = page.url();
		expect(currentUrl).not.toContain('/auth/signin');

		// Bottom nav should now be visible on the dashboard
		const bottomNav = page.locator('nav.fixed.bottom-0');
		await expect(bottomNav).toBeVisible({ timeout: 10000 });
	});
});
