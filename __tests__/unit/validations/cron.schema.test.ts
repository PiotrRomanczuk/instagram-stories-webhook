import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { parseCronConfig } from '@/lib/validations/cron.schema';

describe('parseCronConfig', () => {
	const originalEnv = process.env;

	beforeEach(() => {
		process.env = { ...originalEnv };
		delete process.env.MAX_POSTS_PER_CRON_RUN;
		delete process.env.PUBLISH_DELAY_MS;
		delete process.env.QUOTA_CHECK_ENABLED;
		delete process.env.QUOTA_SAFETY_MARGIN;
	});

	afterEach(() => {
		process.env = originalEnv;
	});

	it('should return defaults when no env vars set', () => {
		const config = parseCronConfig();
		expect(config.maxPostsPerCronRun).toBe(3);
		expect(config.publishDelayMs).toBe(10000);
		expect(config.quotaCheckEnabled).toBe(true);
		expect(config.quotaSafetyMargin).toBe(2);
	});

	it('should parse env vars correctly', () => {
		process.env.MAX_POSTS_PER_CRON_RUN = '5';
		process.env.PUBLISH_DELAY_MS = '5000';
		process.env.QUOTA_CHECK_ENABLED = 'false';
		process.env.QUOTA_SAFETY_MARGIN = '10';

		const config = parseCronConfig();
		expect(config.maxPostsPerCronRun).toBe(5);
		expect(config.publishDelayMs).toBe(5000);
		expect(config.quotaCheckEnabled).toBe(false);
		expect(config.quotaSafetyMargin).toBe(10);
	});

	it('should coerce string numbers', () => {
		process.env.MAX_POSTS_PER_CRON_RUN = '10';
		const config = parseCronConfig();
		expect(config.maxPostsPerCronRun).toBe(10);
	});

	it('should throw on invalid maxPostsPerCronRun (0)', () => {
		process.env.MAX_POSTS_PER_CRON_RUN = '0';
		expect(() => parseCronConfig()).toThrow();
	});

	it('should throw on invalid maxPostsPerCronRun (over 50)', () => {
		process.env.MAX_POSTS_PER_CRON_RUN = '51';
		expect(() => parseCronConfig()).toThrow();
	});

	it('should throw on negative publishDelayMs', () => {
		process.env.PUBLISH_DELAY_MS = '-1';
		expect(() => parseCronConfig()).toThrow();
	});

	it('should allow zero publishDelayMs', () => {
		process.env.PUBLISH_DELAY_MS = '0';
		const config = parseCronConfig();
		expect(config.publishDelayMs).toBe(0);
	});
});
