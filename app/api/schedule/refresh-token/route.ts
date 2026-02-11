import { NextRequest, NextResponse } from 'next/server';
import { refreshAllTokens } from '@/lib/services/token-refresh-service';

/**
 * Automated Token Refresh (All Users)
 * Proactively checks token expiry and refreshes tokens within 7 days of expiring.
 * Called weekly via Vercel cron. Logs results to system_logs for admin visibility.
 */
export async function GET(request: NextRequest) {
	const authHeader = request.headers.get('authorization');
	const secret = process.env.CRON_SECRET;

	if (secret && authHeader !== `Bearer ${secret}`) {
		return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
	}

	if (
		process.env.DISABLE_CRON === 'true' ||
		(process.env.VERCEL_ENV === 'preview' && process.env.STAGING_MODE !== 'true')
	) {
		return NextResponse.json(
			{ message: 'Cron disabled on preview deployment', skipped: true },
			{ status: 200 },
		);
	}

	const summary = await refreshAllTokens();

	const status = summary.failed > 0 && summary.refreshed === 0 ? 500 : 200;

	return NextResponse.json(
		{
			message: `Refreshed ${summary.refreshed}/${summary.totalAccounts} tokens (${summary.skipped} skipped, ${summary.failed} failed)`,
			...summary,
		},
		{ status },
	);
}
