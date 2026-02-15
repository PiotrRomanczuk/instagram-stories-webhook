export interface CronJobDefinition {
    /** Unique job identifier, used for env var overrides */
    id: string;
    /** API route path (e.g. /api/cron/process) */
    path: string;
    /** Cron expression (node-cron / Vercel format) */
    schedule: string;
    /** Whether this job runs by default in local development */
    enabledLocally: boolean;
    /** Human-readable description */
    description: string;
}

export const CRON_JOBS: CronJobDefinition[] = [
    {
        id: 'process',
        path: '/api/cron/process',
        schedule: '* * * * *',
        enabledLocally: true,
        description: 'Process scheduled posts for publishing',
    },
    {
        id: 'identity-audit',
        path: '/api/cron/identity-audit',
        schedule: '*/5 * * * *',
        enabledLocally: false,
        description: 'Audit Instagram account identity',
    },
    {
        id: 'check-media-health',
        path: '/api/cron/check-media-health',
        schedule: '0 */6 * * *',
        enabledLocally: false,
        description: 'Check health of media assets',
    },
    {
        id: 'refresh-token',
        path: '/api/schedule/refresh-token',
        schedule: '0 0 * * 0',
        enabledLocally: false,
        description: 'Refresh OAuth tokens weekly',
    },
    {
        id: 'process-videos',
        path: '/api/cron/process-videos',
        schedule: '*/5 * * * *',
        enabledLocally: true,
        description: 'Process video uploads',
    },
];

/**
 * Converts job ID to env var key format.
 * e.g. "identity-audit" -> "IDENTITY_AUDIT"
 */
function idToEnvKey(id: string): string {
    return id.replace(/-/g, '_').toUpperCase();
}

/**
 * Determines if a job is enabled for a given environment.
 *
 * Override precedence:
 * 1. CRON_DISABLE_<ID>=true -> disabled (highest priority)
 * 2. CRON_ENABLE_<ID>=true -> enabled
 * 3. job.enabledLocally default
 */
export function isJobEnabled(
    job: CronJobDefinition,
    env: Record<string, string | undefined> = process.env as Record<string, string | undefined>,
): boolean {
    const key = idToEnvKey(job.id);

    if (env[`CRON_DISABLE_${key}`] === 'true') {
        return false;
    }

    if (env[`CRON_ENABLE_${key}`] === 'true') {
        return true;
    }

    return job.enabledLocally;
}

/** Generates the crons array for vercel.json */
export function toVercelCronsConfig(): Array<{ path: string; schedule: string }> {
    return CRON_JOBS.map(({ path, schedule }) => ({ path, schedule }));
}
