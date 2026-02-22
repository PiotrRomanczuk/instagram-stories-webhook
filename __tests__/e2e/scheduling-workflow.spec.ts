import { test, expect } from '@playwright/test';
import { signInAsRealIG } from './helpers/auth';
import {
	createApprovedContent,
	createScheduledContent,
	cleanupTestContent,
	fetchContent,
	getContentById,
} from './helpers/seed';
import { getSafeScheduleTime } from './helpers/calendar';

test.describe('CP-6: Scheduling Workflow', () => {
	// Skip in preview mode (production-only tests)
	test.skip(
		() => process.env.PREVIEW_MODE === 'true',
		'Production-only tests - skipped in preview mode'
	);

	test.skip(
		() => process.env.CI === 'true',
		'NEVER run live publishing tests in CI'
	);
	test.skip(
		() => !process.env.ENABLE_REAL_IG_TESTS,
		'Set ENABLE_REAL_IG_TESTS=true to run'
	);
	test.skip(
		() => process.env.ENABLE_LIVE_IG_PUBLISH !== 'true',
		'Set ENABLE_LIVE_IG_PUBLISH=true'
	);

	const createdIds: string[] = [];

	test.beforeEach(async ({ page }) => {
		await signInAsRealIG(page);
	});

	test.afterEach(async ({ page }) => {
		if (createdIds.length > 0) {
			await cleanupTestContent(page, createdIds);
			createdIds.length = 0;
		}
	});

	test('CP-6.1: admin can schedule approved content via API', async ({
		page,
	}) => {
		// Create approved content
		const contentId = await createApprovedContent(page, {
			title: 'CP-6.1 Schedule Test ' + Date.now(),
			caption: 'Testing scheduling workflow',
		});
		createdIds.push(contentId);

		// Schedule it via the schedule endpoint
		const { date, hour } = getSafeScheduleTime();
		const scheduledTime = new Date(date);
		scheduledTime.setHours(hour, 0, 0, 0);

		const scheduleResponse = await page.request.post(
			`/api/content/${contentId}/schedule`,
			{ data: { scheduledTime: scheduledTime.getTime() } }
		);
		expect(scheduleResponse.ok()).toBe(true);

		// Verify content is now scheduled
		const content = await getContentById(page, contentId);
		expect(content).not.toBeNull();
		expect(content!.publishingStatus).toBe('scheduled');
	});

	test('CP-6.2: admin can reschedule content to a different time', async ({
		page,
	}) => {
		// Create scheduled content
		const { date, hour } = getSafeScheduleTime();
		const originalTime = new Date(date);
		originalTime.setHours(hour, 0, 0, 0);

		const contentId = await createScheduledContent(page, originalTime, {
			title: 'CP-6.2 Reschedule Test ' + Date.now(),
			caption: 'Testing rescheduling workflow',
		});
		createdIds.push(contentId);

		// Reschedule to a different time (+2 hours)
		const newTime = new Date(originalTime.getTime() + 2 * 60 * 60 * 1000);
		const rescheduleResponse = await page.request.post(
			`/api/content/${contentId}/schedule`,
			{ data: { scheduledTime: newTime.getTime() } }
		);
		expect(rescheduleResponse.ok()).toBe(true);

		// Verify the scheduled time was updated
		const content = await getContentById(page, contentId);
		expect(content).not.toBeNull();
		expect(content!.publishingStatus).toBe('scheduled');
		expect(content!.scheduledTime).toBe(newTime.getTime());
	});

	test('CP-6.3: scheduled content appears correctly in queue', async ({
		page,
	}) => {
		// Create 2 scheduled items at different times
		const { date, hour } = getSafeScheduleTime();
		const time1 = new Date(date);
		time1.setHours(hour, 0, 0, 0);
		const time2 = new Date(time1.getTime() + 24 * 60 * 60 * 1000); // +24h

		const id1 = await createScheduledContent(page, time1, {
			title: 'CP-6.3 Queue Test A ' + Date.now(),
			caption: 'Queue item A',
		});
		createdIds.push(id1);

		const id2 = await createScheduledContent(page, time2, {
			title: 'CP-6.3 Queue Test B ' + Date.now(),
			caption: 'Queue item B',
		});
		createdIds.push(id2);

		// Verify both items exist as scheduled via API
		const scheduledItems = await fetchContent(page, {
			publishingStatus: 'scheduled',
		});

		const ourItems = scheduledItems.filter(
			(item) => item.id === id1 || item.id === id2
		);
		expect(ourItems.length).toBe(2);
	});
});
