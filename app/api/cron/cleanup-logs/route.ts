/**
 * Log Retention Cron Job
 * Deletes records older than the configured TTL from monitoring tables.
 *
 * Schedule: daily (configured in vercel.json)
 * TTLs:
 *   system_logs   → 30 days
 *   auth_events   → 90 days
 *   api_quota_history → 90 days
 *   admin_audit_log → 365 days (compliance)
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/config/supabase-admin';
import { Logger } from '@/lib/utils/logger';

const MODULE = 'api:cron:cleanup-logs';

const RETENTION: Record<string, number> = {
	system_logs: 30,
	auth_events: 90,
	api_quota_history: 90,
	admin_audit_log: 365,
};

async function purgeTable(
	table: string,
	retentionDays: number,
): Promise<{ table: string; deleted: number; error?: string }> {
	const cutoff = new Date(
		Date.now() - retentionDays * 24 * 60 * 60 * 1000,
	).toISOString();

	const { error, count } = await supabaseAdmin
		.from(table)
		.delete({ count: 'exact' })
		.lt('created_at', cutoff);

	if (error) {
		return { table, deleted: 0, error: error.message };
	}

	return { table, deleted: count ?? 0 };
}

export async function GET(req: NextRequest) {
	const authHeader = req.headers.get('authorization');
	const cronSecret = process.env.CRON_SECRET;

	if (!cronSecret) {
		Logger.error(MODULE, 'CRON_SECRET not configured');
		return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
	}

	if (authHeader !== `Bearer ${cronSecret}`) {
		return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
	}

	await Logger.info(MODULE, 'Starting log retention cleanup');

	const results = await Promise.all(
		Object.entries(RETENTION).map(([table, days]) => purgeTable(table, days)),
	);

	const errors = results.filter((r) => r.error);
	const totalDeleted = results.reduce((sum, r) => sum + r.deleted, 0);

	await Logger.info(MODULE, `Log cleanup complete: ${totalDeleted} rows deleted`, {
		results,
		errors: errors.length,
	});

	if (errors.length > 0) {
		errors.forEach((e) =>
			Logger.error(MODULE, `Failed to purge ${e.table}: ${e.error}`),
		);
	}

	return NextResponse.json({ success: true, totalDeleted, results });
}
