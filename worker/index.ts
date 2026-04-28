/**
 * Worker process entry point.
 * Run with: npx tsx worker/index.ts
 * Managed in production by PM2 (ecosystem.config.js).
 *
 * Responsibilities:
 * - Start all BullMQ workers
 * - Register repeating cron jobs in Redis
 * - Handle graceful shutdown
 */

import { publishQueue, ingestQueue, analyticsQueue } from '@/lib/queue/queues';
import { startPublishWorker } from './workers/publish.worker';
import { startAnalyticsWorker } from './workers/analytics.worker';

async function registerRepeatJobs(): Promise<void> {
    // Publish queue — pick up due scheduled posts every minute
    await publishQueue.add(
        'process-due-posts',
        {},
        {
            repeat: { pattern: '* * * * *' },
            jobId: 'process-due-posts-repeat',
        }
    );

    // Ingest queue — fetch new stories every 6 hours
    await ingestQueue.add(
        'fetch-stories',
        {},
        {
            repeat: { pattern: '0 */6 * * *' },
            jobId: 'fetch-stories-repeat',
        }
    );

    // Analytics queue — refresh post metrics every 6 hours
    await analyticsQueue.add(
        'refresh-metrics',
        {},
        {
            repeat: { pattern: '0 */6 * * *' },
            jobId: 'refresh-metrics-repeat',
        }
    );

    console.log('[worker] Repeat jobs registered');
}

async function main(): Promise<void> {
    console.log('[worker] Starting...');

    const workers = [
        startPublishWorker(),
        startAnalyticsWorker(),
    ];

    await registerRepeatJobs();

    console.log('[worker] Ready — all workers listening');

    // Graceful shutdown
    const shutdown = async (signal: string): Promise<void> => {
        console.log(`[worker] ${signal} received — shutting down gracefully`);
        await Promise.all(workers.map((w) => w.close()));
        process.exit(0);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((err) => {
    console.error('[worker] Fatal startup error:', err);
    process.exit(1);
});
