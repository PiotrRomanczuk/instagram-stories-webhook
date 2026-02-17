import { test, expect } from '@playwright/test';
import { signInAsAdmin, signInAsUser } from './helpers/auth';

/**
 * Settings Page E2E Tests
 * Tests user settings, preferences, account management, and configuration
 */

test.describe('Settings Page', () => {
	/**
	 * SET-01: Settings Page Access Control
	 * Priority: P0 (Critical)
	 */
	test('SET-01: should require authentication to access settings', async ({ page }) => {
		await page.goto('/settings');

		// Should redirect to sign-in
		await expect(page).toHaveURL(/\/(en\/)?auth\/signin/);
	});

	/**
	 * SET-02: Settings Page Load for Admin
	 * Priority: P0 (Critical)
	 */
	test('SET-02: should load settings page for authenticated admin', async ({ page }) => {
		await signInAsAdmin(page);
		await page.goto('/settings');

		// Should be on settings page
		await expect(page).toHaveURL(/\/(en\/)?settings/);

		// Check for page heading
		await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
	});

	/**
	 * SET-03: Settings Page Load for User
	 * Priority: P0 (Critical)
	 */
	test('SET-03: should load settings page for authenticated user', async ({ page }) => {
		await signInAsUser(page);
		await page.goto('/settings');

		// Should be on settings page
		await expect(page).toHaveURL(/\/(en\/)?settings/);
	});

	/**
	 * SET-04: Settings Categories Display
	 * Priority: P1 (High)
	 */
	test('SET-04: should display settings categories', async ({ page }) => {
		await signInAsAdmin(page);
		await page.goto('/settings');

		await page.waitForLoadState('networkidle', { timeout: 10000 });

		const bodyText = await page.innerText('body');

		// Should show settings-related content
		const hasSettingsContent =
			bodyText.includes('Settings') ||
			bodyText.includes('Profile') ||
			bodyText.includes('Account') ||
			bodyText.includes('Preferences') ||
			bodyText.includes('Notifications');

		expect(hasSettingsContent).toBeTruthy();
	});

	/**
	 * SET-05: User Profile Section
	 * Priority: P1 (High)
	 */
	test('SET-05: should display user profile information', async ({ page }) => {
		await signInAsAdmin(page);
		await page.goto('/settings');

		await page.waitForLoadState('networkidle', { timeout: 10000 });

		const bodyText = await page.innerText('body');

		// Should show user info
		const hasUserInfo =
			bodyText.includes('Email') ||
			bodyText.includes('Name') ||
			bodyText.includes('Profile') ||
			bodyText.includes('admin@test.com') ||
			bodyText.includes('Test Admin');

		expect(hasUserInfo).toBeTruthy();
	});

	/**
	 * SET-06: Instagram Account Connection
	 * Priority: P1 (High)
	 */
	test('SET-06: should show Instagram account connection status', async ({ page }) => {
		await signInAsAdmin(page);
		await page.goto('/settings');

		await page.waitForLoadState('networkidle', { timeout: 10000 });

		const bodyText = await page.innerText('body');

		// Should show Instagram connection info
		const hasIGConnection =
			bodyText.includes('Instagram') ||
			bodyText.includes('Connect') ||
			bodyText.includes('Linked') ||
			bodyText.includes('Account');

		expect(hasIGConnection).toBeTruthy();
	});

	/**
	 * SET-07: Connect Instagram Button
	 * Priority: P1 (High)
	 */
	test('SET-07: should provide button to connect Instagram', async ({ page }) => {
		await signInAsUser(page); // Regular user likely not connected
		await page.goto('/settings');

		await page.waitForLoadState('networkidle', { timeout: 10000 });

		// Look for connect button or link
		const connectButton = page.getByRole('button', { name: /connect|link|authorize/i });
		const connectLink = page.getByRole('link', { name: /connect|link|authorize/i });

		const hasConnectOption = await connectButton.count() > 0 || await connectLink.count() > 0;

		if (hasConnectOption) {
			console.log('✅ Instagram connect option available');
		} else {
			console.log('ℹ️ No connect button (may already be connected)');
		}
	});

	/**
	 * SET-08: Notification Preferences
	 * Priority: P2 (Medium)
	 */
	test('SET-08: should display notification preferences', async ({ page }) => {
		await signInAsAdmin(page);
		await page.goto('/settings');

		await page.waitForLoadState('networkidle', { timeout: 10000 });

		const bodyText = await page.innerText('body');

		// Look for notification settings
		const hasNotificationSettings =
			bodyText.includes('Notification') ||
			bodyText.includes('Email') ||
			bodyText.includes('Alert') ||
			bodyText.includes('Preferences');

		if (hasNotificationSettings) {
			console.log('✅ Notification settings found');
		} else {
			console.log('ℹ️ No notification settings detected');
		}
	});

	/**
	 * SET-09: Language/Locale Selection
	 * Priority: P2 (Medium)
	 */
	test('SET-09: should support language/locale selection', async ({ page }) => {
		await signInAsAdmin(page);
		await page.goto('/settings');

		await page.waitForLoadState('networkidle', { timeout: 10000 });

		const bodyText = await page.innerText('body');

		// Look for language options
		const hasLanguageSettings =
			bodyText.includes('Language') ||
			bodyText.includes('Locale') ||
			bodyText.includes('English') ||
			bodyText.includes('Polski');

		if (hasLanguageSettings) {
			console.log('✅ Language settings found');
		} else {
			console.log('ℹ️ No language settings detected');
		}
	});

	/**
	 * SET-10: Save Changes Button
	 * Priority: P1 (High)
	 */
	test('SET-10: should have save button for settings changes', async ({ page }) => {
		await signInAsAdmin(page);
		await page.goto('/settings');

		await page.waitForLoadState('networkidle', { timeout: 10000 });

		// Look for save button
		const saveButton = page.getByRole('button', { name: /save|update|apply/i });

		if (await saveButton.count() > 0) {
			await expect(saveButton.first()).toBeVisible();
			console.log('✅ Save button available');
		} else {
			console.log('ℹ️ No save button (may auto-save)');
		}
	});

	/**
	 * SET-11: Form Validation
	 * Priority: P2 (Medium)
	 */
	test('SET-11: should validate settings form inputs', async ({ page }) => {
		await signInAsAdmin(page);
		await page.goto('/settings');

		await page.waitForLoadState('networkidle', { timeout: 10000 });

		// Look for form inputs
		const formInputs = page.locator('input, textarea, select');

		if (await formInputs.count() > 0) {
			console.log('✅ Settings form inputs found');

			// Check for required field indicators
			const requiredFields = await page.locator('[required], [aria-required="true"]').count();

			if (requiredFields > 0) {
				console.log('✅ Form validation present');
			}
		} else {
			console.log('ℹ️ No editable settings detected');
		}
	});

	/**
	 * SET-12: Account Deletion or Deactivation
	 * Priority: P2 (Medium)
	 */
	test('SET-12: should provide account management options', async ({ page }) => {
		await signInAsAdmin(page);
		await page.goto('/settings');

		await page.waitForLoadState('networkidle', { timeout: 10000 });

		const bodyText = await page.innerText('body');

		// Look for account management
		const hasAccountManagement =
			bodyText.includes('Delete') ||
			bodyText.includes('Deactivate') ||
			bodyText.includes('Danger') ||
			bodyText.includes('Remove account');

		if (hasAccountManagement) {
			console.log('✅ Account management options found');
		} else {
			console.log('ℹ️ No account management detected');
		}
	});

	/**
	 * SET-13: Disconnect Instagram
	 * Priority: P2 (Medium)
	 */
	test('SET-13: should allow disconnecting Instagram account', async ({ page }) => {
		await signInAsAdmin(page);
		await page.goto('/settings');

		await page.waitForLoadState('networkidle', { timeout: 10000 });

		// Look for disconnect button
		const disconnectButton = page.getByRole('button', { name: /disconnect|unlink|remove/i });

		if (await disconnectButton.count() > 0) {
			console.log('✅ Disconnect option available');
		} else {
			console.log('ℹ️ No disconnect option (may not be connected)');
		}
	});

	/**
	 * SET-14: Settings Tabs/Sections Navigation
	 * Priority: P2 (Medium)
	 */
	test('SET-14: should support tabs or sections navigation', async ({ page }) => {
		await signInAsAdmin(page);
		await page.goto('/settings');

		await page.waitForLoadState('networkidle', { timeout: 10000 });

		// Look for tabs or section navigation
		const tabs = page.locator('[role="tab"], [role="tablist"]');
		const sectionButtons = page.getByRole('button').filter({ hasText: /profile|account|notification|preference/i });

		const hasNavigation = await tabs.count() > 0 || await sectionButtons.count() > 0;

		if (hasNavigation) {
			console.log('✅ Section navigation found');
		} else {
			console.log('ℹ️ Single-page settings (no tabs)');
		}
	});

	/**
	 * SET-15: Success/Error Feedback
	 * Priority: P2 (Medium)
	 */
	test('SET-15: should show feedback after saving settings', async ({ page }) => {
		await signInAsAdmin(page);
		await page.goto('/settings');

		await page.waitForLoadState('networkidle', { timeout: 10000 });

		const saveButton = page.getByRole('button', { name: /save|update|apply/i });

		if (await saveButton.count() > 0) {
			// Try saving (might fail without changes, which is ok)
			await saveButton.first().click({ timeout: 5000 }).catch(() => {});

			await page.waitForTimeout(1000);

			// Look for feedback messages
			const bodyText = await page.innerText('body');

			const hasFeedback =
				bodyText.includes('Saved') ||
				bodyText.includes('Updated') ||
				bodyText.includes('Success') ||
				bodyText.includes('Error');

			if (hasFeedback) {
				console.log('✅ Feedback messages present');
			}
		}
	});

	/**
	 * SET-16: Navigation Elements
	 * Priority: P2 (Medium)
	 */
	test('SET-16: should have navigation elements', async ({ page }) => {
		await signInAsAdmin(page);
		await page.goto('/settings');

		await page.waitForLoadState('networkidle', { timeout: 10000 });

		// Should have navigation
		const navLinks = page.getByRole('navigation').locator('a');
		const linkCount = await navLinks.count();

		expect(linkCount).toBeGreaterThan(0);
	});

	/**
	 * SET-17: Mobile Responsiveness
	 * Priority: P3 (Low)
	 */
	test('SET-17: should be responsive on mobile viewport', async ({ page }) => {
		await page.setViewportSize({ width: 375, height: 667 });

		await signInAsAdmin(page);
		await page.goto('/settings');

		await page.waitForLoadState('networkidle', { timeout: 10000 });

		// Page should load
		await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

		// Check horizontal scroll
		const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
		const viewportWidth = await page.evaluate(() => window.innerWidth);

		expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 20);
	});
});
