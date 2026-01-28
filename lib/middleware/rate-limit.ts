import { NextRequest, NextResponse } from 'next/server';

// Simple in-memory rate limit store
// Note: This is per-instance and won't be perfectly shared in serverless environments,
// but it provides a basic level of protection against simple flood attacks.
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

export interface RateLimitConfig {
	limit: number; // Max requests
	windowMs: number; // Time window in milliseconds
}

export function rateLimiter(req: NextRequest, config: RateLimitConfig) {
	const ip = req.headers.get('x-forwarded-for') || 'anonymous';
	const now = Date.now();

	const record = rateLimitStore.get(ip) || {
		count: 0,
		resetTime: now + config.windowMs,
	};

	if (now > record.resetTime) {
		record.count = 1;
		record.resetTime = now + config.windowMs;
	} else {
		record.count++;
	}

	rateLimitStore.set(ip, record);

	if (record.count > config.limit) {
		return {
			isRateLimited: true,
			remaining: 0,
			reset: record.resetTime,
			response: new NextResponse(
				JSON.stringify({
					error: 'Too many requests',
					message: 'Rate limit exceeded. Please try again later.',
				}),
				{
					status: 429,
					headers: {
						'Content-Type': 'application/json',
						'Retry-After': Math.ceil(
							(record.resetTime - now) / 1000,
						).toString(),
					},
				},
			),
		};
	}

	return {
		isRateLimited: false,
		remaining: config.limit - record.count,
		reset: record.resetTime,
	};
}
