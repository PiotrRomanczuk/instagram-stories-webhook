/**
 * Unit tests for linked-accounts database module (BMS-152)
 * Tests Facebook account CRUD operations, token retrieval, and expiry checks.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
	getLinkedFacebookAccount,
	saveLinkedFacebookAccount,
	deleteLinkedFacebookAccount,
	getFacebookAccessToken,
	getInstagramUserId,
} from '@/lib/database/linked-accounts';
import { supabaseAdmin } from '@/lib/config/supabase-admin';
import type { LinkedAccount } from '@/lib/types';

vi.mock('@/lib/config/supabase-admin', () => ({
	supabaseAdmin: { from: vi.fn() },
}));

vi.mock('@/lib/utils/logger', () => ({
	Logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

const mockAccount: LinkedAccount = {
	id: 'acc-1',
	user_id: 'user-1',
	provider: 'facebook',
	provider_account_id: 'fb-123',
	access_token: 'EAAtoken123',
	refresh_token: 'refresh-abc',
	expires_at: Date.now() + 30 * 24 * 60 * 60 * 1000,
	ig_user_id: '17841400000',
	ig_username: 'testuser',
};

describe('linked-accounts', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('getLinkedFacebookAccount', () => {
		it('should return linked account for user', async () => {
			const mockQuery = {
				select: vi.fn().mockReturnThis(),
				eq: vi.fn().mockReturnThis(),
				single: vi.fn().mockResolvedValue({ data: mockAccount, error: null }),
			};
			vi.mocked(supabaseAdmin.from).mockReturnValue(mockQuery as never);

			const result = await getLinkedFacebookAccount('user-1');
			expect(result).toEqual(mockAccount);
			expect(mockQuery.eq).toHaveBeenCalledWith('user_id', 'user-1');
			expect(mockQuery.eq).toHaveBeenCalledWith('provider', 'facebook');
		});

		it('should return null when no account found (PGRST116)', async () => {
			const mockQuery = {
				select: vi.fn().mockReturnThis(),
				eq: vi.fn().mockReturnThis(),
				single: vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
			};
			vi.mocked(supabaseAdmin.from).mockReturnValue(mockQuery as never);

			const result = await getLinkedFacebookAccount('user-missing');
			expect(result).toBeNull();
		});

		it('should return null on other database errors', async () => {
			const mockQuery = {
				select: vi.fn().mockReturnThis(),
				eq: vi.fn().mockReturnThis(),
				single: vi.fn().mockResolvedValue({ data: null, error: { code: 'UNEXPECTED', message: 'Connection failed' } }),
			};
			vi.mocked(supabaseAdmin.from).mockReturnValue(mockQuery as never);

			const result = await getLinkedFacebookAccount('user-1');
			expect(result).toBeNull();
		});

		it('should return null on exception', async () => {
			const mockQuery = {
				select: vi.fn().mockRejectedValue(new Error('Network error')),
			};
			vi.mocked(supabaseAdmin.from).mockReturnValue(mockQuery as never);

			const result = await getLinkedFacebookAccount('user-1');
			expect(result).toBeNull();
		});
	});

	describe('saveLinkedFacebookAccount', () => {
		it('should update existing account', async () => {
			let callCount = 0;
			vi.mocked(supabaseAdmin.from).mockImplementation(() => {
				callCount++;
				if (callCount === 1) {
					return {
						select: vi.fn().mockReturnThis(),
						eq: vi.fn().mockReturnThis(),
						single: vi.fn().mockResolvedValue({ data: mockAccount, error: null }),
					} as never;
				}
				return {
					update: vi.fn().mockReturnThis(),
					eq: vi.fn().mockResolvedValue({ error: null }),
				} as never;
			});

			await expect(saveLinkedFacebookAccount(mockAccount)).resolves.toBeUndefined();
		});

		it('should insert new account when none exists', async () => {
			let callCount = 0;
			vi.mocked(supabaseAdmin.from).mockImplementation(() => {
				callCount++;
				if (callCount === 1) {
					return {
						select: vi.fn().mockReturnThis(),
						eq: vi.fn().mockReturnThis(),
						single: vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
					} as never;
				}
				return {
					insert: vi.fn().mockResolvedValue({ error: null }),
				} as never;
			});

			await expect(saveLinkedFacebookAccount(mockAccount)).resolves.toBeUndefined();
		});

		it('should throw on update error', async () => {
			let callCount = 0;
			vi.mocked(supabaseAdmin.from).mockImplementation(() => {
				callCount++;
				if (callCount === 1) {
					return {
						select: vi.fn().mockReturnThis(),
						eq: vi.fn().mockReturnThis(),
						single: vi.fn().mockResolvedValue({ data: mockAccount, error: null }),
					} as never;
				}
				return {
					update: vi.fn().mockReturnThis(),
					eq: vi.fn().mockResolvedValue({ error: { message: 'Update failed' } }),
				} as never;
			});

			await expect(saveLinkedFacebookAccount(mockAccount)).rejects.toThrow();
		});
	});

	describe('deleteLinkedFacebookAccount', () => {
		it('should delete account for user', async () => {
			const mockQuery = {
				delete: vi.fn().mockReturnThis(),
				eq: vi.fn().mockReturnThis(),
			};
			let eqCount = 0;
			mockQuery.eq.mockImplementation(() => {
				eqCount++;
				if (eqCount >= 2) return Promise.resolve({ error: null });
				return mockQuery;
			});
			vi.mocked(supabaseAdmin.from).mockReturnValue(mockQuery as never);

			await expect(deleteLinkedFacebookAccount('user-1')).resolves.toBeUndefined();
		});

		it('should throw on delete error', async () => {
			const mockQuery = {
				delete: vi.fn().mockReturnThis(),
				eq: vi.fn().mockReturnThis(),
			};
			let eqCount = 0;
			mockQuery.eq.mockImplementation(() => {
				eqCount++;
				if (eqCount >= 2) return Promise.resolve({ error: { message: 'Delete failed' } });
				return mockQuery;
			});
			vi.mocked(supabaseAdmin.from).mockReturnValue(mockQuery as never);

			await expect(deleteLinkedFacebookAccount('user-1')).rejects.toThrow();
		});

		it('should throw on exception', async () => {
			const mockQuery = {
				delete: vi.fn().mockReturnThis(),
				eq: vi.fn().mockImplementation(() => {
					throw new Error('Network error');
				}),
			};
			vi.mocked(supabaseAdmin.from).mockReturnValue(mockQuery as never);

			await expect(deleteLinkedFacebookAccount('user-1')).rejects.toThrow('Network error');
		});
	});

	describe('getFacebookAccessToken', () => {
		it('should return access token for user with valid token', async () => {
			const mockQuery = {
				select: vi.fn().mockReturnThis(),
				eq: vi.fn().mockReturnThis(),
				single: vi.fn().mockResolvedValue({ data: mockAccount, error: null }),
			};
			vi.mocked(supabaseAdmin.from).mockReturnValue(mockQuery as never);

			const token = await getFacebookAccessToken('user-1');
			expect(token).toBe('EAAtoken123');
		});

		it('should return null when no account exists', async () => {
			const mockQuery = {
				select: vi.fn().mockReturnThis(),
				eq: vi.fn().mockReturnThis(),
				single: vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
			};
			vi.mocked(supabaseAdmin.from).mockReturnValue(mockQuery as never);

			const token = await getFacebookAccessToken('user-missing');
			expect(token).toBeNull();
		});

		it('should return null when token is expired', async () => {
			const expiredAccount = { ...mockAccount, expires_at: Date.now() - 1000 };
			const mockQuery = {
				select: vi.fn().mockReturnThis(),
				eq: vi.fn().mockReturnThis(),
				single: vi.fn().mockResolvedValue({ data: expiredAccount, error: null }),
			};
			vi.mocked(supabaseAdmin.from).mockReturnValue(mockQuery as never);

			const token = await getFacebookAccessToken('user-1');
			expect(token).toBeNull();
		});

		it('should return token when expires_at is undefined', async () => {
			const noExpiryAccount = { ...mockAccount, expires_at: undefined };
			const mockQuery = {
				select: vi.fn().mockReturnThis(),
				eq: vi.fn().mockReturnThis(),
				single: vi.fn().mockResolvedValue({ data: noExpiryAccount, error: null }),
			};
			vi.mocked(supabaseAdmin.from).mockReturnValue(mockQuery as never);

			const token = await getFacebookAccessToken('user-1');
			expect(token).toBe('EAAtoken123');
		});
	});

	describe('getInstagramUserId', () => {
		it('should return IG user ID for user with linked account', async () => {
			const mockQuery = {
				select: vi.fn().mockReturnThis(),
				eq: vi.fn().mockReturnThis(),
				single: vi.fn().mockResolvedValue({ data: mockAccount, error: null }),
			};
			vi.mocked(supabaseAdmin.from).mockReturnValue(mockQuery as never);

			const igUserId = await getInstagramUserId('user-1');
			expect(igUserId).toBe('17841400000');
		});

		it('should return null when no account exists', async () => {
			const mockQuery = {
				select: vi.fn().mockReturnThis(),
				eq: vi.fn().mockReturnThis(),
				single: vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
			};
			vi.mocked(supabaseAdmin.from).mockReturnValue(mockQuery as never);

			const igUserId = await getInstagramUserId('user-missing');
			expect(igUserId).toBeNull();
		});

		it('should return null when account has no ig_user_id', async () => {
			const noIgAccount = { ...mockAccount, ig_user_id: undefined };
			const mockQuery = {
				select: vi.fn().mockReturnThis(),
				eq: vi.fn().mockReturnThis(),
				single: vi.fn().mockResolvedValue({ data: noIgAccount, error: null }),
			};
			vi.mocked(supabaseAdmin.from).mockReturnValue(mockQuery as never);

			const igUserId = await getInstagramUserId('user-1');
			expect(igUserId).toBeNull();
		});
	});
});
