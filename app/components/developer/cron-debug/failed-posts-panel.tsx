'use client';

import useSWR from 'swr';
import { useState } from 'react';
import { Loader, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Panel } from '@/app/components/ui/panel';
import { Skeleton } from '@/app/components/ui/skeleton';
import { Card } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/app/components/ui/collapsible';

interface FailedPost {
	id: string;
	url: string;
	caption: string;
	scheduled_time: number;
	error: string | null;
	retry_count: number;
	updated_at: string;
	status: string;
}

interface FailedPostsData {
	posts: FailedPost[];
	count: number;
}

const fetcher = async (url: string) => {
	const res = await fetch(url);
	if (!res.ok) throw new Error('Failed to fetch failed posts');
	return res.json();
};

export function FailedPostsPanel() {
	const { data, isLoading, error, mutate } = useSWR<FailedPostsData>(
		'/api/developer/cron-debug/failed-posts',
		fetcher,
		{ refreshInterval: 10000, revalidateOnFocus: true },
	);

	const [retryingId, setRetryingId] = useState<string | null>(null);
	const [expandedId, setExpandedId] = useState<string | null>(null);

	const handleRetry = async (postId: string) => {
		setRetryingId(postId);
		try {
			const res = await fetch('/api/developer/cron-debug/failed-posts', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ postId }),
			});

			if (!res.ok) throw new Error('Failed to retry post');
			toast.success(`Post ${postId.slice(0, 8)} reset for retry`);
			mutate();
		} catch (err) {
			toast.error(`Failed to retry: ${err instanceof Error ? err.message : 'Unknown error'}`);
		} finally {
			setRetryingId(null);
		}
	};

	if (error) {
		return (
			<Panel title="Failed Posts" icon={<XCircle className="w-6 h-6" />}>
				<div className="text-center py-4 text-red-600">
					Failed to load failed posts
				</div>
			</Panel>
		);
	}

	if (isLoading || !data) {
		return (
			<Panel title="Failed Posts" icon={<XCircle className="w-6 h-6" />}>
				<Skeleton className="h-32 w-full rounded-lg" />
			</Panel>
		);
	}

	return (
		<Panel title="Failed Posts" icon={<XCircle className="w-6 h-6" />}>
			{data.count === 0 ? (
				<div className="text-center py-8 text-slate-600">
					<p className="font-semibold">No failed posts</p>
					<p className="text-sm text-slate-500 mt-1">Great! All posts succeeded.</p>
				</div>
			) : (
				<div>
					<p className="text-sm font-semibold text-slate-700 mb-4">
						{data.count} post{data.count !== 1 ? 's' : ''} failed (last 50)
					</p>
					<div className="space-y-3">
						{data.posts.map((post) => (
							<Card
								key={post.id}
								className="p-4"
							>
								<div className="flex items-start justify-between mb-2">
									<div className="flex-1">
										<p className="font-mono text-sm font-bold text-slate-900">
											{post.id.slice(0, 12)}...
										</p>
										<p className="text-xs text-slate-600 mt-1">
											Scheduled:{' '}
											{new Date(post.scheduled_time).toLocaleString()}
										</p>
									</div>
									<div className="flex items-center gap-2">
										<Badge variant="destructive" className="bg-rose-100 text-rose-700 border-rose-200">
											{post.retry_count}/3
										</Badge>
										<Button
											onClick={() => handleRetry(post.id)}
											disabled={
												retryingId === post.id ||
												post.retry_count >= 3
											}
											size="sm"
										>
											{retryingId === post.id ? (
												<Loader className="w-4 h-4 animate-spin" />
											) : null}
											Retry
										</Button>
									</div>
								</div>

								{post.error && (
									<Collapsible
										open={expandedId === post.id}
										onOpenChange={(open) =>
											setExpandedId(open ? post.id : null)
										}
									>
										<CollapsibleTrigger className="text-xs font-semibold text-rose-600 hover:text-rose-700 mt-2">
											{expandedId === post.id
												? '▼ Hide error'
												: '▶ Show error'}
										</CollapsibleTrigger>
										<CollapsibleContent>
											<pre className="mt-2 p-2 bg-slate-100 rounded text-xs text-slate-700 overflow-auto max-h-32">
												{post.error}
											</pre>
										</CollapsibleContent>
									</Collapsible>
								)}
							</Card>
						))}
					</div>
				</div>
			)}
		</Panel>
	);
}
