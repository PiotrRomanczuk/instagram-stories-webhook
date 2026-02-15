import { describe, it, expect } from 'vitest';
import cron from 'node-cron';
import { CRON_JOBS, isJobEnabled, toVercelCronsConfig } from '@/lib/cron/cron-jobs';
import type { CronJobDefinition } from '@/lib/cron/cron-jobs';

describe('CRON_JOBS registry', () => {
    it('has unique IDs', () => {
        const ids = CRON_JOBS.map((j) => j.id);
        expect(new Set(ids).size).toBe(ids.length);
    });

    it('has unique paths', () => {
        const paths = CRON_JOBS.map((j) => j.path);
        expect(new Set(paths).size).toBe(paths.length);
    });

    it('all schedules are valid cron expressions', () => {
        for (const job of CRON_JOBS) {
            expect(cron.validate(job.schedule), `Invalid schedule for ${job.id}: ${job.schedule}`).toBe(true);
        }
    });

    it('all paths start with /api/', () => {
        for (const job of CRON_JOBS) {
            expect(job.path.startsWith('/api/'), `Path for ${job.id} should start with /api/`).toBe(true);
        }
    });
});

describe('toVercelCronsConfig', () => {
    it('returns array with path and schedule only', () => {
        const result = toVercelCronsConfig();

        expect(result).toHaveLength(CRON_JOBS.length);
        for (const entry of result) {
            expect(Object.keys(entry).sort()).toEqual(['path', 'schedule']);
        }
    });

    it('matches the expected vercel.json format', () => {
        const result = toVercelCronsConfig();

        expect(result).toEqual([
            { path: '/api/cron/process', schedule: '* * * * *' },
            { path: '/api/cron/identity-audit', schedule: '*/5 * * * *' },
            { path: '/api/cron/check-media-health', schedule: '0 */6 * * *' },
            { path: '/api/schedule/refresh-token', schedule: '0 0 * * 0' },
            { path: '/api/cron/process-videos', schedule: '*/5 * * * *' },
        ]);
    });
});

describe('isJobEnabled', () => {
    const makeJob = (overrides: Partial<CronJobDefinition> = {}): CronJobDefinition => ({
        id: 'test-job',
        path: '/api/cron/test-job',
        schedule: '* * * * *',
        enabledLocally: false,
        description: 'Test job',
        ...overrides,
    });

    it('returns enabledLocally default when no env overrides', () => {
        const enabled = makeJob({ enabledLocally: true });
        const disabled = makeJob({ enabledLocally: false });

        expect(isJobEnabled(enabled, {})).toBe(true);
        expect(isJobEnabled(disabled, {})).toBe(false);
    });

    it('CRON_ENABLE_<ID>=true overrides enabledLocally=false', () => {
        const job = makeJob({ id: 'identity-audit', enabledLocally: false });
        expect(isJobEnabled(job, { CRON_ENABLE_IDENTITY_AUDIT: 'true' })).toBe(true);
    });

    it('CRON_DISABLE_<ID>=true overrides enabledLocally=true', () => {
        const job = makeJob({ id: 'process', enabledLocally: true });
        expect(isJobEnabled(job, { CRON_DISABLE_PROCESS: 'true' })).toBe(false);
    });

    it('CRON_DISABLE takes precedence over CRON_ENABLE', () => {
        const job = makeJob({ id: 'process', enabledLocally: true });
        expect(
            isJobEnabled(job, {
                CRON_ENABLE_PROCESS: 'true',
                CRON_DISABLE_PROCESS: 'true',
            }),
        ).toBe(false);
    });

    it('handles hyphenated IDs correctly', () => {
        const job = makeJob({ id: 'check-media-health', enabledLocally: false });
        expect(isJobEnabled(job, { CRON_ENABLE_CHECK_MEDIA_HEALTH: 'true' })).toBe(true);
        expect(isJobEnabled(job, { CRON_DISABLE_CHECK_MEDIA_HEALTH: 'true' })).toBe(false);
    });

    it('ignores non-"true" env values', () => {
        const job = makeJob({ id: 'process', enabledLocally: true });
        expect(isJobEnabled(job, { CRON_DISABLE_PROCESS: 'false' })).toBe(true);
        expect(isJobEnabled(job, { CRON_DISABLE_PROCESS: '1' })).toBe(true);
    });
});
