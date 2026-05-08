'use client';

import useSWR from 'swr';
import { AlertCircle, Camera, Instagram, RefreshCw } from 'lucide-react';
import { PageHeader } from '@/app/components/layout/page-header';
import { Button } from '@/app/components/ui/button';
import { Skeleton } from '@/app/components/ui/skeleton';
import { EmptyState } from '@/app/components/ui/empty-state';
import { Alert, AlertDescription, AlertTitle } from '@/app/components/ui/alert';
import { Card, CardContent } from '@/app/components/ui/card';
import { StoriesTable } from './stories-table';
import type { StoriesWithInsightsResponse } from '@/app/api/instagram/stories/with-insights/route';

const fetcher = async <T,>(url: string): Promise<T> => {
	const res = await fetch(url);
	if (!res.ok) {
		const body = await res.json().catch(() => ({}));
		throw new Error(body.error ?? `Request failed (${res.status})`);
	}
	return res.json();
};

export function InstagramStoriesClient() {
	const { data, error, isLoading, isValidating, mutate } =
		useSWR<StoriesWithInsightsResponse>(
			'/api/instagram/stories/with-insights?limit=200',
			fetcher,
			{
				revalidateOnFocus: false,
				dedupingInterval: 30_000,
				keepPreviousData: true,
			},
		);

	const stories = data?.stories ?? [];
	const username = stories[0]?.username;

	return (
		<div className="container mx-auto space-y-6 px-4 py-6 sm:px-6 sm:py-8">
			<PageHeader
				title="Instagram Stories"
				description={
					username
						? `Live stories currently active on @${username}.`
						: 'Live stories currently active on the linked Instagram account.'
				}
				badge={
					username ? (
						<span className="inline-flex items-center gap-1 rounded-full bg-pink-50 px-2.5 py-1 text-xs font-medium text-pink-700">
							<Instagram className="h-3 w-3" />@{username}
						</span>
					) : null
				}
				actions={
					<Button
						variant="outline"
						size="sm"
						onClick={() => mutate()}
						disabled={isValidating}
						className="gap-2"
					>
						<RefreshCw
							className={`h-4 w-4 ${isValidating ? 'animate-spin' : ''}`}
						/>
						Refresh
					</Button>
				}
			/>

			<StatRow count={data?.count} loading={isLoading} />

			{error ? (
				<Alert variant="destructive">
					<AlertCircle className="h-4 w-4" />
					<AlertTitle>Couldn&apos;t load stories</AlertTitle>
					<AlertDescription className="flex flex-col gap-2">
						<span>{(error as Error).message}</span>
						<Button
							size="sm"
							variant="outline"
							className="w-fit"
							onClick={() => mutate()}
						>
							Try again
						</Button>
					</AlertDescription>
				</Alert>
			) : isLoading && !data ? (
				<div className="space-y-2">
					{Array.from({ length: 8 }).map((_, i) => (
						<Skeleton key={i} className="h-24 w-full rounded-xl" />
					))}
				</div>
			) : stories.length === 0 ? (
				<EmptyState
					icon={Camera}
					title="No active stories"
					description="Instagram stories expire after 24 hours. Post a new story or check back later."
				/>
			) : (
				<StoriesTable
					stories={stories}
					insights={data?.insights}
					insightsLoading={isValidating && !data?.insights}
				/>
			)}
		</div>
	);
}

function StatRow({ count, loading }: { count?: number; loading: boolean }) {
	return (
		<Card className="border-dashed">
			<CardContent className="flex items-center justify-between gap-4 px-6 py-3">
				<div className="flex items-center gap-3">
					<div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-pink-500 to-purple-600 text-white shadow-sm">
						<Camera className="h-5 w-5" />
					</div>
					<div>
						<div className="text-2xl font-semibold leading-none">
							{loading ? '—' : (count ?? 0)}
						</div>
						<div className="text-xs text-muted-foreground">
							active {count === 1 ? 'story' : 'stories'}
						</div>
					</div>
				</div>
				<div className="text-right text-xs text-muted-foreground">
					Stories live for <span className="font-medium">24h</span>
					<br />
					Source: Instagram Graph API
				</div>
			</CardContent>
		</Card>
	);
}
