/**
 * Middleware execution tests (BMS-153)
 * Tests actual middleware request/response cycle, not just regex patterns.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

const { mockIntlMiddleware, mockAuthMiddleware, mockGetToken } = vi.hoisted(() => ({
	mockIntlMiddleware: vi.fn(),
	mockAuthMiddleware: vi.fn(),
	mockGetToken: vi.fn(),
}));

vi.mock('next-intl/middleware', () => ({
	default: vi.fn(() => mockIntlMiddleware),
}));

vi.mock('@/i18n/routing', () => ({
	routing: { locales: ['en'], defaultLocale: 'en', localePrefix: 'never' },
}));

vi.mock('next-auth/middleware', () => ({
	withAuth: vi.fn((_onSuccess: unknown, _options: unknown) => mockAuthMiddleware),
}));

vi.mock('next-auth/jwt', () => ({
	getToken: mockGetToken,
}));

import middleware, { config } from '@/middleware';

function createRequest(url: string): NextRequest {
	return new NextRequest(new URL(url, 'http://localhost:3000'));
}

describe('Middleware Execution', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		// Set NEXTAUTH_SECRET so middleware doesn't short-circuit to /landing
		process.env.NEXTAUTH_SECRET = 'test-secret';
		mockIntlMiddleware.mockReturnValue(NextResponse.next());
		mockAuthMiddleware.mockReturnValue(NextResponse.next());
		// Default: authenticated 'user' role that has finished onboarding,
		// so it bypasses the /welcome redirect.
		mockGetToken.mockResolvedValue({ role: 'user', onboardedAt: Date.now() });
	});

	describe('Public pages (auth routes)', () => {
		it('should route /auth/signin through intl middleware (no auth required)', async () => {
			const req = createRequest('/auth/signin');
			await middleware(req);
			expect(mockIntlMiddleware).toHaveBeenCalledWith(req);
			expect(mockAuthMiddleware).not.toHaveBeenCalled();
		});

		it('should route /auth/signout through intl middleware', async () => {
			const req = createRequest('/auth/signout');
			await middleware(req);
			expect(mockIntlMiddleware).toHaveBeenCalledWith(req);
			expect(mockAuthMiddleware).not.toHaveBeenCalled();
		});

		// Removed: locale prefix tests - using localePrefix: 'never' now

		it('should route /auth/callback/google through intl middleware', async () => {
			const req = createRequest('/auth/callback/google');
			await middleware(req);
			expect(mockIntlMiddleware).toHaveBeenCalledWith(req);
			expect(mockAuthMiddleware).not.toHaveBeenCalled();
		});

		it('should route /landing through intl middleware (no auth required)', async () => {
			const req = createRequest('/landing');
			await middleware(req);
			expect(mockIntlMiddleware).toHaveBeenCalledWith(req);
			expect(mockAuthMiddleware).not.toHaveBeenCalled();
		});
	});

	describe('Missing NEXTAUTH_SECRET', () => {
		it('should fall through to intl middleware when NEXTAUTH_SECRET is not set', async () => {
			delete process.env.NEXTAUTH_SECRET;
			const req = createRequest('/dashboard');
			await middleware(req);
			expect(mockIntlMiddleware).toHaveBeenCalledWith(req);
			expect(mockAuthMiddleware).not.toHaveBeenCalled();
		});
	});

	describe('Protected pages (require auth)', () => {
		it('should route / through intl middleware (public landing)', async () => {
			const req = createRequest('/');
			await middleware(req);
			expect(mockIntlMiddleware).toHaveBeenCalledWith(req);
			expect(mockAuthMiddleware).not.toHaveBeenCalled();
		});

		it('should route /dashboard through auth middleware', async () => {
			const req = createRequest('/dashboard');
			await middleware(req);
			expect(mockAuthMiddleware).toHaveBeenCalledWith(req);
		});

		// Removed: /en/dashboard test - using localePrefix: 'never' now

		it('should route /debug through auth middleware', async () => {
			const req = createRequest('/debug');
			await middleware(req);
			expect(mockAuthMiddleware).toHaveBeenCalledWith(req);
		});
	});

	describe('Role-protected routes - /users', () => {
		it('should allow admin to access /users', async () => {
			mockGetToken.mockResolvedValue({ role: 'admin' });
			const req = createRequest('/users');
			await middleware(req);
			expect(mockAuthMiddleware).toHaveBeenCalledWith(req);
		});

		it('should allow developer to access /users', async () => {
			mockGetToken.mockResolvedValue({ role: 'developer' });
			const req = createRequest('/users');
			await middleware(req);
			expect(mockAuthMiddleware).toHaveBeenCalledWith(req);
		});

		it('should redirect user role away from /users to /', async () => {
			mockGetToken.mockResolvedValue({ role: 'user', onboardedAt: Date.now() });
			const req = createRequest('/users');
			const result = await middleware(req);
			expect(result?.status).toBe(307);
			expect(result?.headers.get('location')).toBe('http://localhost:3000/');
		});

		it('should redirect user role away from /users/sub-path to /', async () => {
			mockGetToken.mockResolvedValue({ role: 'user', onboardedAt: Date.now() });
			const req = createRequest('/users/some-path');
			const result = await middleware(req);
			expect(result?.status).toBe(307);
		});

		it('should delegate to authMiddleware when no token on /users', async () => {
			mockGetToken.mockResolvedValue(null);
			const req = createRequest('/users');
			await middleware(req);
			expect(mockAuthMiddleware).toHaveBeenCalledWith(req);
		});
	});

	describe('Role-protected routes - /developer', () => {
		it('should allow admin to access /developer', async () => {
			mockGetToken.mockResolvedValue({ role: 'admin' });
			const req = createRequest('/developer');
			await middleware(req);
			expect(mockAuthMiddleware).toHaveBeenCalledWith(req);
		});

		it('should allow developer to access /developer', async () => {
			mockGetToken.mockResolvedValue({ role: 'developer' });
			const req = createRequest('/developer');
			await middleware(req);
			expect(mockAuthMiddleware).toHaveBeenCalledWith(req);
		});

		it('should redirect user role away from /developer to /', async () => {
			mockGetToken.mockResolvedValue({ role: 'user', onboardedAt: Date.now() });
			const req = createRequest('/developer');
			const result = await middleware(req);
			expect(result?.status).toBe(307);
			expect(result?.headers.get('location')).toBe('http://localhost:3000/');
		});

		it('should redirect user role away from /developer/cron-debug to /', async () => {
			mockGetToken.mockResolvedValue({ role: 'user', onboardedAt: Date.now() });
			const req = createRequest('/developer/cron-debug');
			const result = await middleware(req);
			expect(result?.status).toBe(307);
		});
	});

	describe('Role-protected routes - /settings', () => {
		it('should allow developer to access /settings', async () => {
			mockGetToken.mockResolvedValue({ role: 'developer' });
			const req = createRequest('/settings');
			await middleware(req);
			expect(mockAuthMiddleware).toHaveBeenCalledWith(req);
		});

		it('should allow admin to access /settings', async () => {
			mockGetToken.mockResolvedValue({ role: 'admin' });
			const req = createRequest('/settings');
			await middleware(req);
			expect(mockAuthMiddleware).toHaveBeenCalledWith(req);
		});

		it('should redirect user role away from /settings to /', async () => {
			mockGetToken.mockResolvedValue({ role: 'user', onboardedAt: Date.now() });
			const req = createRequest('/settings');
			const result = await middleware(req);
			expect(result?.status).toBe(307);
		});
	});

	describe('Edge cases', () => {
		// Removed: unsupported locale test - only 'en' supported with localePrefix: 'never'

		it('should treat /authentication as protected', async () => {
			const req = createRequest('/authentication');
			await middleware(req);
			expect(mockAuthMiddleware).toHaveBeenCalledWith(req);
		});

		it('should handle case-insensitive auth paths', async () => {
			const req = createRequest('/AUTH/signin');
			await middleware(req);
			expect(mockIntlMiddleware).toHaveBeenCalledWith(req);
			expect(mockAuthMiddleware).not.toHaveBeenCalled();
		});
	});

	describe('Middleware config', () => {
		it('should export a matcher configuration', () => {
			expect(config).toBeDefined();
			expect(config.matcher).toBeDefined();
			expect(Array.isArray(config.matcher)).toBe(true);
		});

		it('should have matcher that excludes api, _next, _vercel', () => {
			const pattern = config.matcher[0];
			expect(pattern).toContain('api');
			expect(pattern).toContain('_next');
			expect(pattern).toContain('_vercel');
		});
	});

	describe('Response propagation', () => {
		it('should return intl middleware response for public pages', async () => {
			const intlResponse = NextResponse.redirect(new URL('/en/auth/signin', 'http://localhost:3000'));
			mockIntlMiddleware.mockReturnValue(intlResponse);
			const req = createRequest('/auth/signin');
			const result = await middleware(req);
			expect(result).toBe(intlResponse);
		});

		it('should return auth middleware response for protected pages', async () => {
			const authResponse = NextResponse.redirect(new URL('/auth/signin', 'http://localhost:3000'));
			mockAuthMiddleware.mockReturnValue(authResponse);
			const req = createRequest('/dashboard');
			const result = await middleware(req);
			expect(result).toBe(authResponse);
		});
	});

	describe('Onboarding gate', () => {
		it('should redirect creator without onboarded_at to /welcome', async () => {
			mockGetToken.mockResolvedValue({ role: 'user', onboardedAt: null });
			const req = createRequest('/submit');
			const result = await middleware(req);
			expect(result?.headers.get('location')).toBe('http://localhost:3000/welcome');
			expect(mockAuthMiddleware).not.toHaveBeenCalled();
		});

		it('should not redirect when already on /welcome', async () => {
			mockGetToken.mockResolvedValue({ role: 'user', onboardedAt: null });
			const req = createRequest('/welcome');
			await middleware(req);
			expect(mockAuthMiddleware).toHaveBeenCalled();
		});

		it('should not redirect admin without onboarded_at', async () => {
			mockGetToken.mockResolvedValue({ role: 'admin', onboardedAt: null });
			const req = createRequest('/submit');
			await middleware(req);
			expect(mockAuthMiddleware).toHaveBeenCalled();
		});

		it('should not redirect creator who has completed onboarding', async () => {
			mockGetToken.mockResolvedValue({ role: 'user', onboardedAt: Date.now() });
			const req = createRequest('/submit');
			await middleware(req);
			expect(mockAuthMiddleware).toHaveBeenCalled();
		});
	});
});
