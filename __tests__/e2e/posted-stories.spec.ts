import { test, expect } from '@playwright/test';
import {
	signInAsAdmin,
	signInAsUser,
	signInAsRealIG,
	signOut,
} from './helpers/auth';

test.describe('CP-5: Posted Stories Verification', () => {
	// Skip in preview mode (production-only tests)
	test.skip(
		() => process.env.PREVIEW_MODE === 'true',
		'Production-only tests - skipped in preview mode'
	);

	test.describe('Admin Posted Stories Page', () => {
		test.beforeEach(async ({ page }) => {
			await signInAsAdmin(page);
		});

		test('CP-5.1: posted stories page loads for admin', async ({
			page,
		}) => {
			await page.goto('/posted-stories');
			await expect(page).toHaveURL(/\/(en\/)?posted-stories/);

			await page.waitForLoadState('domcontentloaded');
			const bodyText = await page.innerText('body');
			expect(bodyText).toMatch(
				/stories|published|posted|no.*stories|empty/i
			);
		});

		test('CP-5.2: regular user cannot access posted stories', async ({
			page,
		}) => {
			// Sign out admin, sign in as user
			await signOut(page);
			await signInAsUser(page);

			await page.goto('/posted-stories');
			await page.waitForLoadState('domcontentloaded');

			// Should be redirected away (non-admin route)
			const url = page.url();
			expect(url).not.toMatch(/\/posted-stories$/);
		});
	});

	test.describe('Real Instagram Stories Verification', () => {
		test.skip(
			() => !process.env.ENABLE_REAL_IG_TESTS,
			'Set ENABLE_REAL_IG_TESTS=true to run'
		);

		test.skip(
			() => process.env.CI === 'true',
			'Skipping in CI'
		);

		test.beforeEach(async ({ page }) => {
			await signInAsRealIG(page);
		});

		test('CP-5.3: recent stories API returns data', async ({
			request,
		}) => {
			const response = await request.get(
				'/api/instagram/recent-stories?limit=5'
			);
			expect(response.ok()).toBe(true);

			const stories = await response.json();
			expect(Array.isArray(stories)).toBe(true);

			if (stories.length > 0) {
				// Verify story structure
				const story = stories[0];
				expect(story).toHaveProperty('id');
				expect(story).toHaveProperty('media_type');
				console.log(
					'Found ' + stories.length + ' recent stories, latest: ' + story.id
				);
			}
		});

		// NOTE: IG connection check is in CP-4.1, publish+verify is in instagram-publishing-live.spec.ts
	});
});
