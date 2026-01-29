'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { Clock, Loader, Play, PlayCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Panel } from '@/app/components/ui/panel';

interface PendingPost {
	id: string;
	url: string;
	caption: string;
	scheduled_time: number;
	created_at: string;
	status: string;
	meme_id: string | null;
	minutesOverdue: number;
}

interface PendingPostsData {
	posts: PendingPost[];
	count: number;
}

const fetcher = async (url: string) => {
	const res = await fetch(url);
	if (!res.ok) throw new Error('Failed to fetch pending posts');
	return res.json();
};

export function PendingPostsPanel() {
	const { data, isLoading, error, mutate } = useSWR<PendingPostsData>(
		'/api/developer/cron-debug/pending-posts',
		fetcher,
		{ refreshInterval: 10000, revalidateOnFocus: true },
	);

	const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
	const [bulkProcessing, setBulkProcessing] = useState(false);

	const handleProcessSingle = async (postId: string) => {
		setProcessingIds(prev => new Set(prev).add(postId));
		try {
			const res = await fetch('/api/developer/cron-debug/force-process', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					postIds: [postId],
					bypassDuplicates: true,
				}),
			});

			const result = await res.json();

			if (!res.ok) {
				throw new Error(result.error || 'Failed to process post');
			}

			if (result.success === 1) {
				toast.success('Post processed successfully');
			} else {
				toast.error(result.details[0]?.error || 'Failed to process post');
			}

			mutate();
		} catch (err) {
			toast.error(
				`Failed to process: ${err instanceof Error ? err.message : 'Unknown error'}`
			);
		} finally {
			setProcessingIds(prev => {
				const next = new Set(prev);
				next.delete(postId);
				return next;
			});
		}
	};

	const handleProcessAll = async () => {
		if (!data || data.count === 0) return;

		setBulkProcessing(true);
		try {
			const postIds = data.posts.map(p => p.id);

			const res = await fetch('/api/developer/cron-debug/force-process', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					postIds,
					bypassDuplicates: true,
				}),
			});

			const result = await res.json();

			if (!res.ok) {
				throw new Error(result.error || 'Failed to process posts');
			}

			if (result.success > 0) {
				toast.success(
					`Successfully processed ${result.success} post${result.success !== 1 ? 's' : ''}`
				);
			}

			if (result.failed > 0) {
				toast.error(
					`${result.failed} post${result.failed !== 1 ? 's' : ''} failed to process`
				);
			}

			mutate();
		} catch (err) {
			toast.error(
				`Bulk process failed: ${err instanceof Error ? err.message : 'Unknown error'}`
			);
		} finally {
			setBulkProcessing(false);
		}
	};

	const handleTriggerCron = async () => {
		setBulkProcessing(true);
		try {
			const res = await fetch('/api/developer/cron-debug/trigger', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ job: 'process' }),
			});

			if (!res.ok) {
				const result = await res.json();
				throw new Error(result.error || 'Failed to trigger cron');
			}

			toast.success('Cron job triggered - posts will process shortly');

			// Refresh after 3 seconds to see results
			setTimeout(() => mutate(), 3000);
		} catch (err) {
			toast.error(
				`Failed to trigger: ${err instanceof Error ? err.message : 'Unknown error'}`
			);
		} finally {
			setBulkProcessing(false);
		}
	};

	if (error) {
		return (
			<Panel title="🕐 Pending Posts" icon={<Clock className="w-6 h-6" />}>
				<div className="text-center py-4 text-red-600">
					Failed to load pending posts
				</div>
			</Panel>
		);
	}

	if (isLoading || !data) {
		return (
			<Panel title="🕐 Pending Posts" icon={<Clock className="w-6 h-6" />}>
				<div className="animate-pulse h-24 bg-slate-200 rounded-lg"></div>
			</Panel>
		);
	}

	return (
		<Panel title="🕐 Pending Posts" icon={<Clock className="w-6 h-6" />}>
			{data.count === 0 ? (
				<div className="text-center py-8 text-slate-600">
					<p className="font-semibold">No pending overdue posts</p>
					<p className="text-sm text-slate-500 mt-1">
						All scheduled posts have been processed.
					</p>
				</div>
			) : (
				<div>
					<p className="text-sm font-semibold text-slate-700 mb-4">
						{data.count} post{data.count !== 1 ? 's' : ''} due but not processed
					</p>

					{data.count > 0 && (
						<div className="flex flex-col sm:flex-row gap-3 mb-4 p-4 bg-slate-100 rounded-lg border border-slate-200">
							<button
								onClick={handleProcessAll}
								disabled={bulkProcessing}
								className="flex-1 px-4 py-3 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 disabled:opacity-50 transition flex items-center justify-center gap-2"
							>
								{bulkProcessing ? (
									<Loader className="w-5 h-5 animate-spin" />
								) : (
									<PlayCircle className="w-5 h-5" />
								)}
								Process All Overdue ({data.count})
							</button>

							<button
								onClick={handleTriggerCron}
								disabled={bulkProcessing}
								className="flex-1 px-4 py-3 bg-slate-600 text-white rounded-lg font-bold hover:bg-slate-700 disabled:opacity-50 transition flex items-center justify-center gap-2"
							>
								{bulkProcessing ? (
									<Loader className="w-5 h-5 animate-spin" />
								) : (
									<Clock className="w-5 h-5" />
								)}
								Trigger Cron Job
							</button>
						</div>
					)}

					{data.count > 0 && (
						<p className="text-xs text-slate-500 mb-4 italic">
							⚠️ Force-processing bypasses duplicate detection and processes immediately
						</p>
					)}

					<div className="space-y-3">
						{data.posts.map((post) => {
							const overdueClass =
								post.minutesOverdue > 30
									? 'border-rose-200 bg-rose-50'
									: post.minutesOverdue > 10
										? 'border-amber-200 bg-amber-50'
										: 'border-yellow-200 bg-yellow-50';

							return (
								<div
									key={post.id}
									className={`rounded-lg border ${overdueClass} p-4`}
								>
									<div className="flex items-start justify-between mb-2">
										<div>
											<p className="font-mono text-sm font-bold text-slate-900">
												{post.id.slice(0, 12)}...
											</p>
											<p className="text-xs text-slate-600 mt-1">
												Scheduled:{' '}
												{new Date(
													post.scheduled_time,
												).toLocaleString()}
											</p>
										</div>
										<div className="flex items-center gap-2">
											<div
												className={`px-3 py-1 rounded-lg font-bold text-sm ${
													post.minutesOverdue > 30
														? 'bg-rose-600 text-white'
														: post.minutesOverdue > 10
															? 'bg-amber-600 text-white'
															: 'bg-yellow-600 text-white'
												}`}
											>
												{post.minutesOverdue}m overdue
											</div>
											<button
												onClick={() => handleProcessSingle(post.id)}
												disabled={processingIds.has(post.id) || bulkProcessing}
												className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg font-bold text-xs hover:bg-indigo-700 disabled:opacity-50 transition flex items-center gap-1.5"
											>
												{processingIds.has(post.id) ? (
													<Loader className="w-3.5 h-3.5 animate-spin" />
												) : (
													<Play className="w-3.5 h-3.5" />
												)}
												Process Now
											</button>
										</div>
									</div>
									{post.caption && (
										<p className="text-xs text-slate-600 truncate mt-2">
											{post.caption.slice(0, 100)}
										</p>
									)}
								</div>
							);
						})}
					</div>
				</div>
			)}
		</Panel>
	);
}
