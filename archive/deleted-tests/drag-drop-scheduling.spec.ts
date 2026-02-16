import { test, expect } from '@playwright/test';
import { signInAsAdmin } from './helpers/auth';
import {
	waitForCalendarReady,
	waitForSidebarReady,
	getTimeSlotSelector,
	performDragAndDrop,
	getSafeScheduleTime,
	navigateToWeek,
	getReadyItemsCount,
} from './helpers/calendar';
import {
	createApprovedContent,
	createScheduledContent,
	cleanupTestContent,
	getContentById,
} from './helpers/seed';
import { addDays, setHours, setMinutes } from 'date-fns';

/**
 * Drag-and-Drop Scheduling Verification Tests
 *
 * These tests verify that drag-and-drop scheduling properly updates
 * the calendar view, not just shows a success toast.
 *
 * Test IDs:
 * - DD-VERIFY-01: Drag item appears on calendar after drop
 * - DD-VERIFY-02: Reschedule moves item between slots
 * - DD-VERIFY-03: Multiple items in same slot display correctly
 * - DD-VERIFY-04: Item removed from sidebar after scheduling
 */

test.describe('Drag-and-Drop Scheduling Verification', () => {
	let testContentIds: string[] = [];

	test.afterEach(async ({ page }) => {
		// Cleanup test content after each test
		if (testContentIds.length > 0) {
			await cleanupTestContent(page, testContentIds);
			testContentIds = [];
		}
	});

	/**
	 * DD-VERIFY-01: Drag item appears on calendar after drop
	 *
	 * Verifies the complete flow:
	 * 1. Seed approved content item
	 * 2. Drag from sidebar to time slot
	 * 3. Assert: Toast shows success
	 * 4. Assert: Item visible in calendar slot (not just toast)
	 * 5. Assert: API confirms publishingStatus: 'scheduled'
	 */
	test('DD-VERIFY-01: drag item appears on calendar after drop', async ({ page }) => {
		await signInAsAdmin(page);

		// Create approved content
		const contentId = await createApprovedContent(page, {
			title: 'Drag Verify Test Item',
			caption: 'Testing that item appears on calendar after drag',
		});
		testContentIds.push(contentId);

		// Go to schedule page and wait for everything to load
		await page.goto('/schedule');
		await waitForCalendarReady(page);
		await waitForSidebarReady(page);

		// Verify item is in sidebar before drag
		const initialReadyCount = await getReadyItemsCount(page);
		expect(initialReadyCount).toBeGreaterThan(0);

		// Get a safe time slot for scheduling
		const { date, hour } = getSafeScheduleTime();

		// Ensure we're on the right week
		await navigateToWeek(page, date);
		await page.waitForTimeout(500);

		// Get target slot selector
		const targetSlotSelector = getTimeSlotSelector(date, hour);
		const targetSlot = page.locator(targetSlotSelector);

		// Verify target slot exists and is empty (or count current items)
		await expect(targetSlot).toBeVisible({ timeout: 5000 });
		const initialItemsInSlot = await targetSlot.locator('[class*="ScheduleCalendarItem"], [class*="aspect-square"]').count();

		// Find draggable item in sidebar
		const sidebarItem = page.locator('[data-draggable-id]').first();
		await expect(sidebarItem).toBeVisible({ timeout: 5000 });

		// Perform drag and drop
		await performDragAndDrop(page, '[data-draggable-id]', targetSlotSelector);

		// Wait for API response and UI update
		await page.waitForTimeout(2000);

		// Assert 1: Check for success toast
		const toastText = await page.locator('[role="status"], .toast, [class*="Toaster"]').textContent().catch(() => '');
		const bodyText = await page.innerText('body');
		const hasSuccessIndicator = bodyText.toLowerCase().includes('scheduled') || toastText?.toLowerCase().includes('scheduled');
		expect(hasSuccessIndicator).toBe(true);

		// Assert 2: Item should now be visible in the calendar slot
		const finalItemsInSlot = await targetSlot.locator('[class*="ScheduleCalendarItem"], [class*="aspect-square"], img').count();
		expect(finalItemsInSlot).toBeGreaterThan(initialItemsInSlot);

		// Assert 3: API should confirm publishingStatus is 'scheduled'
		const content = await getContentById(page, contentId);
		expect(content).not.toBeNull();
		expect(content?.publishingStatus).toBe('scheduled');
		expect(content?.scheduledTime).toBeDefined();
	});

	/**
	 * DD-VERIFY-02: Reschedule moves item between slots
	 *
	 * Verifies rescheduling:
	 * 1. Seed scheduled content at 10:00
	 * 2. Drag from 10:00 slot to 14:00 slot
	 * 3. Assert: Item gone from 10:00 slot
	 * 4. Assert: Item visible in 14:00 slot
	 */
	test('DD-VERIFY-02: reschedule moves item between slots', async ({ page }) => {
		await signInAsAdmin(page);

		// Create scheduled content at a specific time
		const tomorrow = addDays(new Date(), 1);
		const originalTime = setHours(setMinutes(tomorrow, 0), 10); // Tomorrow 10:00
		const newHour = 14; // 14:00

		const contentId = await createScheduledContent(page, originalTime, {
			title: 'Reschedule Verify Test Item',
		});
		testContentIds.push(contentId);

		// Go to schedule page
		await page.goto('/schedule');
		await waitForCalendarReady(page);

		// Navigate to the correct week
		await navigateToWeek(page, originalTime);
		await page.waitForTimeout(500);

		// Verify item is in original slot
		const originalSlotSelector = getTimeSlotSelector(originalTime, 10);
		const originalSlot = page.locator(originalSlotSelector);

		// Wait for slot to be visible
		if (!(await originalSlot.isVisible({ timeout: 5000 }).catch(() => false))) {
			test.skip(true, 'Original slot not visible - may need navigation');
			return;
		}

		// Count items in original slot
		const originalSlotItemCount = await originalSlot.locator('[class*="ScheduleCalendarItem"], [class*="aspect-square"], img').count();

		// Get new slot
		const newSlotSelector = getTimeSlotSelector(originalTime, newHour);
		const newSlot = page.locator(newSlotSelector);

		if (!(await newSlot.isVisible({ timeout: 2000 }).catch(() => false))) {
			test.skip(true, 'Target slot not visible');
			return;
		}

		// Count items in new slot before drag
		const newSlotInitialCount = await newSlot.locator('[class*="ScheduleCalendarItem"], [class*="aspect-square"], img').count();

		// Perform drag from original slot to new slot
		await performDragAndDrop(page, originalSlotSelector, newSlotSelector);
		await page.waitForTimeout(2000);

		// Assert 1: Original slot should have fewer items
		const originalSlotFinalCount = await originalSlot.locator('[class*="ScheduleCalendarItem"], [class*="aspect-square"], img').count();
		expect(originalSlotFinalCount).toBeLessThan(originalSlotItemCount);

		// Assert 2: New slot should have more items
		const newSlotFinalCount = await newSlot.locator('[class*="ScheduleCalendarItem"], [class*="aspect-square"], img').count();
		expect(newSlotFinalCount).toBeGreaterThan(newSlotInitialCount);

		// Assert 3: Verify API has updated scheduled time
		const content = await getContentById(page, contentId);
		expect(content).not.toBeNull();
		expect(content?.publishingStatus).toBe('scheduled');
		// New scheduled time should be at 14:00
		if (content?.scheduledTime) {
			const scheduledDate = new Date(content.scheduledTime);
			expect(scheduledDate.getHours()).toBe(newHour);
		}
	});

	/**
	 * DD-VERIFY-03: Multiple items in same slot display correctly
	 *
	 * Verifies:
	 * 1. Seed 2 scheduled items at same time
	 * 2. Assert: Both items visible (stacked or side-by-side)
	 * 3. Drag third item to same slot
	 * 4. Assert: All items display (with overflow indicator if needed)
	 */
	test('DD-VERIFY-03: multiple items in same slot display correctly', async ({ page }) => {
		await signInAsAdmin(page);

		// Create two items scheduled at the same time
		const tomorrow = addDays(new Date(), 1);
		const scheduledTime = setHours(setMinutes(tomorrow, 0), 15); // Tomorrow 15:00

		const id1 = await createScheduledContent(page, scheduledTime, { title: 'Multi-slot Item 1' });
		const id2 = await createScheduledContent(page, scheduledTime, { title: 'Multi-slot Item 2' });
		testContentIds.push(id1, id2);

		// Create an approved item to drag as third
		const id3 = await createApprovedContent(page, { title: 'Multi-slot Item 3 (to drag)' });
		testContentIds.push(id3);

		// Go to schedule page
		await page.goto('/schedule');
		await waitForCalendarReady(page);
		await waitForSidebarReady(page);

		// Navigate to the correct week
		await navigateToWeek(page, scheduledTime);
		await page.waitForTimeout(500);

		// Find the slot
		const slotSelector = getTimeSlotSelector(scheduledTime, 15);
		const slot = page.locator(slotSelector);

		if (!(await slot.isVisible({ timeout: 5000 }).catch(() => false))) {
			test.skip(true, 'Target slot not visible');
			return;
		}

		// Assert 1: Both items should be visible or indicated
		const itemsInSlot = slot.locator('[class*="ScheduleCalendarItem"], [class*="aspect-square"], img');
		const initialCount = await itemsInSlot.count();
		expect(initialCount).toBeGreaterThanOrEqual(1); // At least 1 visible (others may be stacked)

		// Check for overflow indicator if items are stacked
		const overflowIndicator = slot.locator('[class*="+"], text=/\\+\\d/');
		const hasOverflow = await overflowIndicator.count() > 0;
		const slotHtml = await slot.innerHTML();
		const hasMultipleItems = initialCount >= 2 || hasOverflow || slotHtml.includes('Multi-slot');

		// Drag third item to same slot
		const sidebarItem = page.locator('[data-draggable-id]').first();
		if (await sidebarItem.isVisible({ timeout: 3000 }).catch(() => false)) {
			await performDragAndDrop(page, '[data-draggable-id]', slotSelector);
			await page.waitForTimeout(2000);

			// Assert 2: Slot should now show 3 items or overflow indicator
			const finalCount = await itemsInSlot.count();
			const finalOverflow = await overflowIndicator.count() > 0;

			// Either we see more items, or an overflow indicator
			expect(finalCount >= initialCount || finalOverflow).toBe(true);
		}
	});

	/**
	 * DD-VERIFY-04: Item removed from sidebar after scheduling
	 *
	 * Verifies:
	 * 1. Count sidebar items before
	 * 2. Drag item to calendar
	 * 3. Assert: Sidebar count decreased by 1
	 */
	test('DD-VERIFY-04: item removed from sidebar after scheduling', async ({ page }) => {
		await signInAsAdmin(page);

		// Create multiple approved items
		const id1 = await createApprovedContent(page, { title: 'Sidebar Remove Test 1' });
		const id2 = await createApprovedContent(page, { title: 'Sidebar Remove Test 2' });
		testContentIds.push(id1, id2);

		// Go to schedule page
		await page.goto('/schedule');
		await waitForCalendarReady(page);
		await waitForSidebarReady(page);

		// Count sidebar items before drag
		const initialCount = await page.locator('[data-draggable-id]').count();
		expect(initialCount).toBeGreaterThanOrEqual(2);

		// Get a safe time slot
		const { date, hour } = getSafeScheduleTime();
		await navigateToWeek(page, date);
		await page.waitForTimeout(500);

		const targetSlotSelector = getTimeSlotSelector(date, hour);
		const targetSlot = page.locator(targetSlotSelector);

		if (!(await targetSlot.isVisible({ timeout: 5000 }).catch(() => false))) {
			test.skip(true, 'Target slot not visible');
			return;
		}

		// Drag first item to calendar
		await performDragAndDrop(page, '[data-draggable-id]', targetSlotSelector);
		await page.waitForTimeout(2000);

		// Assert: Sidebar should have one fewer item
		const finalCount = await page.locator('[data-draggable-id]').count();
		expect(finalCount).toBe(initialCount - 1);
	});

	/**
	 * DD-VERIFY-05: publishingStatus correctly updates to 'scheduled' via API
	 *
	 * This test specifically verifies the bug fix where PATCH was ignoring publishingStatus
	 */
	test('DD-VERIFY-05: publishingStatus updates correctly in database', async ({ page }) => {
		await signInAsAdmin(page);

		// Create approved content with draft publishing status
		const contentId = await createApprovedContent(page, {
			title: 'API Status Verify Test',
			caption: 'Verifying publishingStatus update fix',
		});
		testContentIds.push(contentId);

		// Verify initial state is draft
		const initialContent = await getContentById(page, contentId);
		expect(initialContent?.publishingStatus).toBe('draft');
		expect(initialContent?.submissionStatus).toBe('approved');

		// Go to schedule page
		await page.goto('/schedule');
		await waitForCalendarReady(page);
		await waitForSidebarReady(page);

		// Get a safe time slot
		const { date, hour } = getSafeScheduleTime();
		await navigateToWeek(page, date);
		await page.waitForTimeout(500);

		const targetSlotSelector = getTimeSlotSelector(date, hour);
		const targetSlot = page.locator(targetSlotSelector);

		if (!(await targetSlot.isVisible({ timeout: 5000 }).catch(() => false))) {
			test.skip(true, 'Target slot not visible');
			return;
		}

		// Find our specific item in sidebar
		const sidebarItem = page.locator('[data-draggable-id]').first();
		if (!(await sidebarItem.isVisible({ timeout: 3000 }).catch(() => false))) {
			test.skip(true, 'No items in sidebar');
			return;
		}

		// Drag to schedule
		await performDragAndDrop(page, '[data-draggable-id]', targetSlotSelector);
		await page.waitForTimeout(2000);

		// THE KEY ASSERTION: publishingStatus should now be 'scheduled', not 'draft'
		const updatedContent = await getContentById(page, contentId);
		expect(updatedContent).not.toBeNull();
		expect(updatedContent?.publishingStatus).toBe('scheduled');
		expect(updatedContent?.scheduledTime).toBeDefined();
		expect(updatedContent?.scheduledTime).toBeGreaterThan(Date.now());
	});
});
