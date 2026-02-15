/**
 * Local cron runner — standalone script that uses node-cron to hit
 * the same API routes the Vercel cron scheduler would in production.
 *
 * Usage: tsx --watch scripts/local-cron.ts
 * Requires: ENABLE_LOCAL_CRON=true in .env.local
 */
import dotenv from 'dotenv';
import cron, { type ScheduledTask } from 'node-cron';
import { CRON_JOBS, isJobEnabled } from '../lib/cron/cron-jobs';

dotenv.config({ path: '.env.local' });

// ── gate ────────────────────────────────────────────────────────
if (process.env.ENABLE_LOCAL_CRON !== 'true') {
    console.log('[cron] ENABLE_LOCAL_CRON is not "true" — exiting.');
    process.exit(0);
}

const CRON_SECRET = process.env.CRON_SECRET;
if (!CRON_SECRET) {
    console.error('[cron] ERROR: CRON_SECRET is not set in .env.local');
    process.exit(1);
}

const BASE_URL = process.env.LOCAL_CRON_BASE_URL ?? 'http://localhost:3000';
const POLL_INTERVAL_MS = 1000;
const MAX_WAIT_MS = 30_000;

// ── colors ──────────────────────────────────────────────────────
const green = (s: string) => `\x1b[32m${s}\x1b[0m`;
const red = (s: string) => `\x1b[31m${s}\x1b[0m`;
const cyan = (s: string) => `\x1b[36m${s}\x1b[0m`;
const dim = (s: string) => `\x1b[2m${s}\x1b[0m`;
const magenta = (s: string) => `\x1b[35m${s}\x1b[0m`;

// ── helpers ─────────────────────────────────────────────────────
async function waitForServer(): Promise<void> {
    const start = Date.now();
    while (Date.now() - start < MAX_WAIT_MS) {
        try {
            await fetch(BASE_URL, { signal: AbortSignal.timeout(2000) });
            return;
        } catch {
            await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
        }
    }
    console.error(`[cron] ERROR: Next.js server not reachable at ${BASE_URL} after ${MAX_WAIT_MS / 1000}s`);
    process.exit(1);
}

async function triggerJob(id: string, path: string): Promise<void> {
    const url = `${BASE_URL}${path}`;
    const timestamp = new Date().toLocaleTimeString();

    try {
        const res = await fetch(url, {
            headers: { Authorization: `Bearer ${CRON_SECRET}` },
            signal: AbortSignal.timeout(30_000),
        });
        const text = await res.text();
        const preview = text.length > 120 ? text.slice(0, 120) + '...' : text;

        if (res.ok) {
            console.log(`${dim(timestamp)} ${green('OK')}   ${cyan(id)} ${dim(preview)}`);
        } else {
            console.log(`${dim(timestamp)} ${red('FAIL')} ${cyan(id)} ${res.status} ${dim(preview)}`);
        }
    } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.log(`${dim(timestamp)} ${red('ERR')}  ${cyan(id)} ${dim(msg)}`);
    }
}

// ── main ────────────────────────────────────────────────────────
async function main(): Promise<void> {
    console.log(magenta('\n  Local Cron Runner'));
    console.log(dim(`  Server: ${BASE_URL}\n`));

    // Print job table
    const enabledJobs = CRON_JOBS.filter((j) => isJobEnabled(j));
    const disabledJobs = CRON_JOBS.filter((j) => !isJobEnabled(j));

    for (const job of enabledJobs) {
        console.log(`  ${green('ON')}  ${job.id.padEnd(22)} ${dim(job.schedule)}`);
    }
    for (const job of disabledJobs) {
        console.log(`  ${red('OFF')} ${job.id.padEnd(22)} ${dim(job.schedule)}`);
    }

    if (enabledJobs.length === 0) {
        console.log(dim('\n  No jobs enabled — exiting.'));
        process.exit(0);
    }

    console.log(dim('\n  Waiting for Next.js server...'));
    await waitForServer();
    console.log(green('  Server ready!\n'));

    // Schedule enabled jobs
    const tasks: ScheduledTask[] = [];
    for (const job of enabledJobs) {
        const task = cron.schedule(job.schedule, () => {
            void triggerJob(job.id, job.path);
        });
        tasks.push(task);
    }

    // Graceful shutdown
    const shutdown = () => {
        console.log(dim('\n  Shutting down cron runner...'));
        for (const task of tasks) {
            task.stop();
        }
        process.exit(0);
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
}

void main();
