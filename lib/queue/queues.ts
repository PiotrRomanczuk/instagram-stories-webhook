import { Queue } from 'bullmq';
import { createRedisConnection } from './redis';

const defaultJobOptions = {
    removeOnComplete: { count: 500 },
    removeOnFail: { count: 1000 },
};

/**
 * Lazy queue construction.
 *
 * Each queue is created on first access and memoized. This avoids opening
 * Redis connections at module-import time so the Next.js dev server (and
 * route handlers that don't actually use queues) can boot without Redis.
 *
 * Background: an earlier iteration constructed all 5 queues at top level,
 * which spawned 5 reconnect-looping ioredis clients whenever Redis was
 * absent (CI without a service container, local dev without `redis-server`).
 */

const memoize = <T>(factory: () => T): (() => T) => {
    let value: T | undefined;
    return () => {
        if (value === undefined) value = factory();
        return value;
    };
};

/**
 * One job per platform per scheduled post.
 * Concurrency: 5. Retry: 3× exponential backoff.
 */
export const getPublishQueue = memoize(() => new Queue('publish-queue', {
    connection: createRedisConnection(),
    defaultJobOptions: {
        ...defaultJobOptions,
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
    },
}));

/**
 * FFmpeg slideshow composition jobs.
 * Concurrency: 2 (CPU-bound — cap it).
 */
export const getComposeQueue = memoize(() => new Queue('compose-queue', {
    connection: createRedisConnection(),
    defaultJobOptions: {
        ...defaultJobOptions,
        attempts: 2,
        backoff: { type: 'exponential', delay: 10000 },
    },
}));

/**
 * AI text generation, image generation, video generation.
 * Concurrency: 4 (network-bound — more parallelism is fine).
 */
export const getAiGenQueue = memoize(() => new Queue('ai-gen-queue', {
    connection: createRedisConnection(),
    defaultJobOptions: {
        ...defaultJobOptions,
        attempts: 3,
        backoff: { type: 'exponential', delay: 8000 },
    },
}));

/**
 * Instagram Story fetch + download per source account.
 * Concurrency: 1 (serial to avoid rate limit issues per account).
 */
export const getIngestQueue = memoize(() => new Queue('ingest-queue', {
    connection: createRedisConnection(),
    defaultJobOptions: {
        ...defaultJobOptions,
        attempts: 2,
        backoff: { type: 'fixed', delay: 30000 },
    },
}));

/**
 * Fetch post metrics from platform APIs.
 * Concurrency: 3.
 */
export const getAnalyticsQueue = memoize(() => new Queue('analytics-queue', {
    connection: createRedisConnection(),
    defaultJobOptions: {
        ...defaultJobOptions,
        attempts: 1,
    },
}));

export function getAllQueues(): readonly Queue[] {
    return [
        getPublishQueue(),
        getComposeQueue(),
        getAiGenQueue(),
        getIngestQueue(),
        getAnalyticsQueue(),
    ];
}

export type QueueName =
    | 'publish-queue'
    | 'compose-queue'
    | 'ai-gen-queue'
    | 'ingest-queue'
    | 'analytics-queue';
