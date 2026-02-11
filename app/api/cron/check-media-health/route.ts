import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { requireAdmin } from '@/lib/auth-helpers';
import { supabaseAdmin } from '@/lib/config/supabase-admin';
import { checkMediaHealth } from '@/lib/media/health-check';
import { Logger } from '@/lib/utils/logger';

const MODULE = 'api:cron:check-media-health';

/**
 * Cron Job: Check Media Health
 * Runs periodically to check if pending meme media URLs are still accessible
 *
 * Schedule: Every 6 hours
 * Purpose: Detect expired or broken media URLs before admin review
 */
export async function GET(req: NextRequest) {
	try {
		// Verify this is a cron job or admin request
		const authHeader = req.headers.get('authorization');
		const cronSecret = process.env.CRON_SECRET;

		// Allow either cron secret or admin session
		const isCronJob = cronSecret && authHeader === `Bearer ${cronSecret}`;

		if (!isCronJob) {
			// Check if admin session
			const session = await getServerSession(authOptions);
			requireAdmin(session);
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

		await Logger.info(
			MODULE,
			'🏥 Starting media health check for pending memes...',
		);

		// Get all pending meme submissions
		const { data: memes, error } = await supabaseAdmin
			.from('meme_submissions')
			.select('id, media_url, title, created_at')
			.eq('status', 'pending')
			.order('created_at', { ascending: false })
			.limit(100); // Check up to 100 pending memes

		if (error) {
			throw new Error(`Failed to fetch pending memes: ${error.message}`);
		}

		if (!memes || memes.length === 0) {
			await Logger.info(MODULE, 'No pending memes to check');
			return NextResponse.json({
				checked: 0,
				unhealthy: 0,
				message: 'No pending memes to check',
			});
		}

		await Logger.info(MODULE, `Checking ${memes.length} pending meme(s)...`);

		// Check each media URL
		const results = await Promise.all(
			memes.map(async (meme) => {
				const health = await checkMediaHealth(meme.media_url);
				return {
					id: meme.id,
					title: meme.title,
					url: meme.media_url,
					health,
				};
			}),
		);

		// Find unhealthy media
		const unhealthy = results.filter((r) => !r.health.healthy);

		// Update admin_notes for unhealthy media
		if (unhealthy.length > 0) {
			await Logger.warn(
				MODULE,
				`Found ${unhealthy.length} meme(s) with unhealthy media`,
			);

			for (const item of unhealthy) {
				const note = `⚠️ Media URL health check failed (${item.health.statusCode || 'timeout'}): ${item.health.error || 'URL not accessible'}. Checked at ${new Date(item.health.checkedAt).toISOString()}`;

				await supabaseAdmin
					.from('meme_submissions')
					.update({
						admin_notes: note,
					})
					.eq('id', item.id);

				await Logger.warn(
					MODULE,
					`Marked meme ${item.id} as unhealthy: ${item.title}`,
				);
			}
		}

		await Logger.info(
			MODULE,
			`✅ Health check complete: ${results.length} checked, ${unhealthy.length} unhealthy`,
		);

		return NextResponse.json({
			checked: results.length,
			unhealthy: unhealthy.length,
			unhealthyMemes: unhealthy.map((u) => ({
				id: u.id,
				title: u.title,
				error: u.health.error,
				statusCode: u.health.statusCode,
			})),
		});
	} catch (error) {
		const message =
			error instanceof Error ? error.message : 'Health check failed';
		Logger.error(MODULE, message, error);

		if (message === 'Admin access required') {
			return NextResponse.json({ error: message }, { status: 403 });
		}

		return NextResponse.json({ error: message }, { status: 500 });
	}
}
