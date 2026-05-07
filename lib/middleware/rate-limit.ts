import { NextRequest, NextResponse } from 'next/server';
import type IORedis from 'ioredis';

/**
 * Per-instance in-memory rate-limit store.
 *
 * NOTE (P1-2): On Vercel serverless this Map is NOT shared across lambda
 * instances, so a global limit of N is effectively `N × concurrent_lambdas`.
 * It is still useful as a per-instance burst guard and as a fallback when
 * Redis is unreachable. For true cross-instance limiting, set REDIS_URL
 * (Upstash, Vercel KV, or self-hosted Redis) — the limiter will then use
 * an atomic INCR + EXPIRE script.
 */
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

export interface RateLimitConfig {
	limit: number; // Max requests
	windowMs: number; // Time window in milliseconds
	/** Optional extra key (e.g. user id) appended to the IP bucket. */
	key?: string;
}

export interface RateLimitResult {
	isRateLimited: boolean;
	remaining: number;
	reset: number;
	response?: NextResponse;
}

function getClientKey(req: NextRequest, extraKey?: string): string {
	const ip =
		req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
		req.headers.get('x-real-ip') ||
		'anonymous';
	return extraKey ? `${ip}:${extraKey}` : ip;
}

function buildLimitedResponse(
	resetTime: number,
	now: number,
): NextResponse {
	return new NextResponse(
		JSON.stringify({
			error: 'Too many requests',
			message: 'Rate limit exceeded. Please try again later.',
		}),
		{
			status: 429,
			headers: {
				'Content-Type': 'application/json',
				'Retry-After': Math.ceil((resetTime - now) / 1000).toString(),
			},
		},
	);
}

/**
 * Synchronous in-memory rate limiter. Backwards-compatible with all existing
 * callers. Per-instance only — see module note above.
 */
export function rateLimiter(
	req: NextRequest,
	config: RateLimitConfig,
): RateLimitResult {
	const key = getClientKey(req, config.key);
	const now = Date.now();

	const record = rateLimitStore.get(key) || {
		count: 0,
		resetTime: now + config.windowMs,
	};

	if (now > record.resetTime) {
		record.count = 1;
		record.resetTime = now + config.windowMs;
	} else {
		record.count++;
	}

	rateLimitStore.set(key, record);

	if (record.count > config.limit) {
		return {
			isRateLimited: true,
			remaining: 0,
			reset: record.resetTime,
			response: buildLimitedResponse(record.resetTime, now),
		};
	}

	return {
		isRateLimited: false,
		remaining: config.limit - record.count,
		reset: record.resetTime,
	};
}

// --- Redis-backed limiter (cross-instance) ----------------------------------

let cachedRedis: IORedis | null = null;
let redisDisabled = false;

async function getRedis(): Promise<IORedis | null> {
	if (redisDisabled) return null;
	if (cachedRedis) return cachedRedis;
	if (!process.env.REDIS_URL) {
		// No Redis configured — silently fall back to in-memory.
		redisDisabled = true;
		return null;
	}
	try {
		const { createRedisConnection } = await import('@/lib/queue/redis');
		const client = createRedisConnection();
		await client.connect();
		cachedRedis = client;
		return client;
	} catch (err) {
		// Connection failed — disable for the lifetime of this lambda
		// to avoid hammering a broken Redis on every request.
		console.warn(
			'[rate-limit] Redis unavailable, falling back to in-memory:',
			err instanceof Error ? err.message : String(err),
		);
		redisDisabled = true;
		return null;
	}
}

/**
 * Async cross-instance rate limiter. Uses Redis INCR with EXPIRE for atomic
 * cross-lambda counting; falls back to the in-memory limiter when Redis is
 * unavailable. Prefer this for security-sensitive endpoints (auth, OAuth,
 * token extension) where per-instance leakage matters.
 */
export async function rateLimitRequest(
	req: NextRequest,
	config: RateLimitConfig,
): Promise<RateLimitResult> {
	const redis = await getRedis();
	if (!redis) {
		return rateLimiter(req, config);
	}

	const key = `rl:${getClientKey(req, config.key)}:${config.windowMs}`;
	const now = Date.now();

	try {
		// Atomic: increment, then set TTL only on first hit.
		const count = await redis.incr(key);
		if (count === 1) {
			// PX = expire in ms; use NX-equivalent semantics by only setting on
			// first call so the window doesn't slide on each request.
			await redis.pexpire(key, config.windowMs);
		}
		const ttlMs = await redis.pttl(key);
		const reset = now + (ttlMs > 0 ? ttlMs : config.windowMs);

		if (count > config.limit) {
			return {
				isRateLimited: true,
				remaining: 0,
				reset,
				response: buildLimitedResponse(reset, now),
			};
		}
		return {
			isRateLimited: false,
			remaining: Math.max(0, config.limit - count),
			reset,
		};
	} catch (err) {
		console.warn(
			'[rate-limit] Redis op failed, falling back to in-memory:',
			err instanceof Error ? err.message : String(err),
		);
		return rateLimiter(req, config);
	}
}

/** Test-only helpers. Not exported via index — call by full path in tests. */
export function __resetRateLimitState(): void {
	rateLimitStore.clear();
	if (cachedRedis) {
		try {
			cachedRedis.disconnect();
		} catch {
			/* ignore */
		}
	}
	cachedRedis = null;
	redisDisabled = false;
}
