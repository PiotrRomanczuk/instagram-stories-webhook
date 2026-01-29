'use client';

import useSWR from 'swr';
import { useState } from 'react';
import { Loader, AlertTriangle, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { Panel } from '@/app/components/ui/panel';

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
			<Panel title="🔓 Stuck Locks" icon={<Lock className="w-6 h-6" />}>
				<div className="text-center py-4 text-red-600">
					Failed to load stuck locks
				</div>
			</Panel>
		);
	}

	const isHealthy = !data || data.count === 0;

	return (
		<Panel title="🔓 Stuck Locks" icon={<Lock className="w-6 h-6" />}>
			{isLoading || !data ? (
				<div className="animate-pulse h-24 bg-slate-200 rounded-lg"></div>
			) : isHealthy ? (
				<div className="text-center py-8">
					<div className="text-4xl mb-2">✅</div>
					<p className="text-slate-600 font-semibold">
						No stuck locks detected
					</p>
					<p className="text-sm text-slate-500 mt-1">
						All posts are processing normally
					</p>
				</div>
			) : (
				<div>
					<div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-start gap-2">
						<AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
						<div>
							<p className="font-semibold text-rose-900">
								{data.count} post{data.count !== 1 ? 's' : ''} stuck in processing
							</p>
							<p className="text-sm text-rose-700 mt-1">
								Posts stuck for more than 5 minutes. Consider releasing locks if this
								persists.
							</p>
						</div>
					</div>

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
									<button
										onClick={() => handleReleaseLock(post.id)}
										disabled={releasingId === post.id}
										className="px-3 py-1.5 bg-rose-600 text-white rounded-lg font-bold text-sm hover:bg-rose-700 disabled:opacity-50 flex items-center gap-2 transition"
									>
										{releasingId === post.id ? (
											<Loader className="w-4 h-4 animate-spin" />
										) : null}
										Release
									</button>
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
