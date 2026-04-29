'use client';

import { useState, useMemo } from 'react';
import useSWR from 'swr';
import { PageHeader } from '@/app/components/layout/page-header';
import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import { Skeleton } from '@/app/components/ui/skeleton';
import { EmptyState } from '@/app/components/ui/empty-state';
import { StoryArchive } from '@/lib/types/story-archive';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
	Archive,
	ChevronLeft,
	ChevronRight,
	Download,
	ExternalLink,
	Image as ImageIcon,
	Video,
	PlayCircle,
	Loader2,
	Eye,
	Users,
	MessageCircle,
	ChevronUp,
	Share2,
	Zap,
	Trophy,
	Check,
	Film,
	Square,
	CheckSquare,
	Sparkles,
	Send,
	X,
} from 'lucide-react';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/app/components/ui/select';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const PAGE_SIZE = 24;
const MIN_SELECT = 3;
const MAX_SELECT = 20;

type SortKey = 'newest' | 'score' | 'impressions' | 'reach' | 'replies';
type FilterKey =
	| 'all'
	| 'with-insights'
	| 'without-insights'
	| 'failed'
	| 'video'
	| 'image';

interface ArchiveResponse {
	stories: StoryArchive[];
	summary: {
		totalArchived: number;
		withInsights: number;
		topScore: number;
		avgScore: number;
	};
	pagination: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
	};
}

const FILTERS: { key: FilterKey; label: string }[] = [
	{ key: 'all', label: 'All' },
	{ key: 'with-insights', label: 'With insights' },
	{ key: 'without-insights', label: 'No insights yet' },
	{ key: 'video', label: 'Video' },
	{ key: 'image', label: 'Image' },
	{ key: 'failed', label: 'Failed' },
];

function fmt(n: number | undefined | null): string {
	if (n === undefined || n === null) return '—';
	if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
	return n.toString();
}

function formatBytes(bytes?: number): string {
	if (!bytes) return '—';
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
	return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function fmtAge(iso: string): string {
	const diff = Date.now() - new Date(iso).getTime();
	const hr = Math.floor(diff / (1000 * 60 * 60));
	if (hr < 1) {
		const m = Math.floor(diff / 60000);
		return `${Math.max(m, 0)}m ago`;
	}
	if (hr < 24) return `${hr}h ago`;
	return `${Math.floor(hr / 24)}d ago`;
}

export function StoryArchiveClient() {
	const [page, setPage] = useState(1);
	const [sort, setSort] = useState<SortKey>('score');
	const [filter, setFilter] = useState<FilterKey>('all');
	const [selected, setSelected] = useState<Set<string>>(new Set());
	const [running, setRunning] = useState(false);
	const [refreshingInsights, setRefreshingInsights] = useState(false);
	const [composing, setComposing] = useState(false);
	const [previewStory, setPreviewStory] = useState<StoryArchive | null>(null);

	const { data, error, isLoading, mutate } = useSWR<ArchiveResponse>(
		`/api/stories/archive?page=${page}&limit=${PAGE_SIZE}&sort=${sort}&filter=${filter}`,
		fetcher,
		{ revalidateOnFocus: false, dedupingInterval: 5000 },
	);

	const stories = data?.stories ?? [];
	const summary = data?.summary;
	const pagination = data?.pagination;
	const totalPages = pagination?.totalPages ?? 1;

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

	function selectAllOnPage() {
		const eligible = stories
			.filter((s) => s.downloadStatus === 'completed')
			.slice(0, MAX_SELECT)
			.map((s) => s.id);
		setSelected(new Set(eligible));
	}

	function clearSelection() {
		setSelected(new Set());
	}

	async function handleRunNow() {
		setRunning(true);
		try {
			const res = await fetch('/api/stories/archive/run', { method: 'POST' });
			const body = await res.json();
			if (!res.ok) {
				toast.error(body.error ?? 'Archive run failed');
			} else {
				const r = body.result;
				const e = body.engagement;
				const archiveMsg = `Archived ${r.newlyArchived} new · ${r.alreadyArchived} existing · ${r.failed} failed`;
				const insightsMsg = e
					? `${e.storiesUpdated} of ${e.storiesProcessed} insights updated${
							e.storiesFailed > 0 ? ` (${e.storiesFailed} failed)` : ''
						}`
					: '';
				toast.success(`${archiveMsg}${insightsMsg ? ` · ${insightsMsg}` : ''}`);
				if (e?.errors && e.errors.length > 0) {
					const sample = e.errors.slice(0, 2).join('; ');
					toast.warning(`Insight issues: ${sample}${e.errors.length > 2 ? '…' : ''}`);
				}
				mutate();
			}
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Request failed');
		} finally {
			setRunning(false);
		}
	}

	async function handleRefreshInsights() {
		setRefreshingInsights(true);
		try {
			const res = await fetch('/api/stories/archive/refresh-insights', {
				method: 'POST',
			});
			const body = await res.json();
			if (!res.ok) {
				toast.error(body.error ?? 'Insight refresh failed');
			} else {
				const e = body.engagement;
				if (e.storiesProcessed === 0) {
					toast.info('No stories within the 24h insights window');
				} else {
					toast.success(
						`Insights: ${e.storiesUpdated} updated · ${e.storiesFailed} failed (of ${e.storiesProcessed})`,
					);
				}
				if (e.errors && e.errors.length > 0) {
					const sample = e.errors.slice(0, 2).join('; ');
					toast.warning(`${sample}${e.errors.length > 2 ? '…' : ''}`);
				}
				mutate();
			}
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Request failed');
		} finally {
			setRefreshingInsights(false);
		}
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
				clearSelection();
			} else {
				toast.error(body.error ?? `Compose failed (${res.status})`);
			}
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Compose failed');
		} finally {
			setComposing(false);
		}
	}

	return (
		<main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
			<div className="space-y-5">
				<PageHeader
					title="Story Archive"
					description="Downloaded copies of Instagram stories with engagement metrics. Pick the best performers to compose."
					badge={
						pagination ? (
							<Badge variant="secondary" className="text-xs">
								{pagination.total} archived
							</Badge>
						) : null
					}
				/>

				{summary && (
					<div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
						<SummaryStat
							label="Total archived"
							value={summary.totalArchived.toString()}
							icon={<Archive className="h-4 w-4 text-blue-600" />}
							tone="bg-blue-100"
						/>
						<SummaryStat
							label="With insights"
							value={summary.withInsights.toString()}
							icon={<Sparkles className="h-4 w-4 text-purple-600" />}
							tone="bg-purple-100"
						/>
						<SummaryStat
							label="Top score"
							value={summary.topScore.toFixed(0)}
							icon={<Trophy className="h-4 w-4 text-amber-500" />}
							tone="bg-amber-100"
						/>
						<SummaryStat
							label="Avg score"
							value={summary.avgScore.toFixed(0)}
							icon={<ChevronUp className="h-4 w-4 text-emerald-600" />}
							tone="bg-emerald-100"
						/>
					</div>
				)}

				<div className="flex flex-wrap items-center gap-2">
					<Button onClick={handleRunNow} disabled={running} size="sm">
						{running ? (
							<Loader2 className="h-4 w-4 animate-spin" />
						) : (
							<PlayCircle className="h-4 w-4" />
						)}
						<span>Run archive now</span>
					</Button>
					<Button
						onClick={handleRefreshInsights}
						disabled={refreshingInsights}
						size="sm"
						variant="outline"
					>
						{refreshingInsights ? (
							<Loader2 className="h-4 w-4 animate-spin" />
						) : (
							<Sparkles className="h-4 w-4" />
						)}
						<span>Refresh insights</span>
					</Button>
					<Button
						variant="outline"
						size="sm"
						onClick={() => {
							window.location.href = '/api/auth/link-facebook';
						}}
					>
						<ExternalLink className="h-4 w-4" />
						<span>Reconnect Instagram</span>
					</Button>

					<div className="ml-auto flex items-center gap-2">
						<Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
							<SelectTrigger size="sm" className="w-[160px]">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="score">Engagement score</SelectItem>
								<SelectItem value="newest">Newest</SelectItem>
								<SelectItem value="impressions">Most impressions</SelectItem>
								<SelectItem value="reach">Most reach</SelectItem>
								<SelectItem value="replies">Most replies</SelectItem>
							</SelectContent>
						</Select>
					</div>
				</div>

				<div className="flex flex-wrap gap-1.5">
					{FILTERS.map((f) => (
						<button
							key={f.key}
							onClick={() => {
								setFilter(f.key);
								setPage(1);
							}}
							className={cn(
								'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
								filter === f.key
									? 'border-primary bg-primary text-primary-foreground'
									: 'border-border bg-card hover:bg-muted',
							)}
						>
							{f.label}
						</button>
					))}
				</div>

				{error && (
					<div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
						Failed to load archived stories.
					</div>
				)}

				{isLoading && <LoadingSkeleton />}

				{!isLoading && !error && stories.length === 0 && (
					<EmptyState
						icon={Archive}
						title={
							filter === 'all'
								? 'No archived stories yet'
								: 'No stories match this filter'
						}
						description={
							filter === 'all'
								? 'The archive cron runs every 4 hours and saves your active stories before they expire (24h window).'
								: 'Try a different filter, or run the archive to pull new stories.'
						}
					/>
				)}

				{!isLoading && stories.length > 0 && (
					<>
						<div className="flex items-center justify-between text-xs text-muted-foreground">
							<span>
								{selected.size > 0
									? `${selected.size} selected`
									: 'Click a card to select it for composing'}
							</span>
							<button
								onClick={selectAllOnPage}
								className="text-xs font-medium text-primary hover:underline"
							>
								Select top {Math.min(MAX_SELECT, stories.length)} on page
							</button>
						</div>

						<div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
							{stories.map((story, idx) => (
								<ArchivedStoryCard
									key={story.id}
									story={story}
									rank={sort === 'score' ? idx + 1 + (page - 1) * PAGE_SIZE : undefined}
									maxScore={maxScore}
									isSelected={selected.has(story.id)}
									onToggle={() => toggle(story.id)}
									onPreview={() => setPreviewStory(story)}
								/>
							))}
						</div>

						{totalPages > 1 && (
							<div className="flex items-center justify-between pt-2">
								<p className="text-sm text-muted-foreground">
									Page {page} of {totalPages}
								</p>
								<div className="flex items-center gap-2">
									<Button
										variant="outline"
										size="sm"
										onClick={() => setPage((p) => Math.max(1, p - 1))}
										disabled={page <= 1}
									>
										<ChevronLeft className="h-4 w-4" />
										<span>Previous</span>
									</Button>
									<Button
										variant="outline"
										size="sm"
										onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
										disabled={page >= totalPages}
									>
										<span>Next</span>
										<ChevronRight className="h-4 w-4" />
									</Button>
								</div>
							</div>
						)}
					</>
				)}
			</div>

			{selected.size > 0 && (
				<div className="fixed bottom-4 left-1/2 z-50 w-[min(640px,calc(100vw-2rem))] -translate-x-1/2 rounded-2xl border bg-card/95 p-3 shadow-2xl backdrop-blur supports-[backdrop-filter]:bg-card/80">
					<div className="flex items-center gap-3">
						<div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
							<Film className="h-4 w-4" />
						</div>
						<div className="flex-1 min-w-0">
							<div className="text-sm font-semibold">
								{selected.size} {selected.size === 1 ? 'story' : 'stories'} selected
							</div>
							<div className="text-xs text-muted-foreground">
								{selected.size < MIN_SELECT
									? `Pick ${MIN_SELECT - selected.size} more to compose`
									: 'Ready to compose into a TikTok video'}
							</div>
						</div>
						<Button variant="ghost" size="sm" onClick={clearSelection}>
							<X className="h-4 w-4" />
						</Button>
						<Button onClick={handleCompose} disabled={composing || selected.size < MIN_SELECT}>
							{composing ? (
								<Loader2 className="h-4 w-4 animate-spin" />
							) : (
								<Film className="h-4 w-4" />
							)}
							<span>Compose video</span>
						</Button>
					</div>
				</div>
			)}

			{previewStory && (
				<StoryPreviewDialog
					story={previewStory}
					onClose={() => setPreviewStory(null)}
				/>
			)}
		</main>
	);
}

interface CardProps {
	story: StoryArchive;
	rank?: number;
	maxScore: number;
	isSelected: boolean;
	onToggle: () => void;
	onPreview: () => void;
}

function ArchivedStoryCard({
	story,
	rank,
	maxScore,
	isSelected,
	onToggle,
	onPreview,
}: CardProps) {
	const isVideo = story.mediaType === 'VIDEO';
	const downloadUrl = `/api/stories/archive/${story.id}/download`;
	const canDownload = story.downloadStatus === 'completed';
	const score = story.engagementScore ?? 0;
	const scorePct = maxScore > 0 ? (score / maxScore) * 100 : 0;
	const hasInsights = story.engagementScore !== undefined && story.engagementScore !== null;
	const thumb =
		story.downloadStatus === 'completed'
			? `/api/stories/archive/${story.id}/thumbnail`
			: story.mediaUrlOriginal;

	return (
		<div
			className={cn(
				'group relative overflow-hidden rounded-xl border bg-card transition-all',
				isSelected
					? 'ring-2 ring-primary border-primary shadow-md'
					: 'hover:border-muted-foreground/30 hover:shadow-sm',
			)}
		>
			<button
				onClick={onToggle}
				className="absolute left-2 top-2 z-10 flex h-6 w-6 items-center justify-center rounded-md bg-background/90 shadow-sm backdrop-blur transition-colors hover:bg-background"
				aria-pressed={isSelected}
				aria-label={isSelected ? 'Deselect' : 'Select'}
			>
				{isSelected ? (
					<CheckSquare className="h-4 w-4 text-primary" />
				) : (
					<Square className="h-4 w-4 text-muted-foreground" />
				)}
			</button>

			{rank !== undefined && rank <= 99 && (
				<div
					className={cn(
						'absolute right-2 top-2 z-10 flex h-6 min-w-6 items-center justify-center rounded-full px-1.5 text-[10px] font-bold leading-none shadow-sm',
						rank === 1
							? 'bg-amber-500 text-white'
							: rank <= 3
								? 'bg-emerald-500 text-white'
								: 'bg-background/90 text-foreground backdrop-blur',
					)}
				>
					#{rank}
				</div>
			)}

			<button
				onClick={onPreview}
				className="relative block aspect-[9/16] w-full bg-muted overflow-hidden"
			>
				{thumb ? (
					// eslint-disable-next-line @next/next/no-img-element
					<img
						src={thumb}
						alt={story.caption ?? 'Story'}
						className="h-full w-full object-cover transition-transform group-hover:scale-105"
						onError={(e) => {
							(e.target as HTMLImageElement).style.display = 'none';
						}}
					/>
				) : (
					<div className="flex h-full items-center justify-center bg-gradient-to-br from-slate-700 to-slate-900 text-white/40">
						{isVideo ? <Video className="h-8 w-8" /> : <ImageIcon className="h-8 w-8" />}
					</div>
				)}

				{isVideo && (
					<div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100">
						<div className="rounded-full bg-black/60 p-2.5 backdrop-blur">
							<PlayCircle className="h-5 w-5 text-white" />
						</div>
					</div>
				)}

				<div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent p-2 pt-8 text-white">
					{hasInsights && (
						<>
							<div className="flex items-baseline justify-between text-xs">
								<span className="font-bold tabular-nums">
									{score.toFixed(0)}
								</span>
								<span className="text-[10px] text-white/70">{fmtAge(story.igTimestamp)}</span>
							</div>
							<div className="mt-1 h-1 overflow-hidden rounded-full bg-white/20">
								<div
									className={cn(
										'h-full rounded-full',
										rank === 1
											? 'bg-amber-400'
											: rank && rank <= 3
												? 'bg-emerald-400'
												: 'bg-white/80',
									)}
									style={{ width: `${Math.max(scorePct, 4)}%` }}
								/>
							</div>
							<div className="mt-1.5 flex items-center justify-between text-[10px] text-white/80">
								<span className="flex items-center gap-0.5" title="Impressions">
									<Eye className="h-2.5 w-2.5" />
									{fmt(story.impressions)}
								</span>
								<span className="flex items-center gap-0.5" title="Reach">
									<Users className="h-2.5 w-2.5" />
									{fmt(story.reach)}
								</span>
								<span className="flex items-center gap-0.5" title="Replies">
									<MessageCircle className="h-2.5 w-2.5" />
									{fmt(story.replies)}
								</span>
								<span className="flex items-center gap-0.5" title="Shares">
									<Share2 className="h-2.5 w-2.5 text-emerald-300" />
									{fmt(story.shares)}
								</span>
							</div>
						</>
					)}
					{!hasInsights && (
						<div className="text-[10px] text-white/70">
							{fmtAge(story.igTimestamp)} · awaiting insights
						</div>
					)}
				</div>

				{story.downloadStatus === 'failed' && (
					<div className="absolute right-2 top-10 z-10">
						<Badge variant="destructive" className="text-[9px]">
							Failed
						</Badge>
					</div>
				)}
			</button>

			<div className="flex items-center gap-1 border-t p-1.5">
				<Button
					size="sm"
					variant="ghost"
					className="h-7 flex-1 text-xs"
					asChild
					disabled={!canDownload}
				>
					<a href={downloadUrl} download>
						<Download className="h-3 w-3" />
						<span>Save</span>
					</a>
				</Button>
				{story.permalink && (
					<Button size="sm" variant="ghost" className="h-7 w-7 p-0" asChild>
						<a
							href={story.permalink}
							target="_blank"
							rel="noopener noreferrer"
							title="View on Instagram"
						>
							<ExternalLink className="h-3 w-3" />
						</a>
					</Button>
				)}
				<button
					onClick={onToggle}
					className={cn(
						'flex h-7 w-7 items-center justify-center rounded-md transition-colors',
						isSelected
							? 'bg-primary text-primary-foreground'
							: 'text-muted-foreground hover:bg-muted',
					)}
					aria-label={isSelected ? 'Deselect' : 'Select for compose'}
					title={isSelected ? 'Deselect' : 'Select for compose'}
				>
					{isSelected ? <Check className="h-3.5 w-3.5" /> : <Film className="h-3.5 w-3.5" />}
				</button>
			</div>

			<div className="px-2 pb-2 text-[10px] text-muted-foreground flex items-center justify-between">
				<span>{formatBytes(story.fileSizeBytes)}</span>
				{story.videoDuration && <span>{story.videoDuration.toFixed(1)}s</span>}
			</div>
		</div>
	);
}

function StoryPreviewDialog({
	story,
	onClose,
}: {
	story: StoryArchive;
	onClose: () => void;
}) {
	const isVideo = story.mediaType === 'VIDEO';
	const canSendToTiktok = isVideo && story.downloadStatus === 'completed';
	const [sending, setSending] = useState(false);
	const src =
		story.downloadStatus === 'completed'
			? `/api/stories/archive/${story.id}/preview`
			: story.mediaUrlOriginal;
	const posterSrc = isVideo
		? `/api/stories/archive/${story.id}/thumbnail`
		: undefined;

	async function handleSendToTiktok() {
		if (!canSendToTiktok || sending) return;
		setSending(true);
		try {
			const res = await fetch(`/api/stories/archive/${story.id}/send-to-tiktok`, {
				method: 'POST',
			});
			const body = await res.json().catch(() => ({}));
			if (res.ok) {
				toast.success(body.note ?? 'Uploaded to TikTok drafts');
				onClose();
			} else {
				toast.error(body.error ?? `Upload failed (${res.status})`);
			}
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Upload failed');
		} finally {
			setSending(false);
		}
	}

	return (
		<div
			className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
			onClick={onClose}
		>
			<div
				className="relative w-full max-w-md overflow-hidden rounded-2xl bg-card shadow-2xl"
				onClick={(e) => e.stopPropagation()}
			>
				<button
					onClick={onClose}
					className="absolute right-3 top-3 z-10 rounded-full bg-black/50 p-1.5 text-white hover:bg-black/70"
				>
					<X className="h-4 w-4" />
				</button>
				<div className="relative aspect-[9/16] bg-black">
					{src && isVideo ? (
						<video
							src={src}
							poster={posterSrc}
							controls
							autoPlay
							className="absolute inset-0 h-full w-full object-contain"
						/>
					) : src ? (
						// eslint-disable-next-line @next/next/no-img-element
						<img
							src={src}
							alt={story.caption ?? 'Story preview'}
							className="absolute inset-0 h-full w-full object-contain"
						/>
					) : (
						<div className="flex h-full items-center justify-center text-muted-foreground">
							No preview available
						</div>
					)}
				</div>
				<div className="space-y-3 p-4">
					{story.caption && <p className="text-sm">{story.caption}</p>}
					{story.engagementScore !== undefined && story.engagementScore !== null ? (
						<div className="grid grid-cols-3 gap-2">
							<MetricBox label="Score" value={story.engagementScore.toFixed(0)} highlight />
							<MetricBox label="Impressions" value={fmt(story.impressions)} />
							<MetricBox label="Reach" value={fmt(story.reach)} />
							<MetricBox label="Replies" value={fmt(story.replies)} />
							<MetricBox label="Shares" value={fmt(story.shares)} positive />
							<MetricBox label="Interactions" value={fmt(story.totalInteractions)} />
						</div>
					) : (
						<p className="text-xs text-muted-foreground">
							Insights not yet available — they appear after the engagement cron runs while the story is still live (24h).
						</p>
					)}
					<div className="flex gap-2 pt-1">
						<Button asChild variant="outline" size="sm" className="flex-1">
							<a href={`/api/stories/archive/${story.id}/download`} download>
								<Download className="h-3.5 w-3.5" />
								<span>Download</span>
							</a>
						</Button>
						{story.permalink && (
							<Button asChild variant="outline" size="sm" className="flex-1">
								<a
									href={story.permalink}
									target="_blank"
									rel="noopener noreferrer"
								>
									<ExternalLink className="h-3.5 w-3.5" />
									<span>Instagram</span>
								</a>
							</Button>
						)}
					</div>
					{canSendToTiktok && (
						<Button
							onClick={handleSendToTiktok}
							disabled={sending}
							size="sm"
							className="w-full"
						>
							{sending ? (
								<Loader2 className="h-3.5 w-3.5 animate-spin" />
							) : (
								<Send className="h-3.5 w-3.5" />
							)}
							<span>{sending ? 'Uploading…' : 'Send to TikTok drafts'}</span>
						</Button>
					)}
					{!canSendToTiktok && isVideo && (
						<p className="text-[11px] text-muted-foreground text-center">
							Video must be downloaded locally before it can be sent to TikTok.
						</p>
					)}
					{!isVideo && (
						<p className="text-[11px] text-muted-foreground text-center">
							TikTok drafts only support video stories.
						</p>
					)}
				</div>
			</div>
		</div>
	);
}

function MetricBox({
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
				'rounded-lg border px-2.5 py-2',
				highlight && 'border-primary/30 bg-primary/5',
				positive && 'border-emerald-200 bg-emerald-50/50 dark:bg-emerald-950/20',
				negative && 'border-red-200 bg-red-50/50 dark:bg-red-950/20',
			)}
		>
			<div className="text-[10px] uppercase tracking-wide text-muted-foreground">
				{label}
			</div>
			<div
				className={cn(
					'text-base font-bold tabular-nums',
					highlight && 'text-primary',
					positive && 'text-emerald-700 dark:text-emerald-400',
					negative && 'text-red-700 dark:text-red-400',
				)}
			>
				{value}
			</div>
		</div>
	);
}

function SummaryStat({
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
		<div className="rounded-xl border bg-card p-3">
			<div className="flex items-center gap-2">
				<div className={cn('rounded-md p-1.5', tone)}>{icon}</div>
				<span className="text-xs font-medium text-muted-foreground">{label}</span>
			</div>
			<div className="mt-1 text-2xl font-bold tabular-nums">{value}</div>
		</div>
	);
}

function LoadingSkeleton() {
	return (
		<div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
			{Array.from({ length: 12 }).map((_, i) => (
				<div key={i} className="overflow-hidden rounded-xl border bg-card">
					<Skeleton className="aspect-[9/16] w-full" />
					<div className="space-y-2 p-2">
						<Skeleton className="h-3 w-20" />
						<Skeleton className="h-7 w-full" />
					</div>
				</div>
			))}
		</div>
	);
}
