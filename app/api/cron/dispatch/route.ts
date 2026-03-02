/**
 * Cron Dispatcher — Single daily cron that triggers all sub-jobs.
 *
 * Vercel Hobby plans only allow daily cron schedules. This dispatcher
 * runs once daily and sequentially calls every cron endpoint, passing
 * through the CRON_SECRET for authentication.
 *
 * Schedule: 0 0 * * * (daily at midnight UTC, configured in vercel.json)
 */

import { NextRequest, NextResponse } from 'next/server';
import { Logger } from '@/lib/utils/logger';

const MODULE = 'api:cron:dispatch';

export const maxDuration = 300;

interface JobResult {
	path: string;
	status: number;
	ok: boolean;
	durationMs: number;
	error?: string;
}

const JOBS = [
	'/api/cron/process',
	'/api/cron/process-videos',
	'/api/cron/identity-audit',
	'/api/cron/check-media-health',
	'/api/cron/cleanup-logs',
	'/api/cron/cleanup-orphans',
	'/api/schedule/refresh-token',
];

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

	// Determine base URL from the incoming request
	const url = new URL(req.url);
	const baseUrl = `${url.protocol}//${url.host}`;

	await Logger.info(MODULE, `Dispatching ${JOBS.length} cron jobs`, { baseUrl });

	const results: JobResult[] = [];

	for (const path of JOBS) {
		const start = Date.now();
		try {
			const res = await fetch(`${baseUrl}${path}`, {
				method: 'GET',
				headers: { Authorization: `Bearer ${cronSecret}` },
			});

			results.push({
				path,
				status: res.status,
				ok: res.ok,
				durationMs: Date.now() - start,
			});
		} catch (err) {
			results.push({
				path,
				status: 0,
				ok: false,
				durationMs: Date.now() - start,
				error: err instanceof Error ? err.message : String(err),
			});
		}
	}

	const succeeded = results.filter((r) => r.ok).length;
	const failed = results.filter((r) => !r.ok).length;
	const totalMs = results.reduce((sum, r) => sum + r.durationMs, 0);

	await Logger.info(MODULE, `Dispatch complete: ${succeeded}/${JOBS.length} ok, ${failed} failed`, {
		totalMs,
		results,
	});

	return NextResponse.json({
		success: failed === 0,
		dispatched: JOBS.length,
		succeeded,
		failed,
		totalMs,
		results,
	});
}
