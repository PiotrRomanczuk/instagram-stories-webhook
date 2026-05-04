/**
 * Video Processing Cron Endpoint
 *
 * Processes videos that need conversion to Instagram Stories specs.
 * Triggered by cron job every 5 minutes.
 *
 * GET /api/cron/process-videos
 */

import { processVideosQueue, cleanupOldProcessedVideos } from '@/lib/jobs/process-videos';
import { createCronHandler } from '@/lib/scheduler/cron-handler';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export const GET = createCronHandler(
    { module: 'cron:process-videos', lockName: 'process-videos' },
    async () => {
        const result = await processVideosQueue();
        const cleanedUp = await cleanupOldProcessedVideos();
        return {
            success: true,
            totalQueued: result.totalQueued,
            processed: result.processed,
            failed: result.failed,
            errors: result.errors,
            cleanedUp,
            timestamp: new Date().toISOString(),
        };
    },
);
