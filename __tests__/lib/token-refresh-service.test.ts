import { describe, it, expect, vi, beforeEach } from 'vitest';
import { refreshAllTokens } from '@/lib/services/token-refresh-service';
import { saveLinkedFacebookAccount } from '@/lib/database/linked-accounts';
import axios from 'axios';

vi.mock('@/lib/config/supabase-admin', () => ({
	supabaseAdmin: {
		from: vi.fn(),
	},
}));

vi.mock('@/lib/database/linked-accounts', () => ({
	saveLinkedFacebookAccount: vi.fn(),
}));

vi.mock('@/lib/utils/logger', () => ({
	Logger: {
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
		debug: vi.fn(),
		log: vi.fn(),
	},
}));

vi.mock('axios');

vi.mock('@/lib/utils/retry', () => ({
	withRetry: vi.fn((fn: () => Promise<unknown>) => fn()),
}));

const { supabaseAdmin } = await import('@/lib/config/supabase-admin');
const { Logger } = await import('@/lib/utils/logger');

const MS_PER_DAY = 1000 * 60 * 60 * 24;

function mockSupabaseSelect(result: { data: unknown; error: unknown }) {
	const chain = {
		select: vi.fn().mockReturnValue({
			eq: vi.fn().mockResolvedValue(result),
		}),
	};
	vi.mocked(supabaseAdmin.from).mockReturnValue(chain as never);
	return chain;
}

function makeAccount(overrides: Record<string, unknown> = {}) {
	return {
		id: 'acc-1',
		user_id: 'user-1',
		provider: 'facebook',
		provider_account_id: 'fb-123',
		access_token: 'old-token',
		expires_at: Date.now() + 3 * MS_PER_DAY,
		ig_user_id: 'ig-1',
		ig_username: 'testuser',
		...overrides,
	};
}

describe('Token Refresh Service', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		process.env.AUTH_FACEBOOK_ID = 'test-app-id';
		process.env.AUTH_FACEBOOK_SECRET = 'test-app-secret';
	});

	it('returns empty summary when no credentials are set', async () => {
		delete process.env.AUTH_FACEBOOK_ID;
		delete process.env.AUTH_FACEBOOK_SECRET;
		delete process.env.NEXT_PUBLIC_FB_APP_ID;
		delete process.env.FB_APP_SECRET;

		const result = await refreshAllTokens();

		expect(result.totalAccounts).toBe(0);
		expect(Logger.error).toHaveBeenCalledWith(
			'token-refresh',
			'Missing Meta App credentials for token refresh',
		);
	});

	it('returns empty summary when database fetch fails', async () => {
		mockSupabaseSelect({
			data: null,
			error: { message: 'DB connection failed' },
		});

		const result = await refreshAllTokens();

		expect(result.totalAccounts).toBe(0);
		expect(Logger.error).toHaveBeenCalled();
	});

	it('returns empty summary when no accounts exist', async () => {
		mockSupabaseSelect({ data: [], error: null });

		const result = await refreshAllTokens();

		expect(result.totalAccounts).toBe(0);
		expect(result.refreshed).toBe(0);
	});

	it('skips tokens that are not expiring soon', async () => {
		const healthyAccount = makeAccount({
			expires_at: Date.now() + 30 * MS_PER_DAY,
		});
		mockSupabaseSelect({ data: [healthyAccount], error: null });

		const result = await refreshAllTokens();

		expect(result.totalAccounts).toBe(1);
		expect(result.skipped).toBe(1);
		expect(result.refreshed).toBe(0);
		expect(saveLinkedFacebookAccount).not.toHaveBeenCalled();
	});

	it('refreshes tokens expiring within 7 days', async () => {
		const expiringAccount = makeAccount({
			expires_at: Date.now() + 3 * MS_PER_DAY,
		});
		mockSupabaseSelect({ data: [expiringAccount], error: null });

		vi.mocked(axios.get).mockResolvedValue({
			data: { access_token: 'new-token', expires_in: 5184000 },
		});

		const result = await refreshAllTokens();

		expect(result.totalAccounts).toBe(1);
		expect(result.refreshed).toBe(1);
		expect(result.failed).toBe(0);
		expect(saveLinkedFacebookAccount).toHaveBeenCalledWith(
			expect.objectContaining({ access_token: 'new-token' }),
		);
		expect(Logger.warn).toHaveBeenCalledWith(
			'token-refresh',
			expect.stringContaining('Token expiring in'),
			expect.objectContaining({ userId: 'user-1' }),
		);
	});

	it('logs critical error when token is already expired', async () => {
		const expiredAccount = makeAccount({
			expires_at: Date.now() - MS_PER_DAY,
		});
		mockSupabaseSelect({ data: [expiredAccount], error: null });

		const result = await refreshAllTokens();

		expect(result.failed).toBe(1);
		expect(Logger.error).toHaveBeenCalledWith(
			'token-refresh',
			'Token has expired and cannot be refreshed',
			expect.objectContaining({ userId: 'user-1' }),
		);
	});

	it('logs critical error when refresh fails after retries', async () => {
		const expiringAccount = makeAccount({
			expires_at: Date.now() + 2 * MS_PER_DAY,
		});
		mockSupabaseSelect({ data: [expiringAccount], error: null });

		const { withRetry } = await import('@/lib/utils/retry');
		vi.mocked(withRetry).mockRejectedValue(new Error('API rate limit'));

		const result = await refreshAllTokens();

		expect(result.failed).toBe(1);
		expect(Logger.error).toHaveBeenCalledWith(
			'token-refresh',
			'Token refresh failed after retries',
			expect.objectContaining({
				userId: 'user-1',
				error: 'API rate limit',
			}),
		);
	});

	it('refreshes tokens with unknown expiry', async () => {
		const noExpiryAccount = makeAccount({ expires_at: undefined });
		mockSupabaseSelect({ data: [noExpiryAccount], error: null });

		vi.mocked(axios.get).mockResolvedValue({
			data: { access_token: 'new-token', expires_in: 5184000 },
		});

		const { withRetry } = await import('@/lib/utils/retry');
		vi.mocked(withRetry).mockImplementation((fn) => fn());

		const result = await refreshAllTokens();

		expect(result.refreshed).toBe(1);
	});
});
