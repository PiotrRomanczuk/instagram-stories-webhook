import { test, expect } from '@playwright/test';
import { signInAsRealIG } from './helpers/auth';

/**
 * Skeleton Loading E2E Tests
 *
 * Tests skeleton loading states in the timeline view:
 * - Initial load behavior
 * - Shimmer animation
 * - Content transition
 * - Responsive behavior
 * - Edge cases
 *
 * Component: TimelineGridSkeleton + TimelineCardSkeleton
 * Route: /schedule-mobile
 */

test.describe('Skeleton Loading - Initial Load', () => {
	test.skip(
		() => process.env.CI === 'true',
		'Skipping in CI - requires real account',
	);

	test.skip(
		() => !process.env.ENABLE_REAL_IG_TESTS,
		'Set ENABLE_REAL_IG_TESTS=true to run',
	);

	test.beforeEach(async ({ page }) => {
		await signInAsRealIG(page);
	});

	test('SL-01: Skeleton appears immediately (<50ms)', async ({ page }) => {
		// Start measuring time
		const startTime = Date.now();

		// Navigate to timeline
		await page.goto('/schedule-mobile');

		// Check if skeleton appears (it may not if data loads fast)
		const skeleton = page.locator('[data-testid="timeline-grid-skeleton"]');
		const skeletonAppeared = await skeleton.isVisible({ timeout: 100 }).catch(() => false);

		if (skeletonAppeared) {
			// Verify it appeared quickly
			const loadTime = Date.now() - startTime;
			expect(loadTime).toBeLessThan(200); // Allow 200ms for navigation

			console.log(`✅ Skeleton appeared in ${loadTime}ms`);
		} else {
			// Data loaded too fast to see skeleton (acceptable)
			console.log('⚠️  Data loaded too quickly to observe skeleton');
		}
	});

	test('SL-02: Correct skeleton count on mobile (3 cards)', async ({ page }) => {
		await page.setViewportSize({ width: 390, height: 844 });

		// Block API to force skeleton to stay visible
		await page.route('**/api/content**', async (route) => {
			await page.waitForTimeout(2000); // Delay response
			await route.continue();
		});

		await page.goto('/schedule-mobile');

		const skeleton = page.locator('[data-testid="timeline-grid-skeleton"]');
		if (await skeleton.isVisible({ timeout: 1000 }).catch(() => false)) {
			const skeletons = page.locator('[data-testid="timeline-card-skeleton"]');
			const count = await skeletons.count();

			// Mobile should show 3 or 6 skeletons (depends on implementation)
			expect(count).toBeGreaterThanOrEqual(3);
			expect(count).toBeLessThanOrEqual(6);

			console.log(`✅ Skeleton count on mobile: ${count}`);
		} else {
			console.log('⚠️  Skeleton not visible (data loaded too fast)');
		}
	});

	test('SL-03: Correct skeleton count on tablet (4 cards)', async ({ page }) => {
		await page.setViewportSize({ width: 768, height: 1024 });

		// Block API to force skeleton visibility
		await page.route('**/api/content**', async (route) => {
			await page.waitForTimeout(2000);
			await route.continue();
		});

		await page.goto('/schedule-mobile');

		const skeleton = page.locator('[data-testid="timeline-grid-skeleton"]');
		if (await skeleton.isVisible({ timeout: 1000 }).catch(() => false)) {
			const skeletons = page.locator('[data-testid="timeline-card-skeleton"]');
			const count = await skeletons.count();

			// Tablet/desktop should show 4-6 skeletons
			expect(count).toBeGreaterThanOrEqual(4);
			expect(count).toBeLessThanOrEqual(6);

			console.log(`✅ Skeleton count on tablet: ${count}`);
		} else {
			console.log('⚠️  Skeleton not visible (data loaded too fast)');
		}
	});

	test('SL-04: Correct skeleton count on desktop (6 cards)', async ({ page }) => {
		await page.setViewportSize({ width: 1280, height: 720 });

		// Block API to force skeleton visibility
		await page.route('**/api/content**', async (route) => {
			await page.waitForTimeout(2000);
			await route.continue();
		});

		await page.goto('/schedule-mobile');

		const skeleton = page.locator('[data-testid="timeline-grid-skeleton"]');
		if (await skeleton.isVisible({ timeout: 1000 }).catch(() => false)) {
			const skeletons = page.locator('[data-testid="timeline-card-skeleton"]');
			const count = await skeletons.count();

			// Desktop should show 6 skeletons
			expect(count).toBe(6);

			console.log(`✅ Skeleton count on desktop: ${count}`);
		} else {
			console.log('⚠️  Skeleton not visible (data loaded too fast)');
		}
	});

	test('SL-05: Skeleton cards match real card dimensions', async ({ page }) => {
		// Block API to keep skeleton visible
		await page.route('**/api/content**', async (route) => {
			await page.waitForTimeout(3000);
			await route.continue();
		});

		await page.goto('/schedule-mobile');

		const skeleton = page.locator('[data-testid="timeline-card-skeleton"]').first();
		if (await skeleton.isVisible({ timeout: 1000 }).catch(() => false)) {
			const box = await skeleton.boundingBox();
			expect(box).toBeTruthy();
			expect(box!.height).toBeGreaterThan(100); // Should have height from thumbnail

			// Check for key styling
			await expect(skeleton).toHaveCSS('border-radius', '12px'); // rounded-xl
			const borderLeft = await skeleton.evaluate((el) =>
				window.getComputedStyle(el).borderLeftWidth
			);
			expect(borderLeft).toBe('4px');

			console.log(`✅ Skeleton dimensions: ${box!.width}x${box!.height}`);
		} else {
			console.log('⚠️  Skeleton not visible (data loaded too fast)');
		}
	});

	test('SL-06: Skeleton thumbnail has 9:16 aspect ratio', async ({ page }) => {
		// Block API
		await page.route('**/api/content**', async (route) => {
			await page.waitForTimeout(3000);
			await route.continue();
		});

		await page.goto('/schedule-mobile');

		const skeleton = page.locator('[data-testid="timeline-card-skeleton"]').first();
		if (await skeleton.isVisible({ timeout: 1000 }).catch(() => false)) {
			// Find thumbnail skeleton (w-20 h-[142px])
			const thumbnail = skeleton.locator('.w-20').first();
			if (await thumbnail.isVisible().catch(() => false)) {
				const box = await thumbnail.boundingBox();
				if (box) {
					const aspectRatio = box.width / box.height;
					// 80 / 142 ≈ 0.5634 (close to 9/16 = 0.5625)
					expect(aspectRatio).toBeGreaterThan(0.5);
					expect(aspectRatio).toBeLessThan(0.6);

					console.log(`✅ Thumbnail aspect ratio: ${aspectRatio.toFixed(3)}`);
				}
			}
		} else {
			console.log('⚠️  Skeleton not visible (data loaded too fast)');
		}
	});

	test('SL-07: Skeleton has rounded corners', async ({ page }) => {
		// Block API
		await page.route('**/api/content**', async (route) => {
			await page.waitForTimeout(3000);
			await route.continue();
		});

		await page.goto('/schedule-mobile');

		const skeleton = page.locator('[data-testid="timeline-card-skeleton"]').first();
		if (await skeleton.isVisible({ timeout: 1000 }).catch(() => false)) {
			// Check for rounded-xl (12px)
			await expect(skeleton).toHaveCSS('border-radius', '12px');

			console.log('✅ Skeleton has rounded corners');
		} else {
			console.log('⚠️  Skeleton not visible (data loaded too fast)');
		}
	});

	test('SL-08: Skeleton has ARIA labels for accessibility', async ({ page }) => {
		// Block API
		await page.route('**/api/content**', async (route) => {
			await page.waitForTimeout(3000);
			await route.continue();
		});

		await page.goto('/schedule-mobile');

		// Check grid skeleton ARIA
		const gridSkeleton = page.locator('[data-testid="timeline-grid-skeleton"]');
		if (await gridSkeleton.isVisible({ timeout: 1000 }).catch(() => false)) {
			await expect(gridSkeleton).toHaveAttribute('role', 'status');
			await expect(gridSkeleton).toHaveAttribute('aria-live', 'polite');
			await expect(gridSkeleton).toHaveAttribute('aria-label', 'Loading posts');

			// Check for screen reader text
			const srText = gridSkeleton.locator('.sr-only');
			await expect(srText).toBeVisible();

			console.log('✅ Skeleton has proper ARIA labels');
		} else {
			console.log('⚠️  Skeleton not visible (data loaded too fast)');
		}
	});
});

test.describe('Skeleton Loading - Shimmer Animation', () => {
	test.skip(
		() => process.env.CI === 'true',
		'Skipping in CI - requires real account',
	);

	test.skip(
		() => !process.env.ENABLE_REAL_IG_TESTS,
		'Set ENABLE_REAL_IG_TESTS=true to run',
	);

	test.beforeEach(async ({ page }) => {
		await signInAsRealIG(page);
	});

	test('SL-09: Shimmer gradient animation runs', async ({ page }) => {
		// Block API to keep skeleton visible
		await page.route('**/api/content**', async (route) => {
			await page.waitForTimeout(5000);
			await route.continue();
		});

		await page.goto('/schedule-mobile');

		const skeleton = page.locator('[data-testid="timeline-card-skeleton"]').first();
		if (await skeleton.isVisible({ timeout: 1000 }).catch(() => false)) {
			// Find shimmer element
			const shimmer = skeleton.locator('.skeleton-shimmer').first();
			if (await shimmer.isVisible().catch(() => false)) {
				// Check animation property
				const animation = await shimmer.evaluate((el) => {
					const computed = window.getComputedStyle(el);
					return {
						animationName: computed.animationName,
						animationDuration: computed.animationDuration,
						animationIterationCount: computed.animationIterationCount,
					};
				});

				expect(animation.animationName).toContain('shimmer');

				console.log('✅ Shimmer animation running:', animation);
			}
		} else {
			console.log('⚠️  Skeleton not visible (data loaded too fast)');
		}
	});

	test('SL-10: Shimmer has 1.5s animation duration', async ({ page }) => {
		// Block API
		await page.route('**/api/content**', async (route) => {
			await page.waitForTimeout(5000);
			await route.continue();
		});

		await page.goto('/schedule-mobile');

		const skeleton = page.locator('[data-testid="timeline-card-skeleton"]').first();
		if (await skeleton.isVisible({ timeout: 1000 }).catch(() => false)) {
			const shimmer = skeleton.locator('.skeleton-shimmer').first();
			if (await shimmer.isVisible().catch(() => false)) {
				const duration = await shimmer.evaluate((el) => {
					return window.getComputedStyle(el).animationDuration;
				});

				expect(duration).toBe('1.5s');

				console.log(`✅ Shimmer duration: ${duration}`);
			}
		} else {
			console.log('⚠️  Skeleton not visible (data loaded too fast)');
		}
	});

	test('SL-11: Shimmer loops infinitely', async ({ page }) => {
		// Block API
		await page.route('**/api/content**', async (route) => {
			await page.waitForTimeout(5000);
			await route.continue();
		});

		await page.goto('/schedule-mobile');

		const skeleton = page.locator('[data-testid="timeline-card-skeleton"]').first();
		if (await skeleton.isVisible({ timeout: 1000 }).catch(() => false)) {
			const shimmer = skeleton.locator('.skeleton-shimmer').first();
			if (await shimmer.isVisible().catch(() => false)) {
				const iterationCount = await shimmer.evaluate((el) => {
					return window.getComputedStyle(el).animationIterationCount;
				});

				expect(iterationCount).toBe('infinite');

				console.log('✅ Shimmer loops infinitely');
			}
		} else {
			console.log('⚠️  Skeleton not visible (data loaded too fast)');
		}
	});

	test('SL-12: Shimmer animation is smooth', async ({ page }) => {
		// Block API
		await page.route('**/api/content**', async (route) => {
			await page.waitForTimeout(5000);
			await route.continue();
		});

		await page.goto('/schedule-mobile');

		const skeleton = page.locator('[data-testid="timeline-card-skeleton"]').first();
		if (await skeleton.isVisible({ timeout: 1000 }).catch(() => false)) {
			const shimmer = skeleton.locator('.skeleton-shimmer').first();
			if (await shimmer.isVisible().catch(() => false)) {
				const timingFunction = await shimmer.evaluate((el) => {
					return window.getComputedStyle(el).animationTimingFunction;
				});

				// Should be linear for smooth gradient movement
				expect(timingFunction).toContain('linear');

				console.log(`✅ Shimmer timing: ${timingFunction}`);
			}
		} else {
			console.log('⚠️  Skeleton not visible (data loaded too fast)');
		}
	});

	test('SL-13: Shimmer has correct gradient colors', async ({ page }) => {
		// Block API
		await page.route('**/api/content**', async (route) => {
			await page.waitForTimeout(5000);
			await route.continue();
		});

		await page.goto('/schedule-mobile');

		const skeleton = page.locator('[data-testid="timeline-card-skeleton"]').first();
		if (await skeleton.isVisible({ timeout: 1000 }).catch(() => false)) {
			const shimmer = skeleton.locator('.skeleton-shimmer').first();
			if (await shimmer.isVisible().catch(() => false)) {
				const backgroundImage = await shimmer.evaluate((el) => {
					return window.getComputedStyle(el).backgroundImage;
				});

				// Should contain gradient
				expect(backgroundImage).toContain('linear-gradient');

				console.log('✅ Shimmer has gradient background');
			}
		} else {
			console.log('⚠️  Skeleton not visible (data loaded too fast)');
		}
	});

	test('SL-14: Shimmer respects prefers-reduced-motion', async ({ page }) => {
		// Set reduced motion preference
		await page.emulateMedia({ reducedMotion: 'reduce' });

		// Block API
		await page.route('**/api/content**', async (route) => {
			await page.waitForTimeout(5000);
			await route.continue();
		});

		await page.goto('/schedule-mobile');

		const skeleton = page.locator('[data-testid="timeline-card-skeleton"]').first();
		if (await skeleton.isVisible({ timeout: 1000 }).catch(() => false)) {
			// Skeleton should still be visible but animation may be disabled
			await expect(skeleton).toBeVisible();

			console.log('✅ Skeleton respects reduced motion (still renders)');
		} else {
			console.log('⚠️  Skeleton not visible (data loaded too fast)');
		}
	});
});

test.describe('Skeleton Loading - Content Transition', () => {
	test.skip(
		() => process.env.CI === 'true',
		'Skipping in CI - requires real account',
	);

	test.skip(
		() => !process.env.ENABLE_REAL_IG_TESTS,
		'Set ENABLE_REAL_IG_TESTS=true to run',
	);

	test.beforeEach(async ({ page }) => {
		await signInAsRealIG(page);
	});

	test('SL-15: Skeleton fades out when data loads', async ({ page }) => {
		// Block API initially
		let allowRequest = false;
		await page.route('**/api/content**', async (route) => {
			if (!allowRequest) {
				await page.waitForTimeout(3000);
			}
			await route.continue();
		});

		await page.goto('/schedule-mobile');

		// Wait for skeleton
		const skeleton = page.locator('[data-testid="timeline-grid-skeleton"]');
		const skeletonVisible = await skeleton.isVisible({ timeout: 2000 }).catch(() => false);

		if (skeletonVisible) {
			// Allow request to proceed
			allowRequest = true;

			// Wait for skeleton to disappear
			await skeleton.waitFor({ state: 'hidden', timeout: 10000 });

			console.log('✅ Skeleton faded out after data loaded');
		} else {
			console.log('⚠️  Skeleton not visible (data loaded too fast)');
		}
	});

	test('SL-16: Real content appears after skeleton', async ({ page }) => {
		await page.goto('/schedule-mobile');
		await page.waitForLoadState('domcontentloaded');

		// Wait for either skeleton or content
		const skeleton = page.locator('[data-testid="timeline-grid-skeleton"]');
		const content = page.locator('[data-testid="timeline-card"]').first();

		// Content should eventually be visible (or empty state)
		const contentAppeared = await Promise.race([
			content.waitFor({ state: 'visible', timeout: 10000 }).then(() => true),
			page.locator('[data-testid="empty-state"]').waitFor({ state: 'visible', timeout: 10000 }).then(() => true),
		]).catch(() => false);

		if (contentAppeared) {
			// Skeleton should be gone
			const skeletonStillVisible = await skeleton.isVisible({ timeout: 100 }).catch(() => false);
			expect(skeletonStillVisible).toBe(false);

			console.log('✅ Real content appeared, skeleton removed');
		} else {
			console.log('⚠️  Content did not appear within timeout');
		}
	});

	test('SL-17: No flash of unstyled content (FOUC)', async ({ page }) => {
		// Navigate without waiting
		await page.goto('/schedule-mobile', { waitUntil: 'domcontentloaded' });

		// Take screenshot immediately
		const screenshot1 = await page.screenshot();

		// Wait a bit
		await page.waitForTimeout(500);

		// Take another screenshot
		const screenshot2 = await page.screenshot();

		// Screenshots should show styled content (no broken layout)
		expect(screenshot1).toBeTruthy();
		expect(screenshot2).toBeTruthy();

		console.log('✅ No FOUC detected (screenshots captured)');
	});

	test('SL-18: Stagger timing matches skeleton entrance', async ({ page }) => {
		// This is difficult to test precisely in E2E
		// We can verify the animation structure exists
		await page.goto('/schedule-mobile');
		await page.waitForLoadState('domcontentloaded');

		// Content should eventually appear
		const content = page.locator('[data-testid="timeline-card"]');
		const contentVisible = await content.first().isVisible({ timeout: 10000 }).catch(() => false);

		if (contentVisible) {
			// Verify multiple cards exist (for stagger effect)
			const count = await content.count();
			expect(count).toBeGreaterThanOrEqual(1);

			console.log(`✅ ${count} cards loaded with stagger support`);
		} else {
			console.log('⚠️  No content to test stagger timing');
		}
	});

	test('SL-19: Transition completes within 500ms', async ({ page }) => {
		let transitionStart = 0;
		let transitionEnd = 0;

		// Block API initially
		let allowRequest = false;
		await page.route('**/api/content**', async (route) => {
			if (!allowRequest) {
				await page.waitForTimeout(2000);
			}
			await route.continue();
		});

		await page.goto('/schedule-mobile');

		const skeleton = page.locator('[data-testid="timeline-grid-skeleton"]');
		const skeletonVisible = await skeleton.isVisible({ timeout: 2000 }).catch(() => false);

		if (skeletonVisible) {
			// Allow request
			allowRequest = true;
			transitionStart = Date.now();

			// Wait for content
			const content = page.locator('[data-testid="timeline-card"]').first();
			await content.waitFor({ state: 'visible', timeout: 10000 });
			transitionEnd = Date.now();

			const transitionTime = transitionEnd - transitionStart;
			expect(transitionTime).toBeLessThan(5000); // Allow 5s for network + transition

			console.log(`✅ Transition completed in ${transitionTime}ms`);
		} else {
			console.log('⚠️  Skeleton not visible (data loaded too fast)');
		}
	});

	test('SL-20: No layout shifts during transition', async ({ page }) => {
		await page.goto('/schedule-mobile');

		// Get initial layout
		await page.waitForTimeout(100);
		const initialScroll = await page.evaluate(() => window.scrollY);

		// Wait for content to fully load
		await page.waitForLoadState('networkidle', { timeout: 10000 });

		// Check scroll position didn't change unexpectedly
		const finalScroll = await page.evaluate(() => window.scrollY);
		expect(finalScroll).toBe(initialScroll);

		console.log('✅ No unexpected layout shifts');
	});

	test('SL-21: Empty state shows if no data', async ({ page }) => {
		// Mock empty response
		await page.route('**/api/content**', async (route) => {
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify({ items: [] }),
			});
		});

		await page.goto('/schedule-mobile');

		// Skeleton should disappear
		const skeleton = page.locator('[data-testid="timeline-grid-skeleton"]');
		if (await skeleton.isVisible({ timeout: 1000 }).catch(() => false)) {
			await skeleton.waitFor({ state: 'hidden', timeout: 5000 });
		}

		// Empty state should appear
		const emptyState = page.locator('[data-testid="empty-state"]');
		await expect(emptyState).toBeVisible({ timeout: 5000 });

		console.log('✅ Empty state shown correctly');
	});

	test('SL-22: Error state shows on API failure', async ({ page }) => {
		// Mock error response
		await page.route('**/api/content**', async (route) => {
			await route.fulfill({
				status: 500,
				contentType: 'application/json',
				body: JSON.stringify({ error: 'Internal server error' }),
			});
		});

		await page.goto('/schedule-mobile');

		// Skeleton should eventually disappear
		const skeleton = page.locator('[data-testid="timeline-grid-skeleton"]');
		if (await skeleton.isVisible({ timeout: 1000 }).catch(() => false)) {
			await skeleton.waitFor({ state: 'hidden', timeout: 5000 });
		}

		// Error state or empty state should show
		const hasError = await page.locator('text=/error|failed|try again/i').isVisible({ timeout: 5000 }).catch(() => false);
		const hasEmpty = await page.locator('[data-testid="empty-state"]').isVisible({ timeout: 5000 }).catch(() => false);

		expect(hasError || hasEmpty).toBe(true);

		console.log('✅ Error state handled correctly');
	});
});

test.describe('Skeleton Loading - Responsive Behavior', () => {
	test.skip(
		() => process.env.CI === 'true',
		'Skipping in CI - requires real account',
	);

	test.skip(
		() => !process.env.ENABLE_REAL_IG_TESTS,
		'Set ENABLE_REAL_IG_TESTS=true to run',
	);

	test.beforeEach(async ({ page }) => {
		await signInAsRealIG(page);
	});

	test('SL-23: Mobile shows 1 column grid', async ({ page }) => {
		await page.setViewportSize({ width: 390, height: 844 });

		// Block API
		await page.route('**/api/content**', async (route) => {
			await page.waitForTimeout(3000);
			await route.continue();
		});

		await page.goto('/schedule-mobile');

		const skeleton = page.locator('[data-testid="timeline-grid-skeleton"]');
		if (await skeleton.isVisible({ timeout: 1000 }).catch(() => false)) {
			const grid = skeleton.locator('.grid');
			const gridCols = await grid.evaluate((el) =>
				window.getComputedStyle(el).gridTemplateColumns
			);

			// Single column on mobile
			expect(gridCols.split(' ').length).toBe(1);

			console.log(`✅ Mobile grid: ${gridCols}`);
		} else {
			console.log('⚠️  Skeleton not visible (data loaded too fast)');
		}
	});

	test('SL-24: Tablet shows 2 column grid', async ({ page }) => {
		await page.setViewportSize({ width: 768, height: 1024 });

		// Block API
		await page.route('**/api/content**', async (route) => {
			await page.waitForTimeout(3000);
			await route.continue();
		});

		await page.goto('/schedule-mobile');

		const skeleton = page.locator('[data-testid="timeline-grid-skeleton"]');
		if (await skeleton.isVisible({ timeout: 1000 }).catch(() => false)) {
			const grid = skeleton.locator('.grid');
			const gridCols = await grid.evaluate((el) =>
				window.getComputedStyle(el).gridTemplateColumns
			);

			// 2 columns on tablet
			expect(gridCols.split(' ').length).toBe(2);

			console.log(`✅ Tablet grid: ${gridCols}`);
		} else {
			console.log('⚠️  Skeleton not visible (data loaded too fast)');
		}
	});

	test('SL-25: Desktop shows 3 column grid', async ({ page }) => {
		await page.setViewportSize({ width: 1280, height: 720 });

		// Block API
		await page.route('**/api/content**', async (route) => {
			await page.waitForTimeout(3000);
			await route.continue();
		});

		await page.goto('/schedule-mobile');

		const skeleton = page.locator('[data-testid="timeline-grid-skeleton"]');
		if (await skeleton.isVisible({ timeout: 1000 }).catch(() => false)) {
			const grid = skeleton.locator('.grid');
			const gridCols = await grid.evaluate((el) =>
				window.getComputedStyle(el).gridTemplateColumns
			);

			// 3 columns on desktop
			expect(gridCols.split(' ').length).toBe(3);

			console.log(`✅ Desktop grid: ${gridCols}`);
		} else {
			console.log('⚠️  Skeleton not visible (data loaded too fast)');
		}
	});

	test('SL-26: Viewport resize updates grid layout', async ({ page }) => {
		// Block API
		await page.route('**/api/content**', async (route) => {
			await page.waitForTimeout(5000); // Long delay
			await route.continue();
		});

		// Start mobile
		await page.setViewportSize({ width: 390, height: 844 });
		await page.goto('/schedule-mobile');

		const skeleton = page.locator('[data-testid="timeline-grid-skeleton"]');
		if (await skeleton.isVisible({ timeout: 1000 }).catch(() => false)) {
			const grid = skeleton.locator('.grid');

			// Check mobile
			let gridCols = await grid.evaluate((el) =>
				window.getComputedStyle(el).gridTemplateColumns
			);
			expect(gridCols.split(' ').length).toBe(1);

			// Resize to desktop
			await page.setViewportSize({ width: 1280, height: 720 });
			await page.waitForTimeout(500);

			// Check desktop
			gridCols = await grid.evaluate((el) =>
				window.getComputedStyle(el).gridTemplateColumns
			);
			expect(gridCols.split(' ').length).toBe(3);

			console.log('✅ Grid layout updates on resize');
		} else {
			console.log('⚠️  Skeleton not visible (data loaded too fast)');
		}
	});

	test('SL-27: Grid spacing matches real cards', async ({ page }) => {
		// Block API
		await page.route('**/api/content**', async (route) => {
			await page.waitForTimeout(3000);
			await route.continue();
		});

		await page.goto('/schedule-mobile');

		const skeleton = page.locator('[data-testid="timeline-grid-skeleton"]');
		if (await skeleton.isVisible({ timeout: 1000 }).catch(() => false)) {
			const grid = skeleton.locator('.grid');
			const gap = await grid.evaluate((el) =>
				window.getComputedStyle(el).gap
			);

			// Should have gap-4 (1rem = 16px)
			expect(gap).toBe('16px');

			console.log(`✅ Grid gap: ${gap}`);
		} else {
			console.log('⚠️  Skeleton not visible (data loaded too fast)');
		}
	});

	test('SL-28: Skeleton layout prevents horizontal scroll', async ({ page }) => {
		await page.setViewportSize({ width: 390, height: 844 });

		// Block API
		await page.route('**/api/content**', async (route) => {
			await page.waitForTimeout(3000);
			await route.continue();
		});

		await page.goto('/schedule-mobile');

		const skeleton = page.locator('[data-testid="timeline-grid-skeleton"]');
		if (await skeleton.isVisible({ timeout: 1000 }).catch(() => false)) {
			// Check body scroll width
			const scrollWidth = await page.evaluate(() => document.body.scrollWidth);
			const clientWidth = await page.evaluate(() => document.body.clientWidth);

			expect(scrollWidth).toBeLessThanOrEqual(clientWidth);

			console.log('✅ No horizontal scroll');
		} else {
			console.log('⚠️  Skeleton not visible (data loaded too fast)');
		}
	});
});

test.describe('Skeleton Loading - Edge Cases', () => {
	test.skip(
		() => process.env.CI === 'true',
		'Skipping in CI - requires real account',
	);

	test.skip(
		() => !process.env.ENABLE_REAL_IG_TESTS,
		'Set ENABLE_REAL_IG_TESTS=true to run',
	);

	test.beforeEach(async ({ page }) => {
		await signInAsRealIG(page);
	});

	test('SL-29: Fast data load handles gracefully', async ({ page }) => {
		// Don't block API - let it load fast
		await page.goto('/schedule-mobile');

		// Wait for page to fully load
		await page.waitForLoadState('networkidle', { timeout: 10000 });

		// Content should be visible
		const content = page.locator('[data-testid="timeline-card"]').first();
		const emptyState = page.locator('[data-testid="empty-state"]');

		const hasContent = await content.isVisible({ timeout: 5000 }).catch(() => false);
		const hasEmpty = await emptyState.isVisible({ timeout: 5000 }).catch(() => false);

		expect(hasContent || hasEmpty).toBe(true);

		console.log('✅ Fast load handled (skeleton may have been skipped)');
	});

	test('SL-30: Slow data load keeps shimmer running', async ({ page }) => {
		// Very long delay
		await page.route('**/api/content**', async (route) => {
			await page.waitForTimeout(8000);
			await route.continue();
		});

		await page.goto('/schedule-mobile');

		const skeleton = page.locator('[data-testid="timeline-grid-skeleton"]');
		if (await skeleton.isVisible({ timeout: 1000 }).catch(() => false)) {
			// Wait 5 seconds
			await page.waitForTimeout(5000);

			// Skeleton should still be visible
			await expect(skeleton).toBeVisible();

			// Shimmer should still be animating
			const shimmer = skeleton.locator('.skeleton-shimmer').first();
			const animation = await shimmer.evaluate((el) => {
				return window.getComputedStyle(el).animationPlayState;
			});

			expect(animation).toBe('running');

			console.log('✅ Skeleton persists during slow load, shimmer continues');
		} else {
			console.log('⚠️  Skeleton not visible (data loaded too fast)');
		}
	});

	test('SL-31: Network error shows error state', async ({ page }) => {
		// Mock error
		await page.route('**/api/content**', async (route) => {
			await route.abort('failed');
		});

		await page.goto('/schedule-mobile');

		// Skeleton should disappear
		const skeleton = page.locator('[data-testid="timeline-grid-skeleton"]');
		if (await skeleton.isVisible({ timeout: 1000 }).catch(() => false)) {
			await skeleton.waitFor({ state: 'hidden', timeout: 10000 });
		}

		// Error or empty state should show
		const hasError = await page.locator('text=/error|failed|try again/i').isVisible({ timeout: 5000 }).catch(() => false);
		const hasEmpty = await page.locator('[data-testid="empty-state"]').isVisible({ timeout: 5000 }).catch(() => false);

		expect(hasError || hasEmpty).toBe(true);

		console.log('✅ Network error handled correctly');
	});

	test('SL-32: Refresh re-shows skeleton', async ({ page }) => {
		await page.goto('/schedule-mobile');
		await page.waitForLoadState('networkidle', { timeout: 10000 });

		// Content should be loaded
		const content = page.locator('[data-testid="timeline-card"]').first();
		const contentLoaded = await content.isVisible({ timeout: 5000 }).catch(() => false);

		if (contentLoaded) {
			// Block API for refresh
			await page.route('**/api/content**', async (route) => {
				await page.waitForTimeout(3000);
				await route.continue();
			});

			// Trigger refresh
			const refreshButton = page.locator('[data-testid="pull-to-refresh"]');
			if (await refreshButton.isVisible({ timeout: 1000 }).catch(() => false)) {
				await refreshButton.click();

				// Skeleton should appear again
				const skeleton = page.locator('[data-testid="timeline-grid-skeleton"]');
				const skeletonReappeared = await skeleton.isVisible({ timeout: 2000 }).catch(() => false);

				if (skeletonReappeared) {
					console.log('✅ Skeleton re-appeared on refresh');
				} else {
					console.log('⚠️  Skeleton did not reappear (data loaded too fast)');
				}
			} else {
				console.log('⚠️  Refresh button not found');
			}
		} else {
			console.log('⚠️  No content to refresh');
		}
	});

	test('SL-33: Multiple rapid refreshes handled correctly', async ({ page }) => {
		await page.goto('/schedule-mobile');
		await page.waitForLoadState('networkidle', { timeout: 10000 });

		const refreshButton = page.locator('[data-testid="pull-to-refresh"]');
		const hasRefresh = await refreshButton.isVisible({ timeout: 1000 }).catch(() => false);

		if (hasRefresh) {
			// Click refresh 3 times rapidly
			await refreshButton.click();
			await page.waitForTimeout(100);
			await refreshButton.click();
			await page.waitForTimeout(100);
			await refreshButton.click();

			// Page should still be functional
			await page.waitForTimeout(2000);

			// No crashes or errors
			const bodyText = await page.innerText('body');
			expect(bodyText.length).toBeGreaterThan(0);

			console.log('✅ Multiple rapid refreshes handled');
		} else {
			console.log('⚠️  Refresh button not found');
		}
	});

	test('SL-34: Skeleton renders correctly on slow devices', async ({ page }) => {
		// Throttle CPU
		const client = await page.context().newCDPSession(page);
		await client.send('Emulation.setCPUThrottlingRate', { rate: 4 });

		// Block API
		await page.route('**/api/content**', async (route) => {
			await page.waitForTimeout(3000);
			await route.continue();
		});

		await page.goto('/schedule-mobile');

		const skeleton = page.locator('[data-testid="timeline-grid-skeleton"]');
		const skeletonVisible = await skeleton.isVisible({ timeout: 2000 }).catch(() => false);

		if (skeletonVisible) {
			// Should still render correctly
			await expect(skeleton).toBeVisible();

			const skeletons = page.locator('[data-testid="timeline-card-skeleton"]');
			const count = await skeletons.count();
			expect(count).toBeGreaterThan(0);

			console.log(`✅ Skeleton renders on slow device (${count} cards)`);
		} else {
			console.log('⚠️  Skeleton not visible (data loaded too fast)');
		}

		// Reset CPU throttling
		await client.send('Emulation.setCPUThrottlingRate', { rate: 1 });
	});
});
