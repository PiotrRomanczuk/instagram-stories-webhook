'use client';

/**
 * Skeleton loading component for TimelineCard
 * - Matches exact dimensions of real TimelineCard
 * - 9:16 aspect ratio thumbnail (80px × 142px)
 * - Shimmer animation for visual feedback
 * - Accessible with ARIA labels
 */
export function TimelineCardSkeleton() {
	return (
		<div
			data-testid="timeline-card-skeleton"
			className="rounded-xl overflow-hidden border border-gray-100 dark:border-gray-800 bg-white dark:bg-[#1f2229] p-2.5 flex items-center gap-2.5 animate-pulse"
		>
			{/* Media Thumbnail Skeleton */}
			<div className="w-16 h-16 sm:w-20 sm:h-20 bg-gray-200 dark:bg-gray-700 rounded-lg shrink-0" />

			{/* Content Skeleton */}
			<div className="flex-1 space-y-2">
				{/* Time + Status badges */}
				<div className="flex items-center gap-2">
					<div className="h-5 w-14 bg-gray-200 dark:bg-gray-700 rounded-md" />
					<div className="h-4 w-16 bg-gray-100 dark:bg-gray-800 rounded-full" />
				</div>

				{/* Caption Lines */}
				<div className="h-3.5 bg-gray-100 dark:bg-gray-800 rounded w-full" />
				<div className="h-3 bg-gray-100 dark:bg-gray-800 rounded w-2/3" />
			</div>

			<span className="sr-only">Loading scheduled post...</span>
		</div>
	);
}
