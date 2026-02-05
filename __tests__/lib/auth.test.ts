import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { authOptions } from '@/lib/auth';
import { isEmailAllowed, getUserRole } from '@/lib/memes-db';
import type { User, Account } from 'next-auth';
import type { JWT } from 'next-auth/jwt';

// Mock dependencies
vi.mock('@/lib/memes-db', () => ({
	isEmailAllowed: vi.fn(),
	getUserRole: vi.fn(),
}));

vi.mock('@/lib/database/linked-accounts', () => ({
	getLinkedFacebookAccount: vi.fn(),
	saveLinkedFacebookAccount: vi.fn(),
}));

vi.mock('@/lib/instagram/account', () => ({
	getInstagramUsername: vi.fn(),
}));

vi.mock('@/lib/utils/logger', () => ({
	Logger: {
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
	},
}));

describe('Authentication Flow', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('Google OAuth Sign In', () => {
		it('should allow sign-in for whitelisted email', async () => {
			const user: User = {
				id: 'test-user-id',
				email: 'allowed@example.com',
				name: 'Test User',
			};

			const account: Account = {
				provider: 'google',
				type: 'oauth',
				providerAccountId: '123456',
				access_token: 'test-token',
				token_type: 'Bearer',
			};

			(isEmailAllowed as Mock).mockResolvedValue(true);

			const signInCallback = authOptions.callbacks?.signIn;
			if (!signInCallback) throw new Error('signIn callback not defined');

			const result = await signInCallback({ user, account, profile: undefined });

			expect(result).toBe(true);
			expect(isEmailAllowed).toHaveBeenCalledWith('allowed@example.com');
		});

		it('should deny sign-in for non-whitelisted email', async () => {
			const user: User = {
				id: 'test-user-id',
				email: 'notallowed@example.com',
				name: 'Test User',
			};

			const account: Account = {
				provider: 'google',
				type: 'oauth',
				providerAccountId: '123456',
				access_token: 'test-token',
				token_type: 'Bearer',
			};

			(isEmailAllowed as Mock).mockResolvedValue(false);
			process.env.ADMIN_EMAIL = 'admin@example.com';

			const signInCallback = authOptions.callbacks?.signIn;
			if (!signInCallback) throw new Error('signIn callback not defined');

			const result = await signInCallback({ user, account, profile: undefined });

			expect(result).toBe(false);
			expect(isEmailAllowed).toHaveBeenCalledWith('notallowed@example.com');
		});

		it('should normalize email to lowercase when checking whitelist', async () => {
			const user: User = {
				id: 'test-user-id',
				email: 'UPPERCASE@EXAMPLE.COM',
				name: 'Test User',
			};

			const account: Account = {
				provider: 'google',
				type: 'oauth',
				providerAccountId: '123456',
				access_token: 'test-token',
				token_type: 'Bearer',
			};

			(isEmailAllowed as Mock).mockResolvedValue(true);

			const signInCallback = authOptions.callbacks?.signIn;
			if (!signInCallback) throw new Error('signIn callback not defined');

			await signInCallback({ user, account, profile: undefined });

			expect(isEmailAllowed).toHaveBeenCalledWith('uppercase@example.com');
		});

		it('should allow sign-in for ADMIN_EMAIL env fallback', async () => {
			const user: User = {
				id: 'test-user-id',
				email: 'admin@example.com',
				name: 'Admin User',
			};

			const account: Account = {
				provider: 'google',
				type: 'oauth',
				providerAccountId: '123456',
				access_token: 'test-token',
				token_type: 'Bearer',
			};

			(isEmailAllowed as Mock).mockResolvedValue(false);
			process.env.ADMIN_EMAIL = 'admin@example.com,other@example.com';

			const signInCallback = authOptions.callbacks?.signIn;
			if (!signInCallback) throw new Error('signIn callback not defined');

			const result = await signInCallback({ user, account, profile: undefined });

			expect(result).toBe(true);
		});

		it('should block Facebook provider for sign-in', async () => {
			const user: User = {
				id: 'test-user-id',
				email: 'user@example.com',
				name: 'Test User',
			};

			const account: Account = {
				provider: 'facebook',
				type: 'oauth',
				providerAccountId: '123456',
				access_token: 'test-token',
				token_type: 'Bearer',
			};

			const signInCallback = authOptions.callbacks?.signIn;
			if (!signInCallback) throw new Error('signIn callback not defined');

			const result = await signInCallback({ user, account, profile: undefined });

			expect(result).toBe(false);
		});

		it('should block unknown providers', async () => {
			const user: User = {
				id: 'test-user-id',
				email: 'user@example.com',
				name: 'Test User',
			};

			const account: Account = {
				provider: 'unknown-provider' as any,
				type: 'oauth',
				providerAccountId: '123456',
				access_token: 'test-token',
				token_type: 'Bearer',
			};

			const signInCallback = authOptions.callbacks?.signIn;
			if (!signInCallback) throw new Error('signIn callback not defined');

			const result = await signInCallback({ user, account, profile: undefined });

			expect(result).toBe(false);
		});
	});

	describe('Test Credentials Provider (dev/test only)', () => {
		it('should reject sign-in when email is missing in credentials', async () => {
			const testCredentialsProvider = authOptions.providers.find(
				(p) => (p as any).id === 'test-credentials'
			) as any;

			if (!testCredentialsProvider) {
				// Skip if test credentials provider not available
				return;
			}

			const result = await testCredentialsProvider.authorize({});

			expect(result).toBeNull();
		});

		it('should allow known test emails in test mode', async () => {
			const user: User = {
				id: 'test-user-id',
				email: 'user@test.com',
				name: 'Test User',
			};

			const account: Account = {
				provider: 'test-credentials',
				type: 'credentials',
				providerAccountId: 'test-123',
			};

			const signInCallback = authOptions.callbacks?.signIn;
			if (!signInCallback) throw new Error('signIn callback not defined');

			const result = await signInCallback({ user, account, profile: undefined });

			expect(result).toBe(true);
		});

		it('should check whitelist for unknown test emails', async () => {
			const user: User = {
				id: 'test-user-id',
				email: 'unknown@test.com',
				name: 'Unknown User',
			};

			const account: Account = {
				provider: 'test-credentials',
				type: 'credentials',
				providerAccountId: 'test-123',
			};

			(isEmailAllowed as Mock).mockResolvedValue(true);

			const signInCallback = authOptions.callbacks?.signIn;
			if (!signInCallback) throw new Error('signIn callback not defined');

			const result = await signInCallback({ user, account, profile: undefined });

			expect(result).toBe(true);
			expect(isEmailAllowed).toHaveBeenCalledWith('unknown@test.com');
		});

		it('should deny unknown test emails not in whitelist', async () => {
			const user: User = {
				id: 'test-user-id',
				email: 'denied@test.com',
				name: 'Denied User',
			};

			const account: Account = {
				provider: 'test-credentials',
				type: 'credentials',
				providerAccountId: 'test-123',
			};

			(isEmailAllowed as Mock).mockResolvedValue(false);

			const signInCallback = authOptions.callbacks?.signIn;
			if (!signInCallback) throw new Error('signIn callback not defined');

			const result = await signInCallback({ user, account, profile: undefined });

			expect(result).toBe(false);
		});
	});

	describe('JWT Callback - Role Assignment', () => {
		it('should assign admin role from database', async () => {
			const token: JWT = {
				id: 'test-user-id',
				role: 'user' as any, // Will be overridden
				name: 'Test User',
				email: 'admin@example.com',
				picture: '',
				sub: 'test-id',
			};

			const user: User = {
				id: 'test-user-id',
				email: 'admin@example.com',
				name: 'Admin User',
			};

			(getUserRole as Mock).mockResolvedValue('admin');

			const jwtCallback = authOptions.callbacks?.jwt;
			if (!jwtCallback) throw new Error('jwt callback not defined');

			const result = await jwtCallback({
				token,
				user,
				account: null,
				trigger: 'signIn',
			});

			expect(result.role).toBe('admin');
			expect(result.id).toBe('test-user-id');
			expect(getUserRole).toHaveBeenCalledWith('admin@example.com');
		});

		it('should assign user role from database', async () => {
			const token: JWT = {
				id: 'test-user-id',
				role: 'user' as any,
				name: 'Test User',
				email: 'user@example.com',
				picture: '',
				sub: 'test-id',
			};

			const user: User = {
				id: 'test-user-id',
				email: 'user@example.com',
				name: 'Regular User',
			};

			(getUserRole as Mock).mockResolvedValue('user');

			const jwtCallback = authOptions.callbacks?.jwt;
			if (!jwtCallback) throw new Error('jwt callback not defined');

			const result = await jwtCallback({
				token,
				user,
				account: null,
				trigger: 'signIn',
			});

			expect(result.role).toBe('user');
		});

		it('should use test role mappings in test mode', async () => {
			const token: JWT = {
				id: 'test-user-id',
				role: 'user' as any, // Will be overridden by callback
				name: 'Admin Test',
				email: 'admin@test.com',
				picture: '',
				sub: 'test-id',
			};

			const user: User = {
				id: 'test-user-id',
				email: 'admin@test.com',
				name: 'Admin Test',
			};

			const jwtCallback = authOptions.callbacks?.jwt;
			if (!jwtCallback) throw new Error('jwt callback not defined');

			const result = await jwtCallback({
				token,
				user,
				account: null,
				trigger: 'signIn',
			});

			expect(result.role).toBe('admin');
			expect(getUserRole).not.toHaveBeenCalled(); // Should use hardcoded test mapping
		});

		it('should fallback to admin role for ADMIN_EMAIL users', async () => {
			process.env.ADMIN_EMAIL = 'fallback@example.com';

			const token: JWT = {
				id: 'test-user-id',
				role: 'user' as any,
				name: 'Fallback Admin',
				email: 'fallback@example.com',
				picture: '',
				sub: 'test-id',
			};

			const user: User = {
				id: 'test-user-id',
				email: 'fallback@example.com',
				name: 'Fallback Admin',
			};

			(getUserRole as Mock).mockResolvedValue(null);

			const jwtCallback = authOptions.callbacks?.jwt;
			if (!jwtCallback) throw new Error('jwt callback not defined');

			const result = await jwtCallback({
				token,
				user,
				account: null,
				trigger: 'signIn',
			});

			expect(result.role).toBe('admin');
		});

		it('should default to user role when not in whitelist or ADMIN_EMAIL', async () => {
			process.env.ADMIN_EMAIL = 'admin@example.com';

			const token: JWT = {
				id: 'test-user-id',
				role: 'user' as any,
				name: 'Regular User',
				email: 'regular@example.com',
				picture: '',
				sub: 'test-id',
			};

			const user: User = {
				id: 'test-user-id',
				email: 'regular@example.com',
				name: 'Regular User',
			};

			(getUserRole as Mock).mockResolvedValue(null);

			const jwtCallback = authOptions.callbacks?.jwt;
			if (!jwtCallback) throw new Error('jwt callback not defined');

			const result = await jwtCallback({
				token,
				user,
				account: null,
				trigger: 'signIn',
			});

			expect(result.role).toBe('user');
		});
	});

	describe('JWT Callback - Instagram Account Linking', () => {
		it('should link Instagram account on initial sign-in', async () => {
			const { getLinkedFacebookAccount } = await import('@/lib/database/linked-accounts');
			const { getInstagramUsername } = await import('@/lib/instagram/account');

			const mockLinkedAccount = {
				user_id: 'test-user-id',
				access_token: 'valid-fb-token',
				ig_user_id: '17841400000000000',
				ig_username: 'test_user',
				expires_at: Date.now() + 60 * 24 * 60 * 60 * 1000, // 60 days from now
			};

			(getLinkedFacebookAccount as Mock).mockResolvedValue(mockLinkedAccount);
			(getInstagramUsername as Mock).mockResolvedValue('test_user');

			const token: JWT = {
				id: 'test-user-id',
				role: 'user',
				name: 'Test User',
				email: 'test@example.com',
				picture: '',
				sub: 'test-id',
			};

			const user: User = {
				id: 'test-user-id',
				email: 'test@example.com',
				name: 'Test User',
			};

			const jwtCallback = authOptions.callbacks?.jwt;
			if (!jwtCallback) throw new Error('jwt callback not defined');

			const result = await jwtCallback({
				token,
				user,
				account: null,
				trigger: 'signIn',
			});

			expect(result.instagramAccount).toEqual({
				id: '17841400000000000',
				username: 'test_user',
			});
			expect(getLinkedFacebookAccount).toHaveBeenCalledWith('test-user-id');
			expect(getInstagramUsername).toHaveBeenCalledWith('17841400000000000', 'valid-fb-token');
		});

		it('should not link Instagram account when token is expired', async () => {
			const { getLinkedFacebookAccount } = await import('@/lib/database/linked-accounts');
			const { getInstagramUsername } = await import('@/lib/instagram/account');

			const mockLinkedAccount = {
				user_id: 'test-user-id',
				access_token: 'expired-fb-token',
				ig_user_id: '17841400000000000',
				ig_username: 'test_user',
				expires_at: Date.now() - 1000, // Expired
			};

			(getLinkedFacebookAccount as Mock).mockResolvedValue(mockLinkedAccount);

			const token: JWT = {
				id: 'test-user-id',
				role: 'user',
				name: 'Test User',
				email: 'test@example.com',
				picture: '',
				sub: 'test-id',
			};

			const user: User = {
				id: 'test-user-id',
				email: 'test@example.com',
				name: 'Test User',
			};

			const jwtCallback = authOptions.callbacks?.jwt;
			if (!jwtCallback) throw new Error('jwt callback not defined');

			const result = await jwtCallback({
				token,
				user,
				account: null,
				trigger: 'signIn',
			});

			expect(result.instagramAccount).toBeUndefined();
			expect(getInstagramUsername).not.toHaveBeenCalled();
		});

		it('should update Instagram account on trigger update', async () => {
			const { getLinkedFacebookAccount } = await import('@/lib/database/linked-accounts');
			const { getInstagramUsername } = await import('@/lib/instagram/account');

			const mockLinkedAccount = {
				user_id: 'test-user-id',
				access_token: 'valid-fb-token',
				ig_user_id: '17841400000000000',
				ig_username: 'test_user',
				expires_at: Date.now() + 60 * 24 * 60 * 60 * 1000,
			};

			(getLinkedFacebookAccount as Mock).mockResolvedValue(mockLinkedAccount);
			(getInstagramUsername as Mock).mockResolvedValue('updated_username');

			const token: JWT = {
				id: 'test-user-id',
				role: 'user',
				name: 'Test User',
				email: 'test@example.com',
				picture: '',
				sub: 'test-id',
			};

			const jwtCallback = authOptions.callbacks?.jwt;
			if (!jwtCallback) throw new Error('jwt callback not defined');

			const result = await jwtCallback({
				token,
				user: undefined as any,
				account: null,
				trigger: 'update',
			});

			expect(result.instagramAccount).toEqual({
				id: '17841400000000000',
				username: 'updated_username',
			});
		});

		it('should update database when Instagram username changes', async () => {
			const { getLinkedFacebookAccount, saveLinkedFacebookAccount } = await import('@/lib/database/linked-accounts');
			const { getInstagramUsername } = await import('@/lib/instagram/account');

			const mockLinkedAccount = {
				user_id: 'test-user-id',
				access_token: 'valid-fb-token',
				ig_user_id: '17841400000000000',
				ig_username: 'old_username',
				expires_at: Date.now() + 60 * 24 * 60 * 60 * 1000,
			};

			(getLinkedFacebookAccount as Mock).mockResolvedValue(mockLinkedAccount);
			(getInstagramUsername as Mock).mockResolvedValue('new_username');
			(saveLinkedFacebookAccount as Mock).mockResolvedValue(undefined);

			const token: JWT = {
				id: 'test-user-id',
				role: 'user',
				name: 'Test User',
				email: 'test@example.com',
				picture: '',
				sub: 'test-id',
			};

			const user: User = {
				id: 'test-user-id',
				email: 'test@example.com',
				name: 'Test User',
			};

			const jwtCallback = authOptions.callbacks?.jwt;
			if (!jwtCallback) throw new Error('jwt callback not defined');

			await jwtCallback({
				token,
				user,
				account: null,
				trigger: 'signIn',
			});

			expect(saveLinkedFacebookAccount).toHaveBeenCalledWith({
				...mockLinkedAccount,
				ig_username: 'new_username',
			});
		});

		it('should handle errors in Instagram account linking gracefully', async () => {
			const { getLinkedFacebookAccount } = await import('@/lib/database/linked-accounts');

			(getLinkedFacebookAccount as Mock).mockRejectedValue(new Error('Database error'));

			const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

			const token: JWT = {
				id: 'test-user-id',
				role: 'user',
				name: 'Test User',
				email: 'test@example.com',
				picture: '',
				sub: 'test-id',
			};

			const user: User = {
				id: 'test-user-id',
				email: 'test@example.com',
				name: 'Test User',
			};

			const jwtCallback = authOptions.callbacks?.jwt;
			if (!jwtCallback) throw new Error('jwt callback not defined');

			const result = await jwtCallback({
				token,
				user,
				account: null,
				trigger: 'signIn',
			});

			expect(result.instagramAccount).toBeUndefined();
			expect(consoleErrorSpy).toHaveBeenCalledWith(
				'Error fetching linked account in JWT callback:',
				expect.any(Error)
			);

			consoleErrorSpy.mockRestore();
		});

		it('should not link Instagram account when no linked account exists', async () => {
			const { getLinkedFacebookAccount } = await import('@/lib/database/linked-accounts');
			const { getInstagramUsername } = await import('@/lib/instagram/account');

			(getLinkedFacebookAccount as Mock).mockResolvedValue(null);

			const token: JWT = {
				id: 'test-user-id',
				role: 'user',
				name: 'Test User',
				email: 'test@example.com',
				picture: '',
				sub: 'test-id',
			};

			const user: User = {
				id: 'test-user-id',
				email: 'test@example.com',
				name: 'Test User',
			};

			const jwtCallback = authOptions.callbacks?.jwt;
			if (!jwtCallback) throw new Error('jwt callback not defined');

			const result = await jwtCallback({
				token,
				user,
				account: null,
				trigger: 'signIn',
			});

			expect(result.instagramAccount).toBeUndefined();
			expect(getInstagramUsername).not.toHaveBeenCalled();
		});

		it('should refresh Instagram account when token does not have it', async () => {
			const { getLinkedFacebookAccount } = await import('@/lib/database/linked-accounts');
			const { getInstagramUsername } = await import('@/lib/instagram/account');

			const mockLinkedAccount = {
				user_id: 'test-user-id',
				access_token: 'valid-fb-token',
				ig_user_id: '17841400000000000',
				ig_username: 'test_user',
				expires_at: Date.now() + 60 * 24 * 60 * 60 * 1000,
			};

			(getLinkedFacebookAccount as Mock).mockResolvedValue(mockLinkedAccount);
			(getInstagramUsername as Mock).mockResolvedValue('test_user');

			const token: JWT = {
				id: 'test-user-id',
				role: 'user',
				name: 'Test User',
				email: 'test@example.com',
				picture: '',
				sub: 'test-id',
				// No instagramAccount initially
			};

			const jwtCallback = authOptions.callbacks?.jwt;
			if (!jwtCallback) throw new Error('jwt callback not defined');

			const result = await jwtCallback({
				token,
				user: undefined as any, // No user on subsequent calls
				account: null,
				trigger: undefined,
			});

			expect(result.instagramAccount).toEqual({
				id: '17841400000000000',
				username: 'test_user',
			});
			expect(getLinkedFacebookAccount).toHaveBeenCalledWith('test-user-id');
		});
	});

	describe('Session Callback', () => {
		it('should populate session with user data and role', async () => {
			const session = {
				user: {
					id: '',
					name: 'Test User',
					email: 'test@example.com',
					image: null,
					role: 'user' as any,
				},
				expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
			};

			const token: JWT = {
				id: 'test-user-id',
				role: 'admin',
				email: 'test@example.com',
				name: 'Test User',
				picture: '',
				sub: 'test-id',
			};

			const sessionCallback = authOptions.callbacks?.session;
			if (!sessionCallback) throw new Error('session callback not defined');

			const result = await sessionCallback({
				session,
				token,
				trigger: 'update',
			} as any);

			expect((result as any).user?.id).toBe('test-user-id');
			expect((result as any).user?.role).toBe('admin');
			expect((result as any).user?.email).toBe('test@example.com');
		});

		it('should generate Supabase access token when JWT secret is set', async () => {
			process.env.SUPABASE_JWT_SECRET = 'test-secret';

			const session = {
				user: {
					id: '',
					name: 'Test User',
					email: 'test@example.com',
					image: null,
					role: 'user' as any,
				},
				expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
			};

			const token: JWT = {
				id: 'test-user-id',
				role: 'user',
				email: 'test@example.com',
				name: 'Test User',
				picture: '',
				sub: 'test-id',
			};

			const sessionCallback = authOptions.callbacks?.session;
			if (!sessionCallback) throw new Error('session callback not defined');

			const result = await sessionCallback({
				session,
				token,
				trigger: 'update',
			} as any) as any;

			expect(result.supabaseAccessToken).toBeDefined();
			expect(typeof result.supabaseAccessToken).toBe('string');
		});

		it('should include Instagram account info in session', async () => {
			const session = {
				user: {
					id: '',
					name: 'Test User',
					email: 'test@example.com',
					image: null,
					role: 'user' as any,
				},
				expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
			};

			const token: JWT = {
				id: 'test-user-id',
				role: 'user',
				email: 'test@example.com',
				name: 'Test User',
				picture: '',
				sub: 'test-id',
				instagramAccount: {
					id: '17841400000000000',
					username: 'test_instagram',
				},
			};

			const sessionCallback = authOptions.callbacks?.session;
			if (!sessionCallback) throw new Error('session callback not defined');

			const result = await sessionCallback({
				session,
				token,
				trigger: 'update',
			} as any);

			expect((result as any).user?.instagramAccount).toEqual({
				id: '17841400000000000',
				username: 'test_instagram',
			});
		});
	});

	describe('Provider Configuration', () => {
		it('should have Google provider configured', () => {
			const googleProvider = authOptions.providers.find(
				(p) => (p as any).id === 'google',
			);
			expect(googleProvider).toBeDefined();
		});

		it('should have at least one authentication provider', () => {
			// Verify that we have authentication providers configured
			// At minimum, Google provider should always be present
			expect(authOptions.providers.length).toBeGreaterThan(0);

			// Test credentials provider is conditionally included based on NODE_ENV
			// at module load time, so we just verify providers exist
			const providerIds = authOptions.providers.map((p) => (p as any).id);
			expect(providerIds).toContain('google');
		});

		it('should use JWT session strategy', () => {
			expect(authOptions.session?.strategy).toBe('jwt');
		});

		it('should have custom sign-in page configured', () => {
			expect(authOptions.pages?.signIn).toBe('/auth/signin');
		});
	});

	describe('Edge Cases', () => {
		it('should handle missing email gracefully', async () => {
			const user: User = {
				id: 'test-user-id',
				email: undefined,
				name: 'No Email User',
			};

			const account: Account = {
				provider: 'google',
				type: 'oauth',
				providerAccountId: '123456',
				access_token: 'test-token',
				token_type: 'Bearer',
			};

			(isEmailAllowed as Mock).mockResolvedValue(false);

			const signInCallback = authOptions.callbacks?.signIn;
			if (!signInCallback) throw new Error('signIn callback not defined');

			const result = await signInCallback({ user, account, profile: undefined });

			expect(result).toBe(false);
			expect(isEmailAllowed).toHaveBeenCalledWith('');
		});

		it('should handle empty ADMIN_EMAIL env variable', async () => {
			process.env.ADMIN_EMAIL = '';

			const user: User = {
				id: 'test-user-id',
				email: 'test@example.com',
				name: 'Test User',
			};

			const account: Account = {
				provider: 'google',
				type: 'oauth',
				providerAccountId: '123456',
				access_token: 'test-token',
				token_type: 'Bearer',
			};

			(isEmailAllowed as Mock).mockResolvedValue(false);

			const signInCallback = authOptions.callbacks?.signIn;
			if (!signInCallback) throw new Error('signIn callback not defined');

			const result = await signInCallback({ user, account, profile: undefined });

			expect(result).toBe(false);
		});

		it('should handle multiple admins in ADMIN_EMAIL', async () => {
			process.env.ADMIN_EMAIL = 'admin1@example.com, admin2@example.com, admin3@example.com';

			const user: User = {
				id: 'test-user-id',
				email: 'admin2@example.com',
				name: 'Admin 2',
			};

			const account: Account = {
				provider: 'google',
				type: 'oauth',
				providerAccountId: '123456',
				access_token: 'test-token',
				token_type: 'Bearer',
			};

			(isEmailAllowed as Mock).mockResolvedValue(false);

			const signInCallback = authOptions.callbacks?.signIn;
			if (!signInCallback) throw new Error('signIn callback not defined');

			const result = await signInCallback({ user, account, profile: undefined });

			expect(result).toBe(true);
		});
	});
});
