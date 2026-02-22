import { test, expect } from '@playwright/test';
import { signInAsUser, signOut, isAuthenticated } from './helpers/auth';

// ===========================================================================
// Authentication Core Tests
// ===========================================================================

test.describe('Authentication Core', () => {
	/**
	 * AUTH-01: Unauthenticated User Redirection
	 * Priority: P0 (Critical)
	 */
	test('AUTH-01: should redirect unauthenticated user to sign-in page', async ({ page }) => {
		await page.goto('/');
		await expect(page).toHaveURL(/\/(en\/)?auth\/signin/);
		await expect(page).toHaveTitle(/Instagram/i);
	});

	/**
	 * AUTH-02: Sign In with Test Account
	 * Priority: P0 (Critical)
	 */
	test('AUTH-02: should sign in with test user account', async ({ page }) => {
		await signInAsUser(page);
		expect(await isAuthenticated(page)).toBe(true);
		await expect(page).not.toHaveURL(/\/(en\/)?auth\/signin/);
	});

	/**
	 * AUTH-03: Session Persists Across Navigation
	 * Priority: P1 (High)
	 */
	test('AUTH-03: should persist session across page navigation', async ({ page }) => {
		await signInAsUser(page);
		expect(await isAuthenticated(page)).toBe(true);

		await page.goto('/submit');
		expect(await isAuthenticated(page)).toBe(true);

		await page.goto('/submissions');
		expect(await isAuthenticated(page)).toBe(true);
	});

	/**
	 * AUTH-04: Session Persists After Refresh
	 * Priority: P1 (High)
	 */
	test('AUTH-04: should persist session after page refresh', async ({ page }) => {
		await signInAsUser(page);
		const initialUrl = page.url();
		expect(await isAuthenticated(page)).toBe(true);

		await page.reload();
		expect(await isAuthenticated(page)).toBe(true);
		await expect(page).toHaveURL(initialUrl);
	});

	/**
	 * AUTH-05: Sign Out Clears Session
	 * Priority: P1 (High)
	 */
	test('AUTH-05: should sign out and clear session', async ({ page }) => {
		await signInAsUser(page);
		expect(await isAuthenticated(page)).toBe(true);

		await signOut(page);
		await page.goto('/schedule');

		// Should redirect to sign-in
		await expect(page).toHaveURL(/\/(en\/)?auth\/signin/);
	});

	/**
	 * AUTH-06: Expired Session Handling
	 * Priority: P2 (Medium)
	 */
	test('AUTH-06: should handle expired session gracefully', async ({ page }) => {
		await signInAsUser(page);

		// Clear cookies to simulate expired session
		await page.context().clearCookies();

		await page.goto('/schedule');

		// Should redirect to sign-in
		await expect(page).toHaveURL(/\/(en\/)?auth\/signin/);
	});
});
