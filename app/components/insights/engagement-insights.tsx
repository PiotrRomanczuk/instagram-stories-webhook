'use client';

import { useMemo, useState } from 'react';
import useSWR from 'swr';
import { Trophy, Eye, Sparkles, ChevronUp, BarChart3 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Skeleton } from '@/app/components/ui/skeleton';
import { Link } from '@/i18n/routing';
import { cn } from '@/lib/utils';
import type { StoriesResponse, InstagramStory } from '@/lib/instagram/media';
import type { StoryInsightsResponse } from '@/app/api/instagram/stories/insights/route';
import { rankStoriesByEngagement, scoreStory } from '@/lib/insights/score-story';
import { SelectedStrip } from './selected-strip';
import { LeaderboardRow } from './leaderboard-row';

const fetcher = async <T,>(url: string): Promise<T> => {
	const res = await fetch(url);
	if (!res.ok) {
		const body = await res.json().catch(() => ({}));
		throw new Error(body.error ?? `Request failed (${res.status})`);
	}
	return res.json();
};

type SortMode = 'engagement' | 'newest' | 'oldest';
type FilterMode = 'all' | 'image' | 'video';

export function EngagementInsights() {
	const { data: storiesData, isLoading: storiesLoading } = useSWR<StoriesResponse>(
		'/api/instagram/recent-stories?limit=200',
		fetcher,
		{ revalidateOnFocus: false, dedupingInterval: 60_000 },
	);

	const stories = useMemo(() => storiesData?.stories ?? [], [storiesData]);
	const insightsKey = stories.length
		? `/api/instagram/stories/insights?ids=${stories.map((s) => s.id).join(',')}`
		: null;
	const { data: insightsData, isLoading: insightsLoading } = useSWR<StoryInsightsResponse>(
		insightsKey,
		fetcher,
		{ revalidateOnFocus: false, dedupingInterval: 60_000 },
	);

	const [selectedIds, setSelectedIds] = useState<string[]>([]);
	const [sort, setSort] = useState<SortMode>('engagement');
	const [filter, setFilter] = useState<FilterMode>('all');

	const insights = useMemo(() => insightsData?.insights ?? {}, [insightsData]);

	const ranked = useMemo(() => {
		const scored = rankStoriesByEngagement(
			stories.map((s) => ({ id: s.id, story: s, metrics: insights[s.id]?.metrics })),
		);
		const filtered = scored.filter((r) => {
			if (filter === 'image') return r.story.story.media_type === 'IMAGE';
			if (filter === 'video') return r.story.story.media_type === 'VIDEO';
			return true;
		});
		if (sort === 'newest' || sort === 'oldest') {
			const dir = sort === 'newest' ? -1 : 1;
			filtered.sort(
				(a, b) =>
					(new Date(a.story.story.timestamp).getTime() -
						new Date(b.story.story.timestamp).getTime()) *
					dir,
			);
		}
		return filtered;
	}, [stories, insights, sort, filter]);

	const stats = useMemo(() => {
		if (stories.length === 0) return null;
		const qualified = ranked.filter((r) => r.qualifies);
		const totalImpressions = stories.reduce((s, x) => {
			const m = insights[x.id]?.metrics;
			return s + (m?.impressions ?? m?.views ?? 0);
		}, 0);
		const totalReach = stories.reduce((s, x) => s + (insights[x.id]?.metrics?.reach ?? 0), 0);
		const reachRate = totalImpressions > 0 ? (totalReach / totalImpressions) * 100 : 0;
		const top = ranked[0];
		const topRatePct = top?.qualifies ? (top.rate * 100).toFixed(0) : '—';
		return {
			active: stories.length,
			qualified: qualified.length,
			topRatePct,
			avgImpressions: stories.length > 0 ? Math.round(totalImpressions / stories.length) : 0,
			reachRate,
		};
	}, [stories, ranked, insights]);

	const maxRate = useMemo(
		() => ranked.reduce((m, r) => Math.max(m, r.qualifies ? r.rate : 0), 0),
		[ranked],
	);

	const selectedStories: InstagramStory[] = useMemo(() => {
		const byId = new Map(stories.map((s) => [s.id, s]));
		return selectedIds.map((id) => byId.get(id)).filter((s): s is InstagramStory => !!s);
	}, [selectedIds, stories]);

	function toggleSelect(id: string) {
		setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
	}

	const isLoading = storiesLoading || (stories.length > 0 && insightsLoading);

	if (isLoading) {
		return (
			<div className="space-y-5">
				<div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
					{Array.from({ length: 4 }).map((_, i) => (
						<Skeleton key={i} className="h-24" />
					))}
				</div>
				<Skeleton className="h-[420px]" />
			</div>
		);
	}

	if (stories.length === 0) {
		return (
			<Card>
				<CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
					<div className="rounded-full bg-muted p-4">
						<BarChart3 className="h-8 w-8 text-muted-foreground/60" />
					</div>
					<h3 className="text-lg font-semibold">No active IG stories</h3>
					<p className="max-w-md text-sm text-muted-foreground">
						Stories live for 24 hours. Post a story or wait for new content; this page
						auto-refreshes every minute.
					</p>
					<Button asChild size="sm">
						<Link href="/">Back to dashboard</Link>
					</Button>
				</CardContent>
			</Card>
		);
	}

	return (
		<div className="space-y-5">
			<div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
				<HeroStat
					label="Active stories"
					value={stats!.active.toString()}
					icon={<Sparkles className="h-4 w-4" />}
					tone="bg-purple-100 text-purple-700"
				/>
				<HeroStat
					label="Top rate"
					value={`${stats!.topRatePct}${stats!.topRatePct === '—' ? '' : '%'}`}
					icon={<Trophy className="h-4 w-4" />}
					tone="bg-amber-100 text-amber-700"
				/>
				<HeroStat
					label="Avg views"
					value={fmtCount(stats!.avgImpressions)}
					icon={<Eye className="h-4 w-4" />}
					tone="bg-blue-100 text-blue-700"
				/>
				<HeroStat
					label="Reach rate"
					value={`${stats!.reachRate.toFixed(0)}%`}
					icon={<ChevronUp className="h-4 w-4" />}
					tone="bg-emerald-100 text-emerald-700"
				/>
			</div>

			<SelectedStrip
				stories={selectedStories}
				onReorder={setSelectedIds}
				onRemove={(id) => setSelectedIds((prev) => prev.filter((x) => x !== id))}
				onClear={() => setSelectedIds([])}
			/>

			<Card>
				<CardHeader className="pb-3">
					<div className="flex flex-wrap items-start justify-between gap-2">
						<div>
							<CardTitle className="flex items-center gap-2 text-base">
								<Trophy className="h-4 w-4 text-amber-500" />
								Story leaderboard
							</CardTitle>
							<p className="mt-0.5 text-xs text-muted-foreground">
								Click a story to add it to your TT inbox draft. Drag tiles in the
								selection above to reorder.
							</p>
						</div>
						<div className="flex flex-wrap items-center gap-1.5">
							<FilterChips value={filter} onChange={setFilter} />
							<SortChips value={sort} onChange={setSort} />
						</div>
					</div>
				</CardHeader>
				<CardContent>
					<ul className="divide-y rounded-lg border">
						{ranked.map((r, idx) => (
							<LeaderboardRow
								key={r.story.id}
								story={r.story.story}
								score={scoreStory(r.story.metrics ?? {})}
								metrics={r.story.metrics}
								rank={idx}
								maxRate={maxRate}
								isSelected={selectedIds.includes(r.story.id)}
								onToggle={() => toggleSelect(r.story.id)}
							/>
						))}
					</ul>
					{ranked.length === 0 && (
						<div className="py-8 text-center text-sm text-muted-foreground">
							No stories match this filter.
						</div>
					)}
				</CardContent>
			</Card>
		</div>
	);
}

function HeroStat({
	label,
	value,
	icon,
	tone,
}: {
	label: string;
	value: string;
	icon: React.ReactNode;
	tone: string;
}) {
	return (
		<Card>
			<CardContent className="p-4">
				<div className="flex items-center gap-2">
					<div className={cn('rounded-md p-1.5', tone)}>{icon}</div>
					<span className="text-xs font-medium text-muted-foreground">{label}</span>
				</div>
				<div className="mt-2 text-2xl font-bold tabular-nums">{value}</div>
			</CardContent>
		</Card>
	);
}

function FilterChips({ value, onChange }: { value: FilterMode; onChange: (v: FilterMode) => void }) {
	const opts: { v: FilterMode; label: string }[] = [
		{ v: 'all', label: 'All' },
		{ v: 'image', label: 'Photos' },
		{ v: 'video', label: 'Videos' },
	];
	return <Chips opts={opts} value={value} onChange={onChange} />;
}

function SortChips({ value, onChange }: { value: SortMode; onChange: (v: SortMode) => void }) {
	const opts: { v: SortMode; label: string }[] = [
		{ v: 'engagement', label: 'Top rate' },
		{ v: 'newest', label: 'Newest' },
		{ v: 'oldest', label: 'Oldest' },
	];
	return <Chips opts={opts} value={value} onChange={onChange} />;
}

function Chips<T extends string>({
	opts,
	value,
	onChange,
}: {
	opts: { v: T; label: string }[];
	value: T;
	onChange: (v: T) => void;
}) {
	return (
		<div className="flex items-center gap-0.5 rounded-md border bg-muted/40 p-0.5">
			{opts.map((o) => (
				<button
					key={o.v}
					onClick={() => onChange(o.v)}
					className={cn(
						'rounded px-2 py-0.5 text-[11px] font-medium transition-colors',
						value === o.v
							? 'bg-background text-foreground shadow-sm'
							: 'text-muted-foreground hover:text-foreground',
					)}
				>
					{o.label}
				</button>
			))}
		</div>
	);
}

function fmtCount(n: number): string {
	if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
	return n.toString();
}
