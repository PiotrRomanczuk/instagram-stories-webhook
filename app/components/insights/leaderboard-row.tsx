'use client';

import {
	Eye,
	Users,
	MessageCircle,
	Check,
	Image as ImageIcon,
	Video,
	ArrowUpRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { proxyUrl } from '@/lib/instagram/proxy-url';
import type { InstagramStory } from '@/lib/instagram/media';
import type { ScoredStory } from '@/lib/insights/score-story';

interface LeaderboardRowProps {
	story: InstagramStory;
	score: ScoredStory;
	metrics: { impressions?: number; views?: number; reach?: number; replies?: number } | undefined;
	rank: number;
	maxRate: number;
	isSelected: boolean;
	onToggle: () => void;
}

function fmt(n: number | undefined): string {
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

export function LeaderboardRow({
	story,
	score,
	metrics,
	rank,
	maxRate,
	isSelected,
	onToggle,
}: LeaderboardRowProps) {
	const ratePct = (score.rate * 100).toFixed(0);
	const widthPct = maxRate > 0 ? (score.rate / maxRate) * 100 : 0;
	const thumb = proxyUrl(story.thumbnail_url ?? story.media_url);
	const views = metrics?.impressions ?? metrics?.views;

	return (
		<li
			className={cn(
				'grid grid-cols-[28px_56px_minmax(0,1fr)_repeat(3,minmax(0,52px))_28px] items-center gap-2 px-3 py-2 text-sm transition-colors hover:bg-muted/40',
				isSelected && 'bg-primary/5',
			)}
		>
			<button
				onClick={onToggle}
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
						{rank + 1}
					</span>
				)}
			</button>

			<button
				onClick={onToggle}
				className="relative h-14 w-10 overflow-hidden rounded-md border bg-muted"
				aria-label={isSelected ? 'Deselect' : 'Select'}
			>
				{thumb ? (
					// eslint-disable-next-line @next/next/no-img-element
					<img src={thumb} alt="" className="absolute inset-0 h-full w-full object-cover" />
				) : (
					<div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-slate-700 to-slate-900">
						{story.media_type === 'VIDEO' ? (
							<Video className="h-3.5 w-3.5 text-white/40" />
						) : (
							<ImageIcon className="h-3.5 w-3.5 text-white/40" />
						)}
					</div>
				)}
				{rank === 0 && score.qualifies && (
					<div className="absolute left-0.5 top-0.5 rounded bg-amber-500 px-1 text-[8px] font-bold leading-none text-white">
						TOP
					</div>
				)}
			</button>

			<div className="min-w-0">
				<div className="flex items-baseline gap-1.5">
					<span className="text-sm font-bold tabular-nums">
						{score.qualifies ? `${ratePct}%` : '—'}
					</span>
					<span className="text-[10px] uppercase tracking-wide text-muted-foreground">
						rate
					</span>
					{!score.qualifies && (
						<span className="text-[10px] text-amber-600">low impressions</span>
					)}
					<span className="ml-auto text-[10px] text-muted-foreground">
						{fmtAge(story.timestamp)} ago
					</span>
				</div>
				<div className="mt-0.5 h-1 w-full overflow-hidden rounded-full bg-muted">
					<div
						className={cn(
							'h-full rounded-full transition-all',
							rank === 0
								? 'bg-amber-500'
								: rank < 3
									? 'bg-emerald-500'
									: 'bg-blue-500',
						)}
						style={{ width: `${Math.max(widthPct, 4)}%` }}
					/>
				</div>
			</div>

			<span
				className="flex items-center gap-0.5 text-xs tabular-nums text-muted-foreground"
				title="Views"
			>
				<Eye className="h-3 w-3" />
				{fmt(views)}
			</span>
			<span
				className="flex items-center gap-0.5 text-xs tabular-nums text-muted-foreground"
				title="Reach"
			>
				<Users className="h-3 w-3" />
				{fmt(metrics?.reach)}
			</span>
			<span
				className="flex items-center gap-0.5 text-xs tabular-nums text-muted-foreground"
				title="Replies"
			>
				<MessageCircle className="h-3 w-3" />
				{fmt(metrics?.replies)}
			</span>

			{story.permalink ? (
				<a
					href={story.permalink}
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
}
