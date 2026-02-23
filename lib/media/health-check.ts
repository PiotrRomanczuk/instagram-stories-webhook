/**
 * Media Health Check Utility
 * Checks if media URLs are accessible and returns health status
 */

import { validateFetchUrl } from '@/lib/utils/url-validation';

export interface MediaHealthResult {
	healthy: boolean;
	statusCode?: number;
	error?: string;
	checkedAt: number;
}

/**
 * Check if a media URL is accessible
 * Uses HEAD request to avoid downloading the entire file
 */
export async function checkMediaHealth(
	url: string,
): Promise<MediaHealthResult> {
	const checkedAt = Date.now();

	try {
		// Validate URL to prevent SSRF attacks
		validateFetchUrl(url);

		// Use HEAD request for efficiency
		const response = await fetch(url, {
			method: 'HEAD',
			signal: AbortSignal.timeout(5000), // 5 second timeout
		});

		return {
			healthy: response.ok,
			statusCode: response.status,
			checkedAt,
		};
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);

		return {
			healthy: false,
			error: message,
			checkedAt,
		};
	}
}

/**
 * Batch check multiple media URLs
 * Returns a map of URL to health result
 */
export async function batchCheckMediaHealth(
	urls: string[],
): Promise<Map<string, MediaHealthResult>> {
	const results = new Map<string, MediaHealthResult>();

	// Check all URLs in parallel (with reasonable concurrency)
	const promises = urls.map(async (url) => {
		const result = await checkMediaHealth(url);
		results.set(url, result);
	});

	await Promise.all(promises);

	return results;
}
