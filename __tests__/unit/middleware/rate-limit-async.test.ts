/**
 * Tests for the async, Redis-aware rate limiter and its application to
 * sensitive auth endpoints (P1-2).
 *
 * We explicitly do NOT set REDIS_URL here so the limiter falls back to its
 * in-memory implementation — that path is what protects every lambda
 * instance even when KV/Upstash isn't provisioned.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import {
	rateLimitRequest,
	__resetRateLimitState,
} from '@/lib/middleware/rate-limit';

function reqWithIp(ip: string): NextRequest {
	return new NextRequest(new URL('http://localhost:3000/api/extend-token'), {
		method: 'POST',
		headers: { 'x-forwarded-for': ip },
	});
}

describe('rateLimitRequest (async, fallback path)', () => {
	beforeEach(() => {
		__resetRateLimitState();
		delete process.env.REDIS_URL;
	});

	it('allows requests under the limit', async () => {
		const result = await rateLimitRequest(reqWithIp('1.1.1.1'), {
			limit: 3,
			windowMs: 60_000,
		});
		expect(result.isRateLimited).toBe(false);
		expect(result.remaining).toBe(2);
	});

	it('returns 429 once the limit is exceeded', async () => {
		const cfg = { limit: 2, windowMs: 60_000 };
		await rateLimitRequest(reqWithIp('2.2.2.2'), cfg);
		await rateLimitRequest(reqWithIp('2.2.2.2'), cfg);
		const result = await rateLimitRequest(reqWithIp('2.2.2.2'), cfg);
		expect(result.isRateLimited).toBe(true);
		expect(result.response?.status).toBe(429);
		const body = await result.response!.json();
		expect(body.error).toBe('Too many requests');
	});

	it('keys per (IP + extra key) so different users on the same IP are isolated', async () => {
		const cfg = { limit: 1, windowMs: 60_000 };
		await rateLimitRequest(reqWithIp('3.3.3.3'), { ...cfg, key: 'user:a' });
		// same IP, different user — should still be allowed
		const second = await rateLimitRequest(reqWithIp('3.3.3.3'), {
			...cfg,
			key: 'user:b',
		});
		expect(second.isRateLimited).toBe(false);
		// same IP + same user — now blocked
		const third = await rateLimitRequest(reqWithIp('3.3.3.3'), {
			...cfg,
			key: 'user:a',
		});
		expect(third.isRateLimited).toBe(true);
	});
});

// Smoke-test the actual /api/extend-token handler to prove the limiter
// is wired to a real auth endpoint (closes the gap called out in P1-2).
describe('/api/extend-token rate limiting', () => {
	beforeEach(() => {
		vi.resetModules();
		__resetRateLimitState();
		delete process.env.REDIS_URL;
	});

	it('returns 429 after exceeding the per-user limit', async () => {
		// Mock just enough of the auth + DB layer that the route can run.
		vi.doMock('next-auth/next', () => ({
			getServerSession: vi
				.fn()
				.mockResolvedValue({ user: { id: 'user-extend-1', role: 'user' } }),
		}));
		vi.doMock('@/lib/auth', () => ({ authOptions: {} }));
		vi.doMock('@/lib/preview-guard', () => ({
			preventWriteForDemo: () => null,
		}));
		// Force the linked-account lookup to fail FAST so we never reach the
		// real Meta call. The 400 short-circuit happens AFTER the rate-limit
		// check, which is exactly what we want to exercise.
		vi.doMock('@/lib/database/linked-accounts', () => ({
			getLinkedFacebookAccount: vi.fn().mockResolvedValue(null),
			saveLinkedFacebookAccount: vi.fn(),
		}));

		const { POST } = await import('@/app/api/extend-token/route');

		// Burn through the limit (10/min) — all should return 400 (no account).
		for (let i = 0; i < 10; i++) {
			const res = await POST(reqWithIp('9.9.9.9') as never);
			expect(res.status).toBe(400);
		}
		// 11th hit should be rate-limited regardless of downstream state.
		const limited = await POST(reqWithIp('9.9.9.9') as never);
		expect(limited.status).toBe(429);
	});
});
