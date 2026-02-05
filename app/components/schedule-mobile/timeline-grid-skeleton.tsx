'use client';

import { motion } from 'framer-motion';
import { TimelineCardSkeleton } from './timeline-card-skeleton';

interface TimelineGridSkeletonProps {
	/**
	 * Number of skeleton cards to display
	 * - Mobile: 3
	 * - Tablet: 4
	 * - Desktop: 6
	 */
	count?: number;
}

/**
 * Skeleton loading component for timeline grid
 * - Responsive grid layout matching TimelineLayout
 * - Staggered entrance animation (each card +100ms delay)
 * - Shows different counts based on viewport
 */
export function TimelineGridSkeleton({ count = 6 }: TimelineGridSkeletonProps) {
	return (
		<div
			role="status"
			aria-live="polite"
			aria-label="Loading posts"
			data-testid="timeline-grid-skeleton"
			className="w-full"
		>
			{/* Skeleton Group Header */}
			<div className="flex items-center justify-between mb-4 px-1">
				<div className="h-3 w-32 bg-[#2a2f3e] rounded skeleton-shimmer" />
			</div>

			{/* Skeleton Grid */}
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
				{Array.from({ length: count }).map((_, i) => (
					<motion.div
						key={i}
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{
							delay: i * 0.1,
							duration: 0.3,
							ease: 'easeOut',
						}}
					>
						<TimelineCardSkeleton />
					</motion.div>
				))}
			</div>

			{/* Screen reader only text */}
			<span className="sr-only">Loading scheduled posts...</span>
		</div>
	);
}

/**
 * Hook to determine skeleton count based on viewport
 * @returns count of skeletons to show
 */
export function useSkeletonCount(): number {
	// This could be enhanced with useMediaQuery hook
	// For now, we default to 6 and let CSS grid handle responsiveness
	return 6;
}
