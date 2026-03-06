import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '@/app/api/developer/cron-debug/logs/route';
import { getServerSession } from 'next-auth/next';
import { supabaseAdmin } from '@/lib/config/supabase-admin';
import { requireDeveloper } from '@/lib/auth-helpers';

vi.mock('next-auth/next');
vi.mock('@/lib/config/supabase-admin', () => ({
	supabaseAdmin: {
		from: vi.fn(),
	},
}));
vi.mock('@/lib/auth');
vi.mock('@/lib/auth-helpers', async (importOriginal) => {
	const actual = await importOriginal<typeof import('@/lib/auth-helpers')>();
	return { ...actual, requireDeveloper: vi.fn() };
});

function createChainableQuery(resolvedValue: unknown) {
	const builder: Record<string, ReturnType<typeof vi.fn>> = {};
	const self = () => builder;
	builder.select = vi.fn(self);
	builder.ilike = vi.fn(self);
	builder.gte = vi.fn(self);
	builder.order = vi.fn(self);
	builder.range = vi.fn().mockResolvedValue(resolvedValue);
	return builder;
}

describe('/api/developer/cron-debug/logs', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should return 500 if user is not developer', async () => {
		vi.mocked(getServerSession).mockResolvedValue({
			user: { id: 'user1', email: 'user@test.com' },
			expires: '2025-01-01',
		});
		vi.mocked(requireDeveloper).mockImplementation(() => {
			throw new Error('Developer access required');
		});

		const request = new Request(
			'http://localhost:3000/api/developer/cron-debug/logs?type=system',
		);

		const response = await GET(request as unknown as NextRequest);
		expect(response.status).toBe(500);
	});

	it('should fetch system logs for developer', async () => {
		vi.mocked(getServerSession).mockResolvedValue({
			user: { id: 'dev1', email: 'piotr@bms95.com' },
			expires: '2025-01-01',
		});
		vi.mocked(requireDeveloper).mockImplementation(() => {});

		const mockLogs = [
			{
				id: 'log1',
				level: 'info',
				module: 'cron',
				message: 'Running scheduled post check...',
				details: null,
				created_at: new Date().toISOString(),
			},
		];

		const query = createChainableQuery({
			data: mockLogs,
			error: null,
			count: 1,
		});

		vi.mocked(supabaseAdmin.from).mockReturnValue(query as unknown as ReturnType<typeof supabaseAdmin.from>);

		const request = new Request(
			'http://localhost:3000/api/developer/cron-debug/logs?type=system&module=cron&hours=1',
		);

		const response = await GET(request as unknown as NextRequest);
		expect(response.status).toBe(200);

		const json = await response.json();
		expect(json).toEqual({
			logs: mockLogs,
			total: 1,
			type: 'system',
		});
	});

	it('should fetch publishing logs', async () => {
		vi.mocked(getServerSession).mockResolvedValue({
			user: { id: 'dev1', email: 'piotr@bms95.com' },
			expires: '2025-01-01',
		});
		vi.mocked(requireDeveloper).mockImplementation(() => {});

		const mockLogs = [
			{
				id: 'log1',
				status: 'SUCCESS',
				ig_media_id: '123',
				error_message: null,
				created_at: new Date().toISOString(),
				user_id: 'user1',
				media_type: 'IMAGE',
				post_type: 'STORY',
			},
		];

		const query = createChainableQuery({
			data: mockLogs,
			error: null,
			count: 1,
		});

		vi.mocked(supabaseAdmin.from).mockReturnValue(query as unknown as ReturnType<typeof supabaseAdmin.from>);

		const request = new Request(
			'http://localhost:3000/api/developer/cron-debug/logs?type=publishing&hours=6',
		);

		const response = await GET(request as unknown as NextRequest);
		expect(response.status).toBe(200);

		const json = await response.json();
		expect(json).toEqual({
			logs: mockLogs,
			total: 1,
			type: 'publishing',
		});
	});

	it('should return 400 for invalid log type', async () => {
		vi.mocked(getServerSession).mockResolvedValue({
			user: { id: 'dev1', email: 'piotr@bms95.com' },
			expires: '2025-01-01',
		});
		vi.mocked(requireDeveloper).mockImplementation(() => {});

		const request = new Request(
			'http://localhost:3000/api/developer/cron-debug/logs?type=invalid',
		);

		const response = await GET(request as unknown as NextRequest);
		expect(response.status).toBe(400);

		const json = await response.json();
		expect(json.error).toContain('Invalid log type');
	});
});
