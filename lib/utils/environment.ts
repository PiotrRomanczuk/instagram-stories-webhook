/**
 * Environment detection utilities for dev/prod isolation.
 *
 * Content items are tagged with the environment that created them.
 * The cron processor only processes items matching its own environment,
 * preventing dev/test posts from publishing in production.
 */

export type AppEnvironment = 'production' | 'development' | 'preview';

/**
 * Returns the current application environment.
 *
 * Priority:
 * 1. VERCEL_ENV (set automatically by Vercel: 'production' | 'preview' | 'development')
 * 2. NODE_ENV ('production' | 'development' | 'test')
 * 3. Defaults to 'development'
 */
export function getAppEnvironment(): AppEnvironment {
	const vercelEnv = process.env.VERCEL_ENV;
	if (vercelEnv === 'production') return 'production';
	if (vercelEnv === 'preview') return 'preview';
	if (vercelEnv === 'development') return 'development';

	const nodeEnv = process.env.NODE_ENV;
	if (nodeEnv === 'production') return 'production';

	return 'development';
}

/**
 * Whether publishing should be a no-op (dry run).
 * In dry-run mode, all publishing logic runs except the actual Instagram API call.
 *
 * Enabled by setting PUBLISHING_DRY_RUN=true in .env.local
 */
export function isDryRun(): boolean {
	return process.env.PUBLISHING_DRY_RUN === 'true';
}
