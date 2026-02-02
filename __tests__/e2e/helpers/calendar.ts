import { Page, Locator } from '@playwright/test';
import { format, addDays, startOfWeek, setHours } from 'date-fns';

/**
 * Calendar Helper Utilities for E2E Tests
 * Provides drag-and-drop and calendar navigation helpers
 */

/**
 * Wait for the calendar grid to be ready and fully loaded
 */
export async function waitForCalendarReady(page: Page): Promise<void> {
	// Wait for the DnD context and calendar grid to be visible
	await page.waitForSelector('[class*="overflow-auto"]', { timeout: 10000 });

	// Wait for at least one time slot to be rendered
	await page.waitForSelector('[data-droppable-id]', { timeout: 10000 });

	// Small delay to ensure React hydration is complete
	await page.waitForTimeout(500);
}

/**
 * Wait for the ready-to-schedule sidebar to load
 */
export async function waitForSidebarReady(page: Page): Promise<void> {
	// Wait for the sidebar container
	const sidebar = page.locator('aside').filter({ hasText: 'Ready to Schedule' });
	await sidebar.waitFor({ state: 'visible', timeout: 10000 });

	// Wait for content to load
	await page.waitForTimeout(500);
}

/**
 * Get selector for a specific time slot by date and hour
 * @param date - The date for the time slot
 * @param hour - Hour in 24-hour format (6-23)
 */
export function getTimeSlotSelector(date: Date, hour: number): string {
	const dateStr = format(date, 'yyyy-MM-dd');
	return `[data-droppable-id="${dateStr}-${hour}"]`;
}

/**
 * Get the time slot locator for a specific date and hour
 */
export function getTimeSlotLocator(page: Page, date: Date, hour: number): Locator {
	return page.locator(getTimeSlotSelector(date, hour));
}

/**
 * Perform drag and drop operation using Playwright's mouse API
 * Uses step movements for smooth drag that triggers DnD events properly
 *
 * @param page - Playwright page
 * @param sourceSelector - CSS selector for the source element
 * @param targetSelector - CSS selector for the target element
 */
export async function performDragAndDrop(
	page: Page,
	sourceSelector: string,
	targetSelector: string
): Promise<void> {
	const source = page.locator(sourceSelector).first();
	const target = page.locator(targetSelector).first();

	// Ensure both elements are visible
	await source.waitFor({ state: 'visible', timeout: 5000 });
	await target.waitFor({ state: 'visible', timeout: 5000 });

	// Get bounding boxes
	const sourceBox = await source.boundingBox();
	const targetBox = await target.boundingBox();

	if (!sourceBox || !targetBox) {
		throw new Error('Could not get bounding boxes for drag and drop');
	}

	// Calculate center points
	const sourceX = sourceBox.x + sourceBox.width / 2;
	const sourceY = sourceBox.y + sourceBox.height / 2;
	const targetX = targetBox.x + targetBox.width / 2;
	const targetY = targetBox.y + targetBox.height / 2;

	// Perform drag and drop with step movements
	await page.mouse.move(sourceX, sourceY);
	await page.mouse.down();

	// Move in steps for smooth drag (required for DnD kit to detect)
	await page.mouse.move(targetX, targetY, { steps: 20 });

	await page.mouse.up();

	// Wait for any state updates
	await page.waitForTimeout(500);
}

/**
 * Drag an item from the ready-to-schedule sidebar to a calendar time slot
 *
 * @param page - Playwright page
 * @param itemId - The content item ID
 * @param targetDate - Target date for scheduling
 * @param targetHour - Target hour (6-23)
 */
export async function dragToSchedule(
	page: Page,
	itemId: string,
	targetDate: Date,
	targetHour: number
): Promise<void> {
	const sourceSelector = `[data-draggable-id="ready-${itemId}"]`;
	const targetSelector = getTimeSlotSelector(targetDate, targetHour);

	await performDragAndDrop(page, sourceSelector, targetSelector);
}

/**
 * Drag a scheduled item to a new time slot (reschedule)
 *
 * @param page - Playwright page
 * @param itemId - The content item ID
 * @param fromDate - Current scheduled date
 * @param fromHour - Current scheduled hour
 * @param toDate - New target date
 * @param toHour - New target hour
 */
export async function dragToReschedule(
	page: Page,
	itemId: string,
	fromDate: Date,
	fromHour: number,
	toDate: Date,
	toHour: number
): Promise<void> {
	// Scheduled items in the calendar have their ID prefixed in the slot
	const sourceSlotSelector = getTimeSlotSelector(fromDate, fromHour);
	const targetSlotSelector = getTimeSlotSelector(toDate, toHour);

	// Find the item within the source slot
	const sourceSlot = page.locator(sourceSlotSelector);
	const itemInSlot = sourceSlot.locator(`[data-item-id="${itemId}"]`);

	// If item has data-item-id, use that; otherwise fall back to slot-based drag
	if (await itemInSlot.count() > 0) {
		const targetSlot = page.locator(targetSlotSelector);
		await performDragAndDropLocators(page, itemInSlot, targetSlot);
	} else {
		// Direct slot-to-slot drag
		await performDragAndDrop(page, sourceSlotSelector, targetSlotSelector);
	}
}

/**
 * Perform drag and drop between two locators
 */
async function performDragAndDropLocators(
	page: Page,
	source: Locator,
	target: Locator
): Promise<void> {
	await source.waitFor({ state: 'visible', timeout: 5000 });
	await target.waitFor({ state: 'visible', timeout: 5000 });

	const sourceBox = await source.boundingBox();
	const targetBox = await target.boundingBox();

	if (!sourceBox || !targetBox) {
		throw new Error('Could not get bounding boxes for drag and drop');
	}

	const sourceX = sourceBox.x + sourceBox.width / 2;
	const sourceY = sourceBox.y + sourceBox.height / 2;
	const targetX = targetBox.x + targetBox.width / 2;
	const targetY = targetBox.y + targetBox.height / 2;

	await page.mouse.move(sourceX, sourceY);
	await page.mouse.down();
	await page.mouse.move(targetX, targetY, { steps: 20 });
	await page.mouse.up();
	await page.waitForTimeout(500);
}

/**
 * Navigate to a specific week in the calendar
 *
 * @param page - Playwright page
 * @param date - A date within the target week
 */
export async function navigateToWeek(page: Page, date: Date): Promise<void> {
	// Click the date in the header or use navigation buttons
	// The header shows the current week range

	const targetWeekStart = startOfWeek(date, { weekStartsOn: 1 });
	const targetStr = format(targetWeekStart, 'MMM d');

	// Check if we're already on the right week
	const headerText = await page.locator('header').textContent();
	if (headerText?.includes(targetStr)) {
		return; // Already on the correct week
	}

	// Use navigation buttons to reach the target week
	const today = new Date();
	const todayWeekStart = startOfWeek(today, { weekStartsOn: 1 });

	// Calculate weeks difference
	const diffTime = targetWeekStart.getTime() - todayWeekStart.getTime();
	const diffWeeks = Math.round(diffTime / (7 * 24 * 60 * 60 * 1000));

	if (diffWeeks === 0) {
		// Click "Today" button if available
		const todayButton = page.getByRole('button', { name: 'Today' });
		if (await todayButton.isVisible()) {
			await todayButton.click();
			await page.waitForTimeout(300);
		}
	} else if (diffWeeks > 0) {
		// Navigate forward
		const nextButton = page.locator('button').filter({ has: page.locator('.lucide-chevron-right') }).first();
		for (let i = 0; i < diffWeeks; i++) {
			await nextButton.click();
			await page.waitForTimeout(200);
		}
	} else {
		// Navigate backward
		const prevButton = page.locator('button').filter({ has: page.locator('.lucide-chevron-left') }).first();
		for (let i = 0; i < Math.abs(diffWeeks); i++) {
			await prevButton.click();
			await page.waitForTimeout(200);
		}
	}
}

/**
 * Switch the calendar view mode
 *
 * @param page - Playwright page
 * @param mode - View mode ('day' or 'week')
 */
export async function switchViewMode(page: Page, mode: 'day' | 'week'): Promise<void> {
	const viewButton = page.locator('button').filter({ hasText: new RegExp(`^${mode}$`, 'i') });

	if (await viewButton.isVisible()) {
		await viewButton.click();
		await page.waitForTimeout(300);
	}
}

/**
 * Switch to day view specifically
 */
export async function switchToDayView(page: Page): Promise<void> {
	await switchViewMode(page, 'day');
	// Verify single column is shown
	const dayColumns = await getDayColumnCount(page);
	if (dayColumns !== 1) {
		throw new Error(`Expected 1 day column in day view, got ${dayColumns}`);
	}
}

/**
 * Switch to week view specifically
 */
export async function switchToWeekView(page: Page): Promise<void> {
	await switchViewMode(page, 'week');
	// Verify 7 columns are shown
	const dayColumns = await getDayColumnCount(page);
	if (dayColumns !== 7) {
		throw new Error(`Expected 7 day columns in week view, got ${dayColumns}`);
	}
}

/**
 * Get the number of visible day columns in the calendar
 */
export async function getDayColumnCount(page: Page): Promise<number> {
	// Count day column headers (elements with data-day-column attribute)
	const dayColumns = page.locator('[data-day-column]');
	return await dayColumns.count();
}

/**
 * Get the date text displayed in the header
 */
export async function getHeaderDateText(page: Page): Promise<string> {
	const header = page.locator('header h2, header .text-lg');
	return await header.first().textContent() || '';
}

/**
 * Wait for a modal to open
 */
export async function waitForModal(page: Page, timeout = 5000): Promise<void> {
	await page.locator('[role="dialog"], [class*="Modal"], .fixed.inset-0.z-\\[70\\], .fixed.inset-0.z-\\[90\\]').first().waitFor({ state: 'visible', timeout });
}

/**
 * Close currently open modal
 */
export async function closeModal(page: Page): Promise<void> {
	// Try clicking close button first
	const closeButton = page.locator('button').filter({ has: page.locator('.lucide-x') }).first();
	if (await closeButton.isVisible({ timeout: 1000 }).catch(() => false)) {
		await closeButton.click();
		await page.waitForTimeout(300);
		return;
	}

	// Fallback to Escape key
	await page.keyboard.press('Escape');
	await page.waitForTimeout(300);
}

/**
 * Open the datetime picker in the edit modal
 */
export async function openDateTimePicker(page: Page): Promise<void> {
	// The datetime picker button has a Clock icon
	const pickerButton = page.locator('button').filter({ has: page.locator('.lucide-clock, [class*="Clock"]') });
	if (await pickerButton.isVisible()) {
		await pickerButton.click();
		await page.waitForTimeout(300);
	}
}

/**
 * Select a quick pick option in the datetime picker
 * @param label - The label text like "In 1 hour", "Tomorrow 9am", etc.
 */
export async function selectQuickPick(page: Page, label: string): Promise<void> {
	const quickPickButton = page.locator('button').filter({ hasText: label });
	if (await quickPickButton.isVisible()) {
		await quickPickButton.click();
		await page.waitForTimeout(300);
	} else {
		throw new Error(`Quick pick option "${label}" not found`);
	}
}

/**
 * Select a specific day in the calendar date picker
 * @param day - Day of month (1-31)
 */
export async function selectCalendarDate(page: Page, day: number): Promise<void> {
	// Find the calendar grid and click the day button
	const dayButton = page.locator('.grid.grid-cols-7 button').filter({ hasText: String(day) });
	// Get the button that exactly matches the day (not a substring)
	const buttons = await dayButton.all();
	for (const btn of buttons) {
		const text = await btn.textContent();
		if (text?.trim() === String(day)) {
			await btn.click();
			await page.waitForTimeout(300);
			return;
		}
	}
	throw new Error(`Calendar day ${day} not found`);
}

/**
 * Select hour in the time picker dropdown
 * @param hour - Hour in 24-hour format (0-23)
 */
export async function selectHour(page: Page, hour: number): Promise<void> {
	const hourSelect = page.locator('select').first();
	await hourSelect.selectOption(String(hour).padStart(2, '0'));
	await page.waitForTimeout(200);
}

/**
 * Select minute in the time picker dropdown
 * @param minute - Minute (0-59)
 */
export async function selectMinute(page: Page, minute: number): Promise<void> {
	const minuteSelect = page.locator('select').nth(1);
	await minuteSelect.selectOption(String(minute).padStart(2, '0'));
	await page.waitForTimeout(200);
}

/**
 * Get the currently selected date/time from the picker display
 */
export async function getSelectedDateTime(page: Page): Promise<string> {
	const pickerButton = page.locator('button').filter({ has: page.locator('.lucide-clock, [class*="Clock"]') });
	return await pickerButton.textContent() || '';
}

/**
 * Get the current view mode from the calendar data attribute
 */
export async function getCurrentViewMode(page: Page): Promise<'day' | 'week' | 'month' | null> {
	const calendar = page.locator('[data-view-mode]');
	if (await calendar.isVisible({ timeout: 1000 }).catch(() => false)) {
		const mode = await calendar.getAttribute('data-view-mode');
		return mode as 'day' | 'week' | 'month' | null;
	}
	return null;
}

/**
 * Get the count of items in the ready-to-schedule sidebar
 */
export async function getReadyItemsCount(page: Page): Promise<number> {
	const sidebar = page.locator('aside').filter({ hasText: 'Ready to Schedule' });
	const countBadge = sidebar.locator('span').filter({ hasText: /\d+ assets/ });

	if (await countBadge.isVisible()) {
		const text = await countBadge.textContent();
		const match = text?.match(/(\d+)/);
		return match ? parseInt(match[1], 10) : 0;
	}

	return 0;
}

/**
 * Get the count of scheduled items for the current week
 */
export async function getScheduledItemsCount(page: Page): Promise<number> {
	const footer = page.locator('footer');
	const totalText = footer.locator('text=Total Scheduled:');

	if (await totalText.isVisible()) {
		const parent = totalText.locator('..');
		const text = await parent.textContent();
		const match = text?.match(/Total Scheduled:\s*(\d+)/);
		return match ? parseInt(match[1], 10) : 0;
	}

	return 0;
}

/**
 * Click on a scheduled item in the calendar to open its preview
 *
 * @param page - Playwright page
 * @param date - Date where the item is scheduled
 * @param hour - Hour where the item is scheduled
 */
export async function clickScheduledItem(page: Page, date: Date, hour: number): Promise<void> {
	const slotSelector = getTimeSlotSelector(date, hour);
	const slot = page.locator(slotSelector);

	// Find the item within the slot
	const item = slot.locator('[class*="schedule-calendar-item"], [class*="ScheduleCalendarItem"]').first();

	if (await item.isVisible()) {
		await item.click();
	} else {
		// Try clicking the slot itself
		await slot.click();
	}

	await page.waitForTimeout(300);
}

/**
 * Get dates for the current week (Mon-Sun)
 */
export function getCurrentWeekDates(): Date[] {
	const today = new Date();
	const weekStart = startOfWeek(today, { weekStartsOn: 1 });
	return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
}

/**
 * Get a future time slot that's safe for testing (2 hours from now, or tomorrow if late)
 */
export function getSafeScheduleTime(): { date: Date; hour: number } {
	const now = new Date();
	let targetDate = now;
	let targetHour = now.getHours() + 2;

	// If it's too late in the day, schedule for tomorrow
	if (targetHour > 22) {
		targetDate = addDays(now, 1);
		targetHour = 10; // 10 AM tomorrow
	}

	// Ensure hour is within valid range (6-23)
	targetHour = Math.max(6, Math.min(23, targetHour));

	return {
		date: targetDate,
		hour: targetHour,
	};
}
