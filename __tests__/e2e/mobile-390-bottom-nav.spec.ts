import { test, expect } from '@playwright/test';
import { signInAsUser } from './helpers/auth';

// ---------------------------------------------------------------------------
// 390px - Bottom Navigation Tests (iPhone 14 Pro)
// ---------------------------------------------------------------------------

test.describe('Mobile 390px - Bottom Navigation', () => {
	test.use({ viewport: { width: 390, height: 844 } });

	test.beforeEach(async ({ page }) => {
		await signInAsUser(page);
	});

	test('Bottom nav is visible on mobile', async ({ page }) => {
		await page.goto('/', { waitUntil: 'load', timeout: 15000 });

		const bottomNav = page.locator('nav.fixed.bottom-0');
		await expect(bottomNav).toBeVisible({ timeout: 10000 });

		// Verify it's at the bottom of the screen
		const box = await bottomNav.boundingBox();
		expect(box).toBeTruthy();
		expect(box!.y).toBeGreaterThan(700);
	});

	test('Five tab items present with correct labels', async ({ page }) => {
		await page.goto('/', { waitUntil: 'load', timeout: 15000 });

		const bottomNav = page.locator('nav.fixed.bottom-0');
		await expect(bottomNav).toBeVisible({ timeout: 10000 });

		// Verify all 5 tab labels are present
		const expectedTabs = ['Home', 'Schedule', 'New', 'Review', 'Profile'];
		for (const label of expectedTabs) {
			await expect(bottomNav.getByText(label, { exact: true })).toBeVisible();
		}

		const links = bottomNav.locator('a');
		await expect(links).toHaveCount(5);
	});

	test('FAB button has elevated styling', async ({ page }) => {
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
	});

	test('Active tab has blue highlight', async ({ page }) => {
		await page.goto('/', { waitUntil: 'load', timeout: 15000 });

		const bottomNav = page.locator('nav.fixed.bottom-0');
		await expect(bottomNav).toBeVisible({ timeout: 10000 });

		// Home tab should be active (has text-blue-600)
		const homeTab = bottomNav.getByRole('link', { name: /Home/i });
		await expect(homeTab).toBeVisible();

		// Check active state (has blue color)
		const hasActiveClass = await homeTab.evaluate((el) => {
			return el.classList.contains('text-blue-600') ||
				   getComputedStyle(el).color.includes('rgb(37, 99, 235)');
		});
		expect(hasActiveClass).toBe(true);
	});

	test('Bottom nav hidden on sign-in page', async ({ page }) => {
		await page.goto('/auth/signin', { waitUntil: 'load', timeout: 15000 });

		const bottomNav = page.locator('nav.fixed.bottom-0');
		const isVisible = await bottomNav.isVisible().catch(() => false);
		expect(isVisible).toBe(false);
	});
});
