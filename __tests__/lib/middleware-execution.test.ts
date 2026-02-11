/**
 * Middleware execution tests (BMS-153)
 * Tests actual middleware request/response cycle, not just regex patterns.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

const { mockIntlMiddleware, mockAuthMiddleware } = vi.hoisted(() => ({
	mockIntlMiddleware: vi.fn(),
	mockAuthMiddleware: vi.fn(),
}));

vi.mock('next-intl/middleware', () => ({
	default: vi.fn(() => mockIntlMiddleware),
}));

vi.mock('@/i18n/routing', () => ({
	routing: { locales: ['en', 'pl'], defaultLocale: 'en' },
}));

vi.mock('next-auth/middleware', () => ({
	withAuth: vi.fn((_onSuccess: unknown, _options: unknown) => mockAuthMiddleware),
}));

import middleware, { config } from '@/middleware';

function createRequest(url: string): NextRequest {
	return new NextRequest(new URL(url, 'http://localhost:3000'));
}

describe('Middleware Execution', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockIntlMiddleware.mockReturnValue(NextResponse.next());
		mockAuthMiddleware.mockReturnValue(NextResponse.next());
	});

	describe('Public pages (auth routes)', () => {
		it('should route /auth/signin through intl middleware (no auth required)', () => {
			const req = createRequest('/auth/signin');
			middleware(req);
			expect(mockIntlMiddleware).toHaveBeenCalledWith(req);
			expect(mockAuthMiddleware).not.toHaveBeenCalled();
		});

		it('should route /auth/signout through intl middleware', () => {
			const req = createRequest('/auth/signout');
			middleware(req);
			expect(mockIntlMiddleware).toHaveBeenCalledWith(req);
			expect(mockAuthMiddleware).not.toHaveBeenCalled();
		});

		it('should route /en/auth/signin through intl middleware (with locale)', () => {
			const req = createRequest('/en/auth/signin');
			middleware(req);
			expect(mockIntlMiddleware).toHaveBeenCalledWith(req);
			expect(mockAuthMiddleware).not.toHaveBeenCalled();
		});

		it('should route /pl/auth/signin through intl middleware (pl locale)', () => {
			const req = createRequest('/pl/auth/signin');
			middleware(req);
			expect(mockIntlMiddleware).toHaveBeenCalledWith(req);
			expect(mockAuthMiddleware).not.toHaveBeenCalled();
		});

		it('should route /auth/callback/google through intl middleware', () => {
			const req = createRequest('/auth/callback/google');
			middleware(req);
			expect(mockIntlMiddleware).toHaveBeenCalledWith(req);
			expect(mockAuthMiddleware).not.toHaveBeenCalled();
		});
	});

	describe('Protected pages (require auth)', () => {
		it('should route / through auth middleware', () => {
			const req = createRequest('/');
			middleware(req);
			expect(mockAuthMiddleware).toHaveBeenCalledWith(req);
			expect(mockIntlMiddleware).not.toHaveBeenCalled();
		});

		it('should route /dashboard through auth middleware', () => {
			const req = createRequest('/dashboard');
			middleware(req);
			expect(mockAuthMiddleware).toHaveBeenCalledWith(req);
		});

		it('should route /en/dashboard through auth middleware', () => {
			const req = createRequest('/en/dashboard');
			middleware(req);
			expect(mockAuthMiddleware).toHaveBeenCalledWith(req);
		});

		it('should route /settings through auth middleware', () => {
			const req = createRequest('/settings');
			middleware(req);
			expect(mockAuthMiddleware).toHaveBeenCalledWith(req);
		});

		it('should route /debug through auth middleware', () => {
			const req = createRequest('/debug');
			middleware(req);
			expect(mockAuthMiddleware).toHaveBeenCalledWith(req);
		});
	});

	describe('Edge cases', () => {
		it('should treat unsupported locale /fr/auth/signin as protected', () => {
			const req = createRequest('/fr/auth/signin');
			middleware(req);
			expect(mockAuthMiddleware).toHaveBeenCalledWith(req);
			expect(mockIntlMiddleware).not.toHaveBeenCalled();
		});

		it('should treat /authentication as protected', () => {
			const req = createRequest('/authentication');
			middleware(req);
			expect(mockAuthMiddleware).toHaveBeenCalledWith(req);
		});

		it('should handle case-insensitive auth paths', () => {
			const req = createRequest('/AUTH/signin');
			middleware(req);
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
		it('should return intl middleware response for public pages', () => {
			const intlResponse = NextResponse.redirect(new URL('/en/auth/signin', 'http://localhost:3000'));
			mockIntlMiddleware.mockReturnValue(intlResponse);
			const req = createRequest('/auth/signin');
			const result = middleware(req);
			expect(result).toBe(intlResponse);
		});

		it('should return auth middleware response for protected pages', () => {
			const authResponse = NextResponse.redirect(new URL('/auth/signin', 'http://localhost:3000'));
			mockAuthMiddleware.mockReturnValue(authResponse);
			const req = createRequest('/dashboard');
			const result = middleware(req);
			expect(result).toBe(authResponse);
		});
	});
});
