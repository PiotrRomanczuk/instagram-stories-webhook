'use client';

import { useMemo, useState } from 'react';
import useSWR from 'swr';
import { Sparkles, Send, Settings2, Image as ImageIcon, Video, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Skeleton } from '@/app/components/ui/skeleton';
import { Badge } from '@/app/components/ui/badge';
import { Link } from '@/i18n/routing';
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

const TARGET = 7;

interface NextDraftHeroProps {
	canSend: boolean;
}

export function NextDraftHero({ canSend }: NextDraftHeroProps) {
	const { data: storiesData, isLoading: storiesLoading } = useSWR<StoriesResponse>(
		'/api/instagram/recent-stories?limit=200',
		fetcher,
		{ revalidateOnFocus: false, dedupingInterval: 60_000 },
	);

	const stories = useMemo(() => storiesData?.stories ?? [], [storiesData]);
	const insightsKey = stories.length
		? `/api/instagram/stories/insights?ids=${stories.map((s) => s.id).join(',')}`
		: null;
	const { data: insightsData, isLoading: insightsLoading } = useSWR<StoryInsightsResponse>(
		insightsKey,
		fetcher,
		{ revalidateOnFocus: false, dedupingInterval: 60_000 },
	);

	const ranked = useMemo(() => {
		const insights = insightsData?.insights ?? {};
		return rankStoriesByEngagement(
			stories.map((s) => ({ id: s.id, story: s, metrics: insights[s.id]?.metrics })),
		);
	}, [stories, insightsData]);

	const top = ranked.slice(0, TARGET);
	const enough = top.filter((r) => r.qualifies).length >= 3;
	const hasVideo = top.some((r) => r.story.story.media_type === 'VIDEO');
	const formatLabel = hasVideo ? 'Video compilation' : 'Carousel';

	const [sending, setSending] = useState(false);

	async function send() {
		const igMediaIds = top.map((r) => r.story.story.id);
		if (igMediaIds.length < 3) {
			toast.error(`Need at least 3 active stories, have ${igMediaIds.length}`);
			return;
		}
		setSending(true);
		try {
			const res = await fetch('/api/compositions/compose', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ igMediaIds }),
			});
			const body = await res.json().catch(() => ({}));
			if (res.ok) {
				toast.success(
					`Composing ${body.storyCount ?? igMediaIds.length} stories — TT inbox in ~60s`,
					{ description: body.message },
				);
			} else {
				toast.error(body.error ?? `Send failed (${res.status})`);
			}
		} catch (err) {
			toast.error(`Send failed: ${err instanceof Error ? err.message : 'Unknown'}`);
		} finally {
			setSending(false);
		}
	}

	const isLoading = storiesLoading || (stories.length > 0 && insightsLoading);

	if (isLoading) {
		return (
			<Card className="border-primary/30 bg-gradient-to-br from-fuchsia-50/50 to-orange-50/30 dark:from-fuchsia-950/20 dark:to-orange-950/10">
				<CardContent className="space-y-3 p-5">
					<Skeleton className="h-5 w-48" />
					<div className="flex gap-2">
						{Array.from({ length: TARGET }).map((_, i) => (
							<Skeleton key={i} className="h-24 w-16 rounded" />
						))}
					</div>
				</CardContent>
			</Card>
		);
	}

	return (
		<Card className="border-primary/30 bg-gradient-to-br from-fuchsia-50/50 to-orange-50/30 dark:from-fuchsia-950/20 dark:to-orange-950/10">
			<CardContent className="p-5">
				<div className="mb-3 flex flex-wrap items-center justify-between gap-2">
					<div className="flex items-center gap-2">
						<Sparkles className="h-4 w-4 text-primary" />
						<h2 className="text-base font-semibold">Next TikTok draft</h2>
						<Badge variant="secondary" className="text-[10px]">
							{enough ? formatLabel : 'Not enough data'}
						</Badge>
					</div>
					<div className="flex items-center gap-2">
						<Button variant="outline" size="sm" asChild>
							<Link href="/insights" className="flex items-center gap-1.5">
								<Settings2 className="h-3.5 w-3.5" /> Customize
							</Link>
						</Button>
						<Button
							size="sm"
							disabled={!canSend || top.length < 3 || sending}
							onClick={send}
							className="gap-1.5"
						>
							{sending ? (
								<Loader2 className="h-3.5 w-3.5 animate-spin" />
							) : (
								<Send className="h-3.5 w-3.5" />
							)}
							Send to TT inbox
						</Button>
					</div>
				</div>

				{top.length >= 3 ? (
					<>
						<p className="mb-3 text-xs text-muted-foreground">
							Top {top.length} live IG stories by engagement rate. Audio kept from IG; pick a TT-native sound after upload.
						</p>
						<div className="flex gap-2 overflow-x-auto pb-1">
							{top.map((r, idx) => {
								const s = r.story.story;
								const ratePct = (r.rate * 100).toFixed(0);
								return (
									<div
										key={s.id}
										className="relative h-24 w-16 shrink-0 overflow-hidden rounded-md border bg-muted"
									>
										{s.thumbnail_url || s.media_url ? (
											// eslint-disable-next-line @next/next/no-img-element
											<img
												src={proxyUrl(s.thumbnail_url ?? s.media_url)}
												alt=""
												className="h-full w-full object-cover"
											/>
										) : (
											<div className="flex h-full items-center justify-center bg-gradient-to-br from-slate-700 to-slate-900">
												{s.media_type === 'VIDEO' ? (
													<Video className="h-4 w-4 text-white/50" />
												) : (
													<ImageIcon className="h-4 w-4 text-white/50" />
												)}
											</div>
										)}
										<div className="absolute left-0 top-0 rounded-br-md bg-black/70 px-1 py-0.5 text-[9px] font-bold text-white">
											#{idx + 1}
										</div>
										<div className="absolute bottom-0 left-0 right-0 bg-black/70 px-1 py-0.5 text-center text-[9px] font-semibold text-white tabular-nums">
											{r.qualifies ? `${ratePct}%` : '—'}
										</div>
									</div>
								);
							})}
						</div>
					</>
				) : (
					<div className="rounded-lg border border-dashed py-6 text-center">
						<p className="text-sm font-medium">No active IG stories</p>
						<p className="mt-1 text-xs text-muted-foreground">
							Stories live for 24h. Post a story or wait for new content; this card auto-refreshes.
						</p>
					</div>
				)}
			</CardContent>
		</Card>
	);
}
