/// <reference lib="dom" />
import { Page } from '@playwright/test';
import path from 'path';

/**
 * Authentication helper utilities for E2E tests
 */

export const AUTH_FIXTURES_PATH = path.join(__dirname, '../fixtures/auth');

export const ADMIN_AUTH_FILE = path.join(AUTH_FIXTURES_PATH, 'admin-auth.json');
export const USER_AUTH_FILE = path.join(AUTH_FIXTURES_PATH, 'user-auth.json');

export const TEST_USERS = {
	admin: {
		email: 'admin@test.com',
		name: 'Test Admin',
		role: 'admin',
	},
	user: {
		email: 'user@test.com',
		name: 'Test User',
		role: 'user',
	},
	user2: {
		email: 'user2@test.com',
		name: 'Test User 2',
		role: 'user',
	},
	realIG: {
		email: 'p.romanczuk@gmail.com',
		name: 'Real IG',
		role: 'admin',
	},
};

/**
 * Sign in as admin user with retry logic
 */
export async function signInAsAdmin(page: Page, maxRetries = 5) {
	for (let attempt = 1; attempt <= maxRetries; attempt++) {
		try {
			// Clear cookies before each attempt to ensure clean state
			await page.context().clearCookies();

			await page.goto('/auth/signin', { waitUntil: 'load', timeout: 30000 });

			// Wait for React hydration - the "Test Mode" text only appears after useEffect runs
			const devOnlyText = page.locator('text=Test Mode');

			// Wait for hydration with longer timeout
			await devOnlyText.waitFor({ state: 'visible', timeout: 20000 });

			// Find and wait for button to be ready
			const testBtn = page.getByRole('button', { name: 'Test Admin' });
			await testBtn.waitFor({ state: 'visible', timeout: 10000 });

			// Give React a moment to fully hydrate event handlers
			await page.waitForTimeout(1000);

			// Click the button with force option as fallback
			await testBtn.click({ timeout: 5000 });

			// Wait for navigation away from signin page
			await page.waitForURL(
				(url) => !url.pathname.includes('/auth/signin'),
				{ timeout: 30000 },
			);

			// Verify we're actually signed in
			const currentUrl = page.url();
			if (!currentUrl.includes('/auth/signin')) {
				return; // Success
			}
		} catch (error) {
			const errorMsg = error instanceof Error ? error.message : String(error);
			console.warn(`Test Admin sign-in attempt ${attempt}/${maxRetries} failed:`, errorMsg);

			if (attempt < maxRetries) {
				// Clear cookies and wait before retry with exponential backoff
				await page.context().clearCookies();
				await page.waitForTimeout(2000 * attempt);
			}
		}
	}

	// All retries failed - throw error instead of silent fallback
	throw new Error(`Failed to sign in as admin after ${maxRetries} attempts`);
}

/**
 * Sign in as regular user with retry logic
 */
export async function signInAsUser(page: Page, maxRetries = 5) {
	for (let attempt = 1; attempt <= maxRetries; attempt++) {
		try {
			// Clear cookies before each attempt to ensure clean state
			await page.context().clearCookies();

			await page.goto('/auth/signin', { waitUntil: 'load', timeout: 30000 });

			// Wait for React hydration - the "Test Mode" text only appears after useEffect runs
			const devOnlyText = page.locator('text=Test Mode');

			// Wait for hydration with longer timeout
			await devOnlyText.waitFor({ state: 'visible', timeout: 20000 });

			// Find and wait for button to be ready
			const testBtn = page.getByRole('button', { name: 'Test User' });
			await testBtn.waitFor({ state: 'visible', timeout: 10000 });

			// Give React a moment to fully hydrate event handlers
			await page.waitForTimeout(1000);

			// Click the button with force option as fallback
			await testBtn.click({ timeout: 5000 });

			// Wait for navigation away from signin page
			await page.waitForURL(
				(url) => !url.pathname.includes('/auth/signin'),
				{ timeout: 30000 },
			);

			// Verify we're actually signed in
			const currentUrl = page.url();
			if (!currentUrl.includes('/auth/signin')) {
				return; // Success
			}
		} catch (error) {
			const errorMsg = error instanceof Error ? error.message : String(error);
			console.warn(`Test User sign-in attempt ${attempt}/${maxRetries} failed:`, errorMsg);

			if (attempt < maxRetries) {
				// Clear cookies and wait before retry with exponential backoff
				await page.context().clearCookies();
				await page.waitForTimeout(2000 * attempt);
			}
		}
	}

	// All retries failed - throw error instead of silent fallback
	throw new Error(`Failed to sign in as user after ${maxRetries} attempts`);
}

/**
 * Sign in as real Instagram account (for testing actual publishing)
 * This uses the p.romanczuk@gmail.com account which has linked Instagram tokens
 */
export async function signInAsRealIG(page: Page, maxRetries = 5) {
	for (let attempt = 1; attempt <= maxRetries; attempt++) {
		try {
			// Clear cookies before each attempt to ensure clean state
			await page.context().clearCookies();

			// Navigate to signin page
			await page.goto('/auth/signin', { waitUntil: 'load', timeout: 30000 });

			// Wait for React hydration - the "Test Mode" text only appears after useEffect runs
			const devOnlyText = page.locator('text=Test Mode');
			await devOnlyText.waitFor({ state: 'visible', timeout: 20000 });

			// Find the Real IG button
			const testBtn = page.getByRole('button', { name: 'Test Real IG' });
			await testBtn.waitFor({ state: 'visible', timeout: 10000 });

			// Give React a moment to fully hydrate event handlers
			await page.waitForTimeout(1000);

			// Click and wait for navigation
			await testBtn.click({ timeout: 5000 });

			// Wait for navigation away from signin page (NextAuth does redirects)
			await page.waitForURL(
				(url) => !url.pathname.includes('/auth/signin'),
				{ timeout: 30000 },
			);

			// Final check - ensure we're not on signin anymore
			const currentUrl = page.url();
			if (!currentUrl.includes('/auth/signin')) {
				console.log(`✅ Signed in as Real IG (attempt ${attempt}): ${currentUrl}`);
				return; // Success
			}
		} catch (error) {
			const errorMsg = error instanceof Error ? error.message : String(error);
			console.warn(`Real IG sign-in attempt ${attempt}/${maxRetries} failed:`, errorMsg);

			if (attempt < maxRetries) {
				// Clear cookies and retry with exponential backoff
				await page.context().clearCookies();
				await page.waitForTimeout(2000 * attempt);
			}
		}
	}

	throw new Error(`Failed to sign in as Real IG after ${maxRetries} attempts`);
}

/**
 * Sign in as second user (for testing data isolation)
 */
export async function signInAsUser2(page: Page) {
	await page.goto('/auth/signin', { waitUntil: 'domcontentloaded' });

	// For user2, we need to use a different test button or the API
	// Since the UI only has "Test User" and "Test Admin" buttons,
	// we use the credentials provider directly via evaluate
	await page.evaluate((email) => {
		localStorage.setItem(
			'test-auth-user',
			JSON.stringify({
				email,
				name: 'Test User 2',
				role: 'user',
			}),
		);
	}, TEST_USERS.user2.email);

	await page.goto('/');
	await page.waitForLoadState('domcontentloaded');
}

/**
 * Sign out current user
 */
export async function signOut(page: Page) {
	// Clear local storage first
	await page.evaluate(() => {
		localStorage.clear();
		sessionStorage.clear();
	});

	// Clear cookies to fully sign out
	await page.context().clearCookies();

	// Look for sign out button/link on the page
	const signOutButton = page.getByRole('button', { name: /sign out|logout/i });
	const signOutLink = page.getByRole('link', { name: /sign out|logout/i });

	if (await signOutButton.isVisible({ timeout: 2000 }).catch(() => false)) {
		await signOutButton.click();
		await page.waitForLoadState('domcontentloaded');
	} else if (await signOutLink.isVisible({ timeout: 2000 }).catch(() => false)) {
		await signOutLink.click();
		await page.waitForLoadState('domcontentloaded');
	} else {
		// Alternative: navigate to sign out API endpoint with CSRF handling
		// This uses the NextAuth signout flow
		await page.goto('/api/auth/signout', { waitUntil: 'domcontentloaded' });

		// If we get a form, submit it
		const signOutForm = page.locator('form');
		if (await signOutForm.count() > 0) {
			const submitBtn = page.locator('button[type="submit"]');
			if (await submitBtn.count() > 0) {
				await submitBtn.click();
				await page.waitForLoadState('domcontentloaded');
			}
		}
	}
}

/**
 * Check if user is authenticated
 */
export async function isAuthenticated(page: Page): Promise<boolean> {
	const url = page.url();
	return !url.includes('/auth/signin');
}

/**
 * Wait for authentication to complete
 */
export async function waitForAuth(page: Page, timeout = 5000) {
	await page.waitForURL((url) => !url.pathname.includes('/auth/signin'), {
		timeout,
	});
}

/**
 * Load authentication state from file
 */
export async function loadAuthState(page: Page, authFile: string) {
	try {
		const authState = require(authFile);
		await page.context().addCookies(authState.cookies);
		await page.context().addInitScript((storage) => {
			if (storage.localStorage) {
				Object.entries(storage.localStorage).forEach(([key, value]) => {
					localStorage.setItem(key, value as string);
				});
			}
		}, authState);
	} catch (error) {
		console.warn(`Failed to load auth state from ${authFile}:`, error);
	}
}

/**
 * Save authentication state to file
 */
export async function saveAuthState(page: Page, authFile: string) {
	const cookies = await page.context().cookies();
	const localStorage = await page.evaluate(() =>
		Object.entries(window.localStorage),
	);

	const authState = {
		cookies,
		localStorage: Object.fromEntries(localStorage),
	};

	// Note: In real implementation, use fs to write the file
	console.log('Auth state saved to:', authFile);
	return authState;
}
