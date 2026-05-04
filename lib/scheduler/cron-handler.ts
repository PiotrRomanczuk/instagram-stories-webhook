import { NextRequest, NextResponse } from 'next/server';
import { acquireCronLock, releaseCronLock } from './cron-lock';
import { Logger } from '@/lib/utils/logger';

export type CronBody = Record<string, unknown>;

export interface CronHandlerOptions {
    module: string;
    lockName?: string;
    lockTimeoutMs?: number;
    skipOnPreview?: boolean;
    envKillSwitch?: string;
    envKillSwitchSkippedMessage?: string;
    onError?: (err: unknown) => void;
}

const isPreviewWithoutStaging = (): boolean =>
    process.env.VERCEL_ENV === 'preview' && process.env.STAGING_MODE !== 'true';

export function createCronHandler(
    opts: CronHandlerOptions,
    fn: () => Promise<CronBody>,
): (req: NextRequest) => Promise<NextResponse> {
    return async (req: NextRequest) => {
        const cronSecret = process.env.CRON_SECRET;

        if (!cronSecret) {
            await Logger.error(opts.module, 'CRON_SECRET not configured');
            return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
        }

        const authHeader = req.headers.get('authorization');
        if (authHeader !== `Bearer ${cronSecret}`) {
            await Logger.warn(opts.module, 'Unauthorized cron request');
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const skipOnPreview = opts.skipOnPreview !== false;
        if (process.env.DISABLE_CRON === 'true' || (skipOnPreview && isPreviewWithoutStaging())) {
            return NextResponse.json(
                { message: 'Cron disabled on preview deployment', skipped: true },
                { status: 200 },
            );
        }

        if (opts.envKillSwitch && process.env[opts.envKillSwitch] !== 'true') {
            return NextResponse.json(
                {
                    message: opts.envKillSwitchSkippedMessage ?? `${opts.envKillSwitch} disabled`,
                    skipped: true,
                },
                { status: 200 },
            );
        }

        let lockAcquired = false;
        if (opts.lockName) {
            lockAcquired = await acquireCronLock(opts.lockName, opts.lockTimeoutMs);
            if (!lockAcquired) {
                return NextResponse.json(
                    { message: `Another ${opts.module} run in progress`, skipped: true },
                    { status: 200 },
                );
            }
        }

        try {
            const body = await fn();
            return NextResponse.json(body, { status: 200 });
        } catch (error) {
            await Logger.error(opts.module, 'Cron handler failed', error);
            opts.onError?.(error);
            return NextResponse.json(
                {
                    error: 'Internal Server Error',
                    message: error instanceof Error ? error.message : 'Unknown error',
                },
                { status: 500 },
            );
        } finally {
            if (lockAcquired && opts.lockName) {
                await releaseCronLock(opts.lockName);
            }
        }
    };
}
