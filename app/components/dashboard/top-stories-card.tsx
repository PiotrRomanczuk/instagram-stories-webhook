'use client';

import { useState, useMemo } from 'react';
import useSWR from 'swr';
import {
	Trophy,
	Eye,
	Users,
	MessageCircle,
	Share2,
	Zap,
	Film,
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
import type { StoryArchive } from '@/lib/types/story-archive';

interface TopStoriesResponse {
	stories: StoryArchive[];
	total: number;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const MIN_STORIES = 3;
const MAX_STORIES = 20;
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
	const { data, isLoading, mutate } = useSWR<TopStoriesResponse>(
		`/api/analytics/story-engagement?sortBy=engagement_score&limit=${MAX_STORIES}`,
		fetcher,
		{ refreshInterval: 60_000 },
	);

	const [selected, setSelected] = useState<Set<string>>(new Set());
	const [composing, setComposing] = useState(false);

	const stories = useMemo(() => {
		const all = data?.stories ?? [];
		return all.filter((s) => s.engagementScore !== undefined && s.engagementScore !== null);
	}, [data]);

	const maxScore = useMemo(
		() => stories.reduce((m, s) => Math.max(m, s.engagementScore ?? 0), 0),
		[stories],
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
		const top = stories.slice(0, DEFAULT_TARGET).map((s) => s.id);
		setSelected(new Set(top));
	}

	async function compose() {
		if (selected.size < MIN_STORIES) {
			toast.error(`Pick at least ${MIN_STORIES} stories`);
			return;
		}
		setComposing(true);
		try {
			const res = await fetch('/api/compositions/compose', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ storyIds: Array.from(selected) }),
			});
			const body = await res.json().catch(() => ({}));
			if (res.ok) {
				toast.success(`Composing ${body.storyCount} stories with "${body.audioTrackTitle}"`);
				setSelected(new Set());
				mutate();
			} else {
				toast.error(body.error ?? `Compose failed (${res.status})`);
			}
		} catch (err) {
			toast.error(`Compose failed: ${err instanceof Error ? err.message : 'Unknown'}`);
		} finally {
			setComposing(false);
		}
	}

	return (
		<Card>
			<CardHeader className="pb-3">
				<div className="flex items-start justify-between gap-2">
					<div>
						<CardTitle className="flex items-center gap-2 text-base">
							<Trophy className="h-4 w-4 text-amber-500" />
							Top stories by engagement
						</CardTitle>
						<p className="mt-0.5 text-xs text-muted-foreground">
							Pick the ones to compose into your next TikTok.
						</p>
					</div>
					<Button asChild variant="ghost" size="sm" className="h-7 text-xs">
						<Link href="/insights">All metrics</Link>
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
				) : stories.length === 0 ? (
					<div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed py-8 text-center">
						<Trophy className="h-8 w-8 text-muted-foreground/40" />
						<p className="text-sm font-medium">No engagement data yet</p>
						<p className="max-w-xs text-xs text-muted-foreground">
							Insights are pulled within the 24h story window. Once stories are
							archived and the engagement cron runs, ranked results appear here.
						</p>
					</div>
				) : (
					<>
						<div className="mb-2 flex items-center justify-between">
							<div className="text-xs text-muted-foreground">
								{stories.length} ranked · {selected.size} selected
							</div>
							<Button
								variant="ghost"
								size="sm"
								className="h-7 text-xs"
								onClick={selectTop}
								disabled={composing}
							>
								Auto-pick top {Math.min(DEFAULT_TARGET, stories.length)}
							</Button>
						</div>

						<ul className="divide-y rounded-lg border">
							{stories.slice(0, 10).map((s, idx) => {
								const isSelected = selected.has(s.id);
								const score = s.engagementScore ?? 0;
								const scorePct = maxScore > 0 ? (score / maxScore) * 100 : 0;
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
											{s.thumbnailPath ? (
												// eslint-disable-next-line @next/next/no-img-element
												<img
													src={s.thumbnailPath}
													alt=""
													className="absolute inset-0 h-full w-full object-cover"
												/>
											) : (
												<div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-slate-700 to-slate-900">
													{s.mediaType === 'VIDEO' ? (
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
													{score.toFixed(0)}
												</div>
												<Badge variant="secondary" className="h-4 px-1 text-[10px]">
													score
												</Badge>
												<span className="ml-auto text-[10px] text-muted-foreground">
													{fmtAge(s.igTimestamp)} ago
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
													style={{ width: `${Math.max(scorePct, 4)}%` }}
												/>
											</div>
											<div className="mt-1 flex items-center gap-3 text-[11px] text-muted-foreground">
												<span className="flex items-center gap-1" title="Impressions">
													<Eye className="h-3 w-3" />
													{fmt(s.impressions)}
												</span>
												<span className="flex items-center gap-1" title="Reach">
													<Users className="h-3 w-3" />
													{fmt(s.reach)}
												</span>
												<span className="flex items-center gap-1" title="Replies">
													<MessageCircle className="h-3 w-3" />
													{fmt(s.replies)}
												</span>
												<span className="flex items-center gap-1" title="Shares">
													<Share2 className="h-3 w-3 text-emerald-500" />
													{fmt(s.shares)}
												</span>
												<span
													className="flex items-center gap-1"
													title="Total interactions"
												>
													<Zap className="h-3 w-3 text-amber-500" />
													{fmt(s.totalInteractions)}
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
									<>Ready to compose {selected.size} stories</>
								)}
							</div>
							<Button
								size="sm"
								onClick={compose}
								disabled={composing || selected.size < MIN_STORIES}
							>
								{composing ? (
									<Loader2 className="h-4 w-4 animate-spin" />
								) : (
									<Film className="h-4 w-4" />
								)}
								<span>Compose video</span>
							</Button>
						</div>
					</>
				)}
			</CardContent>
		</Card>
	);
}
