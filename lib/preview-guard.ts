/**
 * Preview Deployment Safety Guard
 * Prevents accidental writes in preview environments
 */

export function isPreviewDeployment(): boolean {
	return (
		process.env.PREVIEW_MODE === 'true' ||
		process.env.VERCEL_ENV === 'preview'
	);
}

export function isStagingDeployment(): boolean {
	return process.env.STAGING_MODE === 'true';
}

export function checkWritePermission(isAdmin: boolean = false): void {
	if (isPreviewDeployment() && !isStagingDeployment() && !isAdmin) {
		throw new Error(
			'Write operations are disabled in preview deployments. ' +
			'Only staging and production allow data modification.'
		);
	}
}
