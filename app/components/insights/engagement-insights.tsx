'use client';

import { useMemo, useState } from 'react';
import useSWR from 'swr';
import { useTheme } from 'next-themes';
import { Skeleton } from '@/app/components/ui/skeleton';
import type { InstagramStory } from '@/lib/instagram/media';
import type { StoriesWithInsightsResponse } from '@/app/api/instagram/stories/with-insights/route';
import { rankStoriesByEngagement, scoreStory } from '@/lib/insights/score-story';
import { insightsTokenStyle, MONO_STACK } from './insights-tokens';
import { StatusBar } from './status-bar';
import {
	LeaderboardToolbar,
	type FilterMode,
	type SortMode,
} from './leaderboard-toolbar';
import { LeaderboardRow } from './leaderboard-row';
import { CompilationPane } from './compilation-pane';
import { ZeroState } from './zero-state';
import { useCompilationSummary } from './use-compilation-summary';

const fetcher = async <T,>(url: string): Promise<T> => {
	const res = await fetch(url);
	if (!res.ok) {
		const body = await res.json().catch(() => ({}));
		throw new Error(body.error ?? `Request failed (${res.status})`);
	}
	return res.json();
};

export function EngagementInsights() {
	const { resolvedTheme } = useTheme();
	const themeName = resolvedTheme === 'dark' ? 'dark' : 'light';

	const { data: combined, isLoading } = useSWR<StoriesWithInsightsResponse>(
		'/api/instagram/stories/with-insights?limit=200',
		fetcher,
		{ revalidateOnFocus: false, dedupingInterval: 60_000, keepPreviousData: true },
	);

	const stories = useMemo(() => combined?.stories ?? [], [combined]);
	const insights = useMemo(() => combined?.insights ?? {}, [combined]);

	const [selectedIds, setSelectedIds] = useState<string[]>([]);
	const [filter, setFilter] = useState<FilterMode>('all');
	const [sort, setSort] = useState<SortMode>('top');
	const [qualifiedOnly, setQualifiedOnly] = useState(true);

	const ranked = useMemo(() => {
		const all = rankStoriesByEngagement(
			stories.map((s) => ({ id: s.id, story: s, metrics: insights[s.id]?.metrics })),
		);
		const filtered = all.filter((r) => {
			if (filter === 'photos' && r.story.story.media_type !== 'IMAGE') return false;
			if (filter === 'videos' && r.story.story.media_type !== 'VIDEO') return false;
			if (qualifiedOnly && !r.qualifies) return false;
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
	}, [stories, insights, filter, sort, qualifiedOnly]);

	const pendingCount = useMemo(
		() => stories.filter((s) => !scoreStory(insights[s.id]?.metrics ?? {}).qualifies).length,
		[stories, insights],
	);

	const positionByStory = useMemo(
		() => new Map(selectedIds.map((id, i) => [id, i + 1])),
		[selectedIds],
	);
	const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

	const pickedStories: InstagramStory[] = useMemo(() => {
		const byId = new Map(stories.map((s) => [s.id, s]));
		return selectedIds
			.map((id) => byId.get(id))
			.filter((s): s is InstagramStory => Boolean(s));
	}, [selectedIds, stories]);

	const summary = useCompilationSummary(pickedStories.length);

	const rateById = useMemo(() => {
		const m = new Map<string, number | null>();
		for (const s of stories) {
			const score = scoreStory(insights[s.id]?.metrics ?? {});
			m.set(s.id, score.qualifies ? score.rate : null);
		}
		return m;
	}, [stories, insights]);

	const viewsById = useMemo(() => {
		const m = new Map<string, number | undefined>();
		for (const s of stories) {
			const metrics = insights[s.id]?.metrics;
			m.set(s.id, metrics?.impressions ?? metrics?.views);
		}
		return m;
	}, [stories, insights]);

	function toggle(id: string) {
		setSelectedIds((prev) =>
			prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
		);
	}

	const tokenStyle = insightsTokenStyle(themeName);

	if (isLoading && !combined) {
		return (
			<div style={tokenStyle} className="min-h-[640px]" >
				<div
					className="space-y-4 p-6"
					style={{ background: 'var(--bg)', color: 'var(--ink)', minHeight: '100%' }}
				>
					<Skeleton className="h-10 w-64" />
					<Skeleton className="h-12 w-full" />
					<Skeleton className="h-[420px] w-full" />
				</div>
			</div>
		);
	}

	return (
		<div
			style={{
				...tokenStyle,
				background: 'var(--bg)',
				color: 'var(--ink)',
				fontFamily: "'Inter', system-ui, sans-serif",
			}}
			className="flex min-h-[calc(100vh-4rem)] flex-col"
		>
			<header className="flex flex-col gap-1.5 px-5 pb-4 pt-6 sm:px-6">
				<div
					className="flex items-center gap-2 text-[11.5px]"
					style={{ color: 'var(--muted)' }}
				>
					<span
						className="uppercase"
						style={{
							fontFamily: MONO_STACK,
							letterSpacing: '0.08em',
						}}
					>
						Insights
					</span>
					<span aria-hidden style={{ color: 'var(--muted-2)' }}>
						·
					</span>
					<span style={{ fontFamily: MONO_STACK }}>24h window</span>
				</div>
				<h1
					className="text-3xl font-bold tracking-tight sm:text-[32px]"
					style={{ color: 'var(--ink)', letterSpacing: '-0.025em' }}
				>
					Story Engagement
				</h1>
				<p
					className="max-w-[640px] text-[13.5px]"
					style={{ color: 'var(--muted)' }}
				>
					Per-story performance. Pick the moments worth reposting — they&apos;ll be
					composed in order into your next TikTok inbox draft.
				</p>
			</header>

			<StatusBar storyCount={stories.length} inboxUsed={0} summary={summary} />

			<LeaderboardToolbar
				filter={filter}
				sort={sort}
				qualifiedOnly={qualifiedOnly}
				total={stories.length}
				shown={ranked.length}
				onFilterChange={setFilter}
				onSortChange={setSort}
				onQualifiedOnlyChange={setQualifiedOnly}
			/>

			<div
				className="flex min-h-0 flex-1 flex-col xl:flex-row"
				style={{ borderTop: '1px solid var(--line-2)' }}
			>
				<div className="min-w-0 flex-1 overflow-auto">
					{ranked.length === 0 ? (
						<ZeroState
							filter={filter}
							qualifiedOnly={qualifiedOnly}
							onShowAll={() => {
								setFilter('all');
								setQualifiedOnly(false);
							}}
						/>
					) : (
						<>
							{!qualifiedOnly && pendingCount > 0 && (
								<div
									className="flex items-center gap-2.5 px-5 py-2.5 text-[12px] sm:px-6"
									style={{
										background: 'var(--bg-2)',
										borderBottom: '1px solid var(--line-2)',
										color: 'var(--muted)',
									}}
								>
									<span style={{ fontFamily: MONO_STACK, color: 'var(--ink)' }}>
										{pendingCount}
									</span>{' '}
									{pendingCount === 1 ? 'story' : 'stories'} below the 50-impression floor.
									<span aria-hidden style={{ color: 'var(--muted-2)' }}>
										·
									</span>
									<button
										onClick={() => setQualifiedOnly(true)}
										style={{
											color: 'var(--ink)',
											borderBottom: '1px dashed var(--line)',
											background: 'transparent',
											border: 'none',
											padding: 0,
											cursor: 'pointer',
										}}
									>
										Hide pending
									</button>
								</div>
							)}
							{ranked.map((r, idx) => (
								<LeaderboardRow
									key={r.story.id}
									story={r.story.story}
									score={scoreStory(r.story.metrics ?? {})}
									metrics={r.story.metrics}
									rank={idx}
									isSelected={selectedSet.has(r.story.id)}
									position={positionByStory.get(r.story.id) ?? null}
									onToggle={() => toggle(r.story.id)}
								/>
							))}
						</>
					)}
				</div>

				<CompilationPane
					stories={pickedStories}
					rateById={rateById}
					viewsById={viewsById}
					summary={summary}
					onReorder={setSelectedIds}
					onRemove={(id) =>
						setSelectedIds((prev) => prev.filter((x) => x !== id))
					}
					onClear={() => setSelectedIds([])}
					onSent={() => setSelectedIds([])}
				/>
			</div>
		</div>
	);
}
