import * as Sentry from '@sentry/nextjs';
import { runTikTokHealthCheck } from '@/lib/tiktok-device/health';
import { createCronHandler } from '@/lib/scheduler/cron-handler';

export const maxDuration = 60;

export const GET = createCronHandler(
    {
        module: 'cron:tiktok-health',
        lockName: 'tiktok-health',
        onError: (error) =>
            Sentry.captureException(error, {
                tags: { module: 'scheduler', route: '/api/cron/tiktok-health', method: 'GET' },
            }),
    },
    async () => {
        const result = await runTikTokHealthCheck();
        return {
            checked: result.checked,
            markedOffline: result.markedOffline,
            alertedDevices: result.alertedDevices,
        };
    },
);
