import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { requireDeveloper } from '@/lib/auth-helpers';
import { supabaseAdmin } from '@/lib/config/supabase-admin';
import { Logger } from '@/lib/utils/logger';

const MODULE = 'cron-debug:status';

interface CronJob {
	name: string;
	schedule: string;
}

const CRON_JOBS: CronJob[] = [
	{
		name: 'process',
		schedule: '* * * * *', // Every minute
	},
	{
		name: 'identity-audit',
		schedule: '*/5 * * * *', // Every 5 minutes
	},
	{
		name: 'check-media-health',
		schedule: '0 */6 * * *', // Every 6 hours
	},
];

function calculateNextRun(schedule: string): Date {
	const now = new Date();

	if (schedule === '* * * * *') {
		// Every minute
		return new Date(now.getTime() + 60 * 1000);
	} else if (schedule === '*/5 * * * *') {
		// Every 5 minutes
		const minutes = now.getMinutes();
		const nextMinute = Math.ceil(minutes / 5) * 5;
		const nextRun = new Date(now);
		nextRun.setMinutes(nextMinute, 0, 0);
		if (nextRun <= now) {
			nextRun.setTime(nextRun.getTime() + 5 * 60 * 1000);
		}
		return nextRun;
	} else if (schedule === '0 */6 * * *') {
		// Every 6 hours
		const hours = now.getHours();
		const nextHour = Math.ceil(hours / 6) * 6;
		const nextRun = new Date(now);
		nextRun.setHours(nextHour, 0, 0, 0);
		if (nextRun <= now) {
			nextRun.setTime(nextRun.getTime() + 6 * 60 * 60 * 1000);
		}
		return nextRun;
	}

	return new Date(now.getTime() + 60 * 1000);
}

function getRelativeTime(date: Date): string {
	const now = new Date();
	const diff = now.getTime() - date.getTime();
	const minutes = Math.floor(diff / (1000 * 60));
	const hours = Math.floor(diff / (1000 * 60 * 60));
	const days = Math.floor(diff / (1000 * 60 * 60 * 24));

	if (minutes < 1) return 'just now';
	if (minutes < 60) return `${minutes}m ago`;
	if (hours < 24) return `${hours}h ago`;
	return `${days}d ago`;
}

function getCountdownTime(date: Date): string {
	const now = new Date();
	const diff = date.getTime() - now.getTime();
	const seconds = Math.floor(diff / 1000);
	const minutes = Math.floor(diff / (1000 * 60));
	const hours = Math.floor(diff / (1000 * 60 * 60));

	if (seconds < 0) return 'overdue';
	if (seconds < 60) return `in ${seconds}s`;
	if (minutes < 60) return `in ${minutes}m`;
	return `in ${hours}h`;
}

export async function GET(req: NextRequest) {
	try {
		const session = await getServerSession(authOptions);
		requireDeveloper(session);

		const now = new Date();
		const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

		const jobsStatus = await Promise.all(
			CRON_JOBS.map(async (job) => {
				// Get last execution log for this job
				const { data: logs, error } = await supabaseAdmin
					.from('system_logs')
					.select('message, created_at, level, details')
					.eq('module', 'cron')
					.ilike('message', `%${job.name}%`)
					.gte('created_at', oneDayAgo.toISOString())
					.order('created_at', { ascending: false })
					.limit(1);

				let lastRun = null;
				let lastStatus = 'unknown';
				let lastMessage = 'No recent execution';

				if (logs && logs.length > 0) {
					const lastLog = logs[0];
					lastRun = new Date(lastLog.created_at);
					lastStatus = lastLog.level === 'error' ? 'error' : 'success';
					lastMessage = lastLog.message;
				}

				const nextRun = calculateNextRun(job.schedule);

				return {
					name: job.name,
					schedule: job.schedule,
					lastRun: lastRun ? lastRun.toISOString() : null,
					lastRunRelative: lastRun ? getRelativeTime(lastRun) : 'never',
					lastStatus,
					lastMessage,
					nextExpectedRun: nextRun.toISOString(),
					nextRunCountdown: getCountdownTime(nextRun),
				};
			}),
		);

		return NextResponse.json({
			jobs: jobsStatus,
			timestamp: now.toISOString(),
		});
	} catch (error) {
		console.error('Error fetching cron status:', error);
		return NextResponse.json(
			{
				error:
					error instanceof Error ? error.message : 'Failed to fetch cron status',
			},
			{ status: 500 },
		);
	}
}
