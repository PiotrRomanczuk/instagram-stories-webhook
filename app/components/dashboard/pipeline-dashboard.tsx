'use client';

import useSWR from 'swr';
import { Sparkles, AlertCircle } from 'lucide-react';
import { Link } from '@/i18n/routing';
import { Card, CardContent } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { StatusStrip } from './status-strip';
import { FunnelKpis } from './funnel-kpis';
import { NextDraftHero } from './next-draft-hero';
import { TopStoriesCard } from './top-stories-card';
import { PipelineHealthCard } from './pipeline-health-card';

interface PipelineSummaryResponse {
	stats: {
		archived24h: number;
		composing: number;
		awaitingPublish: number;
		published24h: number;
		failedComposing: number;
		failedPublishing: number;
		activeAudioTracks: number;
	};
	connections: {
		instagram: { connected: boolean; username: string | null; expiresAt: number | null };
		tiktok: { connected: boolean; openId: string | null; expiresAt: number | null };
	};
	cron: { job: string; lastRunAt: string | null; status: 'idle' | 'running' | 'unknown' }[];
	pipelineEnabled: boolean;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface PipelineDashboardProps {
	userName: string;
}

export function PipelineDashboard({ userName }: PipelineDashboardProps) {
	const { data, isLoading, mutate } = useSWR<PipelineSummaryResponse>(
		'/api/dashboard/pipeline-summary',
		fetcher,
		{ refreshInterval: 30_000 },
	);

	const stats = data?.stats;
	const totalFailed = (stats?.failedComposing ?? 0) + (stats?.failedPublishing ?? 0);
	const tiktokConnected = data?.connections.tiktok.connected ?? false;
	const igConnected = data?.connections.instagram.connected ?? false;
	const blocked = !tiktokConnected || !igConnected;

	return (
		<div className="space-y-5">
			<header className="space-y-2">
				<div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
					<div>
						<h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight sm:text-3xl">
							<Sparkles className="h-6 w-6 text-primary" />
							Welcome back, {userName}
						</h1>
						<p className="text-sm text-muted-foreground">
							Pick top IG stories, send a draft to TikTok, finalize there.
						</p>
					</div>
				</div>
				<StatusStrip
					instagram={data?.connections.instagram}
					tiktok={data?.connections.tiktok}
					isLoading={isLoading}
				/>
			</header>

			{blocked && !isLoading && (
				<Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/30">
					<CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
						<div className="flex items-center gap-3">
							<AlertCircle className="h-5 w-5 shrink-0 text-amber-600" />
							<div>
								<p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
									Pipeline is incomplete
								</p>
								<p className="text-xs text-amber-700 dark:text-amber-300/80">
									{!igConnected && !tiktokConnected
										? 'Connect both Instagram and TikTok to start.'
										: !igConnected
											? 'Connect Instagram to begin archiving stories.'
											: 'Connect TikTok to send drafts to the inbox.'}
								</p>
							</div>
						</div>
						<Button asChild size="sm" variant="outline" className="shrink-0">
							<Link href="/linked-accounts">Set up connections</Link>
						</Button>
					</CardContent>
				</Card>
			)}

			{totalFailed > 0 && !isLoading && (
				<Card className="border-red-200 bg-red-50 dark:bg-red-950/30">
					<CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
						<div className="flex items-center gap-3">
							<AlertCircle className="h-5 w-5 shrink-0 text-red-600" />
							<div>
								<p className="text-sm font-semibold text-red-900 dark:text-red-200">
									{totalFailed} {totalFailed === 1 ? 'job has' : 'jobs have'} failed
								</p>
								<p className="text-xs text-red-700 dark:text-red-300/80">
									{stats?.failedComposing ?? 0} composition · {stats?.failedPublishing ?? 0} publish
								</p>
							</div>
						</div>
						<Button asChild size="sm" variant="outline" className="shrink-0">
							<Link href="/posted-tiktok">Review failures</Link>
						</Button>
					</CardContent>
				</Card>
			)}

			<NextDraftHero canSend={!blocked} />

			<FunnelKpis stats={stats} isLoading={isLoading} />

			<div className="grid gap-4 lg:grid-cols-3">
				<div className="lg:col-span-2">
					<TopStoriesCard />
				</div>
				<div>
					<PipelineHealthCard
						cron={data?.cron}
						pipelineEnabled={data?.pipelineEnabled}
						isLoading={isLoading}
						onPipelineRun={() => mutate()}
					/>
				</div>
			</div>
		</div>
	);
}
