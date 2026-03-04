/**
 * Preview Deployment Safety Guard
 *
 * Prevents write operations (mutations) in Vercel preview deployments.
 *
 * Why this matters:
 * - Preview deployments use production database
 * - Accidental writes in previews pollute production data
 * - E2E tests in previews could create test data in production
 *
 * Usage:
 * ```typescript
 * import { preventWriteInPreview } from '@/lib/preview-guard';
 *
 * export async function POST(request: Request) {
 *   const guard = preventWriteInPreview();
 *   if (guard) return guard;
 *
 *   // Safe to write...
 * }
 * ```
 */

import { NextResponse } from 'next/server';

/**
 * Check if the current deployment is a Vercel preview
 */
export function isPreviewDeployment(): boolean {
	return (
		process.env.PREVIEW_MODE === 'true' ||
		process.env.VERCEL_ENV === 'preview'
	);
}

/**
 * Check if the current deployment is staging
 */
export function isStagingDeployment(): boolean {
	return (
		process.env.STAGING_MODE === 'true' ||
		process.env.VERCEL_GIT_COMMIT_REF === 'staging'
	);
}

/**
 * Check if the current deployment is production
 */
export function isProductionDeployment(): boolean {
	return process.env.VERCEL_ENV === 'production';
}

/**
 * Check if the current deployment is development (local)
 */
export function isDevelopmentEnvironment(): boolean {
	return process.env.NODE_ENV === 'development';
}

/**
 * Prevent write operations in preview deployments
 *
 * Returns a 403 response if in preview, null otherwise
 *
 * @param customMessage - Optional custom error message
 * @returns NextResponse with 403 if preview, null if safe to proceed
 *
 * @example
 * ```typescript
 * export async function POST(request: Request) {
 *   const guard = preventWriteInPreview();
 *   if (guard) return guard;
 *
 *   // Mutation code here...
 * }
 * ```
 */
export function preventWriteInPreview(
	customMessage?: string
): NextResponse | null {
	if (isPreviewDeployment() && !isStagingDeployment()) {
		return NextResponse.json(
			{
				error: 'Write operations are disabled in preview deployments',
				message:
					customMessage ||
					'This action cannot be performed in preview deployments to protect production data. Please test in staging or development.',
				deployment: 'preview',
				readOnly: true,
			},
			{ status: 403 }
		);
	}

	return null;
}

/**
 * Prevent read operations from production database in preview
 *
 * Use this for sensitive endpoints that should not expose production data
 *
 * @param customMessage - Optional custom error message
 * @returns NextResponse with 403 if preview, null if safe to proceed
 */
export function preventReadInPreview(
	customMessage?: string
): NextResponse | null {
	if (isPreviewDeployment() && !isStagingDeployment()) {
		return NextResponse.json(
			{
				error: 'This endpoint is disabled in preview deployments',
				message:
					customMessage ||
					'Access to this data is restricted in preview deployments for security.',
				deployment: 'preview',
			},
			{ status: 403 }
		);
	}

	return null;
}

/**
 * Check if the session belongs to a demo user
 */
export function isDemoUser(
	session: { user?: { role?: string } } | null
): boolean {
	return session?.user?.role === 'demo';
}

/**
 * Prevent write operations for demo users
 *
 * Returns a 403 response if demo user, null otherwise
 */
export function preventWriteForDemo(
	session: { user?: { role?: string } } | null
): NextResponse | null {
	if (isDemoUser(session)) {
		return NextResponse.json(
			{
				error: 'Write operations are disabled in demo mode',
				message:
					'Demo mode is read-only. Sign in with your own account to make changes.',
				demo: true,
				readOnly: true,
			},
			{ status: 403 }
		);
	}

	return null;
}

/**
 * Legacy check for backward compatibility
 */
export function checkWritePermission(isAdmin: boolean = false): void {
	if (isPreviewDeployment() && !isStagingDeployment() && !isAdmin) {
		throw new Error(
			'Write operations are disabled in preview deployments. ' +
				'Only staging and production allow data modification.'
		);
	}
}

/**
 * Get deployment environment information
 */
export function getDeploymentInfo() {
	return {
		environment: process.env.VERCEL_ENV || 'development',
		isPreview: isPreviewDeployment(),
		isStaging: isStagingDeployment(),
		isProduction: isProductionDeployment(),
		isDevelopment: isDevelopmentEnvironment(),
		url: process.env.VERCEL_URL,
		branch: process.env.VERCEL_GIT_COMMIT_REF,
		commit: process.env.VERCEL_GIT_COMMIT_SHA,
	};
}

/**
 * Log a warning if running in preview deployment
 */
export function warnIfPreview(context: string): void {
	if (isPreviewDeployment() && !isStagingDeployment()) {
		console.warn(
			`[PREVIEW GUARD] ${context} is running in a preview deployment. Write operations should be blocked.`
		);
	}
}
