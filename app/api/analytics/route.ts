/**
 * Pipeline analytics for the IG -> TT drafts flow.
 *
 * GET /api/analytics?range=7d|30d|90d
 *
 * Returns counts of stories archived, compositions drafted to TT inbox,
 * the success rate of those drafts, and current inbox-slot saturation
 * for the connected TikTok account. Plus a daily breakdown for charting.
 *
 * Scoped to the requesting user (RLS-aligned for multi-tenant safety
 * even though the current product is single-account-per-user).
 */
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/config/supabase-admin';

type RangeKey = '7d' | '30d' | '90d';

const RANGE_DAYS: Record<RangeKey, number> = { '7d': 7, '30d': 30, '90d': 90 };
const TT_INBOX_DAILY_CAP = 5;

interface KpiDelta {
	value: number;
	change: number | null; // percent change vs previous equal-length period, null if no prior data
}

interface DailyPoint {
	date: string; // ISO yyyy-mm-dd
	archived: number;
	drafted: number;
	published: number;
}

function pctChange(current: number, prior: number): number | null {
	if (prior === 0) return current > 0 ? null : 0;
	return Math.round(((current - prior) / prior) * 100);
}

function startOfDayUtc(d: Date): Date {
	const x = new Date(d);
	x.setUTCHours(0, 0, 0, 0);
	return x;
}

function isoDay(d: Date): string {
	return d.toISOString().slice(0, 10);
}

function buildDailySkeleton(start: Date, days: number): Map<string, DailyPoint> {
	const map = new Map<string, DailyPoint>();
	for (let i = 0; i < days; i++) {
		const d = new Date(start);
		d.setUTCDate(start.getUTCDate() + i);
		const key = isoDay(d);
		map.set(key, { date: key, archived: 0, drafted: 0, published: 0 });
	}
	return map;
}

export async function GET(req: NextRequest) {
	const session = await getServerSession(authOptions);
	if (!session?.user?.id) {
		return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
	}
	const role = (session.user as { role?: string }).role;
	if (role !== 'admin' && role !== 'developer') {
		return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
	}
	const userId = session.user.id;

	const rangeParam = (req.nextUrl.searchParams.get('range') ?? '30d') as RangeKey;
	const range: RangeKey = rangeParam in RANGE_DAYS ? rangeParam : '30d';
	const days = RANGE_DAYS[range];

	const now = new Date();
	const today = startOfDayUtc(now);
	const periodStart = new Date(today);
	periodStart.setUTCDate(today.getUTCDate() - (days - 1));
	const priorEnd = new Date(periodStart);
	const priorStart = new Date(priorEnd);
	priorStart.setUTCDate(priorEnd.getUTCDate() - days);

	const periodStartIso = periodStart.toISOString();
	const priorStartIso = priorStart.toISOString();
	const priorEndIso = priorEnd.toISOString();

	// Pull only the columns we need for both windows in one go each.
	const [archivedRowsRes, draftRowsRes] = await Promise.all([
		supabaseAdmin
			.from('story_archive')
			.select('ig_timestamp')
			.eq('user_id', userId)
			.gte('ig_timestamp', priorStartIso),
		supabaseAdmin
			.from('composed_videos')
			.select('created_at,tiktok_publish_status,tiktok_published_at')
			.eq('user_id', userId)
			.gte('created_at', priorStartIso),
	]);

	if (archivedRowsRes.error || draftRowsRes.error) {
		return NextResponse.json(
			{ error: archivedRowsRes.error?.message || draftRowsRes.error?.message || 'Query failed' },
			{ status: 500 },
		);
	}

	const archivedRows = archivedRowsRes.data ?? [];
	const draftRows = draftRowsRes.data ?? [];

	// Bucket into current vs prior, plus a per-day map for the chart.
	const daily = buildDailySkeleton(periodStart, days);
	let archivedCurrent = 0;
	let archivedPrior = 0;
	let draftedCurrent = 0;
	let draftedPrior = 0;
	let publishedCurrent = 0;
	let publishedPrior = 0;

	for (const r of archivedRows) {
		const ts = r.ig_timestamp as string;
		if (!ts) continue;
		const inCurrent = ts >= periodStartIso;
		const inPrior = ts < periodStartIso && ts >= priorStartIso && ts < priorEndIso;
		if (inCurrent) {
			archivedCurrent++;
			const day = isoDay(new Date(ts));
			const cell = daily.get(day);
			if (cell) cell.archived++;
		} else if (inPrior) {
			archivedPrior++;
		}
	}

	for (const r of draftRows) {
		const created = r.created_at as string;
		const status = r.tiktok_publish_status as string | null;
		const isPublished = status === 'published';
		const inCurrent = created >= periodStartIso;
		const inPrior = created < periodStartIso && created >= priorStartIso && created < priorEndIso;
		if (inCurrent) {
			draftedCurrent++;
			if (isPublished) publishedCurrent++;
			const day = isoDay(new Date(created));
			const cell = daily.get(day);
			if (cell) {
				cell.drafted++;
				if (isPublished) cell.published++;
			}
		} else if (inPrior) {
			draftedPrior++;
			if (isPublished) publishedPrior++;
		}
	}

	const publishRateCurrent = draftedCurrent > 0 ? (publishedCurrent / draftedCurrent) * 100 : 0;
	const publishRatePrior = draftedPrior > 0 ? (publishedPrior / draftedPrior) * 100 : 0;

	// Inbox slot use today: drafts created in last 24h that are pending /
	// uploading / published count toward TT's 5-pending-shares-per-24h cap.
	// Failed drafts don't count.
	const last24hIso = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
	const inboxUsed = draftRows.filter(
		(r) => (r.created_at as string) >= last24hIso && r.tiktok_publish_status !== 'failed',
	).length;

	const archived: KpiDelta = {
		value: archivedCurrent,
		change: pctChange(archivedCurrent, archivedPrior),
	};
	const drafted: KpiDelta = {
		value: draftedCurrent,
		change: pctChange(draftedCurrent, draftedPrior),
	};
	const publishRate: KpiDelta = {
		value: Math.round(publishRateCurrent),
		change: pctChange(Math.round(publishRateCurrent), Math.round(publishRatePrior)),
	};

	return NextResponse.json({
		range,
		periodStart: periodStartIso,
		kpis: {
			archived,
			drafted,
			publishRate,
			inboxToday: { used: inboxUsed, cap: TT_INBOX_DAILY_CAP },
		},
		daily: Array.from(daily.values()),
	});
}
