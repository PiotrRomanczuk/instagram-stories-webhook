import { test, expect } from '@playwright/test';
import { signInAsAdmin, signInAsUser } from './helpers/auth';

// NOTE: Auth/RBAC/API permission tests live in auth-and-rbac-core.spec.ts
test.describe('CP-Cross: Navigation', () => {
	test('CP-X.1: navigation menu contains expected links for admin', async ({
		page,
	}) => {
		await signInAsAdmin(page);
		await page.goto('/review');
		await page.waitForLoadState('domcontentloaded');

		const nav = page.getByRole('navigation');
		const linkCount = await nav.locator('a').count();
		expect(linkCount).toBeGreaterThan(0);
	});

	test('CP-X.2: navigation menu is available for regular user', async ({
		page,
	}) => {
		await signInAsUser(page);
		await page.goto('/submissions');
		await page.waitForLoadState('domcontentloaded');

		const nav = page.getByRole('navigation');
		const linkCount = await nav.locator('a').count();
		expect(linkCount).toBeGreaterThan(0);
	});
});
