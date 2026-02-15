import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock supabaseAdmin before importing the module under test
const mockUpdate = vi.fn();
const mockEq = vi.fn();
const mockSelect = vi.fn();
const mockMaybeSingle = vi.fn();

vi.mock('@/lib/config/supabase-admin', () => ({
	supabaseAdmin: {
		from: () => ({
			update: mockUpdate,
		}),
	},
}));

// Chain setup helper
function setupChain(result: { data?: unknown; error?: unknown }) {
	mockUpdate.mockReturnValue({ eq: mockEq });
	mockEq.mockImplementation(() => ({ eq: mockEq, select: mockSelect }));
	mockSelect.mockReturnValue({ maybeSingle: mockMaybeSingle });
	mockMaybeSingle.mockResolvedValue(result);
}

import {
	RETRY_BACKOFF_MS,
	MAX_RETRY_COUNT,
	calculateRetryScheduledTime,
	markContentFailed,
} from '@/lib/content-db/processing';

describe('Auto-retry with exponential backoff', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe('Constants', () => {
		it('should have 3 backoff intervals', () => {
			expect(RETRY_BACKOFF_MS).toHaveLength(3);
		});

		it('should have increasing backoff intervals', () => {
			for (let i = 1; i < RETRY_BACKOFF_MS.length; i++) {
				expect(RETRY_BACKOFF_MS[i]).toBeGreaterThan(RETRY_BACKOFF_MS[i - 1]);
			}
		});

		it('should set MAX_RETRY_COUNT to 3', () => {
			expect(MAX_RETRY_COUNT).toBe(3);
		});
	});

	describe('calculateRetryScheduledTime', () => {
		it('should return a future timestamp for retry 1', () => {
			const now = Date.now();
			const result = calculateRetryScheduledTime(1);
			expect(result).toBeGreaterThan(now);
			expect(result).toBeLessThanOrEqual(now + RETRY_BACKOFF_MS[0] + 100);
		});

		it('should return increasing delays for retries 1, 2, 3', () => {
			const r1 = calculateRetryScheduledTime(1);
			const r2 = calculateRetryScheduledTime(2);
			const r3 = calculateRetryScheduledTime(3);
			// r2 - r1 should approximate RETRY_BACKOFF_MS[1] - RETRY_BACKOFF_MS[0]
			expect(r2 - r1).toBeGreaterThan(0);
			expect(r3 - r2).toBeGreaterThan(0);
		});

		it('should clamp to last backoff for retryCount > length', () => {
			const now = Date.now();
			const result = calculateRetryScheduledTime(10);
			const lastBackoff = RETRY_BACKOFF_MS[RETRY_BACKOFF_MS.length - 1];
			expect(result).toBeGreaterThanOrEqual(now + lastBackoff - 100);
			expect(result).toBeLessThanOrEqual(now + lastBackoff + 100);
		});

		it('should handle retryCount of 0 gracefully', () => {
			const now = Date.now();
			const result = calculateRetryScheduledTime(0);
			// backoffIndex = max(0, -1) = 0, so uses first interval
			expect(result).toBeGreaterThan(now);
			expect(result).toBeLessThanOrEqual(now + RETRY_BACKOFF_MS[0] + 100);
		});
	});

	describe('markContentFailed with backoff', () => {
		it('should set status to scheduled with backoff for retry 1', async () => {
			setupChain({ data: null, error: null });
			await markContentFailed('test-id', 'some error', 1);

			expect(mockUpdate).toHaveBeenCalledWith(
				expect.objectContaining({
					publishing_status: 'scheduled',
					processing_started_at: null,
					retry_count: 1,
					error: 'some error',
					scheduled_time: expect.any(Number),
				}),
			);
		});

		it('should set status to scheduled with backoff for retry 2', async () => {
			setupChain({ data: null, error: null });
			await markContentFailed('test-id', 'some error', 2);

			expect(mockUpdate).toHaveBeenCalledWith(
				expect.objectContaining({
					publishing_status: 'scheduled',
					processing_started_at: null,
					retry_count: 2,
					scheduled_time: expect.any(Number),
				}),
			);
		});

		it('should set status to failed for retry >= MAX_RETRY_COUNT', async () => {
			setupChain({ data: null, error: null });
			await markContentFailed('test-id', 'some error', 3);

			expect(mockUpdate).toHaveBeenCalledWith(
				expect.objectContaining({
					publishing_status: 'failed',
					retry_count: 3,
					error: 'some error',
				}),
			);

			// Should NOT have scheduled_time or processing_started_at = null when failed
			const updateArg = mockUpdate.mock.calls[0][0];
			expect(updateArg).not.toHaveProperty('scheduled_time');
			expect(updateArg).not.toHaveProperty('processing_started_at');
		});

		it('should set status to failed for retry > MAX_RETRY_COUNT', async () => {
			setupChain({ data: null, error: null });
			await markContentFailed('test-id', 'some error', 5);

			expect(mockUpdate).toHaveBeenCalledWith(
				expect.objectContaining({
					publishing_status: 'failed',
					retry_count: 5,
				}),
			);
		});

		it('should not set scheduled_time when retryCount is undefined', async () => {
			setupChain({ data: null, error: null });
			await markContentFailed('test-id', 'some error');

			const updateArg = mockUpdate.mock.calls[0][0];
			expect(updateArg.publishing_status).toBe('scheduled');
			expect(updateArg).not.toHaveProperty('scheduled_time');
		});

		it('should not set scheduled_time when retryCount is 0', async () => {
			setupChain({ data: null, error: null });
			await markContentFailed('test-id', 'some error', 0);

			const updateArg = mockUpdate.mock.calls[0][0];
			expect(updateArg.publishing_status).toBe('scheduled');
			expect(updateArg).not.toHaveProperty('scheduled_time');
		});

		it('should set scheduled_time ~1min in future for retry 1', async () => {
			const now = Date.now();
			setupChain({ data: null, error: null });
			await markContentFailed('test-id', 'some error', 1);

			const updateArg = mockUpdate.mock.calls[0][0];
			const scheduledTime = updateArg.scheduled_time as number;
			const expectedMin = now + RETRY_BACKOFF_MS[0] - 500;
			const expectedMax = now + RETRY_BACKOFF_MS[0] + 500;
			expect(scheduledTime).toBeGreaterThanOrEqual(expectedMin);
			expect(scheduledTime).toBeLessThanOrEqual(expectedMax);
		});

		it('should set scheduled_time ~5min in future for retry 2', async () => {
			const now = Date.now();
			setupChain({ data: null, error: null });
			await markContentFailed('test-id', 'some error', 2);

			const updateArg = mockUpdate.mock.calls[0][0];
			const scheduledTime = updateArg.scheduled_time as number;
			const expectedMin = now + RETRY_BACKOFF_MS[1] - 500;
			const expectedMax = now + RETRY_BACKOFF_MS[1] + 500;
			expect(scheduledTime).toBeGreaterThanOrEqual(expectedMin);
			expect(scheduledTime).toBeLessThanOrEqual(expectedMax);
		});
	});

	describe('Retry lifecycle', () => {
		it('should transition through retries correctly', async () => {
			// Simulate 3 retries: retry 1 -> scheduled, retry 2 -> scheduled, retry 3 -> failed
			for (let attempt = 1; attempt <= 3; attempt++) {
				vi.clearAllMocks();
				setupChain({ data: null, error: null });
				await markContentFailed('test-id', `error attempt ${attempt}`, attempt);

				const updateArg = mockUpdate.mock.calls[0][0];
				if (attempt < MAX_RETRY_COUNT) {
					expect(updateArg.publishing_status).toBe('scheduled');
					expect(updateArg.scheduled_time).toBeDefined();
				} else {
					expect(updateArg.publishing_status).toBe('failed');
					expect(updateArg).not.toHaveProperty('scheduled_time');
				}
			}
		});
	});

	describe('Error handling', () => {
		it('should return false when supabase update fails', async () => {
			setupChain({ data: null, error: { message: 'DB error' } });
			const result = await markContentFailed('test-id', 'some error', 1);
			expect(result).toBe(false);
		});
	});
});
