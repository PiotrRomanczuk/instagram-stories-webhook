import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/config/supabase-admin';
import { Logger } from '@/lib/utils/logger';
import type { UserRole } from '@/lib/types';

const MODULE = 'api:dashboard:pipeline-summary';

interface CronRunSummary {
	job: string;
	lastRunAt: string | null;
	status: 'idle' | 'running' | 'unknown';
}

interface PipelineSummary {
	stats: {
		archived24h: number;
		composing: number;
		awaitingPublish: number;
		published24h: number;
		failedComposing: number;
		failedPublishing: number;
		activeAudioTracks: number;
	};
	connections: {
		instagram: { connected: boolean; username: string | null; expiresAt: number | null };
		tiktok: { connected: boolean; openId: string | null; expiresAt: number | null };
	};
	cron: CronRunSummary[];
	pipelineEnabled: boolean;
}

const DAY_MS = 24 * 60 * 60 * 1000;

async function countSince(table: string, column: string, sinceIso: string, userId: string): Promise<number> {
	const { count, error } = await supabaseAdmin
		.from(table)
		.select('id', { count: 'exact', head: true })
		.eq('user_id', userId)
		.gte(column, sinceIso);
	if (error) {
		Logger.error(MODULE, `countSince ${table}.${column} error: ${error.message}`);
		return 0;
	}
	return count ?? 0;
}

async function countWhere(
	table: string,
	filters: Record<string, string>,
	userId: string,
): Promise<number> {
	let query = supabaseAdmin
		.from(table)
		.select('id', { count: 'exact', head: true })
		.eq('user_id', userId);
	for (const [col, val] of Object.entries(filters)) {
		query = query.eq(col, val);
	}
	const { count, error } = await query;
	if (error) {
		Logger.error(MODULE, `countWhere ${table} error: ${error.message}`);
		return 0;
	}
	return count ?? 0;
}

export async function GET() {
	const session = await getServerSession(authOptions);
	if (!session?.user?.id) {
		return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
	}

	const userId = session.user.id;
	const role = (session.user as { role?: UserRole }).role;
	if (role !== 'admin' && role !== 'developer') {
		return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
	}

	const sinceIso = new Date(Date.now() - DAY_MS).toISOString();

	const [
		archived24h,
		composing,
		awaitingPublish,
		published24h,
		failedComposing,
		failedPublishing,
		audioTracksCount,
		igRow,
		tiktokRow,
		cronLocksRes,
	] = await Promise.all([
		countSince('story_archive', 'created_at', sinceIso, userId),
		countWhere('composed_videos', { composition_status: 'processing' }, userId),
		countWhere('composed_videos', { composition_status: 'completed', tiktok_publish_status: 'pending' }, userId),
		(async () => {
			const { count, error } = await supabaseAdmin
				.from('composed_videos')
				.select('id', { count: 'exact', head: true })
				.eq('user_id', userId)
				.eq('tiktok_publish_status', 'published')
				.gte('tiktok_published_at', sinceIso);
			if (error) {
				Logger.error(MODULE, `published24h error: ${error.message}`);
				return 0;
			}
			return count ?? 0;
		})(),
		countWhere('composed_videos', { composition_status: 'failed' }, userId),
		countWhere('composed_videos', { tiktok_publish_status: 'failed' }, userId),
		(async () => {
			const { count, error } = await supabaseAdmin
				.from('audio_tracks')
				.select('id', { count: 'exact', head: true })
				.eq('is_active', true);
			if (error) return 0;
			return count ?? 0;
		})(),
		supabaseAdmin
			.from('linked_accounts')
			.select('ig_username, expires_at')
			.eq('user_id', userId)
			.eq('provider', 'facebook')
			.maybeSingle(),
		supabaseAdmin
			.from('linked_accounts')
			.select('provider_account_id, expires_at, refresh_expires_at, refresh_token')
			.eq('user_id', userId)
			.eq('provider', 'tiktok')
			.maybeSingle(),
		supabaseAdmin
			.from('cron_locks')
			.select('lock_name, acquired_at, released_at')
			.in('lock_name', ['archive-stories', 'tiktok-pipeline', 'refresh-tiktok-token'])
			.order('acquired_at', { ascending: false })
			.limit(20),
	]);

	const cronByJob = new Map<string, CronRunSummary>();
	for (const job of ['archive-stories', 'tiktok-pipeline', 'refresh-tiktok-token']) {
		cronByJob.set(job, { job, lastRunAt: null, status: 'unknown' });
	}
	for (const row of cronLocksRes.data ?? []) {
		const existing = cronByJob.get(row.lock_name);
		if (!existing || existing.lastRunAt !== null) continue;
		cronByJob.set(row.lock_name, {
			job: row.lock_name,
			lastRunAt: row.acquired_at,
			status: row.released_at ? 'idle' : 'running',
		});
	}

	const summary: PipelineSummary = {
		stats: {
			archived24h,
			composing,
			awaitingPublish,
			published24h,
			failedComposing,
			failedPublishing,
			activeAudioTracks: audioTracksCount,
		},
		connections: {
			instagram: {
				connected: Boolean(igRow.data),
				username: (igRow.data as { ig_username?: string } | null)?.ig_username ?? null,
				expiresAt: (igRow.data as { expires_at?: number } | null)?.expires_at ?? null,
			},
			tiktok: (() => {
				const row = tiktokRow.data as {
					provider_account_id?: string;
					expires_at?: number | null;
					refresh_expires_at?: number | null;
					refresh_token?: string | null;
				} | null;
				// TikTok access tokens last 24h but auto-refresh while the refresh token (~365d) is valid.
				// Surface the refresh token's expiry so the UI doesn't show "Expired" every day.
				const effectiveExpiresAt =
					row?.refresh_expires_at ?? (row?.refresh_token ? null : row?.expires_at ?? null);
				return {
					connected: Boolean(row),
					openId: row?.provider_account_id ?? null,
					expiresAt: effectiveExpiresAt,
				};
			})(),
		},
		cron: Array.from(cronByJob.values()),
		pipelineEnabled: process.env.TIKTOK_PIPELINE_ENABLED === 'true',
	};

	return NextResponse.json(summary);
}
