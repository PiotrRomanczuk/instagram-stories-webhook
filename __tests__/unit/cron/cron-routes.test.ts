/**
 * Unit tests for all 5 cron API route handlers (INS-10).
 *
 * Each route shares a common auth pattern:
 *   1. Reject when CRON_SECRET is not configured (500)
 *   2. Reject when Authorization header is missing / wrong (401)
 *   3. Skip when cron is disabled via DISABLE_CRON or preview env (200, skipped)
 *   4. Return success on the happy path
 *   5. Return 500 on unexpected errors
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

// ---------------------------------------------------------------------------
// Mocks — declared before any route imports so hoisting works correctly
// ---------------------------------------------------------------------------

vi.mock('@/lib/scheduler/process-service', () => ({
	processScheduledPosts: vi.fn(),
}));

vi.mock('@/lib/scheduler/cron-lock', () => ({
	acquireCronLock: vi.fn(),
	releaseCronLock: vi.fn(),
}));

vi.mock('@/lib/scheduler/identity-service', () => ({
	runIdentityAudit: vi.fn(),
}));

vi.mock('@/lib/jobs/process-videos', () => ({
	processVideosQueue: vi.fn(),
	cleanupOldProcessedVideos: vi.fn(),
}));

vi.mock('@/lib/storage/cleanup', () => ({
	cleanupOrphanedUploads: vi.fn(),
}));

vi.mock('@/lib/services/token-refresh-service', () => ({
	refreshAllTokens: vi.fn(),
}));

vi.mock('@/lib/utils/logger', () => ({
	Logger: {
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
		debug: vi.fn(),
	},
}));

vi.mock('@/lib/config/supabase-admin', () => {
	// Build a chainable mock that satisfies the cron lock DB calls.
	// insert/update/delete chains must resolve without error so that
	// acquireVideoLock() returns true (lock acquired) in the happy path.
	const chainable: Record<string, unknown> = {};
	const terminal = { error: null, data: { lock_name: 'process-videos' } };
	const terminalPromise = Promise.resolve(terminal);
	const makeChain = (): Record<string, unknown> => {
		const c: Record<string, unknown> = {};
		['eq', 'lt', 'neq', 'select', 'maybeSingle', 'single', 'order', 'limit', 'upsert', 'update', 'delete', 'insert', 'from'].forEach(m => {
			Object.defineProperty(c, m, { get: () => (..._args: unknown[]) => makeChain() });
		});
		// Make it thenable so awaiting resolves to terminal
		c['then'] = (resolve: (v: typeof terminal) => unknown) => terminalPromise.then(resolve);
		c['catch'] = (reject: (e: unknown) => unknown) => terminalPromise.catch(reject);
		return c;
	};
	void chainable;
	return {
		supabaseAdmin: {
			from: () => makeChain(),
		},
	};
});

// ---------------------------------------------------------------------------
// Imports — after mocks
// ---------------------------------------------------------------------------

import { GET as processRoute } from '@/app/api/cron/process/route';
import { GET as identityAuditRoute } from '@/app/api/cron/identity-audit/route';
import { GET as processVideosRoute } from '@/app/api/cron/process-videos/route';
import { GET as cleanupOrphansRoute } from '@/app/api/cron/cleanup-orphans/route';
import { GET as tokenRefreshRoute } from '@/app/api/schedule/refresh-token/route';

import { processScheduledPosts } from '@/lib/scheduler/process-service';
import { acquireCronLock, releaseCronLock } from '@/lib/scheduler/cron-lock';
import { runIdentityAudit } from '@/lib/scheduler/identity-service';
import { processVideosQueue, cleanupOldProcessedVideos } from '@/lib/jobs/process-videos';
import { cleanupOrphanedUploads } from '@/lib/storage/cleanup';
import { refreshAllTokens } from '@/lib/services/token-refresh-service';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const CRON_SECRET = 'test-cron-secret-abc123';

function makeRequest(bearer?: string): NextRequest {
	const headers: Record<string, string> = {};
	if (bearer !== undefined) {
		headers['authorization'] = bearer;
	}
	return new NextRequest('http://localhost:3000/api/cron/test', { headers });
}

function authedRequest(): NextRequest {
	return makeRequest(`Bearer ${CRON_SECRET}`);
}

// ---------------------------------------------------------------------------
// Shared env management
// ---------------------------------------------------------------------------

const originalEnv = { ...process.env };

beforeEach(() => {
	vi.clearAllMocks();
	process.env.CRON_SECRET = CRON_SECRET;
	delete process.env.DISABLE_CRON;
	delete process.env.VERCEL_ENV;
	delete process.env.STAGING_MODE;
});

afterEach(() => {
	process.env = { ...originalEnv };
});

// ============================================================================
// 1. /api/cron/process
// ============================================================================

describe('GET /api/cron/process', () => {
	beforeEach(() => {
		vi.mocked(acquireCronLock).mockResolvedValue(true);
		vi.mocked(releaseCronLock).mockResolvedValue(undefined);
		vi.mocked(processScheduledPosts).mockResolvedValue({
			processed: 1,
			succeeded: 1,
			failed: 0,
			results: [],
			message: 'ok',
		} as never);
	});

	it('returns 500 when CRON_SECRET is not configured', async () => {
		delete process.env.CRON_SECRET;
		const res = await processRoute(authedRequest());
		expect(res.status).toBe(500);
		const body = await res.json();
		expect(body.error).toMatch(/misconfiguration/i);
	});

	it('returns 401 when authorization header is missing', async () => {
		const res = await processRoute(makeRequest());
		expect(res.status).toBe(401);
	});

	it('returns 401 when authorization header is wrong', async () => {
		const res = await processRoute(makeRequest('Bearer wrong-secret'));
		expect(res.status).toBe(401);
	});

	it('skips when DISABLE_CRON is true', async () => {
		process.env.DISABLE_CRON = 'true';
		const res = await processRoute(authedRequest());
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.skipped).toBe(true);
	});

	it('skips on preview deployment without STAGING_MODE', async () => {
		process.env.VERCEL_ENV = 'preview';
		const res = await processRoute(authedRequest());
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.skipped).toBe(true);
	});

	it('does NOT skip on preview when STAGING_MODE is true', async () => {
		process.env.VERCEL_ENV = 'preview';
		process.env.STAGING_MODE = 'true';
		const res = await processRoute(authedRequest());
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.skipped).toBeUndefined();
	});

	it('skips when cron lock cannot be acquired', async () => {
		vi.mocked(acquireCronLock).mockResolvedValue(false);
		const res = await processRoute(authedRequest());
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.skipped).toBe(true);
		expect(processScheduledPosts).not.toHaveBeenCalled();
	});

	it('processes scheduled posts on success', async () => {
		const res = await processRoute(authedRequest());
		expect(res.status).toBe(200);
		expect(processScheduledPosts).toHaveBeenCalledOnce();
		expect(acquireCronLock).toHaveBeenCalledOnce();
	});

	it('releases cron lock after success', async () => {
		await processRoute(authedRequest());
		expect(releaseCronLock).toHaveBeenCalledOnce();
	});

	it('releases cron lock even when processing throws', async () => {
		vi.mocked(processScheduledPosts).mockRejectedValue(new Error('DB down'));
		const res = await processRoute(authedRequest());
		expect(res.status).toBe(500);
		expect(releaseCronLock).toHaveBeenCalledOnce();
	});

	it('returns 500 when processScheduledPosts throws', async () => {
		vi.mocked(processScheduledPosts).mockRejectedValue(new Error('Unexpected'));
		const res = await processRoute(authedRequest());
		expect(res.status).toBe(500);
		const body = await res.json();
		expect(body.error).toBeDefined();
	});
});

// ============================================================================
// 2. /api/cron/identity-audit
// ============================================================================

describe('GET /api/cron/identity-audit', () => {
	beforeEach(() => {
		vi.mocked(runIdentityAudit).mockResolvedValue({
			success: true,
			results: ['audit line 1'],
		});
	});

	it('returns 500 when CRON_SECRET is not configured', async () => {
		delete process.env.CRON_SECRET;
		const res = await identityAuditRoute(authedRequest());
		expect(res.status).toBe(500);
	});

	it('returns 401 when authorization is missing', async () => {
		const res = await identityAuditRoute(makeRequest());
		expect(res.status).toBe(401);
	});

	it('returns 401 when authorization is wrong', async () => {
		const res = await identityAuditRoute(makeRequest('Bearer bad'));
		expect(res.status).toBe(401);
	});

	it('skips when DISABLE_CRON is true', async () => {
		process.env.DISABLE_CRON = 'true';
		const res = await identityAuditRoute(authedRequest());
		const body = await res.json();
		expect(body.skipped).toBe(true);
	});

	it('skips on preview without STAGING_MODE', async () => {
		process.env.VERCEL_ENV = 'preview';
		const res = await identityAuditRoute(authedRequest());
		const body = await res.json();
		expect(body.skipped).toBe(true);
	});

	it('runs identity audit on success', async () => {
		const res = await identityAuditRoute(authedRequest());
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.success).toBe(true);
		expect(runIdentityAudit).toHaveBeenCalledOnce();
	});

	it('returns 500 when audit throws', async () => {
		vi.mocked(runIdentityAudit).mockRejectedValue(new Error('DB error'));
		const res = await identityAuditRoute(authedRequest());
		expect(res.status).toBe(500);
		const body = await res.json();
		expect(body.error).toBeDefined();
	});
});

// ============================================================================
// 3. /api/cron/process-videos
// ============================================================================

describe('GET /api/cron/process-videos', () => {
	beforeEach(() => {
		vi.mocked(processVideosQueue).mockResolvedValue({
			totalQueued: 2,
			processed: 2,
			failed: 0,
			skipped: 0,
			errors: [],
		});
		vi.mocked(cleanupOldProcessedVideos).mockResolvedValue(0);
	});

	it('returns 500 when CRON_SECRET is not configured', async () => {
		delete process.env.CRON_SECRET;
		const res = await processVideosRoute(authedRequest());
		expect(res.status).toBe(500);
	});

	it('returns 401 when authorization is missing', async () => {
		const res = await processVideosRoute(makeRequest());
		expect(res.status).toBe(401);
	});

	it('returns 401 when authorization is wrong', async () => {
		const res = await processVideosRoute(makeRequest('Bearer nope'));
		expect(res.status).toBe(401);
	});

	it('skips when DISABLE_CRON is true', async () => {
		process.env.DISABLE_CRON = 'true';
		const res = await processVideosRoute(authedRequest());
		const body = await res.json();
		expect(body.skipped).toBe(true);
	});

	it('skips on preview without STAGING_MODE', async () => {
		process.env.VERCEL_ENV = 'preview';
		const res = await processVideosRoute(authedRequest());
		const body = await res.json();
		expect(body.skipped).toBe(true);
	});

	it('processes videos and runs cleanup on success', async () => {
		const res = await processVideosRoute(authedRequest());
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.success).toBe(true);
		expect(body.totalQueued).toBe(2);
		expect(body.processed).toBe(2);
		expect(body.cleanedUp).toBe(0);
		expect(body.timestamp).toBeDefined();
		expect(processVideosQueue).toHaveBeenCalledOnce();
		expect(cleanupOldProcessedVideos).toHaveBeenCalledOnce();
	});

	it('returns 500 when processVideosQueue throws', async () => {
		vi.mocked(processVideosQueue).mockRejectedValue(new Error('FFmpeg crashed'));
		const res = await processVideosRoute(authedRequest());
		expect(res.status).toBe(500);
		const body = await res.json();
		expect(body.error).toBeDefined();
		expect(body.message).toBe('FFmpeg crashed');
	});

	it('returns 500 when cleanup throws', async () => {
		vi.mocked(cleanupOldProcessedVideos).mockRejectedValue(new Error('Storage down'));
		const res = await processVideosRoute(authedRequest());
		expect(res.status).toBe(500);
		const body = await res.json();
		expect(body.message).toBe('Storage down');
	});
});

// ============================================================================
// 4. /api/cron/cleanup-orphans
// ============================================================================

describe('GET /api/cron/cleanup-orphans', () => {
	beforeEach(() => {
		vi.mocked(cleanupOrphanedUploads).mockResolvedValue({
			deletedCount: 3,
			errors: [],
		});
	});

	it('returns 500 when CRON_SECRET is not configured', async () => {
		delete process.env.CRON_SECRET;
		const res = await cleanupOrphansRoute(authedRequest());
		expect(res.status).toBe(500);
	});

	it('returns 401 when authorization is missing', async () => {
		const res = await cleanupOrphansRoute(makeRequest());
		expect(res.status).toBe(401);
	});

	it('returns 401 when authorization is wrong', async () => {
		const res = await cleanupOrphansRoute(makeRequest('Bearer wrong'));
		expect(res.status).toBe(401);
	});

	it('runs cleanup and returns results on success', async () => {
		const res = await cleanupOrphansRoute(authedRequest());
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.success).toBe(true);
		expect(body.deletedCount).toBe(3);
		expect(cleanupOrphanedUploads).toHaveBeenCalledOnce();
	});

	it('returns 500 when cleanup throws', async () => {
		vi.mocked(cleanupOrphanedUploads).mockRejectedValue(new Error('Supabase error'));
		const res = await cleanupOrphansRoute(authedRequest());
		expect(res.status).toBe(500);
		const body = await res.json();
		expect(body.error).toBeDefined();
	});
});

// ============================================================================
// 5. /api/schedule/refresh-token
// ============================================================================

describe('GET /api/schedule/refresh-token', () => {
	const mockSummary = {
		totalAccounts: 5,
		refreshed: 3,
		skipped: 1,
		failed: 1,
		results: [],
	};

	beforeEach(() => {
		vi.mocked(refreshAllTokens).mockResolvedValue(mockSummary);
	});

	it('returns 500 when CRON_SECRET is not configured', async () => {
		delete process.env.CRON_SECRET;
		const res = await tokenRefreshRoute(authedRequest());
		expect(res.status).toBe(500);
		const body = await res.json();
		expect(body.error).toMatch(/CRON_SECRET/);
	});

	it('returns 401 when authorization is missing', async () => {
		const res = await tokenRefreshRoute(makeRequest());
		expect(res.status).toBe(401);
	});

	it('returns 401 when authorization is wrong', async () => {
		const res = await tokenRefreshRoute(makeRequest('Bearer invalid'));
		expect(res.status).toBe(401);
	});

	it('skips when DISABLE_CRON is true', async () => {
		process.env.DISABLE_CRON = 'true';
		const res = await tokenRefreshRoute(authedRequest());
		const body = await res.json();
		expect(body.skipped).toBe(true);
	});

	it('skips on preview without STAGING_MODE', async () => {
		process.env.VERCEL_ENV = 'preview';
		const res = await tokenRefreshRoute(authedRequest());
		const body = await res.json();
		expect(body.skipped).toBe(true);
	});

	it('refreshes tokens and returns summary on success', async () => {
		const res = await tokenRefreshRoute(authedRequest());
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.totalAccounts).toBe(5);
		expect(body.refreshed).toBe(3);
		expect(body.skipped).toBe(1);
		expect(body.failed).toBe(1);
		expect(body.message).toContain('3/5');
		expect(refreshAllTokens).toHaveBeenCalledOnce();
	});

	it('returns 500 when all tokens fail and none refreshed', async () => {
		vi.mocked(refreshAllTokens).mockResolvedValue({
			totalAccounts: 2,
			refreshed: 0,
			skipped: 0,
			failed: 2,
			results: [],
		});
		const res = await tokenRefreshRoute(authedRequest());
		expect(res.status).toBe(500);
	});

	it('returns 200 when some tokens refreshed even with failures', async () => {
		vi.mocked(refreshAllTokens).mockResolvedValue({
			totalAccounts: 3,
			refreshed: 1,
			skipped: 0,
			failed: 2,
			results: [],
		});
		const res = await tokenRefreshRoute(authedRequest());
		expect(res.status).toBe(200);
	});
});
