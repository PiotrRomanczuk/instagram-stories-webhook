'use client';

import { useState, useCallback } from 'react';
import { TimelineCard, TimelineCardPost } from './timeline-card';
import { TimelineCardSwipeable } from './timeline-card-swipeable';
import { TimelineEmptyState } from './timeline-empty-state';
import { TimelineGridSkeleton } from './timeline-grid-skeleton';
import { useSwipeManager } from '@/app/hooks/use-swipe-manager';

export interface TimelineGroup {
	label: string;
	posts: TimelineCardPost[];
}

interface TimelineLayoutProps {
	groups: TimelineGroup[];
	onPostClick?: (post: TimelineCardPost) => void;
	onEdit?: (post: TimelineCardPost) => void;
	onReschedule?: (post: TimelineCardPost) => void;
	onCancel?: (post: TimelineCardPost) => void;
	onScheduleClick?: () => void;
	onRefresh?: () => Promise<void>;
	isLoading?: boolean;
	enableSwipe?: boolean;
}

export function TimelineLayout({
	groups,
	onPostClick,
	onEdit,
	onReschedule,
	onCancel,
	onScheduleClick,
	onRefresh,
	isLoading = false,
	enableSwipe = true,
}: TimelineLayoutProps) {
	const [isRefreshing, setIsRefreshing] = useState(false);
	const { isCardOpen, toggleCard } = useSwipeManager();

	// Calculate total posts
	const totalPosts = groups.reduce((sum, group) => sum + group.posts.length, 0);

	// Pull-to-refresh handler
	const handleRefresh = useCallback(async () => {
		if (onRefresh && !isRefreshing) {
			setIsRefreshing(true);
			try {
				await onRefresh();
			} finally {
				setIsRefreshing(false);
			}
		}
	}, [onRefresh, isRefreshing]);

	// Show empty state if no posts
	if (!isLoading && totalPosts === 0) {
		return <TimelineEmptyState onScheduleClick={onScheduleClick} />;
	}

	return (
		<div data-testid="timeline-layout" className="w-full">
			{/* Pull-to-refresh wrapper */}
			{onRefresh && (
				<div className="mb-4 text-center">
					<button
						data-testid="pull-to-refresh"
						onClick={handleRefresh}
						disabled={isRefreshing}
						className="text-xs text-slate-400 hover:text-slate-300 transition-colors disabled:opacity-50"
					>
						{isRefreshing ? 'Refreshing...' : 'Pull to refresh'}
					</button>
				</div>
			)}

			{/* Timeline Groups */}
			<div className="space-y-8">
				{groups.map((group, groupIndex) => {
					if (group.posts.length === 0) return null;

					return (
						<div
							key={`${group.label}-${groupIndex}`}
							data-testid="timeline-group"
							data-group-label={group.label}
						>
							{/* Group Header */}
							<div
								data-testid="timeline-group-header"
								className="flex items-center justify-between mb-4 px-1"
							>
								<h2 className="text-xs font-black text-slate-400 uppercase tracking-widest">
									{group.label} • {group.posts.length}{' '}
									{group.posts.length === 1 ? 'POST' : 'POSTS'}
								</h2>
							</div>

							{/* Responsive Grid */}
							<div
								data-testid="timeline-grid"
								className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
							>
								{group.posts.map((post) =>
									enableSwipe ? (
										<TimelineCardSwipeable
											key={post.id}
											post={post}
											onClick={onPostClick}
											onEdit={onEdit}
											onReschedule={onReschedule}
											onCancel={onCancel}
											isOpen={isCardOpen(post.id)}
											onOpenChange={(isOpen) => toggleCard(post.id, isOpen)}
										/>
									) : (
										<TimelineCard
											key={post.id}
											post={post}
											onClick={onPostClick}
										/>
									)
								)}
							</div>
						</div>
					);
				})}
			</div>

			{/* Loading State */}
			{isLoading && <TimelineGridSkeleton count={6} />}
		</div>
	);
}

/**
 * Utility function to group posts by time period
 * @param posts Array of posts to group
 * @returns Array of grouped posts (Today, Tomorrow, This Week, etc.)
 */
export function groupPostsByTime(posts: TimelineCardPost[]): TimelineGroup[] {
	const now = Date.now();
	const today = new Date(now);
	today.setHours(0, 0, 0, 0);
	const todayStart = today.getTime();
	const tomorrowStart = todayStart + 24 * 60 * 60 * 1000;
	const weekStart = todayStart + 2 * 24 * 60 * 60 * 1000;
	const weekEnd = todayStart + 7 * 24 * 60 * 60 * 1000;

	const groups: TimelineGroup[] = [
		{ label: 'TODAY', posts: [] },
		{ label: 'TOMORROW', posts: [] },
		{ label: 'THIS WEEK', posts: [] },
		{ label: 'LATER', posts: [] },
	];

	// Sort posts by scheduled time
	const sortedPosts = [...posts].sort(
		(a, b) => a.scheduledTime - b.scheduledTime,
	);

	// Group posts
	for (const post of sortedPosts) {
		if (post.scheduledTime < todayStart) {
			// Past posts go to "TODAY" (or you could create a "PAST" group)
			groups[0].posts.push(post);
		} else if (post.scheduledTime < tomorrowStart) {
			groups[0].posts.push(post);
		} else if (post.scheduledTime < weekStart) {
			groups[1].posts.push(post);
		} else if (post.scheduledTime < weekEnd) {
			groups[2].posts.push(post);
		} else {
			groups[3].posts.push(post);
		}
	}

	return groups;
}
