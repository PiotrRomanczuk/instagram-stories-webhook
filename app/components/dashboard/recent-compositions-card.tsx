'use client';

import useSWR from 'swr';
import { Film, Clock, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Skeleton } from '@/app/components/ui/skeleton';
import { Badge } from '@/app/components/ui/badge';
import { Link } from '@/i18n/routing';
import { cn } from '@/lib/utils';

interface RecentVideo {
	id: string;
	title: string | null;
	thumbnailPath: string | null;
	durationSeconds: number | null;
	compositionStatus: 'pending' | 'processing' | 'completed' | 'failed';
	tiktokPublishStatus: 'pending' | 'uploading' | 'published' | 'failed' | null;
	createdAt: string;
	publishedAt: string | null;
}

interface RecentCompositionsResponse {
	videos: RecentVideo[];
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function statusBadge(v: RecentVideo) {
	if (v.tiktokPublishStatus === 'published') {
		return { label: 'Published', tone: 'bg-emerald-100 text-emerald-700', Icon: CheckCircle2 };
	}
	if (v.tiktokPublishStatus === 'uploading') {
		return { label: 'Uploading', tone: 'bg-blue-100 text-blue-700', Icon: Loader2 };
	}
	if (v.compositionStatus === 'failed' || v.tiktokPublishStatus === 'failed') {
		return { label: 'Failed', tone: 'bg-red-100 text-red-700', Icon: AlertCircle };
	}
	if (v.compositionStatus === 'processing') {
		return { label: 'Composing', tone: 'bg-purple-100 text-purple-700', Icon: Loader2 };
	}
	if (v.compositionStatus === 'completed') {
		return { label: 'Ready', tone: 'bg-amber-100 text-amber-700', Icon: Clock };
	}
	return { label: 'Pending', tone: 'bg-slate-100 text-slate-700', Icon: Clock };
}

function fmtDuration(s: number | null): string {
	if (!s) return '—';
	const m = Math.floor(s / 60);
	const sec = Math.floor(s % 60);
	return `${m}:${sec.toString().padStart(2, '0')}`;
}

function fmtRelative(iso: string): string {
	const diff = Date.now() - new Date(iso).getTime();
	const min = Math.floor(diff / 60_000);
	if (min < 60) return `${Math.max(min, 0)}m`;
	const hr = Math.floor(min / 60);
	if (hr < 24) return `${hr}h`;
	return `${Math.floor(hr / 24)}d`;
}

export function RecentCompositionsCard() {
	const { data, isLoading } = useSWR<RecentCompositionsResponse>(
		'/api/compositions?limit=6',
		fetcher,
		{ refreshInterval: 30_000 },
	);

	const videos = data?.videos ?? [];

	return (
		<Card>
			<CardHeader className="pb-3">
				<div className="flex items-center justify-between">
					<CardTitle className="flex items-center gap-2 text-base">
						<Film className="h-4 w-4" />
						Recent compositions
					</CardTitle>
					<Button asChild variant="ghost" size="sm" className="h-7 text-xs">
						<Link href="/compositions">View all</Link>
					</Button>
				</div>
			</CardHeader>
			<CardContent>
				{isLoading ? (
					<div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
						{Array.from({ length: 6 }).map((_, i) => (
							<Skeleton key={i} className="aspect-[9/16] w-full rounded-md" />
						))}
					</div>
				) : videos.length === 0 ? (
					<div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed py-10 text-center">
						<Film className="h-8 w-8 text-muted-foreground/40" />
						<p className="text-sm text-muted-foreground">No compositions yet</p>
						<Button asChild size="sm" variant="outline" className="mt-1">
							<Link href="/story-archive">Compose from archive</Link>
						</Button>
					</div>
				) : (
					<div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
						{videos.slice(0, 6).map((v) => {
							const status = statusBadge(v);
							const StatusIcon = status.Icon;
							const animate = StatusIcon === Loader2;
							return (
								<Link
									key={v.id}
									href="/compositions"
									className="group relative overflow-hidden rounded-md border bg-muted aspect-[9/16] block"
								>
									{v.thumbnailPath ? (
										// eslint-disable-next-line @next/next/no-img-element
										<img
											src={v.thumbnailPath}
											alt={v.title ?? 'Composition'}
											className="absolute inset-0 h-full w-full object-cover transition-transform group-hover:scale-105"
										/>
									) : (
										<div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-700">
											<Film className="h-8 w-8 text-white/30" />
										</div>
									)}
									<div className="absolute inset-x-0 top-0 p-1.5">
										<Badge
											className={cn('gap-1 text-[10px] font-semibold', status.tone)}
											variant="secondary"
										>
											<StatusIcon className={cn('h-3 w-3', animate && 'animate-spin')} />
											{status.label}
										</Badge>
									</div>
									<div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2 text-white">
										<div className="text-[11px] font-medium truncate">
											{v.title ?? 'Untitled'}
										</div>
										<div className="flex items-center justify-between text-[10px] text-white/70">
											<span>{fmtDuration(v.durationSeconds)}</span>
											<span>{fmtRelative(v.createdAt)} ago</span>
										</div>
									</div>
								</Link>
							);
						})}
					</div>
				)}
			</CardContent>
		</Card>
	);
}
