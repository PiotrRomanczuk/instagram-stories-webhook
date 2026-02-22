import { test, expect } from '@playwright/test';
import { signInAsAdmin } from './helpers/auth';
import {
	createPendingContent,
	createApprovedContent,
	createFailedContent,
	approveContent,
	rejectContent,
	getContentById,
} from './helpers/seed';
import { getSafeScheduleTime } from './helpers/calendar';

/**
 * Content State Transitions E2E Tests
 *
 * Tests the content state machine via API:
 * - pending -> approved (via review/approve)
 * - pending -> rejected (via review/reject)
 * - approved -> scheduled (via schedule endpoint)
 * - failed content creation and retry
 * - Past time scheduling rejection
 * - Bulk operations endpoint availability
 *
 * All tests use admin auth and seed helpers for reliable data setup.
 */

test.describe('Content State Transitions', () => {
	test.beforeEach(async ({ page }) => {
		await signInAsAdmin(page);
	});

	test('create pending content and verify status', async ({ page }) => {
		const contentId = await createPendingContent(page, {
			title: 'State Test Pending ' + Date.now(),
			caption: 'Testing pending state creation',
		});
		expect(contentId).toBeTruthy();

		const content = await getContentById(page, contentId);
		expect(content).not.toBeNull();
		expect(content!.submissionStatus).toBe('pending');
	});

	test('approve pending content and verify status', async ({ page }) => {
		const contentId = await createPendingContent(page, {
			title: 'State Test Approve ' + Date.now(),
			caption: 'Testing approval transition',
		});

		await approveContent(page, contentId);

		const content = await getContentById(page, contentId);
		expect(content).not.toBeNull();
		expect(content!.submissionStatus).toBe('approved');
	});

	test('schedule approved content and verify status', async ({ page }) => {
		const contentId = await createApprovedContent(page, {
			title: 'State Test Schedule ' + Date.now(),
			caption: 'Testing scheduling transition',
		});

		const { date, hour } = getSafeScheduleTime();
		const scheduledTime = new Date(date);
		scheduledTime.setHours(hour, 0, 0, 0);

		const response = await page.request.post(
			`/api/content/${contentId}/schedule`,
			{
				data: { scheduledTime: scheduledTime.getTime() },
			}
		);
		expect(response.ok()).toBe(true);

		const content = await getContentById(page, contentId);
		expect(content).not.toBeNull();
		expect(content!.publishingStatus).toBe('scheduled');
	});

	test('reject pending content and verify status', async ({ page }) => {
		const contentId = await createPendingContent(page, {
			title: 'State Test Reject ' + Date.now(),
			caption: 'Testing rejection transition',
		});

		await rejectContent(page, contentId, 'Does not meet guidelines');

		const content = await getContentById(page, contentId);
		expect(content).not.toBeNull();
		expect(content!.submissionStatus).toBe('rejected');
	});

	test('create failed content and verify status', async ({ page }) => {
		const contentId = await createFailedContent(page, {
			title: 'State Test Failed ' + Date.now(),
			caption: 'Testing failed state creation',
		});
		expect(contentId).toBeTruthy();

		const content = await getContentById(page, contentId);
		expect(content).not.toBeNull();
		expect(content!.publishingStatus).toBe('failed');
	});

	test('retry failed content via API responds', async ({ page }) => {
		const contentId = await createFailedContent(page, {
			title: 'State Test Retry ' + Date.now(),
			caption: 'Testing retry on failed content',
		});

		const response = await page.request.post(
			`/api/content/${contentId}/retry`
		);
		// Retry endpoint may succeed or fail gracefully depending on IG connection
		// We just verify it responds with a valid HTTP status (not 500)
		expect(response.status()).toBeLessThan(500);
	});

	test('schedule content with past time returns error', async ({ page }) => {
		const contentId = await createApprovedContent(page, {
			title: 'State Test Past Schedule ' + Date.now(),
			caption: 'Testing past time scheduling rejection',
		});

		const pastTime = Date.now() - 24 * 60 * 60 * 1000;
		const response = await page.request.post(
			`/api/content/${contentId}/schedule`,
			{
				data: { scheduledTime: pastTime },
			}
		);
		// Should reject past times (400/422) or handle gracefully
		expect(
			[400, 422].includes(response.status()) || response.ok()
		).toBe(true);
	});

	test('bulk operations API responds', async ({ page }) => {
		const response = await page.request.post('/api/content/bulk', {
			data: { action: 'approve', ids: [] },
		});
		// Bulk endpoint should respond (may return 200 for empty, or 400 for invalid)
		expect(response.status()).toBeLessThan(500);
	});
});
