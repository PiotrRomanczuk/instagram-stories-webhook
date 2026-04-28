import { Worker, type Job } from 'bullmq';
import { createRedisConnection } from '@/lib/queue/redis';

export interface PublishJobData {
    postId: string;
    platform: string;
    accountId: string;
    idempotencyKey: string;
}

/**
 * Publish worker — stub.
 * Full implementation in T-M1-11 (Instagram) and T-M2-02 (TikTok).
 */
export function startPublishWorker(): Worker<PublishJobData> {
    const worker = new Worker<PublishJobData>(
        'publish-queue',
        async (job: Job<PublishJobData>) => {
            console.log(
                `[publish-worker] job ${job.id} | platform=${job.data.platform} post=${job.data.postId}`
            );
            // TODO T-M1-11: dispatch to platform-specific publisher
        },
        {
            connection: createRedisConnection(),
            concurrency: 5,
        }
    );

    worker.on('completed', (job) =>
        console.log(`[publish-worker] completed job ${job.id}`)
    );
    worker.on('failed', (job, err) =>
        console.error(`[publish-worker] failed job ${job?.id}:`, err.message)
    );

    return worker;
}
