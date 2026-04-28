import IORedis from 'ioredis';

/**
 * Creates a new IORedis connection.
 * BullMQ requires `maxRetriesPerRequest: null` — each Queue and Worker
 * should create its own connection via this factory.
 */
export function createRedisConnection(): IORedis {
    const url = process.env.REDIS_URL ?? 'redis://localhost:6379';
    return new IORedis(url, {
        maxRetriesPerRequest: null,
        enableReadyCheck: false,
        lazyConnect: true,
    });
}

/**
 * One-shot ping to verify Redis is reachable.
 * Returns { connected: true, latencyMs } or { connected: false, error }.
 */
export async function pingRedis(): Promise<
    | { connected: true; latencyMs: number }
    | { connected: false; error: string }
> {
    const client = createRedisConnection();
    const start = Date.now();
    try {
        await client.connect();
        await client.ping();
        return { connected: true, latencyMs: Date.now() - start };
    } catch (err) {
        return {
            connected: false,
            error: err instanceof Error ? err.message : 'Unknown error',
        };
    } finally {
        client.disconnect();
    }
}
