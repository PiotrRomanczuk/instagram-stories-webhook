/**
 * Unit tests for rate-limit middleware (BMS-152)
 * Tests rate limiting enforcement, window resets, and response format.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { rateLimiter } from '@/lib/middleware/rate-limit';

function createRequestWithIp(ip: string): NextRequest {
	return new NextRequest(new URL('http://localhost:3000/api/test'), {
		headers: { 'x-forwarded-for': ip },
	});
}

describe('rateLimiter', () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('should allow requests under the limit', () => {
		const req = createRequestWithIp('192.168.1.100');
		const result = rateLimiter(req, { limit: 5, windowMs: 60000 });
		expect(result.isRateLimited).toBe(false);
		expect(result.remaining).toBe(4);
	});

	it('should track requests incrementally', () => {
		const config = { limit: 3, windowMs: 60000 };
		const result1 = rateLimiter(createRequestWithIp('10.0.0.1'), config);
		expect(result1.remaining).toBe(2);
		const result2 = rateLimiter(createRequestWithIp('10.0.0.1'), config);
		expect(result2.remaining).toBe(1);
		const result3 = rateLimiter(createRequestWithIp('10.0.0.1'), config);
		expect(result3.remaining).toBe(0);
	});

	it('should rate limit when exceeding the limit', () => {
		const config = { limit: 2, windowMs: 60000 };
		rateLimiter(createRequestWithIp('10.0.0.2'), config);
		rateLimiter(createRequestWithIp('10.0.0.2'), config);
		const result = rateLimiter(createRequestWithIp('10.0.0.2'), config);
		expect(result.isRateLimited).toBe(true);
		expect(result.remaining).toBe(0);
		expect(result.response).toBeDefined();
	});

	it('should return 429 response with correct headers when rate limited', async () => {
		const config = { limit: 1, windowMs: 60000 };
		rateLimiter(createRequestWithIp('10.0.0.3'), config);
		const result = rateLimiter(createRequestWithIp('10.0.0.3'), config);
		expect(result.response!.status).toBe(429);
		const body = await result.response!.json();
		expect(body.error).toBe('Too many requests');
		const retryAfter = result.response!.headers.get('Retry-After');
		expect(Number(retryAfter)).toBeGreaterThan(0);
	});

	it('should track different IPs independently', () => {
		const config = { limit: 1, windowMs: 60000 };
		expect(rateLimiter(createRequestWithIp('10.0.0.10'), config).isRateLimited).toBe(false);
		expect(rateLimiter(createRequestWithIp('10.0.0.20'), config).isRateLimited).toBe(false);
		expect(rateLimiter(createRequestWithIp('10.0.0.10'), config).isRateLimited).toBe(true);
		expect(rateLimiter(createRequestWithIp('10.0.0.20'), config).isRateLimited).toBe(true);
	});

	it('should reset count after window expires', () => {
		const config = { limit: 1, windowMs: 10000 };
		rateLimiter(createRequestWithIp('10.0.0.30'), config);
		expect(rateLimiter(createRequestWithIp('10.0.0.30'), config).isRateLimited).toBe(true);
		vi.advanceTimersByTime(11000);
		expect(rateLimiter(createRequestWithIp('10.0.0.30'), config).isRateLimited).toBe(false);
	});

	it('should use "anonymous" for requests without x-forwarded-for', () => {
		const req = new NextRequest(new URL('http://localhost:3000/api/test'));
		const result = rateLimiter(req, { limit: 5, windowMs: 60000 });
		expect(result.isRateLimited).toBe(false);
	});

	it('should include reset timestamp in result', () => {
		const now = Date.now();
		vi.setSystemTime(now);
		const result = rateLimiter(createRequestWithIp('10.0.0.40'), { limit: 10, windowMs: 60000 });
		expect(result.reset).toBeGreaterThanOrEqual(now);
		expect(result.reset).toBeLessThanOrEqual(now + 60000);
	});
});
