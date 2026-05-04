'use client';

import { useState } from 'react';
import {
    AlertTriangle,
    CheckCircle2,
    ChevronDown,
    ChevronUp,
    ExternalLink,
    Loader2,
    Music,
} from 'lucide-react';
import { Badge } from '@/app/components/ui/badge';
import { cn } from '@/lib/utils';
import type { ComposedVideo, StoryArchive } from '@/lib/types/story-archive';

export interface PostedItem {
    video: ComposedVideo;
    sourceStories: StoryArchive[];
    audioTrack: { id: string; title: string; artist?: string } | null;
}

const RECENT_PULSE_MS = 60 * 60 * 1000;

function fmtAge(iso: string | undefined | null): string {
    if (!iso) return '—';
    const diff = Date.now() - new Date(iso).getTime();
    const sec = Math.floor(diff / 1000);
    if (sec < 60) return `${sec}s ago`;
    const min = Math.floor(sec / 60);
    if (min < 60) return `${min}m ago`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `${hr}h ago`;
    return `${Math.floor(hr / 24)}d ago`;
}

function tiktokPostUrl(postId: string | undefined): string | null {
    if (!postId) return null;
    return `https://www.tiktok.com/video/${postId}`;
}

export function PostedCard({ item }: { item: PostedItem }) {
    const [expanded, setExpanded] = useState(false);
    const { video, sourceStories, audioTrack } = item;

    const status = video.tiktokPublishStatus;
    const heroStory = sourceStories[0];
    const heroThumb = heroStory ? `/api/stories/archive/${heroStory.id}/thumbnail` : null;

    const tsForAge =
        status === 'published' ? video.tiktokPublishedAt : video.updatedAt;
    const isRecent =
        status === 'published' &&
        video.tiktokPublishedAt &&
        Date.now() - new Date(video.tiktokPublishedAt).getTime() < RECENT_PULSE_MS;

    const postUrl = tiktokPostUrl(video.tiktokPublishId);

    return (
        <div className="overflow-hidden rounded-xl border bg-card transition-shadow hover:shadow-sm">
            <div className="relative aspect-[9/16] bg-muted">
                {heroThumb ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                        src={heroThumb}
                        alt={heroStory?.caption ?? 'Source story'}
                        className="h-full w-full object-cover"
                        onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                        }}
                    />
                ) : (
                    <div className="flex h-full items-center justify-center text-muted-foreground text-xs">
                        No source preview
                    </div>
                )}

                <div className="absolute left-2 top-2 flex items-center gap-1.5">
                    <StatusBadge status={status} pulse={Boolean(isRecent)} />
                </div>

                {sourceStories.length > 1 && (
                    <div className="absolute right-2 top-2 rounded-md bg-black/60 px-1.5 py-0.5 text-[10px] font-semibold text-white backdrop-blur">
                        +{sourceStories.length - 1}
                    </div>
                )}

                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent p-2 text-white">
                    <div className="flex items-baseline justify-between text-[11px]">
                        <span className="font-medium">
                            {sourceStories.length} {sourceStories.length === 1 ? 'story' : 'stories'}
                            {video.durationSeconds ? ` · ${video.durationSeconds.toFixed(1)}s` : ''}
                        </span>
                        <span className="text-white/80">{fmtAge(tsForAge)}</span>
                    </div>
                </div>
            </div>

            <div className="space-y-2 p-2.5">
                {audioTrack && (
                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                        <Music className="h-3 w-3 shrink-0" />
                        <span className="truncate">
                            {audioTrack.title}
                            {audioTrack.artist ? ` — ${audioTrack.artist}` : ''}
                        </span>
                    </div>
                )}

                {status === 'failed' && video.tiktokPublishError && (
                    <div className="flex items-start gap-1.5 rounded-md border border-red-200 bg-red-50 p-1.5 text-[11px] text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
                        <AlertTriangle className="h-3 w-3 shrink-0 mt-0.5" />
                        <span className="break-words">{video.tiktokPublishError}</span>
                    </div>
                )}

                <div className="flex items-center justify-between gap-1.5 pt-0.5">
                    {postUrl ? (
                        <a
                            href={postUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
                        >
                            <ExternalLink className="h-3 w-3" />
                            View on TikTok
                        </a>
                    ) : (
                        <span className="text-[11px] text-muted-foreground">
                            ref: {video.tiktokPublishId?.slice(0, 12) ?? '—'}
                        </span>
                    )}
                    <button
                        onClick={() => setExpanded((v) => !v)}
                        className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
                    >
                        Sources
                        {expanded ? (
                            <ChevronUp className="h-3 w-3" />
                        ) : (
                            <ChevronDown className="h-3 w-3" />
                        )}
                    </button>
                </div>

                {expanded && sourceStories.length > 0 && (
                    <ul className="space-y-1 border-t pt-2 text-[11px]">
                        {sourceStories.map((s, idx) => (
                            <li key={s.id} className="flex items-center justify-between gap-2">
                                <span className="truncate text-muted-foreground">
                                    #{idx + 1} · {s.mediaType === 'VIDEO' ? '🎬' : '🖼'}{' '}
                                    {s.caption?.slice(0, 30) || s.igMediaId.slice(0, 10)}
                                </span>
                                <span className="shrink-0 tabular-nums text-muted-foreground/80">
                                    {s.engagementScore != null ? s.engagementScore.toFixed(0) : '—'}
                                </span>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
}

function StatusBadge({
    status,
    pulse,
}: {
    status: ComposedVideo['tiktokPublishStatus'];
    pulse: boolean;
}) {
    if (status === 'published') {
        return (
            <Badge
                className={cn(
                    'gap-1 bg-emerald-500 text-white shadow-sm',
                    pulse && 'animate-pulse',
                )}
            >
                <CheckCircle2 className="h-3 w-3" />
                Published
            </Badge>
        );
    }
    if (status === 'failed') {
        return (
            <Badge variant="destructive" className="gap-1 shadow-sm">
                <AlertTriangle className="h-3 w-3" />
                Failed
            </Badge>
        );
    }
    if (status === 'uploading') {
        return (
            <Badge className="gap-1 bg-amber-500 text-white shadow-sm">
                <Loader2 className="h-3 w-3 animate-spin" />
                Uploading
            </Badge>
        );
    }
    return <Badge variant="secondary">Unknown</Badge>;
}
