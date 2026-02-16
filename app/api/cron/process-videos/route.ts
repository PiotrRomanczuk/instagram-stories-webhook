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
import { supabaseAdmin } from '@/lib/config/supabase-admin';

const MODULE = 'cron:process-videos';
const LOCK_NAME = 'process-videos';
const LOCK_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes max execution time

async function acquireVideoLock(): Promise<boolean> {
	const now = new Date();
	const expiresAt = new Date(Date.now() + LOCK_TIMEOUT_MS).toISOString();

	try {
		const { error: insertError } = await supabaseAdmin
			.from('cron_locks')
			.insert({
				lock_name: LOCK_NAME,
				locked_at: now.toISOString(),
				expires_at: expiresAt,
			});

		if (!insertError) return true;

		const { data, error: updateError } = await supabaseAdmin
			.from('cron_locks')
			.update({
				locked_at: now.toISOString(),
				expires_at: expiresAt,
			})
			.eq('lock_name', LOCK_NAME)
			.lt('expires_at', now.toISOString())
			.select('lock_name')
			.maybeSingle();

		if (!updateError && data) return true;

		return false;
	} catch {
		return true; // Allow execution if lock check fails
	}
}

async function releaseVideoLock(): Promise<void> {
	try {
		await supabaseAdmin
			.from('cron_locks')
			.delete()
			.eq('lock_name', LOCK_NAME);
	} catch {
		// Best-effort release
	}
}

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

		// Acquire distributed lock to prevent overlapping runs
		const lockAcquired = await acquireVideoLock();
		if (!lockAcquired) {
			Logger.info(MODULE, 'Video processing lock held by another execution, skipping');
			return NextResponse.json(
				{ message: 'Another video processing run in progress', skipped: true },
				{ status: 200 }
			);
		}

		try {
			Logger.info(MODULE, 'Starting video processing cron job');

			const result = await processVideosQueue();
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
		} finally {
			await releaseVideoLock();
		}
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
