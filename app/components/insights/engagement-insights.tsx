'use client';

import { useMemo, useState } from 'react';
import useSWR from 'swr';
import {
	Trophy,
	Eye,
	Users,
	MessageCircle,
	ChevronUp,
	Share2,
	Zap,
	Sparkles,
	Film,
	Loader2,
	BarChart3,
	Image as ImageIcon,
	Video,
	Check,
	ArrowUpRight,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Skeleton } from '@/app/components/ui/skeleton';
import { Badge } from '@/app/components/ui/badge';
import { Link } from '@/i18n/routing';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { StoryArchive } from '@/lib/types/story-archive';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const TARGET_DEFAULT = 7;
const MIN_SELECT = 3;

interface EngagementResponse {
	stories: StoryArchive[];
	total: number;
}

function fmt(n: number | undefined | null): string {
	if (n === undefined || n === null) return '—';
	if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
	return n.toString();
}

function fmtAge(iso: string): string {
	const diff = Date.now() - new Date(iso).getTime();
	const hr = Math.floor(diff / (1000 * 60 * 60));
	if (hr < 1) {
		const m = Math.floor(diff / 60000);
		return `${Math.max(m, 0)}m`;
	}
	if (hr < 24) return `${hr}h`;
	return `${Math.floor(hr / 24)}d`;
}

export function EngagementInsights() {
	const { data, isLoading, mutate } = useSWR<EngagementResponse>(
		'/api/analytics/story-engagement?sortBy=engagement_score&limit=50',
		fetcher,
		{ refreshInterval: 60_000 },
	);

	const [selected, setSelected] = useState<Set<string>>(new Set());
	const [composing, setComposing] = useState(false);

	const stories = useMemo(() => {
		const all = data?.stories ?? [];
		return all.filter(
			(s) => s.engagementScore !== undefined && s.engagementScore !== null,
		);
	}, [data]);

	const stats = useMemo(() => {
		if (stories.length === 0) {
			return null;
		}
		const totalImpressions = stories.reduce((s, x) => s + (x.impressions ?? 0), 0);
		const totalReach = stories.reduce((s, x) => s + (x.reach ?? 0), 0);
		const totalReplies = stories.reduce((s, x) => s + (x.replies ?? 0), 0);
		const totalShares = stories.reduce((s, x) => s + (x.shares ?? 0), 0);
		const totalInteractions = stories.reduce(
			(s, x) => s + (x.totalInteractions ?? 0),
			0,
		);
		const avgScore = stories.reduce((s, x) => s + (x.engagementScore ?? 0), 0) / stories.length;
		const top = stories[0];
		// Reach-rate: share of impressions that landed on unique users
		const reachRate =
			totalImpressions > 0 ? (totalReach / totalImpressions) * 100 : 0;
		return {
			ranked: stories.length,
			topScore: top?.engagementScore ?? 0,
			avgScore,
			totalImpressions,
			totalReach,
			totalReplies,
			totalShares,
			totalInteractions,
			reachRate,
			topStory: top,
		};
	}, [stories]);

	const maxScore = stats?.topScore ?? 0;

	function toggle(id: string) {
		setSelected((prev) => {
			const next = new Set(prev);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			return next;
		});
	}

	function selectTop() {
		setSelected(new Set(stories.slice(0, TARGET_DEFAULT).map((s) => s.id)));
	}

	async function handleCompose() {
		if (selected.size < MIN_SELECT) {
			toast.error(`Select at least ${MIN_SELECT} stories`);
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
				toast.success(
					`Composing ${body.storyCount} stories with "${body.audioTrackTitle}"`,
				);
				setSelected(new Set());
				mutate();
			} else {
				toast.error(body.error ?? `Compose failed (${res.status})`);
			}
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Compose failed');
		} finally {
			setComposing(false);
		}
	}

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
					<h3 className="text-lg font-semibold">No engagement data yet</h3>
					<p className="max-w-md text-sm text-muted-foreground">
						Story insights are only available within Instagram&apos;s 24-hour story
						window. Once stories are archived and the engagement cron runs, ranked
						performance metrics appear here.
					</p>
					<div className="flex gap-2 pt-2">
						<Button asChild variant="outline" size="sm">
							<Link href="/story-archive">Open archive</Link>
						</Button>
						<Button asChild size="sm">
							<Link href="/">Back to dashboard</Link>
						</Button>
					</div>
				</CardContent>
			</Card>
		);
	}

	return (
		<div className="space-y-5">
			<div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
				<HeroStat
					label="Stories ranked"
					value={stats!.ranked.toString()}
					icon={<Sparkles className="h-4 w-4" />}
					tone="bg-purple-100 text-purple-700"
				/>
				<HeroStat
					label="Top score"
					value={stats!.topScore.toFixed(0)}
					icon={<Trophy className="h-4 w-4" />}
					tone="bg-amber-100 text-amber-700"
				/>
				<HeroStat
					label="Avg impressions"
					value={fmt(Math.round(stats!.totalImpressions / stats!.ranked))}
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

			{stats?.topStory && <TopPerformerHero story={stats.topStory} />}

			<Card>
				<CardHeader className="pb-3">
					<div className="flex items-start justify-between gap-2">
						<div>
							<CardTitle className="flex items-center gap-2 text-base">
								<Trophy className="h-4 w-4 text-amber-500" />
								Story leaderboard
							</CardTitle>
							<p className="mt-0.5 text-xs text-muted-foreground">
								Click a story to add it to your composition. Score is a weighted
								blend of impressions, reach, replies, taps-back, and exits.
							</p>
						</div>
						<div className="flex items-center gap-1.5">
							<Button
								variant="ghost"
								size="sm"
								className="h-7 text-xs"
								onClick={selectTop}
							>
								Auto-pick top {Math.min(TARGET_DEFAULT, stories.length)}
							</Button>
							<Button asChild variant="ghost" size="sm" className="h-7 text-xs">
								<Link href="/story-archive">
									Browse all
									<ArrowUpRight className="h-3 w-3" />
								</Link>
							</Button>
						</div>
					</div>
				</CardHeader>
				<CardContent>
					<ul className="divide-y rounded-lg border">
						<li className="grid grid-cols-[28px_56px_minmax(0,1fr)_repeat(5,minmax(0,52px))_28px] items-center gap-2 bg-muted/40 px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
							<span>#</span>
							<span></span>
							<span>Score</span>
							<span className="flex items-center gap-1" title="Impressions">
								<Eye className="h-3 w-3" />
							</span>
							<span className="flex items-center gap-1" title="Reach">
								<Users className="h-3 w-3" />
							</span>
							<span className="flex items-center gap-1" title="Replies">
								<MessageCircle className="h-3 w-3" />
							</span>
							<span className="flex items-center gap-1" title="Shares">
								<Share2 className="h-3 w-3" />
							</span>
							<span className="flex items-center gap-1" title="Total interactions">
								<Zap className="h-3 w-3" />
							</span>
							<span></span>
						</li>
						{stories.slice(0, 25).map((s, idx) => {
							const isSelected = selected.has(s.id);
							const score = s.engagementScore ?? 0;
							const scorePct = maxScore > 0 ? (score / maxScore) * 100 : 0;
							return (
								<li
									key={s.id}
									className={cn(
										'grid grid-cols-[28px_56px_minmax(0,1fr)_repeat(5,minmax(0,52px))_28px] items-center gap-2 px-3 py-2 text-sm transition-colors hover:bg-muted/40',
										isSelected && 'bg-primary/5',
									)}
								>
									<button
										onClick={() => toggle(s.id)}
										className={cn(
											'flex h-6 w-6 items-center justify-center rounded-md border transition-colors',
											isSelected
												? 'border-primary bg-primary text-primary-foreground'
												: 'border-border hover:bg-muted',
										)}
										aria-pressed={isSelected}
									>
										{isSelected ? (
											<Check className="h-3.5 w-3.5" />
										) : (
											<span className="text-[10px] font-bold tabular-nums text-muted-foreground">
												{idx + 1}
											</span>
										)}
									</button>

									<button
										onClick={() => toggle(s.id)}
										className="relative h-14 w-10 overflow-hidden rounded-md border bg-muted"
									>
										{s.thumbnailPath || s.mediaUrlOriginal ? (
											// eslint-disable-next-line @next/next/no-img-element
											<img
												src={s.thumbnailPath || s.mediaUrlOriginal}
												alt=""
												className="absolute inset-0 h-full w-full object-cover"
												onError={(e) => {
													(e.target as HTMLImageElement).style.display = 'none';
												}}
											/>
										) : (
											<div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-slate-700 to-slate-900">
												{s.mediaType === 'VIDEO' ? (
													<Video className="h-3.5 w-3.5 text-white/40" />
												) : (
													<ImageIcon className="h-3.5 w-3.5 text-white/40" />
												)}
											</div>
										)}
										{idx === 0 && (
											<div className="absolute left-0.5 top-0.5 rounded bg-amber-500 px-1 text-[8px] font-bold leading-none text-white">
												TOP
											</div>
										)}
									</button>

									<div className="min-w-0">
										<div className="flex items-baseline gap-1.5">
											<span className="text-sm font-bold tabular-nums">
												{score.toFixed(0)}
											</span>
											<span className="text-[10px] text-muted-foreground">
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
									</div>

									<span className="text-xs tabular-nums text-muted-foreground">
										{fmt(s.impressions)}
									</span>
									<span className="text-xs tabular-nums text-muted-foreground">
										{fmt(s.reach)}
									</span>
									<span className="text-xs tabular-nums text-muted-foreground">
										{fmt(s.replies)}
									</span>
									<span className="text-xs tabular-nums text-emerald-600/80">
										{fmt(s.shares)}
									</span>
									<span className="text-xs tabular-nums text-amber-600/80">
										{fmt(s.totalInteractions)}
									</span>

									{s.permalink ? (
										<a
											href={s.permalink}
											target="_blank"
											rel="noopener noreferrer"
											className="text-muted-foreground hover:text-foreground"
											title="View on Instagram"
										>
											<ArrowUpRight className="h-3.5 w-3.5" />
										</a>
									) : (
										<span />
									)}
								</li>
							);
						})}
					</ul>

					<div className="mt-3 flex items-center justify-between gap-2">
						<div className="text-xs text-muted-foreground">
							{selected.size === 0
								? 'Click stories to build your next TikTok composition'
								: selected.size < MIN_SELECT
									? `Pick ${MIN_SELECT - selected.size} more`
									: `Ready to compose ${selected.size} stories`}
						</div>
						<Button
							size="sm"
							onClick={handleCompose}
							disabled={composing || selected.size < MIN_SELECT}
						>
							{composing ? (
								<Loader2 className="h-4 w-4 animate-spin" />
							) : (
								<Film className="h-4 w-4" />
							)}
							<span>Compose video</span>
						</Button>
					</div>
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

function TopPerformerHero({ story }: { story: StoryArchive }) {
	const thumb = story.thumbnailPath || story.mediaUrlOriginal;
	return (
		<Card className="overflow-hidden border-amber-200 bg-gradient-to-br from-amber-50 via-white to-emerald-50 dark:from-amber-950/30 dark:via-card dark:to-emerald-950/30">
			<CardContent className="grid gap-4 p-4 sm:grid-cols-[120px_1fr] sm:p-5">
				<div className="relative aspect-[9/16] w-[120px] overflow-hidden rounded-lg border bg-muted">
					{thumb ? (
						// eslint-disable-next-line @next/next/no-img-element
						<img
							src={thumb}
							alt={story.caption ?? 'Top story'}
							className="h-full w-full object-cover"
						/>
					) : (
						<div className="flex h-full items-center justify-center bg-gradient-to-br from-slate-700 to-slate-900 text-white/40">
							<ImageIcon className="h-6 w-6" />
						</div>
					)}
					<div className="absolute left-1.5 top-1.5 flex items-center gap-1 rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-bold text-white shadow-sm">
						<Trophy className="h-3 w-3" />
						#1
					</div>
				</div>
				<div className="flex flex-col justify-between gap-3">
					<div>
						<Badge className="mb-2 gap-1 bg-amber-500/15 text-amber-700 hover:bg-amber-500/20 dark:text-amber-300">
							Top performer
						</Badge>
						{story.caption && (
							<p className="line-clamp-2 text-sm font-medium">{story.caption}</p>
						)}
						<p className="mt-1 text-xs text-muted-foreground">
							{fmtAge(story.igTimestamp)} ago · {story.mediaType.toLowerCase()}
						</p>
					</div>
					<div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
						<MiniMetric label="Score" value={(story.engagementScore ?? 0).toFixed(0)} highlight />
						<MiniMetric label="Impressions" value={fmt(story.impressions)} />
						<MiniMetric label="Reach" value={fmt(story.reach)} />
						<MiniMetric label="Replies" value={fmt(story.replies)} />
						<MiniMetric label="Shares" value={fmt(story.shares)} positive />
					</div>
				</div>
			</CardContent>
		</Card>
	);
}

function MiniMetric({
	label,
	value,
	highlight,
	positive,
	negative,
}: {
	label: string;
	value: string;
	highlight?: boolean;
	positive?: boolean;
	negative?: boolean;
}) {
	return (
		<div
			className={cn(
				'rounded-md border bg-card/80 px-2 py-1.5',
				highlight && 'border-amber-300 bg-amber-50 dark:bg-amber-950/30',
			)}
		>
			<div className="text-[9px] uppercase tracking-wide text-muted-foreground">
				{label}
			</div>
			<div
				className={cn(
					'text-sm font-bold tabular-nums',
					highlight && 'text-amber-700 dark:text-amber-300',
					positive && 'text-emerald-600 dark:text-emerald-400',
					negative && 'text-red-600 dark:text-red-400',
				)}
			>
				{value}
			</div>
		</div>
	);
}
