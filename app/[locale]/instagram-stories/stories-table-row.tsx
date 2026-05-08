'use client';

import {
	Download,
	ExternalLink,
	Image as ImageIcon,
	Play,
	Video as VideoIcon,
} from 'lucide-react';
import { Badge } from '@/app/components/ui/badge';
import { Skeleton } from '@/app/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { InstagramStory } from '@/lib/instagram/media';
import type { StoryInsightsEntry } from '@/app/api/instagram/stories/insights/route';
import { METRIC_KEYS, formatNumber, proxyUrl, timeAgo } from './stories-table-utils';

interface StoriesTableRowProps {
	story: InstagramStory;
	insights?: StoryInsightsEntry;
	insightsLoading?: boolean;
	leaders?: Partial<Record<(typeof METRIC_KEYS)[number], string>>;
}

export function StoriesTableRow({
	story,
	insights,
	insightsLoading,
	leaders,
}: StoriesTableRowProps) {
	const isVideo = story.media_type === 'VIDEO';
	const thumb = proxyUrl(story.thumbnail_url ?? story.media_url);
	const downloadHref = proxyUrl(story.media_url, true);

	return (
		<tr className="border-b last:border-b-0 hover:bg-muted/40 transition-colors">
			<td className="py-2 pl-3 pr-2">
				<div className="flex items-center gap-3">
					<a
						href={story.permalink}
						target="_blank"
						rel="noopener noreferrer"
						className="relative block h-14 w-9 shrink-0 overflow-hidden rounded-md ring-1 ring-border"
						aria-label="Open in Instagram"
					>
						{/* eslint-disable-next-line @next/next/no-img-element */}
						<img
							src={thumb}
							alt=""
							className="absolute inset-0 h-full w-full object-cover"
							loading="lazy"
						/>
						{isVideo && (
							<div className="absolute inset-0 flex items-center justify-center bg-black/30">
								<Play className="h-3 w-3 fill-white text-white" />
							</div>
						)}
					</a>
					<div className="min-w-0 max-w-xs">
						<p
							className={cn(
								'truncate text-sm',
								!story.caption && 'italic text-muted-foreground',
							)}
						>
							{story.caption ?? `@${story.username ?? 'unknown'}`}
						</p>
						<p className="text-[11px] text-muted-foreground">
							{timeAgo(story.timestamp)} ·{' '}
							{new Date(story.timestamp).toLocaleString()}
						</p>
					</div>
				</div>
			</td>
			<td className="px-2">
				<Badge variant="secondary" className="gap-1 text-[10px]">
					{isVideo ? (
						<VideoIcon className="h-3 w-3" />
					) : (
						<ImageIcon className="h-3 w-3" />
					)}
					{isVideo ? 'Video' : 'Image'}
				</Badge>
			</td>
			{METRIC_KEYS.map((key) => (
				<MetricCell
					key={key}
					value={insights?.metrics[key]}
					loading={Boolean(insightsLoading) && !insights}
					leader={leaders?.[key] === story.id}
				/>
			))}
			<td className="px-2 text-right">
				<div className="inline-flex items-center gap-0.5">
					<a
						href={downloadHref}
						download
						title="Download"
						className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
					>
						<Download className="h-4 w-4" />
					</a>
					<a
						href={story.permalink}
						target="_blank"
						rel="noopener noreferrer"
						title="Open in Instagram"
						className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
					>
						<ExternalLink className="h-4 w-4" />
					</a>
				</div>
			</td>
		</tr>
	);
}

function MetricCell({
	value,
	loading,
	leader,
}: {
	value: number | undefined;
	loading: boolean;
	leader: boolean;
}) {
	if (loading) {
		return (
			<td className="px-2 text-right">
				<Skeleton className="ml-auto h-3 w-10" />
			</td>
		);
	}
	if (value === undefined) {
		return (
			<td className="px-2 text-right text-xs text-muted-foreground/50">—</td>
		);
	}
	return (
		<td
			className={cn(
				'px-2 text-right tabular-nums',
				leader && value > 0 && 'font-semibold text-primary',
			)}
		>
			{formatNumber(value)}
		</td>
	);
}
