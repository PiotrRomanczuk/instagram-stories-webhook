import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/scheduler/cron-lock', () => ({
    acquireCronLock: vi.fn(),
    releaseCronLock: vi.fn(),
}));
vi.mock('@/lib/utils/logger', () => ({
    Logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import { createCronHandler } from '@/lib/scheduler/cron-handler';
import { acquireCronLock, releaseCronLock } from '@/lib/scheduler/cron-lock';

const SECRET = 'test-secret';

function makeReq(bearer?: string): NextRequest {
    const headers: Record<string, string> = {};
    if (bearer !== undefined) headers['authorization'] = bearer;
    return new NextRequest('http://localhost/api/cron/test', { headers });
}
const authed = () => makeReq(`Bearer ${SECRET}`);

const originalEnv = { ...process.env };

beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = SECRET;
    delete process.env.DISABLE_CRON;
    delete process.env.VERCEL_ENV;
    delete process.env.STAGING_MODE;
    vi.mocked(acquireCronLock).mockResolvedValue(true);
    vi.mocked(releaseCronLock).mockResolvedValue(undefined);
});

afterEach(() => {
    process.env = { ...originalEnv };
});

describe('createCronHandler', () => {
    it('returns 500 with misconfiguration when CRON_SECRET is unset', async () => {
        delete process.env.CRON_SECRET;
        const fn = vi.fn();
        const handler = createCronHandler({ module: 'test' }, fn);

        const res = await handler(authed());

        expect(res.status).toBe(500);
        const body = await res.json();
        expect(body.error).toMatch(/misconfiguration/i);
        expect(fn).not.toHaveBeenCalled();
    });

    it('returns 401 when authorization is missing or wrong', async () => {
        const fn = vi.fn();
        const handler = createCronHandler({ module: 'test' }, fn);

        expect((await handler(makeReq())).status).toBe(401);
        expect((await handler(makeReq('Bearer wrong'))).status).toBe(401);
        expect(fn).not.toHaveBeenCalled();
    });

    it('skips with body.skipped when DISABLE_CRON is true', async () => {
        process.env.DISABLE_CRON = 'true';
        const fn = vi.fn();
        const handler = createCronHandler({ module: 'test' }, fn);

        const res = await handler(authed());
        const body = await res.json();
        expect(body.skipped).toBe(true);
        expect(fn).not.toHaveBeenCalled();
    });

    it('skips on preview without STAGING_MODE by default', async () => {
        process.env.VERCEL_ENV = 'preview';
        const fn = vi.fn();
        const handler = createCronHandler({ module: 'test' }, fn);

        const res = await handler(authed());
        const body = await res.json();
        expect(body.skipped).toBe(true);
    });

    it('honors skipOnPreview=false (does not skip on preview)', async () => {
        process.env.VERCEL_ENV = 'preview';
        const fn = vi.fn().mockResolvedValue({ ok: true });
        const handler = createCronHandler({ module: 'test', skipOnPreview: false }, fn);

        const res = await handler(authed());
        expect(res.status).toBe(200);
        expect(fn).toHaveBeenCalled();
    });

    it('respects envKillSwitch when not set to "true"', async () => {
        process.env.MY_FLAG = 'false';
        const fn = vi.fn();
        const handler = createCronHandler(
            { module: 'test', envKillSwitch: 'MY_FLAG', envKillSwitchSkippedMessage: 'flag off' },
            fn,
        );

        const res = await handler(authed());
        const body = await res.json();
        expect(body.skipped).toBe(true);
        expect(body.message).toBe('flag off');
        expect(fn).not.toHaveBeenCalled();
    });

    it('skips when lock cannot be acquired and does not release', async () => {
        vi.mocked(acquireCronLock).mockResolvedValue(false);
        const fn = vi.fn();
        const handler = createCronHandler({ module: 'test', lockName: 'test-lock' }, fn);

        const res = await handler(authed());
        const body = await res.json();
        expect(body.skipped).toBe(true);
        expect(fn).not.toHaveBeenCalled();
        expect(releaseCronLock).not.toHaveBeenCalled();
    });

    it('passes through the fn body on success and stamps 200', async () => {
        const fn = vi.fn().mockResolvedValue({ totalProcessed: 7, items: ['a', 'b'] });
        const handler = createCronHandler({ module: 'test', lockName: 'L' }, fn);

        const res = await handler(authed());
        expect(res.status).toBe(200);
        expect(await res.json()).toEqual({ totalProcessed: 7, items: ['a', 'b'] });
        expect(acquireCronLock).toHaveBeenCalledWith('L', undefined);
        expect(releaseCronLock).toHaveBeenCalledWith('L');
    });

    it('wraps errors as 500 and preserves error message', async () => {
        const fn = vi.fn().mockRejectedValue(new Error('something broke'));
        const handler = createCronHandler({ module: 'test', lockName: 'L' }, fn);

        const res = await handler(authed());
        expect(res.status).toBe(500);
        const body = await res.json();
        expect(body.error).toBeDefined();
        expect(body.message).toBe('something broke');
        expect(releaseCronLock).toHaveBeenCalledWith('L');
    });

    it('invokes onError callback when fn throws', async () => {
        const onError = vi.fn();
        const fn = vi.fn().mockRejectedValue(new Error('boom'));
        const handler = createCronHandler({ module: 'test', onError }, fn);

        await handler(authed());
        expect(onError).toHaveBeenCalledOnce();
        expect(onError.mock.calls[0][0]).toBeInstanceOf(Error);
    });

    it('forwards lockTimeoutMs to acquireCronLock', async () => {
        const fn = vi.fn().mockResolvedValue({});
        const handler = createCronHandler(
            { module: 'test', lockName: 'L', lockTimeoutMs: 600_000 },
            fn,
        );

        await handler(authed());
        expect(acquireCronLock).toHaveBeenCalledWith('L', 600_000);
    });
});
