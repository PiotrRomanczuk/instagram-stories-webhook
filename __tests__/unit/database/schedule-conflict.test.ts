import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { checkScheduleConflict } from '@/lib/database/schedule-conflict';
import { supabaseAdmin } from '@/lib/config/supabase-admin';

vi.mock('@/lib/config/supabase-admin', () => {
	return {
		supabaseAdmin: {
			from: vi.fn(),
		},
	};
});

describe('checkScheduleConflict', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	// Helper: create a chainable query builder for a given table
	// All methods return `this` except limit() which resolves the chain
	function createQueryBuilder(data: unknown[] | null, error: unknown = null) {
		const builder: Record<string, ReturnType<typeof vi.fn>> = {};
		const self = () => builder;
		builder.select = vi.fn(self);
		builder.in = vi.fn(self);
		builder.gte = vi.fn(self);
		builder.lt = vi.fn(self);
		builder.neq = vi.fn(self);
		builder.limit = vi.fn().mockResolvedValue({ data, error });
		return builder;
	}

	function mockBothTables(
		scheduledPostsData: unknown[] | null,
		contentItemsData: unknown[] | null,
		scheduledPostsError: unknown = null,
		contentItemsError: unknown = null,
	) {
		const spBuilder = createQueryBuilder(scheduledPostsData, scheduledPostsError);
		const ciBuilder = createQueryBuilder(contentItemsData, contentItemsError);

		(supabaseAdmin.from as Mock).mockImplementation((table: string) => {
			if (table === 'scheduled_posts') return spBuilder;
			if (table === 'content_items') return ciBuilder;
			return spBuilder;
		});

		return { spBuilder, ciBuilder };
	}

	it('should return no conflict when both tables are empty', async () => {
		mockBothTables([], []);

		const result = await checkScheduleConflict(1700000100000);

		expect(result.hasConflict).toBe(false);
		expect(result.conflictingId).toBeUndefined();
	});

	it('should detect conflict in scheduled_posts (pending post in same minute)', async () => {
		const baseTime = 1700000100000; // some timestamp
		const minuteStart = baseTime - (baseTime % 60000);

		mockBothTables(
			[{ id: 'post_abc', scheduled_time: minuteStart + 15000 }],
			[],
		);

		const result = await checkScheduleConflict(baseTime);

		expect(result.hasConflict).toBe(true);
		expect(result.conflictingId).toBe('post_abc');
		expect(result.conflictingTime).toBe(minuteStart + 15000);
	});

	it('should detect conflict in content_items (scheduled item in same minute)', async () => {
		const baseTime = 1700000100000;
		const minuteStart = baseTime - (baseTime % 60000);

		mockBothTables(
			[],
			[{ id: 'content_xyz', scheduled_time: minuteStart + 30000 }],
		);

		const result = await checkScheduleConflict(baseTime);

		expect(result.hasConflict).toBe(true);
		expect(result.conflictingId).toBe('content_xyz');
		expect(result.conflictingTime).toBe(minuteStart + 30000);
	});

	it('should NOT detect conflict for different minutes (10:05:59 vs 10:06:01)', async () => {
		// 10:05:59 → minute boundary is 10:05:00
		// 10:06:01 → minute boundary is 10:06:00
		// These are different minutes, so no conflict

		// We schedule at 10:06:01 — the query checks [10:06:00, 10:07:00)
		// An existing post at 10:05:59 is in [10:05:00, 10:06:00), outside the range
		mockBothTables([], []);

		const scheduleAt = new Date('2024-01-15T10:06:01.000Z').getTime();
		const result = await checkScheduleConflict(scheduleAt);

		expect(result.hasConflict).toBe(false);

		// Verify the query used correct minute boundaries
		const spBuilder = (supabaseAdmin.from as Mock).mock.results[0].value;
		const minuteStart = scheduleAt - (scheduleAt % 60000);
		expect(spBuilder.gte).toHaveBeenCalledWith('scheduled_time', minuteStart);
		expect(spBuilder.lt).toHaveBeenCalledWith('scheduled_time', minuteStart + 60000);
	});

	it('should ignore published/failed posts (not active statuses)', async () => {
		// The query filters by status IN ('pending', 'processing') for scheduled_posts
		// and IN ('scheduled', 'processing') for content_items
		// So published/failed posts won't be returned by the query
		mockBothTables([], []);

		const result = await checkScheduleConflict(1700000100000);

		expect(result.hasConflict).toBe(false);

		// Verify correct status filters were used
		const spBuilder = (supabaseAdmin.from as Mock).mock.results[0].value;
		expect(spBuilder.in).toHaveBeenCalledWith('status', ['pending', 'processing']);

		const ciBuilder = (supabaseAdmin.from as Mock).mock.results[1].value;
		expect(ciBuilder.in).toHaveBeenCalledWith('publishing_status', ['scheduled', 'processing']);
	});

	it('should exclude self on update (no self-conflict)', async () => {
		const baseTime = 1700000100000;
		const minuteStart = baseTime - (baseTime % 60000);

		// Even though a match exists, the excludeId filter should skip it
		// (the mock returns empty because .neq filters it out)
		mockBothTables([], []);

		const result = await checkScheduleConflict(baseTime, {
			excludeId: 'post_self',
			excludeTable: 'scheduled_posts',
		});

		expect(result.hasConflict).toBe(false);

		// Verify neq was called on the correct table's builder
		const spBuilder = (supabaseAdmin.from as Mock).mock.results[0].value;
		expect(spBuilder.neq).toHaveBeenCalledWith('id', 'post_self');

		// content_items builder should NOT have neq called
		const ciBuilder = (supabaseAdmin.from as Mock).mock.results[1].value;
		expect(ciBuilder.neq).not.toHaveBeenCalled();
	});

	it('should exclude self from content_items on update', async () => {
		mockBothTables([], []);

		await checkScheduleConflict(1700000100000, {
			excludeId: 'content_self',
			excludeTable: 'content_items',
		});

		// scheduled_posts builder should NOT have neq called
		const spBuilder = (supabaseAdmin.from as Mock).mock.results[0].value;
		expect(spBuilder.neq).not.toHaveBeenCalled();

		// content_items builder should have neq called
		const ciBuilder = (supabaseAdmin.from as Mock).mock.results[1].value;
		expect(ciBuilder.neq).toHaveBeenCalledWith('id', 'content_self');
	});

	it('should fail closed on scheduled_posts query error', async () => {
		mockBothTables(
			null,
			[],
			{ message: 'DB connection error', code: '500' },
			null,
		);

		const result = await checkScheduleConflict(1700000100000);

		expect(result.hasConflict).toBe(true);
	});

	it('should fail closed on content_items query error', async () => {
		mockBothTables(
			[],
			null,
			null,
			{ message: 'DB connection error', code: '500' },
		);

		const result = await checkScheduleConflict(1700000100000);

		expect(result.hasConflict).toBe(true);
	});

	it('should fail closed if both queries throw exceptions', async () => {
		(supabaseAdmin.from as Mock).mockImplementation(() => {
			throw new Error('Connection refused');
		});

		const result = await checkScheduleConflict(1700000100000);

		expect(result.hasConflict).toBe(true);
	});

	it('should prioritize scheduled_posts conflict over content_items', async () => {
		const baseTime = 1700000100000;
		const minuteStart = baseTime - (baseTime % 60000);

		mockBothTables(
			[{ id: 'sp_first', scheduled_time: minuteStart + 5000 }],
			[{ id: 'ci_second', scheduled_time: minuteStart + 10000 }],
		);

		const result = await checkScheduleConflict(baseTime);

		expect(result.hasConflict).toBe(true);
		expect(result.conflictingId).toBe('sp_first');
	});
});
