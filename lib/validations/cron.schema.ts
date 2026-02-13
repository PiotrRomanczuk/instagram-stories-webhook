import { z } from 'zod';

/**
 * Cron job configuration schema
 * Validated from environment variables with sensible defaults
 */
const cronConfigSchema = z.object({
	maxPostsPerCronRun: z.coerce.number().int().min(1).max(50).default(3),
	publishDelayMs: z.coerce.number().int().min(0).max(60000).default(10000),
	quotaCheckEnabled: z
		.enum(['true', 'false'])
		.default('true')
		.transform((v) => v === 'true'),
	quotaSafetyMargin: z.coerce.number().int().min(0).max(50).default(2),
});

export type CronConfig = z.infer<typeof cronConfigSchema>;

/**
 * Parse cron config from environment variables.
 * Falls back to defaults if env vars are missing or invalid.
 */
export function parseCronConfig(): CronConfig {
	return cronConfigSchema.parse({
		maxPostsPerCronRun: process.env.MAX_POSTS_PER_CRON_RUN,
		publishDelayMs: process.env.PUBLISH_DELAY_MS,
		quotaCheckEnabled: process.env.QUOTA_CHECK_ENABLED,
		quotaSafetyMargin: process.env.QUOTA_SAFETY_MARGIN,
	});
}
