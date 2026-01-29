'use client';

import useSWR from 'swr';
import { Clock } from 'lucide-react';
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
	const { data, isLoading, error } = useSWR<PendingPostsData>(
		'/api/developer/cron-debug/pending-posts',
		fetcher,
		{ refreshInterval: 10000, revalidateOnFocus: true },
	);

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
