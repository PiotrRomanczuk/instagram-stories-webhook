'use client';

import useSWR from 'swr';
import { useState } from 'react';
import { Loader, AlertTriangle, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { Panel } from '@/app/components/ui/panel';
import { Skeleton } from '@/app/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/app/components/ui/alert';
import { Button } from '@/app/components/ui/button';

interface StuckPost {
	id: string;
	url: string;
	caption: string;
	scheduled_time: number;
	processing_started_at: string;
	error: string | null;
	retry_count: number;
	stuckForMinutes: number;
}

interface StuckLocksData {
	stuck: StuckPost[];
	count: number;
}

const fetcher = async (url: string) => {
	const res = await fetch(url);
	if (!res.ok) throw new Error('Failed to fetch stuck locks');
	return res.json();
};

export function StuckLocksPanel() {
	const { data, isLoading, error, mutate } = useSWR<StuckLocksData>(
		'/api/developer/cron-debug/stuck-locks',
		fetcher,
		{ refreshInterval: 10000, revalidateOnFocus: true },
	);

	const [releasingId, setReleasingId] = useState<string | null>(null);

	const handleReleaseLock = async (postId: string) => {
		setReleasingId(postId);
		try {
			const res = await fetch('/api/developer/cron-debug/stuck-locks', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ postId }),
			});

			if (!res.ok) throw new Error('Failed to release lock');
			toast.success(`Lock released for post ${postId.slice(0, 8)}`);
			mutate();
		} catch (err) {
			toast.error(`Failed to release lock: ${err instanceof Error ? err.message : 'Unknown error'}`);
		} finally {
			setReleasingId(null);
		}
	};

	if (error) {
		return (
			<Panel title="Stuck Locks" icon={<Lock className="w-6 h-6" />}>
				<div className="text-center py-4 text-red-600">
					Failed to load stuck locks
				</div>
			</Panel>
		);
	}

	const isHealthy = !data || data.count === 0;

	return (
		<Panel title="Stuck Locks" icon={<Lock className="w-6 h-6" />}>
			{isLoading || !data ? (
				<Skeleton className="h-24 w-full rounded-lg" />
			) : isHealthy ? (
				<div className="text-center py-8">
					<div className="text-4xl mb-2">&#10003;</div>
					<p className="text-slate-600 font-semibold">
						No stuck locks detected
					</p>
					<p className="text-sm text-slate-500 mt-1">
						All posts are processing normally
					</p>
				</div>
			) : (
				<div>
					<Alert variant="destructive" className="mb-4">
						<AlertTriangle className="h-5 w-5" />
						<AlertTitle>
							{data.count} post{data.count !== 1 ? 's' : ''} stuck in processing
						</AlertTitle>
						<AlertDescription>
							Posts stuck for more than 5 minutes. Consider releasing locks if this
							persists.
						</AlertDescription>
					</Alert>

					<div className="space-y-3">
						{data.stuck.map((post) => (
							<div
								key={post.id}
								className="rounded-lg border border-rose-200 bg-rose-50 p-4"
							>
								<div className="flex items-start justify-between mb-2">
									<div>
										<p className="font-mono text-sm font-bold text-slate-900">
											{post.id.slice(0, 12)}...
										</p>
										<p className="text-xs text-slate-600 mt-1">
											Stuck for: <span className="font-bold text-rose-700">{post.stuckForMinutes} minutes</span>
										</p>
									</div>
									<Button
										onClick={() => handleReleaseLock(post.id)}
										disabled={releasingId === post.id}
										variant="destructive"
										size="sm"
									>
										{releasingId === post.id ? (
											<Loader className="w-4 h-4 animate-spin" />
										) : null}
										Release
									</Button>
								</div>
								{post.caption && (
									<p className="text-xs text-slate-600 truncate mt-2">
										{post.caption.slice(0, 60)}...
									</p>
								)}
							</div>
						))}
					</div>
				</div>
			)}
		</Panel>
	);
}
