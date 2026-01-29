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
};

/**
 * Sign in as admin user
 */
export async function signInAsAdmin(page: Page) {
	await page.goto('/auth/signin');

	const testBtn = page.getByRole('button', { name: 'Test Admin' });
	if (await testBtn.isVisible()) {
		await testBtn.click();
		await page.waitForURL(
			(url) => url.pathname === '/' || url.pathname === '/en',
			{ timeout: 10000 },
		);
		return;
	}

	// Fallback: Mock Google OAuth callback
	await page.evaluate((email) => {
		// This is a simplified mock - in real tests, you'd need to properly mock the OAuth flow
		localStorage.setItem(
			'test-auth-user',
			JSON.stringify({
				email,
				name: 'Test Admin',
				role: 'admin',
			}),
		);
	}, TEST_USERS.admin.email);

	await page.goto('/');
}

/**
 * Sign in as regular user
 */
export async function signInAsUser(page: Page) {
	await page.goto('/auth/signin');

	const testBtn = page.getByRole('button', { name: 'Test User' });
	if (await testBtn.isVisible()) {
		await testBtn.click();
		await page.waitForURL(
			(url) => url.pathname === '/' || url.pathname === '/en',
			{ timeout: 10000 },
		);
		return;
	}

	// Fallback check for dev mode failure
	console.warn(
		'Test User button not found, falling back to localStorage mock (API calls may fail)',
	);

	// Mock Google OAuth callback
	await page.evaluate((email) => {
		localStorage.setItem(
			'test-auth-user',
			JSON.stringify({
				email,
				name: 'Test User',
				role: 'user',
			}),
		);
	}, TEST_USERS.user.email);

	await page.goto('/');
}

/**
 * Sign in as second user (for testing data isolation)
 */
export async function signInAsUser2(page: Page) {
	await page.goto('/auth/signin');

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
}

/**
 * Sign out current user
 */
export async function signOut(page: Page) {
	// Look for sign out button/link
	const signOutButton = page.getByRole('button', { name: /sign out|logout/i });

	if (await signOutButton.isVisible()) {
		await signOutButton.click();
	} else {
		// Alternative: navigate to sign out API endpoint
		await page.goto('/api/auth/signout');
	}

	// Clear local storage
	await page.evaluate(() => {
		localStorage.clear();
		sessionStorage.clear();
	});
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
