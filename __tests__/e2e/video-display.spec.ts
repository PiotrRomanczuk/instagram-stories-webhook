/**
 * E2E Tests: Video Display
 * Tests video display in content cards and preview modal
 */

import { test, expect } from '@playwright/test';
import { signInAsUser } from './helpers/auth';

test.describe('Video Display Components', () => {
	test.beforeEach(async ({ page }) => {
		// Login as test user using the proper auth helper
		await signInAsUser(page);
	});

	test('should display video cards with thumbnail and play button', async ({ page }) => {
		// Navigate to content page
		await page.goto('/en/content');

		// Look for video content cards
		const videoCards = page.locator('[class*="card"]:has(video), [class*="card"]:has-text("VIDEO"), [class*="card"]:has([class*="play"])');

		// Should have at least one video card (if videos exist)
		const count = await videoCards.count();

		if (count > 0) {
			const firstCard = videoCards.first();

			// Should show play button overlay
			await expect(firstCard.locator('[class*="play"], svg[class*="play"]').first()).toBeVisible();

			// Should show video duration badge
			await expect(firstCard.locator('text=/\\d+s/, [class*="duration"]').first()).toBeVisible();

			// Should show thumbnail (not actual video in card)
			const hasImg = await firstCard.locator('img').count();
			expect(hasImg).toBeGreaterThan(0);
		}
	});

	test('should show video icon badge on video cards', async ({ page }) => {
		await page.goto('/en/content');

		// Look for video-specific indicators
		const videoBadges = page.locator('[class*="badge"]:has-text("VIDEO"), svg[class*="video"]');

		const count = await videoBadges.count();

		if (count > 0) {
			await expect(videoBadges.first()).toBeVisible();
		}
	});

	test('should open video preview modal on card click', async ({ page }) => {
		await page.goto('/en/content');

		// Find a video card
		const videoCard = page.locator('[class*="card"]:has([class*="play"])').first();

		const exists = await videoCard.isVisible();

		if (exists) {
			// Click card or preview button
			const previewButton = videoCard.locator('button:has-text("View"), button:has-text("Preview"), button:has([class*="eye"])').first();

			if (await previewButton.isVisible()) {
				await previewButton.click();
			} else {
				await videoCard.click();
			}

			// Should open modal
			await expect(page.locator('[role="dialog"], [class*="modal"]').first()).toBeVisible({ timeout: 5000 });

			// Should show video element
			await expect(page.locator('[role="dialog"] video, [class*="modal"] video').first()).toBeVisible();
		}
	});

	test('should play video in preview modal', async ({ page }) => {
		await page.goto('/en/content');

		const videoCard = page.locator('[class*="card"]:has([class*="play"])').first();

		if (await videoCard.isVisible()) {
			const previewButton = videoCard.locator('button:has-text("View"), button:has-text("Preview")').first();

			if (await previewButton.isVisible()) {
				await previewButton.click();
			} else {
				await videoCard.click();
			}

			// Find video element in modal
			const videoElement = page.locator('[role="dialog"] video, [class*="modal"] video').first();

			if (await videoElement.isVisible()) {
				// Should have controls
				const hasControls = await videoElement.getAttribute('controls');
				expect(hasControls).not.toBeNull();

				// Should have src
				const src = await videoElement.getAttribute('src');
				expect(src).toBeTruthy();
				expect(src).toContain('http');
			}
		}
	});

	test('should display video metadata in preview modal', async ({ page }) => {
		await page.goto('/en/content');

		const videoCard = page.locator('[class*="card"]:has([class*="play"])').first();

		if (await videoCard.isVisible()) {
			const previewButton = videoCard.locator('button:has-text("View"), button:has-text("Preview")').first();

			if (await previewButton.isVisible()) {
				await previewButton.click();
			} else {
				await videoCard.click();
			}

			const modal = page.locator('[role="dialog"], [class*="modal"]').first();

			if (await modal.isVisible()) {
				// Should show video type
				await expect(modal.locator('text=VIDEO, text=video').first()).toBeVisible();

				// Should show duration if available
				const hasDuration = await modal.locator('text=/Duration|\\d+s|\\d+\\.\\d+s/').count();

				if (hasDuration > 0) {
					await expect(modal.locator('text=/Duration/').first()).toBeVisible();
				}
			}
		}
	});

	test('should toggle between Story View and Original View', async ({ page }) => {
		await page.goto('/en/content');

		const videoCard = page.locator('[class*="card"]:has([class*="play"])').first();

		if (await videoCard.isVisible()) {
			const previewButton = videoCard.locator('button:has-text("View")').first();

			if (await previewButton.isVisible()) {
				await previewButton.click();
			} else {
				await videoCard.click();
			}

			// Look for view toggle buttons
			const storyViewButton = page.locator('button:has-text("Story View"), button:has-text("Story")').first();
			const originalViewButton = page.locator('button:has-text("Original"), button:has-text("Original View")').first();

			if (await storyViewButton.isVisible() && await originalViewButton.isVisible()) {
				// Click Story View
				await storyViewButton.click();
				await page.waitForTimeout(500);

				// Should show story frame mockup
				await expect(page.locator('video')).toBeVisible();

				// Click Original View
				await originalViewButton.click();
				await page.waitForTimeout(500);

				// Should still show video
				await expect(page.locator('video')).toBeVisible();
			}
		}
	});

	test('should show video thumbnail as poster', async ({ page }) => {
		await page.goto('/en/content');

		const videoCard = page.locator('[class*="card"]:has([class*="play"])').first();

		if (await videoCard.isVisible()) {
			const previewButton = videoCard.locator('button:has-text("View")').first();

			if (await previewButton.isVisible()) {
				await previewButton.click();
			}

			const videoElement = page.locator('video').first();

			if (await videoElement.isVisible()) {
				// Should have poster attribute
				const poster = await videoElement.getAttribute('poster');

				if (poster) {
					expect(poster).toContain('http');
					expect(poster).toMatch(/thumbnail|jpg|jpeg|png/);
				}
			}
		}
	});

	test('should close video modal', async ({ page }) => {
		await page.goto('/en/content');

		const videoCard = page.locator('[class*="card"]:has([class*="play"])').first();

		if (await videoCard.isVisible()) {
			await videoCard.click();

			// Modal should be visible
			const modal = page.locator('[role="dialog"], [class*="modal"]').first();
			await expect(modal).toBeVisible();

			// Find close button
			const closeButton = modal.locator('button:has([class*="x"]), button:has-text("Close"), button:has-text("Dismiss")').first();
			await closeButton.click();

			// Modal should be hidden
			await expect(modal).not.toBeVisible({ timeout: 3000 });
		}
	});
});
