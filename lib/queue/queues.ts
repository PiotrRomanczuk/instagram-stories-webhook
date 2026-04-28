import { Queue } from 'bullmq';
import { createRedisConnection } from './redis';

const defaultJobOptions = {
    removeOnComplete: { count: 500 },
    removeOnFail: { count: 1000 },
};

/**
 * One job per platform per scheduled post.
 * Concurrency: 5. Retry: 3× exponential backoff.
 */
export const publishQueue = new Queue('publish-queue', {
    connection: createRedisConnection(),
    defaultJobOptions: {
        ...defaultJobOptions,
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
    },
});

/**
 * FFmpeg slideshow composition jobs.
 * Concurrency: 2 (CPU-bound — cap it).
 */
export const composeQueue = new Queue('compose-queue', {
    connection: createRedisConnection(),
    defaultJobOptions: {
        ...defaultJobOptions,
        attempts: 2,
        backoff: { type: 'exponential', delay: 10000 },
    },
});

/**
 * AI text generation, image generation, video generation.
 * Concurrency: 4 (network-bound — more parallelism is fine).
 */
export const aiGenQueue = new Queue('ai-gen-queue', {
    connection: createRedisConnection(),
    defaultJobOptions: {
        ...defaultJobOptions,
        attempts: 3,
        backoff: { type: 'exponential', delay: 8000 },
    },
});

/**
 * Instagram Story fetch + download per source account.
 * Concurrency: 1 (serial to avoid rate limit issues per account).
 */
export const ingestQueue = new Queue('ingest-queue', {
    connection: createRedisConnection(),
    defaultJobOptions: {
        ...defaultJobOptions,
        attempts: 2,
        backoff: { type: 'fixed', delay: 30000 },
    },
});

/**
 * Fetch post metrics from platform APIs.
 * Concurrency: 3.
 */
export const analyticsQueue = new Queue('analytics-queue', {
    connection: createRedisConnection(),
    defaultJobOptions: {
        ...defaultJobOptions,
        attempts: 1,
    },
});

export const allQueues = [
    publishQueue,
    composeQueue,
    aiGenQueue,
    ingestQueue,
    analyticsQueue,
] as const;

export type QueueName =
    | 'publish-queue'
    | 'compose-queue'
    | 'ai-gen-queue'
    | 'ingest-queue'
    | 'analytics-queue';
