/**
 * Content environment isolation.
 *
 * Tags content items with the environment that created them
 * (production, preview, development) so E2E tests running on
 * preview deployments don't pollute production data.
 *
 * The cron and all UI queries filter by the current environment,
 * ensuring each deployment only sees its own items.
 */

export function getCurrentEnvironment(): string {
	return process.env.VERCEL_ENV || 'development';
}
