import * as Sentry from '@sentry/nextjs';
import { processScheduledPosts } from '@/lib/scheduler/process-service';
import { createCronHandler } from '@/lib/scheduler/cron-handler';

export const maxDuration = 300;

export const GET = createCronHandler(
    {
        module: 'cron',
        lockName: 'process-scheduled',
        onError: (error) =>
            Sentry.captureException(error, {
                tags: { module: 'scheduler', route: '/api/cron/process', method: 'GET' },
            }),
    },
    async () => {
        return (await processScheduledPosts()) as unknown as Record<string, unknown>;
    },
);
