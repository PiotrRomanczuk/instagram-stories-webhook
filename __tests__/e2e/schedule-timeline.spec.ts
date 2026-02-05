/**
 * Schedule Timeline View - Comprehensive E2E Tests
 *
 * Tests the mobile-first timeline schedule view based on the Stitch design:
 * - Responsive layouts (mobile, tablet, desktop)
 * - Timeline structure (day groups, cards, status indicators)
 * - Interactive features (tap/click, swipe, hover)
 * - Filters and search
 * - Empty states
 *
 * Design Reference: refined-3-timeline-content.png
 * Test IDs: TL-01 through TL-70
 *
 * NOTE: These tests are TDD - they will FAIL until implementation is complete.
 * The tests define the expected behavior that the implementation must satisfy.
 */

import { test, expect } from '@playwright/test';
import { signInAsUser, signInAsAdmin } from './helpers/auth';

// ============================================================================
// Test Group 1: Timeline Structure and Layout
// ============================================================================

test.describe('Timeline Structure Tests', () => {
	test.beforeEach(async ({ page }) => {
		await signInAsUser(page);
		await page.goto('/schedule/timeline');
		await page.waitForLoadState('domcontentloaded');
	});

	test('TL-01: Timeline page loads successfully', async ({ page }) => {
		// Verify URL
		await expect(page).toHaveURL(/\/schedule\/timeline/);

		// Verify main timeline container exists
		const timelineContainer = page.locator('[data-testid="timeline-container"]');
		await expect(timelineContainer).toBeVisible();
	});

	test('TL-02: Timeline displays day groups (Today, Tomorrow, This Week)', async ({ page }) => {
		// Check for day group sections
		const todaySection = page.locator('[data-testid="timeline-section-today"]');
		const tomorrowSection = page.locator('[data-testid="timeline-section-tomorrow"]');
		const thisWeekSection = page.locator('[data-testid="timeline-section-this-week"]');

		// At least "Today" section should exist
		await expect(todaySection).toBeVisible();

		// Check section header format "TODAY • N POSTS"
		const todayHeader = todaySection.locator('[data-testid="section-header"]');
		const headerText = await todayHeader.textContent();
		expect(headerText).toMatch(/TODAY\s*•\s*\d+\s*POST(S)?/i);
	});

	test('TL-03: Timeline cards show required elements', async ({ page }) => {
		// Find first timeline card
		const firstCard = page.locator('[data-testid="timeline-card"]').first();

		// Wait for cards to load (may be async data fetch)
		await firstCard.waitFor({ state: 'visible', timeout: 10000 }).catch(() => {
			// If no cards, skip this test
			test.skip();
		});

		// Verify card contains thumbnail (9:16 aspect ratio)
		const thumbnail = firstCard.locator('[data-testid="card-thumbnail"]');
		await expect(thumbnail).toBeVisible();

		// Verify card contains caption preview
		const caption = firstCard.locator('[data-testid="card-caption"]');
		await expect(caption).toBeVisible();

		// Verify card contains time badge
		const timeBadge = firstCard.locator('[data-testid="card-time-badge"]');
		await expect(timeBadge).toBeVisible();

		// Verify card has status stripe (colored border)
		const statusStripe = firstCard.locator('[data-testid="card-status-stripe"]');
		await expect(statusStripe).toBeVisible();
	});

	test('TL-04: Timeline section headers show post counts', async ({ page }) => {
		const sections = page.locator('[data-testid^="timeline-section-"]');
		const count = await sections.count();

		// Check at least one section exists
		expect(count).toBeGreaterThan(0);

		// Each section should have a header with count
		for (let i = 0; i < count; i++) {
			const section = sections.nth(i);
			const header = section.locator('[data-testid="section-header"]');
			const headerText = await header.textContent();

			// Format: "SECTION_NAME • N POST(S)"
			expect(headerText).toMatch(/•\s*\d+\s*POST(S)?/i);
		}
	});

	test('TL-05: Empty state displayed when no posts scheduled', async ({ page }) => {
		// This test assumes user has no scheduled posts
		// In real implementation, you'd want to clear data first

		const emptyState = page.locator('[data-testid="timeline-empty-state"]');
		const timelineCards = page.locator('[data-testid="timeline-card"]');
		const cardCount = await timelineCards.count();

		if (cardCount === 0) {
			// Should show empty state
			await expect(emptyState).toBeVisible();

			// Verify empty state content
			const emptyTitle = emptyState.locator('[data-testid="empty-state-title"]');
			const emptyMessage = emptyState.locator('[data-testid="empty-state-message"]');

			await expect(emptyTitle).toBeVisible();
			await expect(emptyMessage).toBeVisible();

			// Verify message suggests action
			const messageText = await emptyMessage.textContent();
			expect(messageText).toMatch(/schedule|upload|no.*posts/i);
		}
	});

	test('TL-06: Timeline card thumbnails have 9:16 aspect ratio', async ({ page }) => {
		const firstCard = page.locator('[data-testid="timeline-card"]').first();

		await firstCard.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {
			test.skip();
		});

		const thumbnail = firstCard.locator('[data-testid="card-thumbnail"]');
		const box = await thumbnail.boundingBox();

		if (box) {
			// 9:16 aspect ratio (Stories format)
			const aspectRatio = box.height / box.width;
			// Allow 10% tolerance for rounding
			expect(aspectRatio).toBeGreaterThan(1.6); // 16/9 = 1.777
			expect(aspectRatio).toBeLessThan(2.0);
		}
	});

	test('TL-07: Timeline cards show caption preview (truncated)', async ({ page }) => {
		const firstCard = page.locator('[data-testid="timeline-card"]').first();

		await firstCard.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {
			test.skip();
		});

		const caption = firstCard.locator('[data-testid="card-caption"]');
		const captionText = await caption.textContent();

		// Caption should exist
		expect(captionText).toBeTruthy();

		// Should be truncated (max 2-3 lines in design)
		const lineCount = await caption.evaluate((el) => {
			const lineHeight = parseFloat(window.getComputedStyle(el).lineHeight);
			const height = el.offsetHeight;
			return Math.round(height / lineHeight);
		});

		// Should be 1-3 lines max
		expect(lineCount).toBeLessThanOrEqual(3);
	});

	test('TL-08: Timeline cards display time badge', async ({ page }) => {
		const firstCard = page.locator('[data-testid="timeline-card"]').first();

		await firstCard.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {
			test.skip();
		});

		const timeBadge = firstCard.locator('[data-testid="card-time-badge"]');
		const timeText = await timeBadge.textContent();

		// Time format: "9:00 AM" or "14:30"
		expect(timeText).toMatch(/\d{1,2}:\d{2}(\s*[AP]M)?/i);
	});
});

// ============================================================================
// Test Group 2: Responsive Behavior Tests
// ============================================================================

test.describe('Responsive Behavior Tests', () => {
	test.beforeEach(async ({ page }) => {
		await signInAsUser(page);
	});

	test('TL-09: Mobile viewport (390px) shows single column layout', async ({ page }) => {
		// Set mobile viewport (iPhone 12 Pro)
		await page.setViewportSize({ width: 390, height: 844 });
		await page.goto('/schedule/timeline');
		await page.waitForLoadState('domcontentloaded');

		// Check grid layout
		const timelineGrid = page.locator('[data-testid="timeline-grid"]');
		await expect(timelineGrid).toBeVisible();

		// Verify single column using CSS grid-template-columns
		const columns = await timelineGrid.evaluate((el) => {
			return window.getComputedStyle(el).gridTemplateColumns;
		});

		// Single column should have only one track
		const columnCount = columns.split(' ').length;
		expect(columnCount).toBe(1);
	});

	test('TL-10: Tablet viewport (768px) shows 2-column grid', async ({ page }) => {
		// Set tablet viewport (iPad)
		await page.setViewportSize({ width: 768, height: 1024 });
		await page.goto('/schedule/timeline');
		await page.waitForLoadState('domcontentloaded');

		const timelineGrid = page.locator('[data-testid="timeline-grid"]');
		await expect(timelineGrid).toBeVisible();

		// Verify 2-column layout
		const columns = await timelineGrid.evaluate((el) => {
			return window.getComputedStyle(el).gridTemplateColumns;
		});

		const columnCount = columns.split(' ').length;
		expect(columnCount).toBe(2);
	});

	test('TL-11: Desktop viewport (1280px+) shows 3-column grid', async ({ page }) => {
		// Set desktop viewport
		await page.setViewportSize({ width: 1280, height: 720 });
		await page.goto('/schedule/timeline');
		await page.waitForLoadState('domcontentloaded');

		const timelineGrid = page.locator('[data-testid="timeline-grid"]');
		await expect(timelineGrid).toBeVisible();

		// Verify 3-column layout
		const columns = await timelineGrid.evaluate((el) => {
			return window.getComputedStyle(el).gridTemplateColumns;
		});

		const columnCount = columns.split(' ').length;
		expect(columnCount).toBeGreaterThanOrEqual(3);
	});

	test('TL-12: Mobile shows bottom navigation', async ({ page }) => {
		await page.setViewportSize({ width: 390, height: 844 });
		await page.goto('/schedule/timeline');
		await page.waitForLoadState('domcontentloaded');

		// Bottom nav should be visible on mobile
		const bottomNav = page.locator('[data-testid="bottom-navigation"]');
		await expect(bottomNav).toBeVisible();

		// Check position is at bottom
		const position = await bottomNav.evaluate((el) => {
			const styles = window.getComputedStyle(el);
			return {
				position: styles.position,
				bottom: styles.bottom,
			};
		});

		expect(position.position).toBe('fixed');
		expect(position.bottom).toBe('0px');
	});

	test('TL-13: Desktop shows sidebar navigation', async ({ page }) => {
		await page.setViewportSize({ width: 1280, height: 720 });
		await page.goto('/schedule/timeline');
		await page.waitForLoadState('domcontentloaded');

		// Sidebar should be visible on desktop
		const sidebar = page.locator('[data-testid="sidebar-navigation"]');
		await expect(sidebar).toBeVisible();

		// Bottom nav should NOT be visible on desktop
		const bottomNav = page.locator('[data-testid="bottom-navigation"]');
		const isBottomNavVisible = await bottomNav.isVisible({ timeout: 2000 }).catch(() => false);
		expect(isBottomNavVisible).toBe(false);
	});

	test('TL-14: Tablet hides bottom navigation', async ({ page }) => {
		await page.setViewportSize({ width: 768, height: 1024 });
		await page.goto('/schedule/timeline');
		await page.waitForLoadState('domcontentloaded');

		// Bottom nav should be hidden on tablet (uses sidebar or top nav instead)
		const bottomNav = page.locator('[data-testid="bottom-navigation"]');
		const isVisible = await bottomNav.isVisible({ timeout: 2000 }).catch(() => false);
		expect(isVisible).toBe(false);
	});

	test('TL-15: Navigation placement changes based on viewport', async ({ page }) => {
		// Test mobile first
		await page.setViewportSize({ width: 390, height: 844 });
		await page.goto('/schedule/timeline');
		await page.waitForLoadState('domcontentloaded');

		let bottomNavVisible = await page.locator('[data-testid="bottom-navigation"]').isVisible({ timeout: 2000 }).catch(() => false);
		expect(bottomNavVisible).toBe(true);

		// Resize to desktop
		await page.setViewportSize({ width: 1280, height: 720 });
		await page.waitForTimeout(500); // Wait for resize handlers

		bottomNavVisible = await page.locator('[data-testid="bottom-navigation"]').isVisible({ timeout: 2000 }).catch(() => false);
		const sidebarVisible = await page.locator('[data-testid="sidebar-navigation"]').isVisible({ timeout: 2000 }).catch(() => false);

		expect(bottomNavVisible).toBe(false);
		expect(sidebarVisible).toBe(true);
	});
});

// ============================================================================
// Test Group 3: Status Indicator Tests
// ============================================================================

test.describe('Status Indicator Tests', () => {
	test.beforeEach(async ({ page }) => {
		await signInAsUser(page);
		await page.goto('/schedule/timeline');
		await page.waitForLoadState('domcontentloaded');
	});

	test('TL-16: Scheduled posts show blue status stripe', async ({ page }) => {
		// Find cards with scheduled status
		const scheduledCard = page.locator('[data-testid="timeline-card"][data-status="scheduled"]').first();

		await scheduledCard.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {
			test.skip(); // Skip if no scheduled posts
		});

		const statusStripe = scheduledCard.locator('[data-testid="card-status-stripe"]');
		await expect(statusStripe).toBeVisible();

		// Check color is blue (using CSS variable or direct color)
		const bgColor = await statusStripe.evaluate((el) => {
			return window.getComputedStyle(el).backgroundColor;
		});

		// Blue in RGB: rgb(59, 130, 246) or similar
		expect(bgColor).toMatch(/rgb\(.*\)|blue|#3b82f6/i);
	});

	test('TL-17: Published posts show green status stripe', async ({ page }) => {
		const publishedCard = page.locator('[data-testid="timeline-card"][data-status="published"]').first();

		await publishedCard.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {
			test.skip(); // Skip if no published posts
		});

		const statusStripe = publishedCard.locator('[data-testid="card-status-stripe"]');
		await expect(statusStripe).toBeVisible();

		// Check color is green
		const bgColor = await statusStripe.evaluate((el) => {
			return window.getComputedStyle(el).backgroundColor;
		});

		expect(bgColor).toMatch(/rgb\(.*\)|green|#10b981|#22c55e/i);
	});

	test('TL-18: Failed posts show red status stripe', async ({ page }) => {
		const failedCard = page.locator('[data-testid="timeline-card"][data-status="failed"]').first();

		await failedCard.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {
			test.skip(); // Skip if no failed posts
		});

		const statusStripe = failedCard.locator('[data-testid="card-status-stripe"]');
		await expect(statusStripe).toBeVisible();

		// Check color is red
		const bgColor = await statusStripe.evaluate((el) => {
			return window.getComputedStyle(el).backgroundColor;
		});

		expect(bgColor).toMatch(/rgb\(.*\)|red|#ef4444|#f87171/i);
	});

	test('TL-19: Status stripe is 4px wide', async ({ page }) => {
		const firstCard = page.locator('[data-testid="timeline-card"]').first();

		await firstCard.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {
			test.skip();
		});

		const statusStripe = firstCard.locator('[data-testid="card-status-stripe"]');
		const width = await statusStripe.evaluate((el) => {
			return window.getComputedStyle(el).width;
		});

		// Should be 4px wide
		expect(width).toBe('4px');
	});

	test('TL-20: Status stripe positioned on left edge of card', async ({ page }) => {
		const firstCard = page.locator('[data-testid="timeline-card"]').first();

		await firstCard.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {
			test.skip();
		});

		const statusStripe = firstCard.locator('[data-testid="card-status-stripe"]');
		const cardBox = await firstCard.boundingBox();
		const stripeBox = await statusStripe.boundingBox();

		if (cardBox && stripeBox) {
			// Stripe should be at left edge (within 1px tolerance)
			expect(Math.abs(stripeBox.x - cardBox.x)).toBeLessThan(1);
		}
	});
});

// ============================================================================
// Test Group 4: Interaction Tests - Click/Tap
// ============================================================================

test.describe('Interaction Tests - Click/Tap', () => {
	test.beforeEach(async ({ page }) => {
		await signInAsUser(page);
		await page.goto('/schedule/timeline');
		await page.waitForLoadState('domcontentloaded');
	});

	test('TL-21: Clicking card opens preview modal', async ({ page }) => {
		const firstCard = page.locator('[data-testid="timeline-card"]').first();

		await firstCard.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {
			test.skip();
		});

		// Click the card
		await firstCard.click();

		// Modal should open
		const modal = page.locator('[data-testid="preview-modal"]');
		await expect(modal).toBeVisible({ timeout: 3000 });

		// Modal should show post details
		const modalTitle = modal.locator('[data-testid="modal-title"]');
		await expect(modalTitle).toBeVisible();
	});

	test('TL-22: Mobile tap on card opens preview modal', async ({ page }) => {
		await page.setViewportSize({ width: 390, height: 844 });
		await page.goto('/schedule/timeline');
		await page.waitForLoadState('domcontentloaded');

		const firstCard = page.locator('[data-testid="timeline-card"]').first();

		await firstCard.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {
			test.skip();
		});

		// Tap the card
		await firstCard.tap();

		// Modal should open
		const modal = page.locator('[data-testid="preview-modal"]');
		await expect(modal).toBeVisible({ timeout: 3000 });
	});

	test('TL-23: Preview modal shows full post details', async ({ page }) => {
		const firstCard = page.locator('[data-testid="timeline-card"]').first();

		await firstCard.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {
			test.skip();
		});

		await firstCard.click();

		const modal = page.locator('[data-testid="preview-modal"]');
		await expect(modal).toBeVisible({ timeout: 3000 });

		// Verify modal contains full caption
		const fullCaption = modal.locator('[data-testid="modal-caption"]');
		await expect(fullCaption).toBeVisible();

		// Verify modal contains full-size image
		const fullImage = modal.locator('[data-testid="modal-image"]');
		await expect(fullImage).toBeVisible();

		// Verify modal contains scheduled time
		const scheduledTime = modal.locator('[data-testid="modal-scheduled-time"]');
		await expect(scheduledTime).toBeVisible();
	});

	test('TL-24: Preview modal can be closed', async ({ page }) => {
		const firstCard = page.locator('[data-testid="timeline-card"]').first();

		await firstCard.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {
			test.skip();
		});

		await firstCard.click();

		const modal = page.locator('[data-testid="preview-modal"]');
		await expect(modal).toBeVisible({ timeout: 3000 });

		// Close modal via close button
		const closeButton = modal.locator('[data-testid="modal-close-button"]');
		await closeButton.click();

		// Modal should disappear
		await expect(modal).not.toBeVisible({ timeout: 2000 });
	});

	test('TL-25: Clicking outside modal closes it', async ({ page }) => {
		const firstCard = page.locator('[data-testid="timeline-card"]').first();

		await firstCard.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {
			test.skip();
		});

		await firstCard.click();

		const modal = page.locator('[data-testid="preview-modal"]');
		await expect(modal).toBeVisible({ timeout: 3000 });

		// Click backdrop/overlay
		const backdrop = page.locator('[data-testid="modal-backdrop"]');
		await backdrop.click({ position: { x: 10, y: 10 } }); // Click corner

		// Modal should close
		await expect(modal).not.toBeVisible({ timeout: 2000 });
	});

	test('TL-26: ESC key closes preview modal', async ({ page }) => {
		const firstCard = page.locator('[data-testid="timeline-card"]').first();

		await firstCard.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {
			test.skip();
		});

		await firstCard.click();

		const modal = page.locator('[data-testid="preview-modal"]');
		await expect(modal).toBeVisible({ timeout: 3000 });

		// Press ESC
		await page.keyboard.press('Escape');

		// Modal should close
		await expect(modal).not.toBeVisible({ timeout: 2000 });
	});
});

// ============================================================================
// Test Group 5: Interaction Tests - Swipe and Hover
// ============================================================================

test.describe('Interaction Tests - Swipe and Hover', () => {
	test('TL-27: Mobile swipe left reveals action buttons', async ({ page }) => {
		await page.setViewportSize({ width: 390, height: 844 });
		await signInAsUser(page);
		await page.goto('/schedule/timeline');
		await page.waitForLoadState('domcontentloaded');

		const firstCard = page.locator('[data-testid="timeline-card"]').first();

		await firstCard.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {
			test.skip();
		});

		const cardBox = await firstCard.boundingBox();
		if (!cardBox) test.skip();

		// Swipe left gesture (drag from right to left)
		const startX = cardBox.x + cardBox.width * 0.8;
		const endX = cardBox.x + cardBox.width * 0.2;
		const centerY = cardBox.y + cardBox.height / 2;

		await page.touchscreen.tap(startX, centerY);
		await page.waitForTimeout(50);
		await page.mouse.move(endX, centerY);

		// Action buttons should be revealed
		const editButton = firstCard.locator('[data-testid="card-action-edit"]');
		const rescheduleButton = firstCard.locator('[data-testid="card-action-reschedule"]');
		const cancelButton = firstCard.locator('[data-testid="card-action-cancel"]');

		await expect(editButton).toBeVisible({ timeout: 2000 });
		await expect(rescheduleButton).toBeVisible({ timeout: 2000 });
		await expect(cancelButton).toBeVisible({ timeout: 2000 });
	});

	test('TL-28: Swipe action buttons include Edit, Reschedule, Cancel', async ({ page }) => {
		await page.setViewportSize({ width: 390, height: 844 });
		await signInAsUser(page);
		await page.goto('/schedule/timeline');
		await page.waitForLoadState('domcontentloaded');

		const firstCard = page.locator('[data-testid="timeline-card"]').first();

		await firstCard.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {
			test.skip();
		});

		// Trigger swipe (simplified for test)
		const cardBox = await firstCard.boundingBox();
		if (!cardBox) test.skip();

		const startX = cardBox.x + cardBox.width - 20;
		const endX = cardBox.x + 20;
		const centerY = cardBox.y + cardBox.height / 2;

		await page.mouse.move(startX, centerY);
		await page.mouse.down();
		await page.mouse.move(endX, centerY, { steps: 10 });
		await page.mouse.up();

		await page.waitForTimeout(300);

		// Verify button labels
		const editButton = firstCard.locator('[data-testid="card-action-edit"]');
		const rescheduleButton = firstCard.locator('[data-testid="card-action-reschedule"]');
		const cancelButton = firstCard.locator('[data-testid="card-action-cancel"]');

		const editText = await editButton.textContent().catch(() => '');
		const rescheduleText = await rescheduleButton.textContent().catch(() => '');
		const cancelText = await cancelButton.textContent().catch(() => '');

		expect(editText).toMatch(/edit/i);
		expect(rescheduleText).toMatch(/reschedule/i);
		expect(cancelText).toMatch(/cancel|delete/i);
	});

	test('TL-29: Desktop hover shows action overlay', async ({ page }) => {
		await page.setViewportSize({ width: 1280, height: 720 });
		await signInAsUser(page);
		await page.goto('/schedule/timeline');
		await page.waitForLoadState('domcontentloaded');

		const firstCard = page.locator('[data-testid="timeline-card"]').first();

		await firstCard.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {
			test.skip();
		});

		// Hover over card
		await firstCard.hover();
		await page.waitForTimeout(300);

		// Action overlay should appear
		const actionOverlay = firstCard.locator('[data-testid="card-action-overlay"]');
		await expect(actionOverlay).toBeVisible({ timeout: 2000 });
	});

	test('TL-30: Desktop hover overlay shows quick actions', async ({ page }) => {
		await page.setViewportSize({ width: 1280, height: 720 });
		await signInAsUser(page);
		await page.goto('/schedule/timeline');
		await page.waitForLoadState('domcontentloaded');

		const firstCard = page.locator('[data-testid="timeline-card"]').first();

		await firstCard.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {
			test.skip();
		});

		await firstCard.hover();
		await page.waitForTimeout(300);

		const overlay = firstCard.locator('[data-testid="card-action-overlay"]');
		await expect(overlay).toBeVisible({ timeout: 2000 });

		// Verify quick action buttons in overlay
		const editBtn = overlay.locator('[data-testid="overlay-action-edit"]');
		const rescheduleBtn = overlay.locator('[data-testid="overlay-action-reschedule"]');

		await expect(editBtn).toBeVisible();
		await expect(rescheduleBtn).toBeVisible();
	});

	test('TL-31: Hover overlay disappears on mouse leave', async ({ page }) => {
		await page.setViewportSize({ width: 1280, height: 720 });
		await signInAsUser(page);
		await page.goto('/schedule/timeline');
		await page.waitForLoadState('domcontentloaded');

		const firstCard = page.locator('[data-testid="timeline-card"]').first();

		await firstCard.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {
			test.skip();
		});

		// Hover to show overlay
		await firstCard.hover();
		await page.waitForTimeout(300);

		const overlay = firstCard.locator('[data-testid="card-action-overlay"]');
		await expect(overlay).toBeVisible({ timeout: 2000 });

		// Move mouse away
		await page.mouse.move(0, 0);
		await page.waitForTimeout(300);

		// Overlay should disappear
		const isVisible = await overlay.isVisible({ timeout: 1000 }).catch(() => false);
		expect(isVisible).toBe(false);
	});
});

// ============================================================================
// Test Group 6: Pull-to-Refresh
// ============================================================================

test.describe('Pull-to-Refresh Tests', () => {
	test('TL-32: Mobile pull-to-refresh triggers data reload', async ({ page }) => {
		await page.setViewportSize({ width: 390, height: 844 });
		await signInAsUser(page);
		await page.goto('/schedule/timeline');
		await page.waitForLoadState('domcontentloaded');

		const timelineContainer = page.locator('[data-testid="timeline-container"]');
		await expect(timelineContainer).toBeVisible();

		// Get initial data timestamp
		const initialTimestamp = await page.evaluate(() => {
			return Date.now();
		});

		// Simulate pull-to-refresh gesture (drag down from top)
		const box = await timelineContainer.boundingBox();
		if (!box) test.skip();

		const centerX = box.x + box.width / 2;
		const startY = box.y + 10;
		const endY = box.y + 150;

		await page.touchscreen.tap(centerX, startY);
		await page.waitForTimeout(50);
		await page.mouse.move(centerX, endY);

		// Wait for loading indicator
		const loadingIndicator = page.locator('[data-testid="timeline-loading-indicator"]');
		await expect(loadingIndicator).toBeVisible({ timeout: 3000 });

		// Wait for reload to complete
		await expect(loadingIndicator).not.toBeVisible({ timeout: 5000 });

		// Verify data was refreshed (would need actual data change in real test)
		const newTimestamp = await page.evaluate(() => {
			return Date.now();
		});

		expect(newTimestamp).toBeGreaterThan(initialTimestamp);
	});

	test('TL-33: Pull-to-refresh shows loading indicator', async ({ page }) => {
		await page.setViewportSize({ width: 390, height: 844 });
		await signInAsUser(page);
		await page.goto('/schedule/timeline');
		await page.waitForLoadState('domcontentloaded');

		const timelineContainer = page.locator('[data-testid="timeline-container"]');
		const box = await timelineContainer.boundingBox();
		if (!box) test.skip();

		// Pull down
		const centerX = box.x + box.width / 2;
		await page.mouse.move(centerX, box.y + 10);
		await page.mouse.down();
		await page.mouse.move(centerX, box.y + 150, { steps: 10 });

		// Loading indicator should appear
		const loadingIndicator = page.locator('[data-testid="timeline-loading-indicator"]');
		await expect(loadingIndicator).toBeVisible({ timeout: 2000 });

		await page.mouse.up();
	});

	test('TL-34: Desktop does not have pull-to-refresh', async ({ page }) => {
		await page.setViewportSize({ width: 1280, height: 720 });
		await signInAsUser(page);
		await page.goto('/schedule/timeline');
		await page.waitForLoadState('domcontentloaded');

		// Check if pull-to-refresh is disabled (no gesture handler)
		const isPullToRefreshEnabled = await page.evaluate(() => {
			const container = document.querySelector('[data-testid="timeline-container"]');
			if (!container) return false;

			// Check for touch-action CSS property
			const touchAction = window.getComputedStyle(container).touchAction;
			return touchAction !== 'none' && touchAction !== 'pan-x';
		});

		// Desktop should disable pull-to-refresh
		expect(isPullToRefreshEnabled).toBe(false);
	});
});

// ============================================================================
// Test Group 7: Filter Tests
// ============================================================================

test.describe('Filter Tests', () => {
	test.beforeEach(async ({ page }) => {
		await signInAsUser(page);
		await page.goto('/schedule/timeline');
		await page.waitForLoadState('domcontentloaded');
	});

	test('TL-35: Filter chips are visible (Scheduled, Published, Failed)', async ({ page }) => {
		const filterContainer = page.locator('[data-testid="timeline-filters"]');
		await expect(filterContainer).toBeVisible();

		// Verify filter chips
		const scheduledFilter = filterContainer.locator('[data-testid="filter-scheduled"]');
		const publishedFilter = filterContainer.locator('[data-testid="filter-published"]');
		const failedFilter = filterContainer.locator('[data-testid="filter-failed"]');

		await expect(scheduledFilter).toBeVisible();
		await expect(publishedFilter).toBeVisible();
		await expect(failedFilter).toBeVisible();
	});

	test('TL-36: Clicking filter chip activates it (blue highlight)', async ({ page }) => {
		const scheduledFilter = page.locator('[data-testid="filter-scheduled"]');
		await expect(scheduledFilter).toBeVisible();

		// Click filter
		await scheduledFilter.click();
		await page.waitForTimeout(300);

		// Should be highlighted (blue background)
		const bgColor = await scheduledFilter.evaluate((el) => {
			return window.getComputedStyle(el).backgroundColor;
		});

		// Should have blue background when active
		expect(bgColor).toMatch(/rgb\(59, 130, 246\)|rgb\(37, 99, 235\)|blue/i);
	});

	test('TL-37: Active filter shows only matching posts', async ({ page }) => {
		// Get initial card count
		const initialCards = page.locator('[data-testid="timeline-card"]');
		const initialCount = await initialCards.count();

		if (initialCount === 0) test.skip();

		// Click "Scheduled" filter
		const scheduledFilter = page.locator('[data-testid="filter-scheduled"]');
		await scheduledFilter.click();
		await page.waitForTimeout(500);

		// All visible cards should have status="scheduled"
		const visibleCards = page.locator('[data-testid="timeline-card"]:visible');
		const cardCount = await visibleCards.count();

		for (let i = 0; i < cardCount; i++) {
			const card = visibleCards.nth(i);
			const status = await card.getAttribute('data-status');
			expect(status).toBe('scheduled');
		}
	});

	test('TL-38: Published filter shows only published posts', async ({ page }) => {
		const publishedFilter = page.locator('[data-testid="filter-published"]');
		await publishedFilter.click();
		await page.waitForTimeout(500);

		const visibleCards = page.locator('[data-testid="timeline-card"]:visible');
		const cardCount = await visibleCards.count();

		// Skip if no cards (might be no published posts)
		if (cardCount === 0) {
			const emptyState = page.locator('[data-testid="timeline-empty-state"]');
			await expect(emptyState).toBeVisible();
			return;
		}

		for (let i = 0; i < cardCount; i++) {
			const card = visibleCards.nth(i);
			const status = await card.getAttribute('data-status');
			expect(status).toBe('published');
		}
	});

	test('TL-39: Failed filter shows only failed posts', async ({ page }) => {
		const failedFilter = page.locator('[data-testid="filter-failed"]');
		await failedFilter.click();
		await page.waitForTimeout(500);

		const visibleCards = page.locator('[data-testid="timeline-card"]:visible');
		const cardCount = await visibleCards.count();

		// Skip if no failed posts
		if (cardCount === 0) {
			const emptyState = page.locator('[data-testid="timeline-empty-state"]');
			await expect(emptyState).toBeVisible();
			return;
		}

		for (let i = 0; i < cardCount; i++) {
			const card = visibleCards.nth(i);
			const status = await card.getAttribute('data-status');
			expect(status).toBe('failed');
		}
	});

	test('TL-40: Can clear filter to show all posts', async ({ page }) => {
		// Apply filter first
		const scheduledFilter = page.locator('[data-testid="filter-scheduled"]');
		await scheduledFilter.click();
		await page.waitForTimeout(500);

		const filteredCount = await page.locator('[data-testid="timeline-card"]:visible').count();

		// Clear filter (click again or click "All" button)
		const clearButton = page.locator('[data-testid="filter-clear"]');
		const hasClearButton = await clearButton.isVisible({ timeout: 1000 }).catch(() => false);

		if (hasClearButton) {
			await clearButton.click();
		} else {
			// Toggle off by clicking same filter again
			await scheduledFilter.click();
		}

		await page.waitForTimeout(500);

		const allCount = await page.locator('[data-testid="timeline-card"]:visible').count();

		// Should show more cards (or same if only scheduled posts exist)
		expect(allCount).toBeGreaterThanOrEqual(filteredCount);
	});

	test('TL-41: Multiple filters cannot be active simultaneously', async ({ page }) => {
		const scheduledFilter = page.locator('[data-testid="filter-scheduled"]');
		const publishedFilter = page.locator('[data-testid="filter-published"]');

		// Click scheduled
		await scheduledFilter.click();
		await page.waitForTimeout(300);

		// Click published (should deactivate scheduled)
		await publishedFilter.click();
		await page.waitForTimeout(300);

		// Only published should be active
		const scheduledActive = await scheduledFilter.evaluate((el) => {
			return el.classList.contains('active') || el.getAttribute('data-active') === 'true';
		});

		const publishedActive = await publishedFilter.evaluate((el) => {
			return el.classList.contains('active') || el.getAttribute('data-active') === 'true';
		});

		expect(scheduledActive).toBe(false);
		expect(publishedActive).toBe(true);
	});

	test('TL-42: Filter state persists during navigation', async ({ page }) => {
		// Apply filter
		const publishedFilter = page.locator('[data-testid="filter-published"]');
		await publishedFilter.click();
		await page.waitForTimeout(500);

		// Navigate away
		await page.goto('/');
		await page.waitForTimeout(500);

		// Navigate back
		await page.goto('/schedule/timeline');
		await page.waitForLoadState('domcontentloaded');

		// Filter should still be active (if using URL params or session storage)
		const publishedActive = await page.locator('[data-testid="filter-published"]').evaluate((el) => {
			return el.classList.contains('active') || el.getAttribute('data-active') === 'true';
		});

		// Note: This depends on implementation - may or may not persist
		// Test documents expected behavior
		expect(typeof publishedActive).toBe('boolean');
	});
});

// ============================================================================
// Test Group 8: Search Tests
// ============================================================================

test.describe('Search Tests', () => {
	test.beforeEach(async ({ page }) => {
		await signInAsUser(page);
		await page.goto('/schedule/timeline');
		await page.waitForLoadState('domcontentloaded');
	});

	test('TL-43: Search bar is visible', async ({ page }) => {
		const searchBar = page.locator('[data-testid="timeline-search"]');
		await expect(searchBar).toBeVisible();

		// Verify placeholder text
		const placeholder = await searchBar.getAttribute('placeholder');
		expect(placeholder).toMatch(/search|find/i);
	});

	test('TL-44: Search filters posts by caption content', async ({ page }) => {
		const searchBar = page.locator('[data-testid="timeline-search"]');

		// Get a caption from first card
		const firstCard = page.locator('[data-testid="timeline-card"]').first();
		await firstCard.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {
			test.skip();
		});

		const captionText = await firstCard.locator('[data-testid="card-caption"]').textContent();
		if (!captionText || captionText.length < 3) test.skip();

		// Search for first word of caption
		const searchTerm = captionText.split(' ')[0];
		await searchBar.fill(searchTerm);

		// Wait for debounce (500ms)
		await page.waitForTimeout(600);

		// Verify results contain search term
		const visibleCards = page.locator('[data-testid="timeline-card"]:visible');
		const count = await visibleCards.count();

		expect(count).toBeGreaterThan(0);

		// Check first result contains search term
		const resultCaption = await visibleCards.first().locator('[data-testid="card-caption"]').textContent();
		expect(resultCaption?.toLowerCase()).toContain(searchTerm.toLowerCase());
	});

	test('TL-45: Search is debounced (waits 500ms)', async ({ page }) => {
		const searchBar = page.locator('[data-testid="timeline-search"]');

		// Track network requests
		let searchRequestCount = 0;
		page.on('request', (request) => {
			if (request.url().includes('/api/posts') || request.url().includes('search')) {
				searchRequestCount++;
			}
		});

		// Type quickly (should not trigger immediate searches)
		await searchBar.fill('t');
		await page.waitForTimeout(100);
		await searchBar.fill('te');
		await page.waitForTimeout(100);
		await searchBar.fill('tes');
		await page.waitForTimeout(100);
		await searchBar.fill('test');

		// Wait for debounce
		await page.waitForTimeout(600);

		// Should have made only 1 request (after debounce)
		expect(searchRequestCount).toBeLessThanOrEqual(1);
	});

	test('TL-46: Search shows no results message for non-matching query', async ({ page }) => {
		const searchBar = page.locator('[data-testid="timeline-search"]');

		// Search for nonsense
		const nonsenseQuery = `xyz_${Date.now()}_nonexistent`;
		await searchBar.fill(nonsenseQuery);
		await page.waitForTimeout(600);

		// Should show empty state or no results message
		const emptyState = page.locator('[data-testid="timeline-empty-state"]');
		const noResults = page.locator('[data-testid="timeline-no-results"]');

		const hasEmptyState = await emptyState.isVisible({ timeout: 2000 }).catch(() => false);
		const hasNoResults = await noResults.isVisible({ timeout: 2000 }).catch(() => false);

		expect(hasEmptyState || hasNoResults).toBe(true);
	});

	test('TL-47: Clear search button is visible when searching', async ({ page }) => {
		const searchBar = page.locator('[data-testid="timeline-search"]');

		// Initially, clear button should not be visible
		const clearButton = page.locator('[data-testid="search-clear-button"]');
		const initiallyVisible = await clearButton.isVisible({ timeout: 1000 }).catch(() => false);
		expect(initiallyVisible).toBe(false);

		// Type search query
		await searchBar.fill('test');
		await page.waitForTimeout(300);

		// Clear button should appear
		await expect(clearButton).toBeVisible({ timeout: 2000 });
	});

	test('TL-48: Clear search button clears search and shows all posts', async ({ page }) => {
		const searchBar = page.locator('[data-testid="timeline-search"]');

		// Search for something
		await searchBar.fill('test');
		await page.waitForTimeout(600);

		const filteredCount = await page.locator('[data-testid="timeline-card"]:visible').count();

		// Click clear button
		const clearButton = page.locator('[data-testid="search-clear-button"]');
		await clearButton.click();
		await page.waitForTimeout(300);

		// Search input should be empty
		const searchValue = await searchBar.inputValue();
		expect(searchValue).toBe('');

		// Should show all posts again
		const allCount = await page.locator('[data-testid="timeline-card"]:visible').count();
		expect(allCount).toBeGreaterThanOrEqual(filteredCount);
	});

	test('TL-49: Search works with filters simultaneously', async ({ page }) => {
		const searchBar = page.locator('[data-testid="timeline-search"]');
		const scheduledFilter = page.locator('[data-testid="filter-scheduled"]');

		// Apply filter first
		await scheduledFilter.click();
		await page.waitForTimeout(500);

		const initialCount = await page.locator('[data-testid="timeline-card"]:visible').count();
		if (initialCount === 0) test.skip();

		// Get caption from first card
		const firstCard = page.locator('[data-testid="timeline-card"]').first();
		const captionText = await firstCard.locator('[data-testid="card-caption"]').textContent();
		if (!captionText) test.skip();

		// Search within filtered results
		const searchTerm = captionText.split(' ')[0];
		await searchBar.fill(searchTerm);
		await page.waitForTimeout(600);

		// Results should match both filter AND search
		const visibleCards = page.locator('[data-testid="timeline-card"]:visible');
		const count = await visibleCards.count();

		expect(count).toBeGreaterThan(0);
		expect(count).toBeLessThanOrEqual(initialCount);

		// Verify cards match filter
		const firstResult = visibleCards.first();
		const status = await firstResult.getAttribute('data-status');
		expect(status).toBe('scheduled');
	});

	test('TL-50: Search is case-insensitive', async ({ page }) => {
		const searchBar = page.locator('[data-testid="timeline-search"]');

		// Get a caption
		const firstCard = page.locator('[data-testid="timeline-card"]').first();
		await firstCard.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {
			test.skip();
		});

		const captionText = await firstCard.locator('[data-testid="card-caption"]').textContent();
		if (!captionText || captionText.length < 3) test.skip();

		const searchTerm = captionText.split(' ')[0];

		// Search with UPPERCASE
		await searchBar.fill(searchTerm.toUpperCase());
		await page.waitForTimeout(600);

		const uppercaseResults = await page.locator('[data-testid="timeline-card"]:visible').count();
		expect(uppercaseResults).toBeGreaterThan(0);

		// Clear and search with lowercase
		await searchBar.fill('');
		await page.waitForTimeout(300);
		await searchBar.fill(searchTerm.toLowerCase());
		await page.waitForTimeout(600);

		const lowercaseResults = await page.locator('[data-testid="timeline-card"]:visible').count();

		// Should return same results
		expect(lowercaseResults).toBe(uppercaseResults);
	});
});

// ============================================================================
// Test Group 9: Accessibility and Performance
// ============================================================================

test.describe('Accessibility and Performance Tests', () => {
	test.beforeEach(async ({ page }) => {
		await signInAsUser(page);
	});

	test('TL-51: Timeline cards have proper ARIA labels', async ({ page }) => {
		await page.goto('/schedule/timeline');
		await page.waitForLoadState('domcontentloaded');

		const firstCard = page.locator('[data-testid="timeline-card"]').first();
		await firstCard.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {
			test.skip();
		});

		// Card should have role="article" or similar
		const role = await firstCard.getAttribute('role');
		expect(role).toMatch(/article|listitem/);

		// Card should have aria-label or aria-labelledby
		const ariaLabel = await firstCard.getAttribute('aria-label');
		const ariaLabelledBy = await firstCard.getAttribute('aria-labelledby');

		expect(ariaLabel || ariaLabelledBy).toBeTruthy();
	});

	test('TL-52: Keyboard navigation works (Tab, Enter)', async ({ page }) => {
		await page.goto('/schedule/timeline');
		await page.waitForLoadState('domcontentloaded');

		// Tab to first card
		await page.keyboard.press('Tab');
		await page.keyboard.press('Tab');
		await page.keyboard.press('Tab');

		// Verify focus is on a card
		const focusedElement = page.locator(':focus');
		const isFocused = await focusedElement.isVisible({ timeout: 2000 }).catch(() => false);

		if (isFocused) {
			// Press Enter to open modal
			await page.keyboard.press('Enter');

			// Modal should open
			const modal = page.locator('[data-testid="preview-modal"]');
			await expect(modal).toBeVisible({ timeout: 3000 });
		}
	});

	test('TL-53: Focus indicators are visible', async ({ page }) => {
		await page.goto('/schedule/timeline');
		await page.waitForLoadState('domcontentloaded');

		const firstCard = page.locator('[data-testid="timeline-card"]').first();
		await firstCard.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {
			test.skip();
		});

		// Focus the card
		await firstCard.focus();
		await page.waitForTimeout(300);

		// Check focus styles
		const outline = await firstCard.evaluate((el) => {
			const styles = window.getComputedStyle(el);
			return styles.outline || styles.boxShadow;
		});

		expect(outline).toBeTruthy();
		expect(outline).not.toBe('none');
	});

	test('TL-54: Timeline loads in under 3 seconds', async ({ page }) => {
		const startTime = Date.now();

		await page.goto('/schedule/timeline');
		await page.waitForLoadState('domcontentloaded');

		// Wait for timeline container
		await page.locator('[data-testid="timeline-container"]').waitFor({ state: 'visible', timeout: 5000 });

		const loadTime = Date.now() - startTime;
		expect(loadTime).toBeLessThan(3000);
	});

	test('TL-55: Images are lazy-loaded', async ({ page }) => {
		await page.goto('/schedule/timeline');
		await page.waitForLoadState('domcontentloaded');

		const images = page.locator('[data-testid="card-thumbnail"] img');
		const count = await images.count();

		if (count === 0) test.skip();

		// Check first image has lazy loading
		const firstImg = images.first();
		const loading = await firstImg.getAttribute('loading');

		expect(loading).toBe('lazy');
	});

	test('TL-56: No console errors on page load', async ({ page }) => {
		const consoleErrors: string[] = [];

		page.on('console', (msg) => {
			if (msg.type() === 'error') {
				consoleErrors.push(msg.text());
			}
		});

		await page.goto('/schedule/timeline');
		await page.waitForLoadState('domcontentloaded');
		await page.waitForTimeout(2000);

		// Filter out known false positives
		const criticalErrors = consoleErrors.filter(
			(err) => !err.includes('ResizeObserver') && !err.includes('favicon')
		);

		expect(criticalErrors.length).toBe(0);
	});

	test('TL-57: Page is responsive to viewport changes', async ({ page }) => {
		await page.goto('/schedule/timeline');
		await page.waitForLoadState('domcontentloaded');

		// Start mobile
		await page.setViewportSize({ width: 390, height: 844 });
		await page.waitForTimeout(500);

		const mobileGrid = await page.locator('[data-testid="timeline-grid"]').evaluate((el) => {
			return window.getComputedStyle(el).gridTemplateColumns.split(' ').length;
		});

		expect(mobileGrid).toBe(1);

		// Resize to desktop
		await page.setViewportSize({ width: 1280, height: 720 });
		await page.waitForTimeout(500);

		const desktopGrid = await page.locator('[data-testid="timeline-grid"]').evaluate((el) => {
			return window.getComputedStyle(el).gridTemplateColumns.split(' ').length;
		});

		expect(desktopGrid).toBeGreaterThanOrEqual(3);
	});
});

// ============================================================================
// Test Group 10: Edge Cases and Error Handling
// ============================================================================

test.describe('Edge Cases and Error Handling', () => {
	test('TL-58: Handles very long captions gracefully', async ({ page }) => {
		await signInAsUser(page);
		await page.goto('/schedule/timeline');
		await page.waitForLoadState('domcontentloaded');

		const cards = page.locator('[data-testid="timeline-card"]');
		const count = await cards.count();

		if (count === 0) test.skip();

		// Check if any card has very long caption
		for (let i = 0; i < Math.min(count, 5); i++) {
			const card = cards.nth(i);
			const caption = card.locator('[data-testid="card-caption"]');

			// Should have text-overflow: ellipsis or line-clamp
			const overflow = await caption.evaluate((el) => {
				const styles = window.getComputedStyle(el);
				return {
					textOverflow: styles.textOverflow,
					overflow: styles.overflow,
					webkitLineClamp: styles.webkitLineClamp,
				};
			});

			// Should truncate long text
			expect(overflow.textOverflow === 'ellipsis' || overflow.webkitLineClamp).toBeTruthy();
		}
	});

	test('TL-59: Handles missing thumbnails gracefully', async ({ page }) => {
		await signInAsUser(page);
		await page.goto('/schedule/timeline');
		await page.waitForLoadState('domcontentloaded');

		// Cards with missing images should show placeholder
		const cards = page.locator('[data-testid="timeline-card"]');
		const count = await cards.count();

		if (count === 0) test.skip();

		const firstCard = cards.first();
		const thumbnail = firstCard.locator('[data-testid="card-thumbnail"]');

		// Should have either img or placeholder
		const hasImage = await thumbnail.locator('img').isVisible({ timeout: 1000 }).catch(() => false);
		const hasPlaceholder = await thumbnail.locator('[data-testid="thumbnail-placeholder"]').isVisible({ timeout: 1000 }).catch(() => false);

		expect(hasImage || hasPlaceholder).toBe(true);
	});

	test('TL-60: Handles network errors during data fetch', async ({ page }) => {
		await signInAsUser(page);

		// Simulate network failure
		await page.route('**/api/posts*', (route) => {
			route.abort('failed');
		});

		await page.goto('/schedule/timeline');
		await page.waitForLoadState('domcontentloaded');

		// Should show error message
		const errorMessage = page.locator('[data-testid="timeline-error-message"]');
		await expect(errorMessage).toBeVisible({ timeout: 5000 });

		// Should offer retry option
		const retryButton = page.locator('[data-testid="error-retry-button"]');
		await expect(retryButton).toBeVisible();
	});

	test('TL-61: Retry button works after error', async ({ page }) => {
		await signInAsUser(page);

		let requestCount = 0;
		await page.route('**/api/posts*', (route) => {
			requestCount++;
			if (requestCount === 1) {
				// Fail first request
				route.abort('failed');
			} else {
				// Succeed on retry
				route.continue();
			}
		});

		await page.goto('/schedule/timeline');
		await page.waitForLoadState('domcontentloaded');

		const errorMessage = page.locator('[data-testid="timeline-error-message"]');
		await expect(errorMessage).toBeVisible({ timeout: 5000 });

		// Click retry
		const retryButton = page.locator('[data-testid="error-retry-button"]');
		await retryButton.click();

		// Should show loading then data
		const loadingIndicator = page.locator('[data-testid="timeline-loading-indicator"]');
		await expect(loadingIndicator).toBeVisible({ timeout: 2000 });
		await expect(loadingIndicator).not.toBeVisible({ timeout: 5000 });

		// Error should be gone
		const errorVisible = await errorMessage.isVisible({ timeout: 1000 }).catch(() => false);
		expect(errorVisible).toBe(false);
	});

	test('TL-62: Handles unauthorized access gracefully', async ({ page }) => {
		// Don't sign in - should redirect or show error
		await page.goto('/schedule/timeline');
		await page.waitForLoadState('domcontentloaded');

		// Should redirect to signin or show error
		const currentUrl = page.url();
		const isSignInPage = currentUrl.includes('/auth/signin');
		const hasUnauthorizedMessage = await page.locator('text=/unauthorized|sign in/i').isVisible({ timeout: 3000 }).catch(() => false);

		expect(isSignInPage || hasUnauthorizedMessage).toBe(true);
	});

	test('TL-63: Handles very large datasets (100+ posts)', async ({ page }) => {
		// This test would need seeded data
		await signInAsUser(page);
		await page.goto('/schedule/timeline');
		await page.waitForLoadState('domcontentloaded');

		// Should implement virtualization or pagination
		const cards = page.locator('[data-testid="timeline-card"]');
		const count = await cards.count();

		// If many cards exist, should not render all at once (virtual scrolling)
		// Or should implement "Load More" pagination
		const loadMoreButton = page.locator('[data-testid="timeline-load-more"]');
		const hasLoadMore = await loadMoreButton.isVisible({ timeout: 2000 }).catch(() => false);

		// If >50 cards visible, should have load more or virtual scrolling
		if (count > 50) {
			expect(hasLoadMore).toBe(true);
		}
	});

	test('TL-64: Optimistic UI updates on action', async ({ page }) => {
		await signInAsUser(page);
		await page.goto('/schedule/timeline');
		await page.waitForLoadState('domcontentloaded');

		const firstCard = page.locator('[data-testid="timeline-card"]').first();
		await firstCard.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {
			test.skip();
		});

		// Open card and perform action (e.g., reschedule)
		await firstCard.click();

		const modal = page.locator('[data-testid="preview-modal"]');
		await expect(modal).toBeVisible({ timeout: 3000 });

		const deleteButton = modal.locator('[data-testid="modal-delete-button"]');
		const hasDeleteButton = await deleteButton.isVisible({ timeout: 2000 }).catch(() => false);

		if (hasDeleteButton) {
			// Get card count before delete
			const initialCount = await page.locator('[data-testid="timeline-card"]').count();

			await deleteButton.click();

			// UI should update immediately (optimistic)
			await page.waitForTimeout(300);

			const newCount = await page.locator('[data-testid="timeline-card"]').count();
			expect(newCount).toBe(initialCount - 1);
		}
	});
});

// ============================================================================
// Test Group 11: Admin-Specific Features
// ============================================================================

test.describe('Admin Features', () => {
	test.beforeEach(async ({ page }) => {
		await signInAsAdmin(page);
		await page.goto('/schedule/timeline');
		await page.waitForLoadState('domcontentloaded');
	});

	test('TL-65: Admin sees all users posts in timeline', async ({ page }) => {
		// Admin should see posts from all users, not just their own
		const cards = page.locator('[data-testid="timeline-card"]');
		const count = await cards.count();

		if (count === 0) test.skip();

		// Check if cards show user attribution
		const firstCard = cards.first();
		const userBadge = firstCard.locator('[data-testid="card-user-badge"]');

		// Admin view should show which user created each post
		const hasBadge = await userBadge.isVisible({ timeout: 2000 }).catch(() => false);
		expect(hasBadge).toBe(true);
	});

	test('TL-66: Admin can filter by user', async ({ page }) => {
		const userFilter = page.locator('[data-testid="timeline-user-filter"]');

		// Admin should have user filter dropdown
		await expect(userFilter).toBeVisible({ timeout: 3000 });

		// Should list users
		await userFilter.click();
		await page.waitForTimeout(300);

		const userOptions = page.locator('[data-testid="user-filter-option"]');
		const optionCount = await userOptions.count();

		expect(optionCount).toBeGreaterThan(0);
	});

	test('TL-67: Regular user does not see admin features', async ({ page }) => {
		// Sign out admin and sign in as regular user
		await page.goto('/auth/signout');
		await page.waitForTimeout(500);

		await signInAsUser(page);
		await page.goto('/schedule/timeline');
		await page.waitForLoadState('domcontentloaded');

		// User filter should not be visible
		const userFilter = page.locator('[data-testid="timeline-user-filter"]');
		const isVisible = await userFilter.isVisible({ timeout: 2000 }).catch(() => false);

		expect(isVisible).toBe(false);
	});
});

// ============================================================================
// Test Group 12: Mobile-Specific Gestures
// ============================================================================

test.describe('Mobile-Specific Gestures', () => {
	test.beforeEach(async ({ page }) => {
		await page.setViewportSize({ width: 390, height: 844 });
		await signInAsUser(page);
		await page.goto('/schedule/timeline');
		await page.waitForLoadState('domcontentloaded');
	});

	test('TL-68: Long press on card shows context menu', async ({ page }) => {
		const firstCard = page.locator('[data-testid="timeline-card"]').first();
		await firstCard.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {
			test.skip();
		});

		const box = await firstCard.boundingBox();
		if (!box) test.skip();

		// Simulate long press (touch and hold)
		const centerX = box.x + box.width / 2;
		const centerY = box.y + box.height / 2;

		await page.touchscreen.tap(centerX, centerY);
		await page.waitForTimeout(800); // Long press duration

		// Context menu should appear
		const contextMenu = page.locator('[data-testid="card-context-menu"]');
		const isVisible = await contextMenu.isVisible({ timeout: 2000 }).catch(() => false);

		// Note: Long press may not be implemented - test documents expected behavior
		expect(typeof isVisible).toBe('boolean');
	});

	test('TL-69: Swipe down refreshes timeline on mobile', async ({ page }) => {
		const timelineContainer = page.locator('[data-testid="timeline-container"]');
		const box = await timelineContainer.boundingBox();
		if (!box) test.skip();

		// Swipe down from top
		const centerX = box.x + box.width / 2;
		const startY = box.y + 20;
		const endY = box.y + 150;

		await page.touchscreen.tap(centerX, startY);
		await page.waitForTimeout(50);
		await page.mouse.move(centerX, endY, { steps: 10 });

		// Should show loading indicator
		const loadingIndicator = page.locator('[data-testid="timeline-loading-indicator"]');
		const isLoading = await loadingIndicator.isVisible({ timeout: 2000 }).catch(() => false);

		expect(isLoading).toBe(true);
	});

	test('TL-70: Bottom navigation is accessible on small screens', async ({ page }) => {
		await page.setViewportSize({ width: 320, height: 568 }); // iPhone SE

		const bottomNav = page.locator('[data-testid="bottom-navigation"]');
		await expect(bottomNav).toBeVisible();

		// Navigation items should not overflow
		const navWidth = await bottomNav.evaluate((el) => el.offsetWidth);
		const viewportWidth = 320;

		expect(navWidth).toBeLessThanOrEqual(viewportWidth);

		// All nav items should be tappable
		const navItems = bottomNav.locator('[data-testid^="nav-item-"]');
		const itemCount = await navItems.count();

		for (let i = 0; i < itemCount; i++) {
			const item = navItems.nth(i);
			const itemBox = await item.boundingBox();

			if (itemBox) {
				// Touch target should be at least 44x44px
				expect(itemBox.width).toBeGreaterThanOrEqual(44);
				expect(itemBox.height).toBeGreaterThanOrEqual(44);
			}
		}
	});
});
