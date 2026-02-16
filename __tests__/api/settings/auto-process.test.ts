import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, PATCH } from '@/app/api/settings/auto-process/route';
import * as systemSettings from '@/lib/supabase/system-settings';

// Mock auth
const mockGetServerSession = vi.fn();
vi.mock('next-auth/next', () => ({
	getServerSession: (...args: unknown[]) => mockGetServerSession(...args),
}));

vi.mock('@/lib/auth', () => ({
	authOptions: {},
}));

vi.mock('@/lib/auth-helpers', () => ({
	isAdmin: (session: { user?: { role?: string } } | null) => {
		const role = session?.user?.role;
		return role === 'admin' || role === 'developer';
	},
}));

// Mock system-settings
vi.mock('@/lib/supabase/system-settings', () => ({
	getBooleanSetting: vi.fn(),
	setSystemSetting: vi.fn(),
	SETTING_KEYS: {
		PUBLISHING_ENABLED: 'publishing_enabled',
		AUTO_PROCESS_VIDEOS: 'auto_process_videos',
	},
}));

const mockGetBoolean = systemSettings.getBooleanSetting as ReturnType<typeof vi.fn>;
const mockSetSetting = systemSettings.setSystemSetting as ReturnType<typeof vi.fn>;

function makeRequest(body: unknown): Request {
	return new Request('http://localhost/api/settings/auto-process', {
		method: 'PATCH',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(body),
	});
}

describe('GET /api/settings/auto-process', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('returns 401 for unauthenticated requests', async () => {
		mockGetServerSession.mockResolvedValue(null);
		const res = await GET();
		expect(res.status).toBe(401);
	});

	it('returns enabled status for authenticated users', async () => {
		mockGetServerSession.mockResolvedValue({
			user: { email: 'user@test.com' },
		});
		mockGetBoolean.mockResolvedValue(true);

		const res = await GET();
		const body = await res.json();

		expect(res.status).toBe(200);
		expect(body.enabled).toBe(true);
		expect(mockGetBoolean).toHaveBeenCalledWith(
			'auto_process_videos',
			true
		);
	});

	it('returns false when setting is disabled', async () => {
		mockGetServerSession.mockResolvedValue({
			user: { email: 'user@test.com' },
		});
		mockGetBoolean.mockResolvedValue(false);

		const res = await GET();
		const body = await res.json();

		expect(body.enabled).toBe(false);
	});
});

describe('PATCH /api/settings/auto-process', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('returns 403 for non-admin users', async () => {
		mockGetServerSession.mockResolvedValue({
			user: { email: 'user@test.com', role: 'user' },
		});

		const res = await PATCH(makeRequest({ enabled: true }));
		expect(res.status).toBe(403);
	});

	it('allows admin to enable auto-processing', async () => {
		mockGetServerSession.mockResolvedValue({
			user: { email: 'admin@test.com', role: 'admin' },
		});
		mockSetSetting.mockResolvedValue(undefined);

		const res = await PATCH(makeRequest({ enabled: true }));
		const body = await res.json();

		expect(res.status).toBe(200);
		expect(body.enabled).toBe(true);
		expect(mockSetSetting).toHaveBeenCalledWith(
			'auto_process_videos',
			'true',
			'admin@test.com'
		);
	});

	it('allows admin to disable auto-processing', async () => {
		mockGetServerSession.mockResolvedValue({
			user: { email: 'admin@test.com', role: 'admin' },
		});
		mockSetSetting.mockResolvedValue(undefined);

		const res = await PATCH(makeRequest({ enabled: false }));
		const body = await res.json();

		expect(res.status).toBe(200);
		expect(body.enabled).toBe(false);
		expect(mockSetSetting).toHaveBeenCalledWith(
			'auto_process_videos',
			'false',
			'admin@test.com'
		);
	});

	it('allows developer role to toggle', async () => {
		mockGetServerSession.mockResolvedValue({
			user: { email: 'dev@test.com', role: 'developer' },
		});
		mockSetSetting.mockResolvedValue(undefined);

		const res = await PATCH(makeRequest({ enabled: true }));
		expect(res.status).toBe(200);
	});

	it('returns 500 when database update fails', async () => {
		mockGetServerSession.mockResolvedValue({
			user: { email: 'admin@test.com', role: 'admin' },
		});
		mockSetSetting.mockRejectedValue(new Error('db error'));

		const res = await PATCH(makeRequest({ enabled: true }));
		expect(res.status).toBe(500);
	});

	it('treats non-boolean enabled as false', async () => {
		mockGetServerSession.mockResolvedValue({
			user: { email: 'admin@test.com', role: 'admin' },
		});
		mockSetSetting.mockResolvedValue(undefined);

		const res = await PATCH(makeRequest({ enabled: 'yes' }));
		const body = await res.json();

		expect(body.enabled).toBe(false);
		expect(mockSetSetting).toHaveBeenCalledWith(
			'auto_process_videos',
			'false',
			'admin@test.com'
		);
	});
});
