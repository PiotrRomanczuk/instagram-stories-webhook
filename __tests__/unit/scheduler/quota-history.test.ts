import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/config/supabase-admin', () => ({
	supabaseAdmin: {
		from: vi.fn().mockReturnValue({
			insert: vi.fn(),
		}),
	},
}));

vi.mock('@/lib/utils/logger', () => ({
	Logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

import { generateCronRunId, recordQuotaSnapshot } from '@/lib/scheduler/quota-history';
import { supabaseAdmin } from '@/lib/config/supabase-admin';
import type { QuotaHistoryRecord } from '@/lib/types';

describe('generateCronRunId', () => {
	it('should return a string starting with cron_', () => {
		const id = generateCronRunId();
		expect(id).toMatch(/^cron_\d+_[a-z0-9]+$/);
	});

	it('should generate unique IDs', () => {
		const id1 = generateCronRunId();
		const id2 = generateCronRunId();
		expect(id1).not.toBe(id2);
	});
});

describe('recordQuotaSnapshot', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	const snapshot: QuotaHistoryRecord = {
		userId: 'user-1',
		igUserId: 'ig-123',
		quotaTotal: 25,
		quotaUsage: 5,
		quotaDuration: 86400,
		cronRunId: 'cron_123_abc',
		snapshotType: 'cron_start',
		postsAttempted: 3,
		postsSucceeded: 0,
		postsFailed: 0,
		postsSkippedQuota: 0,
		maxPostsConfig: 3,
		errorMessage: null,
	};

	it('should insert snapshot without throwing', async () => {
		const insertMock = vi.fn().mockResolvedValue({ error: null });
		vi.mocked(supabaseAdmin.from).mockReturnValue({ insert: insertMock } as never);

		await expect(recordQuotaSnapshot(snapshot)).resolves.not.toThrow();
		expect(supabaseAdmin.from).toHaveBeenCalledWith('api_quota_history');
		expect(insertMock).toHaveBeenCalled();
	});

	it('should not throw when insert fails', async () => {
		const insertMock = vi.fn().mockResolvedValue({ error: { message: 'DB error' } });
		vi.mocked(supabaseAdmin.from).mockReturnValue({ insert: insertMock } as never);

		await expect(recordQuotaSnapshot(snapshot)).resolves.not.toThrow();
	});

	it('should not throw when supabase throws', async () => {
		vi.mocked(supabaseAdmin.from).mockImplementation(() => {
			throw new Error('Connection failed');
		});

		await expect(recordQuotaSnapshot(snapshot)).resolves.not.toThrow();
	});
});
