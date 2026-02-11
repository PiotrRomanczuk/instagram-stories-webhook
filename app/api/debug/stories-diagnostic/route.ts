import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { isAdmin } from '@/lib/auth-helpers';
import { getRecentStories } from '@/lib/instagram/media';
import { supabaseAdmin } from '@/lib/config/supabase-admin';

/**
 * GET /api/debug/stories-diagnostic
 *
 * Comprehensive diagnostic endpoint for troubleshooting missing Instagram stories.
 * Returns:
 * - Recent publishing logs from database
 * - Recent stories from Instagram API
 * - Comparison and analysis
 * - Troubleshooting suggestions
 */
export async function GET(request: NextRequest) {
	// Block in production
	if (process.env.NODE_ENV === 'production') {
		return NextResponse.json({ error: 'Not available in production' }, { status: 404 });
	}

	try {
		// Verify authentication
		const session = await getServerSession(authOptions);
		if (!session?.user?.id) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}
		if (!isAdmin(session)) {
			return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
		}

		const userId = session.user.id;

		// 1. Fetch recent publishing logs from database (last 48 hours)
		const { data: publishingLogs, error: dbError } = await supabaseAdmin
			.from('publishing_logs')
			.select('*')
			.eq('user_id', userId)
			.eq('post_type', 'STORY')
			.gte('created_at', new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString())
			.order('created_at', { ascending: false })
			.limit(20);

		if (dbError) {
			throw new Error(`Database error: ${dbError.message}`);
		}

		// 2. Fetch recent stories from Instagram API (last 24 hours)
		let instagramStories: InstagramStory[] = [];
		let apiError: string | null = null;

		try {
			const { stories } = await getRecentStories(userId, 25);
			instagramStories = stories;
		} catch (error) {
			apiError = error instanceof Error ? error.message : 'Unknown error';
		}

		// 3. Analysis
		const analysis = analyzeStories(publishingLogs || [], instagramStories);

		// 4. Return diagnostic report
		return NextResponse.json({
			timestamp: new Date().toISOString(),
			user_id: userId,
			database: {
				total_logs: publishingLogs?.length || 0,
				successful_publishes: publishingLogs?.filter(l => l.status === 'SUCCESS').length || 0,
				failed_publishes: publishingLogs?.filter(l => l.status === 'FAILED').length || 0,
				logs: publishingLogs,
			},
			instagram_api: {
				error: apiError,
				total_stories: instagramStories.length,
				stories: instagramStories,
			},
			analysis,
			troubleshooting: generateTroubleshootingSteps(analysis),
		});
	} catch (error) {
		console.error('Stories diagnostic error:', error);

		return NextResponse.json(
			{
				error: error instanceof Error ? error.message : 'Diagnostic failed',
				timestamp: new Date().toISOString(),
			},
			{ status: 500 }
		);
	}
}

interface PublishingLog {
	ig_media_id: string;
	status: string;
	created_at: string;
	error_message?: string;
}

interface InstagramStory {
	id: string;
	timestamp: string;
}

interface DiagnosticAnalysis {
	stories_in_both: number;
	stories_in_db_only: Array<{
		media_id: string;
		status: string;
		created_at: string;
		hours_ago: number;
		error_message?: string;
	}>;
	stories_in_instagram_only: Array<{
		media_id: string;
		timestamp: string;
		hours_ago: number;
	}>;
	expired_stories: number;
	recent_failures: number;
	issues_found: string[];
}

function analyzeStories(dbLogs: PublishingLog[], igStories: InstagramStory[]): DiagnosticAnalysis {
	const now = Date.now();
	const issues: string[] = [];

	// Stories that exist in both database and Instagram
	const storiesInBoth = dbLogs.filter(log =>
		log.status === 'SUCCESS' && igStories.some(story => story.id === log.ig_media_id)
	);

	// Stories in database (marked SUCCESS) but not found on Instagram
	const storiesInDbOnly = dbLogs
		.filter(log => {
			if (log.status !== 'SUCCESS') return false;
			const inInstagram = igStories.some(story => story.id === log.ig_media_id);
			return !inInstagram;
		})
		.map(log => {
			const createdAt = new Date(log.created_at).getTime();
			const hoursAgo = (now - createdAt) / (1000 * 60 * 60);

			return {
				media_id: log.ig_media_id,
				status: log.status,
				created_at: log.created_at,
				hours_ago: Math.round(hoursAgo * 10) / 10,
				error_message: log.error_message,
			};
		});

	// Identify expired stories (>24 hours old)
	const expiredStories = storiesInDbOnly.filter(s => s.hours_ago > 24);

	if (expiredStories.length > 0) {
		issues.push(`${expiredStories.length} stories expired (>24 hours old)`);
	}

	// Stories on Instagram but not in database logs
	const storiesInInstagramOnly = igStories
		.filter(story => !dbLogs.some(log => log.ig_media_id === story.id))
		.map(story => {
			const timestamp = new Date(story.timestamp).getTime();
			const hoursAgo = (now - timestamp) / (1000 * 60 * 60);

			return {
				media_id: story.id,
				timestamp: story.timestamp,
				hours_ago: Math.round(hoursAgo * 10) / 10,
			};
		});

	if (storiesInInstagramOnly.length > 0) {
		issues.push(`${storiesInInstagramOnly.length} stories on Instagram not logged in database`);
	}

	// Recent failures (last 24 hours)
	const recentFailures = dbLogs.filter(log => {
		const createdAt = new Date(log.created_at).getTime();
		const hoursAgo = (now - createdAt) / (1000 * 60 * 60);
		return log.status === 'FAILED' && hoursAgo < 24;
	});

	if (recentFailures.length > 0) {
		issues.push(`${recentFailures.length} failed publish attempts in last 24 hours`);
	}

	// Stories published successfully but missing from Instagram (not expired)
	const missingStories = storiesInDbOnly.filter(s => s.hours_ago < 24);
	if (missingStories.length > 0) {
		issues.push(`${missingStories.length} recent stories (<24h) missing from Instagram`);
	}

	return {
		stories_in_both: storiesInBoth.length,
		stories_in_db_only: storiesInDbOnly,
		stories_in_instagram_only: storiesInInstagramOnly,
		expired_stories: expiredStories.length,
		recent_failures: recentFailures.length,
		issues_found: issues,
	};
}

function generateTroubleshootingSteps(analysis: DiagnosticAnalysis): string[] {
	const steps: string[] = [];

	if (analysis.issues_found.length === 0) {
		steps.push('✅ No issues found. All stories are properly published and visible.');
		return steps;
	}

	// Issue: Expired stories
	if (analysis.expired_stories > 0) {
		steps.push(
			`📅 ${analysis.expired_stories} stories expired: Instagram stories automatically disappear after 24 hours. This is normal behavior.`
		);
	}

	// Issue: Recent failures
	if (analysis.recent_failures > 0) {
		steps.push(
			`❌ ${analysis.recent_failures} recent failures: Check publishing_logs table for error_message column. Common issues: expired token (code 190), rate limit (code 368), invalid media.`
		);
	}

	// Issue: Stories missing from Instagram (not expired)
	const missingStories = analysis.stories_in_db_only.filter(s => s.hours_ago < 24);
	if (missingStories.length > 0) {
		steps.push(
			`⚠️ ${missingStories.length} recent stories missing: Stories marked SUCCESS in database but not found on Instagram. Possible causes:`
		);
		steps.push('  1. Instagram processing delay (wait 60-90 seconds for videos)');
		steps.push('  2. Publishing succeeded but media was removed by Instagram');
		steps.push('  3. Token expired mid-publish (check for error code 190)');
		steps.push('  4. Wrong Instagram account linked');
	}

	// Issue: Stories on Instagram not in database
	if (analysis.stories_in_instagram_only.length > 0) {
		steps.push(
			`📝 ${analysis.stories_in_instagram_only.length} stories on Instagram not logged: These stories were published outside this app (manually or via other tools).`
		);
	}

	// General troubleshooting
	steps.push('');
	steps.push('🔍 General troubleshooting steps:');
	steps.push('1. Check /debug page for Instagram connection status');
	steps.push('2. Verify access token is not expired');
	steps.push('3. Check Instagram profile directly (@www_hehe_pl)');
	steps.push('4. Review recent publishing_logs for error messages');
	steps.push('5. Try publishing a test story via /debug page');

	return steps;
}
