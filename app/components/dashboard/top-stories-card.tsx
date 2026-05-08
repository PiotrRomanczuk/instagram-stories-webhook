'use client';

import { useState, useMemo } from 'react';
import useSWR from 'swr';
import {
	Trophy,
	Eye,
	Users,
	MessageCircle,
	Send,
	Loader2,
	Check,
	Image as ImageIcon,
	Video,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Skeleton } from '@/app/components/ui/skeleton';
import { Badge } from '@/app/components/ui/badge';
import { Link } from '@/i18n/routing';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { StoriesResponse } from '@/lib/instagram/media';
import type { StoryInsightsResponse } from '@/app/api/instagram/stories/insights/route';
import { rankStoriesByEngagement } from '@/lib/insights/score-story';
import { proxyUrl } from '@/lib/instagram/proxy-url';

const fetcher = async <T,>(url: string): Promise<T> => {
	const res = await fetch(url);
	if (!res.ok) {
		const body = await res.json().catch(() => ({}));
		throw new Error(body.error ?? `Request failed (${res.status})`);
	}
	return res.json();
};

const MIN_STORIES = 3;
const DEFAULT_TARGET = 7;

function fmt(n: number | undefined): string {
	if (n === undefined || n === null) return '—';
	if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
	return n.toString();
}

function fmtAge(iso: string): string {
	const diff = Date.now() - new Date(iso).getTime();
	const hr = Math.floor(diff / (1000 * 60 * 60));
	if (hr < 24) return `${Math.max(hr, 0)}h`;
	const d = Math.floor(hr / 24);
	return `${d}d`;
}

export function TopStoriesCard() {
	const { data: storiesData, isLoading: storiesLoading, mutate } = useSWR<StoriesResponse>(
		'/api/instagram/recent-stories?limit=200',
		fetcher,
		{ revalidateOnFocus: false, dedupingInterval: 60_000 },
	);

	const liveStories = useMemo(() => storiesData?.stories ?? [], [storiesData]);
	const insightsKey = liveStories.length
		? `/api/instagram/stories/insights?ids=${liveStories.map((s) => s.id).join(',')}`
		: null;
	const { data: insightsData, isLoading: insightsLoading } = useSWR<StoryInsightsResponse>(
		insightsKey,
		fetcher,
		{ revalidateOnFocus: false, dedupingInterval: 60_000 },
	);

	const ranked = useMemo(() => {
		const insights = insightsData?.insights ?? {};
		return rankStoriesByEngagement(
			liveStories.map((s) => ({ id: s.id, story: s, metrics: insights[s.id]?.metrics })),
		);
	}, [liveStories, insightsData]);

	const [selected, setSelected] = useState<Set<string>>(new Set());
	const [sending, setSending] = useState(false);

	const isLoading = storiesLoading || (liveStories.length > 0 && insightsLoading);
	const maxRate = useMemo(
		() => ranked.reduce((m, r) => Math.max(m, r.rate), 0),
		[ranked],
	);

	function toggle(id: string) {
		setSelected((prev) => {
			const next = new Set(prev);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			return next;
		});
	}

	function selectTop() {
		const top = ranked.slice(0, DEFAULT_TARGET).map((r) => r.story.story.id);
		setSelected(new Set(top));
	}

	async function send() {
		if (selected.size < MIN_STORIES) {
			toast.error(`Pick at least ${MIN_STORIES} stories`);
			return;
		}
		setSending(true);
		try {
			const res = await fetch('/api/compositions/compose', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ igMediaIds: Array.from(selected) }),
			});
			const body = await res.json().catch(() => ({}));
			if (res.ok) {
				toast.success(
					`Composing ${body.storyCount} stories — TT inbox in ~60s`,
					{ description: body.message },
				);
				setSelected(new Set());
				mutate();
			} else {
				toast.error(body.error ?? `Send failed (${res.status})`);
			}
		} catch (err) {
			toast.error(`Send failed: ${err instanceof Error ? err.message : 'Unknown'}`);
		} finally {
			setSending(false);
		}
	}

	return (
		<Card>
			<CardHeader className="pb-3">
				<div className="flex items-start justify-between gap-2">
					<div>
						<CardTitle className="flex items-center gap-2 text-base">
							<Trophy className="h-4 w-4 text-amber-500" />
							Top live stories by engagement
						</CardTitle>
						<p className="mt-0.5 text-xs text-muted-foreground">
							Pick the ones to send as a TikTok inbox draft.
						</p>
					</div>
					<Button asChild variant="ghost" size="sm" className="h-7 text-xs">
						<Link href="/instagram-stories">Live view</Link>
					</Button>
				</div>
			</CardHeader>
			<CardContent>
				{isLoading ? (
					<div className="space-y-2">
						{Array.from({ length: 4 }).map((_, i) => (
							<Skeleton key={i} className="h-20 w-full" />
						))}
					</div>
				) : ranked.length === 0 ? (
					<div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed py-8 text-center">
						<Trophy className="h-8 w-8 text-muted-foreground/40" />
						<p className="text-sm font-medium">No active IG stories</p>
						<p className="max-w-xs text-xs text-muted-foreground">
							Stories live for 24h. Post a story or wait for new content; this card
							auto-refreshes.
						</p>
					</div>
				) : (
					<>
						<div className="mb-2 flex items-center justify-between">
							<div className="text-xs text-muted-foreground">
								{ranked.length} active · {selected.size} selected
							</div>
							<Button
								variant="ghost"
								size="sm"
								className="h-7 text-xs"
								onClick={selectTop}
								disabled={sending}
							>
								Auto-pick top {Math.min(DEFAULT_TARGET, ranked.length)}
							</Button>
						</div>

						<ul className="divide-y rounded-lg border">
							{ranked.slice(0, 10).map((r, idx) => {
								const s = r.story.story;
								const isSelected = selected.has(s.id);
								const ratePct = (r.rate * 100).toFixed(0);
								const widthPct = maxRate > 0 ? (r.rate / maxRate) * 100 : 0;
								const m = r.story.metrics;
								return (
									<li
										key={s.id}
										className={cn(
											'flex items-center gap-3 p-2.5 transition-colors',
											isSelected && 'bg-primary/5',
										)}
									>
										<button
											onClick={() => toggle(s.id)}
											className={cn(
												'relative flex h-14 w-10 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-muted',
												isSelected && 'ring-2 ring-primary',
											)}
											aria-pressed={isSelected}
											aria-label={isSelected ? 'Deselect story' : 'Select story'}
										>
											{s.thumbnail_url || s.media_url ? (
												// eslint-disable-next-line @next/next/no-img-element
												<img
													src={proxyUrl(s.thumbnail_url ?? s.media_url)}
													alt=""
													className="absolute inset-0 h-full w-full object-cover"
												/>
											) : (
												<div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-slate-700 to-slate-900">
													{s.media_type === 'VIDEO' ? (
														<Video className="h-4 w-4 text-white/50" />
													) : (
														<ImageIcon className="h-4 w-4 text-white/50" />
													)}
												</div>
											)}
											{isSelected && (
												<div className="absolute inset-0 flex items-center justify-center bg-primary/30">
													<div className="rounded-full bg-primary p-0.5 text-primary-foreground">
														<Check className="h-3 w-3" />
													</div>
												</div>
											)}
											<div className="absolute left-0 top-0 rounded-br-md bg-black/70 px-1 py-0.5 text-[9px] font-bold leading-none text-white">
												#{idx + 1}
											</div>
										</button>

										<div className="flex-1 min-w-0">
											<div className="flex items-center gap-1.5">
												<div className="text-sm font-semibold tabular-nums">
													{r.qualifies ? `${ratePct}%` : '—'}
												</div>
												<Badge variant="secondary" className="h-4 px-1 text-[10px]">
													rate
												</Badge>
												{!r.qualifies && (
													<Badge
														variant="outline"
														className="h-4 px-1 text-[9px] text-muted-foreground"
													>
														low impressions
													</Badge>
												)}
												<span className="ml-auto text-[10px] text-muted-foreground">
													{fmtAge(s.timestamp)} ago
												</span>
											</div>
											<div className="mt-0.5 h-1 w-full overflow-hidden rounded-full bg-muted">
												<div
													className={cn(
														'h-full rounded-full transition-all',
														idx === 0
															? 'bg-amber-500'
															: idx < 3
																? 'bg-emerald-500'
																: 'bg-blue-500',
													)}
													style={{ width: `${Math.max(widthPct, 4)}%` }}
												/>
											</div>
											<div className="mt-1 flex items-center gap-3 text-[11px] text-muted-foreground">
												<span className="flex items-center gap-1" title="Views">
													<Eye className="h-3 w-3" />
													{fmt(m?.impressions ?? m?.views)}
												</span>
												<span className="flex items-center gap-1" title="Reach">
													<Users className="h-3 w-3" />
													{fmt(m?.reach)}
												</span>
												<span className="flex items-center gap-1" title="Replies">
													<MessageCircle className="h-3 w-3" />
													{fmt(m?.replies)}
												</span>
											</div>
										</div>
									</li>
								);
							})}
						</ul>

						<div className="mt-3 flex items-center justify-between gap-2">
							<div className="text-xs text-muted-foreground">
								{selected.size < MIN_STORIES ? (
									<>Pick {MIN_STORIES - selected.size} more</>
								) : (
									<>Ready to send {selected.size} stories</>
								)}
							</div>
							<Button
								size="sm"
								onClick={send}
								disabled={sending || selected.size < MIN_STORIES}
							>
								{sending ? (
									<Loader2 className="h-4 w-4 animate-spin" />
								) : (
									<Send className="h-4 w-4" />
								)}
								<span>Send to TT inbox</span>
							</Button>
						</div>
					</>
				)}
			</CardContent>
		</Card>
	);
}
