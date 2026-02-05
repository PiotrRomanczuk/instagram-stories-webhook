/**
 * Video Processing Cron Endpoint
 *
 * Processes videos that need conversion to Instagram Stories specs
 * Triggered by cron job every 5 minutes
 *
 * GET /api/cron/process-videos
 */

import { NextRequest, NextResponse } from 'next/server';
import { processVideosQueue, cleanupOldProcessedVideos } from '@/lib/jobs/process-videos';
import { Logger } from '@/lib/utils/logger';

const MODULE = 'cron:process-videos';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes max execution time

/**
 * Cron endpoint for video processing
 * Verifies authorization before processing
 */
export async function GET(req: NextRequest) {
	try {
		// Verify authorization
		const authHeader = req.headers.get('authorization');
		const cronSecret = process.env.CRON_SECRET;

		if (!cronSecret) {
			Logger.error(MODULE, 'CRON_SECRET not configured');
			return NextResponse.json(
				{ error: 'Server misconfiguration' },
				{ status: 500 }
			);
		}

		if (authHeader !== `Bearer ${cronSecret}`) {
			Logger.warn(MODULE, 'Unauthorized cron request');
			return NextResponse.json(
				{ error: 'Unauthorized' },
				{ status: 401 }
			);
		}

		// Guard: Skip cron on preview deployments
		if (
			process.env.DISABLE_CRON === 'true' ||
			(process.env.VERCEL_ENV === 'preview' && process.env.STAGING_MODE !== 'true')
		) {
			return NextResponse.json(
				{ message: 'Cron disabled on preview deployment', skipped: true },
				{ status: 200 }
			);
		}

		Logger.info(MODULE, 'Starting video processing cron job');

		// Process videos queue
		const result = await processVideosQueue();

		// Run cleanup every execution (it's optimized to be fast)
		const cleanedUp = await cleanupOldProcessedVideos();

		Logger.info(MODULE, 'Video processing cron job complete', {
			...result,
			cleanedUp,
		});

		return NextResponse.json({
			success: true,
			totalQueued: result.totalQueued,
			processed: result.processed,
			failed: result.failed,
			errors: result.errors,
			cleanedUp,
			timestamp: new Date().toISOString(),
		});
	} catch (error) {
		Logger.error(MODULE, 'Video processing cron job failed', error);
		return NextResponse.json(
			{
				error: 'Internal server error',
				message: error instanceof Error ? error.message : 'Unknown error',
			},
			{ status: 500 }
		);
	}
}
