'use client';

import { useState } from 'react';
import useSWR from 'swr';
import {
    AlertTriangle,
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    CircleDot,
    CloudUpload,
    Loader2,
    RefreshCcw,
    Sparkles,
} from 'lucide-react';
import { PageHeader } from '@/app/components/layout/page-header';
import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import { Skeleton } from '@/app/components/ui/skeleton';
import { EmptyState } from '@/app/components/ui/empty-state';
import { cn } from '@/lib/utils';
import { PostedCard, type PostedItem } from './posted-tiktok-card';

const fetcher = (url: string) => fetch(url).then((r) => r.json());
const PAGE_SIZE = 24;
const REFRESH_INTERVAL_MS = 30_000;

type FilterKey = 'all' | 'published' | 'failed' | 'uploading';

interface ApiResponse {
    items: PostedItem[];
    summary: {
        publishedTotal: number;
        failedTotal: number;
        uploadingTotal: number;
        published24h: number;
        failed24h: number;
        successRate24h: number | null;
        lastPublishedAt: string | null;
    };
    pagination: { page: number; limit: number; total: number; totalPages: number };
}

const FILTERS: { key: FilterKey; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'published', label: 'Published' },
    { key: 'failed', label: 'Failed' },
    { key: 'uploading', label: 'Uploading' },
];

function fmtRelative(iso: string | null): string {
    if (!iso) return 'never';
    const diff = Date.now() - new Date(iso).getTime();
    const min = Math.floor(diff / 60000);
    if (min < 1) return 'just now';
    if (min < 60) return `${min}m ago`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `${hr}h ago`;
    return `${Math.floor(hr / 24)}d ago`;
}

export function PostedTiktokClient() {
    const [page, setPage] = useState(1);
    const [filter, setFilter] = useState<FilterKey>('all');

    const { data, error, isLoading, isValidating, mutate } = useSWR<ApiResponse>(
        `/api/posted-tiktok?page=${page}&limit=${PAGE_SIZE}&filter=${filter}`,
        fetcher,
        {
            refreshInterval: REFRESH_INTERVAL_MS,
            revalidateOnFocus: true,
            dedupingInterval: 5_000,
            keepPreviousData: true,
        },
    );

    const items = data?.items ?? [];
    const summary = data?.summary;
    const pagination = data?.pagination;
    const totalPages = pagination?.totalPages ?? 1;

    return (
        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
            <div className="space-y-5">
                <PageHeader
                    title="Posted to TikTok"
                    description="The completed end of the pipeline — Instagram stories that were composed into a video and pushed to TikTok. Auto-refreshes every 30s."
                    badge={
                        <div className="flex items-center gap-2">
                            {pagination && (
                                <Badge variant="secondary" className="text-xs">
                                    {pagination.total} tracked
                                </Badge>
                            )}
                            <span
                                className={cn(
                                    'flex items-center gap-1 text-[11px] text-muted-foreground',
                                    isValidating && 'text-emerald-600',
                                )}
                            >
                                <CircleDot
                                    className={cn(
                                        'h-3 w-3',
                                        isValidating ? 'animate-pulse text-emerald-500' : 'text-muted-foreground/50',
                                    )}
                                />
                                Live
                            </span>
                        </div>
                    }
                    actions={
                        <Button size="sm" variant="outline" onClick={() => mutate()} disabled={isValidating}>
                            {isValidating ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <RefreshCcw className="h-4 w-4" />
                            )}
                            <span>Refresh</span>
                        </Button>
                    }
                />

                {summary && (
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                        <SummaryStat
                            label="Published"
                            value={summary.publishedTotal.toString()}
                            sub={`${summary.published24h} in 24h`}
                            icon={<CheckCircle2 className="h-4 w-4 text-emerald-600" />}
                            tone="bg-emerald-100"
                        />
                        <SummaryStat
                            label="Failed"
                            value={summary.failedTotal.toString()}
                            sub={`${summary.failed24h} in 24h`}
                            icon={<AlertTriangle className="h-4 w-4 text-red-600" />}
                            tone="bg-red-100"
                        />
                        <SummaryStat
                            label="Uploading"
                            value={summary.uploadingTotal.toString()}
                            sub={summary.uploadingTotal > 0 ? 'in progress' : 'idle'}
                            icon={<CloudUpload className="h-4 w-4 text-amber-600" />}
                            tone="bg-amber-100"
                        />
                        <SummaryStat
                            label="Last published"
                            value={fmtRelative(summary.lastPublishedAt)}
                            sub={
                                summary.successRate24h != null
                                    ? `${Math.round(summary.successRate24h * 100)}% 24h success`
                                    : 'no recent runs'
                            }
                            icon={<Sparkles className="h-4 w-4 text-sky-600" />}
                            tone="bg-sky-100"
                        />
                    </div>
                )}

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
                    <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
                        Failed to load posted videos.
                    </div>
                )}

                {isLoading && !data && <LoadingGrid />}

                {!isLoading && items.length === 0 && (
                    <EmptyState
                        icon={CheckCircle2}
                        title={
                            filter === 'all'
                                ? 'Nothing posted yet'
                                : `No videos in "${filter}"`
                        }
                        description={
                            filter === 'all'
                                ? 'Once the pipeline composes a video and publishes it to TikTok, it will appear here. The TikTok cron runs weekly by default — check that an Instagram and a TikTok account are linked, and that audio tracks exist.'
                                : 'Try a different filter.'
                        }
                    />
                )}

                {items.length > 0 && (
                    <>
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                            {items.map((item) => (
                                <PostedCard key={item.video.id} item={item} />
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
        </main>
    );
}

function SummaryStat({
    label,
    value,
    sub,
    icon,
    tone,
}: {
    label: string;
    value: string;
    sub: string;
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
            <div className="text-[11px] text-muted-foreground">{sub}</div>
        </div>
    );
}

function LoadingGrid() {
    return (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="overflow-hidden rounded-xl border bg-card">
                    <Skeleton className="aspect-[9/16] w-full" />
                    <div className="space-y-2 p-2">
                        <Skeleton className="h-3 w-24" />
                        <Skeleton className="h-3 w-16" />
                    </div>
                </div>
            ))}
        </div>
    );
}
