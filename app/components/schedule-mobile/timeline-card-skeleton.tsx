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
			className="relative bg-[#1a1f2e] rounded-xl overflow-hidden shadow-lg min-h-[48px]"
			style={{
				borderLeft: '4px solid #2a2f3e',
			}}
		>
			{/* Media Thumbnail Skeleton */}
			<div className="relative w-20 h-[142px] float-left mr-3">
				<div className="w-full h-full bg-[#2a2f3e] skeleton-shimmer" />
			</div>

			{/* Content Skeleton */}
			<div className="p-3 pl-0">
				{/* Time Badge Skeleton */}
				<div className="flex items-center gap-2 mb-2">
					<div className="h-6 w-20 bg-[#2a2f3e] rounded-lg skeleton-shimmer" />
				</div>

				{/* Caption Lines Skeleton */}
				<div className="space-y-2">
					<div className="h-4 bg-[#2a2f3e] rounded skeleton-shimmer w-full" />
					<div className="h-4 bg-[#2a2f3e] rounded skeleton-shimmer w-3/4" />
				</div>
			</div>

			{/* Screen reader only text */}
			<span className="sr-only">Loading scheduled post...</span>
		</div>
	);
}
