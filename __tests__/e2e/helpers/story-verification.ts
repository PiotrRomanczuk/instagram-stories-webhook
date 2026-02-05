import { APIRequestContext, expect } from '@playwright/test';

/**
 * E2E Test Helper: Story Verification
 *
 * Utilities for verifying Instagram story publishing in E2E tests.
 * Handles common scenarios like verification delays, 24-hour de-duplication, and debugging.
 */

export interface StoryVerificationResult {
	verified: boolean;
	story?: any;
	error?: string;
	attempts?: number;
}

/**
 * Verifies that a story with the given media ID exists on Instagram
 * Retries with delays to handle Instagram processing time
 *
 * @param request Playwright APIRequestContext
 * @param mediaId Instagram media ID to verify
 * @param maxAttempts Maximum verification attempts (default: 5)
 * @param delayMs Delay between attempts in milliseconds (default: 10000 = 10 seconds)
 */
export async function verifyStoryPublished(
	request: APIRequestContext,
	mediaId: string,
	maxAttempts: number = 5,
	delayMs: number = 10000
): Promise<StoryVerificationResult> {
	for (let attempt = 1; attempt <= maxAttempts; attempt++) {
		console.log(
			`🔍 Attempt ${attempt}/${maxAttempts}: Verifying story ${mediaId}...`
		);

		try {
			// Fetch recent stories from API
			const response = await request.get('/api/instagram/recent-stories?limit=25');

			if (!response.ok()) {
				console.error(`❌ API error: ${response.status()} ${response.statusText()}`);
				if (attempt === maxAttempts) {
					return {
						verified: false,
						error: `API request failed: ${response.status()}`,
						attempts: attempt,
					};
				}
				await delay(delayMs);
				continue;
			}

			const stories = await response.json();

			// Find story with matching ID
			const story = stories.find((s: any) => s.id === mediaId);

			if (story) {
				console.log(`✅ Story verified: ${mediaId} (attempt ${attempt})`);
				return {
					verified: true,
					story,
					attempts: attempt,
				};
			}

			// Story not found yet
			if (attempt < maxAttempts) {
				console.log(
					`⏳ Story not found yet, waiting ${delayMs / 1000}s before retry...`
				);
				await delay(delayMs);
			}
		} catch (error) {
			console.error(`❌ Verification error:`, error);
			if (attempt === maxAttempts) {
				return {
					verified: false,
					error: error instanceof Error ? error.message : 'Unknown error',
					attempts: attempt,
				};
			}
			await delay(delayMs);
		}
	}

	return {
		verified: false,
		error: `Story ${mediaId} not found after ${maxAttempts} attempts`,
		attempts: maxAttempts,
	};
}

/**
 * Waits for a story to be published and verified on Instagram
 * Includes longer timeouts for video processing
 *
 * @param request Playwright APIRequestContext
 * @param mediaId Instagram media ID
 * @param mediaType 'IMAGE' or 'VIDEO'
 */
export async function waitForStoryVerification(
	request: APIRequestContext,
	mediaId: string,
	mediaType: 'IMAGE' | 'VIDEO' = 'IMAGE'
): Promise<StoryVerificationResult> {
	// Videos take much longer to process (30-90 seconds)
	const maxAttempts = mediaType === 'VIDEO' ? 9 : 6;
	const delayMs = mediaType === 'VIDEO' ? 15000 : 10000; // 15s for video, 10s for image

	console.log(
		`⏳ Waiting for ${mediaType} story verification (max ${(maxAttempts * delayMs) / 1000}s)...`
	);

	return await verifyStoryPublished(request, mediaId, maxAttempts, delayMs);
}

/**
 * Checks if a media URL was recently published (within last N hours)
 * Used to prevent duplicate publishing in tests
 *
 * @param request Playwright APIRequestContext
 * @param mediaUrl Media URL to check
 * @param hoursAgo Number of hours to look back (default: 24)
 */
export async function wasMediaPublishedRecently(
	request: APIRequestContext,
	mediaUrl: string,
	hoursAgo: number = 24
): Promise<boolean> {
	try {
		const response = await request.get('/api/instagram/recent-stories?limit=25');

		if (!response.ok()) {
			console.warn(`⚠️ Could not check recent publishes: API error ${response.status()}`);
			return false;
		}

		const stories = await response.json();
		const cutoffTime = Date.now() - hoursAgo * 60 * 60 * 1000;

		const recentPublish = stories.find((s: any) => {
			const storyTime = new Date(s.timestamp).getTime();
			return s.media_url === mediaUrl && storyTime > cutoffTime;
		});

		if (recentPublish) {
			const hoursAgo = (Date.now() - new Date(recentPublish.timestamp).getTime()) / (1000 * 60 * 60);
			console.log(
				`⚠️ Media was published ${hoursAgo.toFixed(1)} hours ago (ID: ${recentPublish.id})`
			);
			return true;
		}

		return false;
	} catch (error) {
		console.error('Error checking recent publishes:', error);
		return false;
	}
}

/**
 * Fetches diagnostic information about recent story publishing
 * Useful for debugging test failures
 *
 * @param request Playwright APIRequestContext
 */
export async function getStoriesDiagnostic(request: APIRequestContext): Promise<any> {
	try {
		const response = await request.get('/api/debug/stories-diagnostic');

		if (!response.ok()) {
			throw new Error(`Diagnostic API error: ${response.status()}`);
		}

		return await response.json();
	} catch (error) {
		console.error('Failed to fetch diagnostic:', error);
		return null;
	}
}

/**
 * Logs diagnostic information about story publishing
 * Call this when a test fails to aid debugging
 *
 * @param request Playwright APIRequestContext
 */
export async function logStoriesDiagnostic(request: APIRequestContext): Promise<void> {
	console.log('\n📊 DIAGNOSTIC REPORT:');
	console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

	const diagnostic = await getStoriesDiagnostic(request);

	if (!diagnostic) {
		console.log('❌ Could not fetch diagnostic information');
		return;
	}

	console.log(`\n📅 Timestamp: ${diagnostic.timestamp}`);
	console.log(`👤 User ID: ${diagnostic.user_id}`);

	console.log('\n📊 DATABASE LOGS:');
	console.log(`  Total logs: ${diagnostic.database.total_logs}`);
	console.log(`  Successful: ${diagnostic.database.successful_publishes}`);
	console.log(`  Failed: ${diagnostic.database.failed_publishes}`);

	console.log('\n📱 INSTAGRAM API:');
	if (diagnostic.instagram_api.error) {
		console.log(`  ❌ Error: ${diagnostic.instagram_api.error}`);
	} else {
		console.log(`  Total stories: ${diagnostic.instagram_api.total_stories}`);
	}

	console.log('\n🔍 ANALYSIS:');
	console.log(`  Stories in both: ${diagnostic.analysis.stories_in_both}`);
	console.log(`  Stories in DB only: ${diagnostic.analysis.stories_in_db_only.length}`);
	console.log(`  Stories on IG only: ${diagnostic.analysis.stories_in_instagram_only.length}`);
	console.log(`  Expired stories: ${diagnostic.analysis.expired_stories}`);
	console.log(`  Recent failures: ${diagnostic.analysis.recent_failures}`);

	if (diagnostic.analysis.issues_found.length > 0) {
		console.log('\n⚠️ ISSUES FOUND:');
		diagnostic.analysis.issues_found.forEach((issue: string) => {
			console.log(`  - ${issue}`);
		});
	}

	if (diagnostic.troubleshooting) {
		console.log('\n💡 TROUBLESHOOTING STEPS:');
		diagnostic.troubleshooting.forEach((step: string) => {
			console.log(`  ${step}`);
		});
	}

	console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

/**
 * Extracts Instagram media ID from success message on page
 *
 * @param pageText Full text content of the page
 * @returns Media ID or null if not found
 */
export function extractMediaId(pageText: string): string | null {
	const mediaIdMatch = pageText.match(/Media ID:?\s*(\d+)/i);
	return mediaIdMatch ? mediaIdMatch[1] : null;
}

/**
 * Delay helper (Promise-based timeout)
 */
function delay(ms: number): Promise<void> {
	return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Asserts that a story was successfully published and verified
 * Throws detailed error with diagnostic info if verification fails
 *
 * @param request Playwright APIRequestContext
 * @param mediaId Instagram media ID
 * @param mediaType 'IMAGE' or 'VIDEO'
 */
export async function assertStoryPublished(
	request: APIRequestContext,
	mediaId: string,
	mediaType: 'IMAGE' | 'VIDEO' = 'IMAGE'
): Promise<void> {
	const result = await waitForStoryVerification(request, mediaId, mediaType);

	if (!result.verified) {
		// Log diagnostic information
		await logStoriesDiagnostic(request);

		// Fail with detailed error
		throw new Error(
			`Story verification failed after ${result.attempts} attempts: ${result.error}\n` +
			`Media ID: ${mediaId}\n` +
			`Media Type: ${mediaType}\n` +
			'Check diagnostic report above for details.'
		);
	}

	// Success
	console.log(`✅ Story ${mediaId} successfully verified on Instagram`);
}
