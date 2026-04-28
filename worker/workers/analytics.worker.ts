import { Worker, type Job } from 'bullmq';
import { createRedisConnection } from '@/lib/queue/redis';

export interface AnalyticsJobData {
    postId: string;
    platform: string;
    platformPostId: string;
}

/**
 * Analytics worker — stub.
 * Full implementation in T-M8-01.
 */
export function startAnalyticsWorker(): Worker<AnalyticsJobData> {
    const worker = new Worker<AnalyticsJobData>(
        'analytics-queue',
        async (job: Job<AnalyticsJobData>) => {
            console.log(
                `[analytics-worker] job ${job.id} | platform=${job.data.platform} post=${job.data.postId}`
            );
            // TODO T-M8-01: fetch metrics from platform API, upsert post_analytics table
        },
        {
            connection: createRedisConnection(),
            concurrency: 3,
        }
    );

    worker.on('failed', (job, err) =>
        console.error(`[analytics-worker] failed job ${job?.id}:`, err.message)
    );

    return worker;
}
