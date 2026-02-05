'use client';

import { useState, useEffect } from 'react';
import { TimelineGridSkeleton } from './timeline-grid-skeleton';
import { TimelineCard, type TimelineCardPost } from './timeline-card';
import { motion } from 'framer-motion';

/**
 * Example component demonstrating skeleton loading states
 * - Shows skeleton for 2 seconds on mount
 * - Smoothly transitions to real content
 * - Demonstrates staggered animation
 */
export function TimelineSkeletonExample() {
	const [isLoading, setIsLoading] = useState(true);

	useEffect(() => {
		// Simulate data loading
		const timer = setTimeout(() => {
			setIsLoading(false);
		}, 2000);

		return () => clearTimeout(timer);
	}, []);

	const mockPosts: TimelineCardPost[] = [
		{
			id: '1',
			url: 'https://picsum.photos/400/711?random=1',
			caption: 'Beautiful sunset at the beach 🌅',
			scheduledTime: Date.now() + 3600000,
			publishingStatus: 'scheduled',
			mediaType: 'IMAGE',
		},
		{
			id: '2',
			url: 'https://picsum.photos/400/711?random=2',
			caption: 'Morning coffee vibes ☕',
			scheduledTime: Date.now() + 7200000,
			publishingStatus: 'scheduled',
			mediaType: 'IMAGE',
		},
		{
			id: '3',
			url: 'https://picsum.photos/400/711?random=3',
			caption: 'Weekend adventure time! 🏔️',
			scheduledTime: Date.now() + 10800000,
			publishingStatus: 'scheduled',
			mediaType: 'IMAGE',
		},
	];

	if (isLoading) {
		return (
			<div className="max-w-7xl mx-auto px-4 py-6">
				<TimelineGridSkeleton count={3} />
			</div>
		);
	}

	return (
		<div className="max-w-7xl mx-auto px-4 py-6">
			{/* Group Header */}
			<div className="flex items-center justify-between mb-4 px-1">
				<h2 className="text-xs font-black text-slate-400 uppercase tracking-widest">
					TODAY • {mockPosts.length} POSTS
				</h2>
			</div>

			{/* Grid with smooth transition */}
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
				{mockPosts.map((post, i) => (
					<motion.div
						key={post.id}
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{
							delay: i * 0.1,
							duration: 0.3,
							ease: 'easeOut',
						}}
					>
						<TimelineCard post={post} />
					</motion.div>
				))}
			</div>
		</div>
	);
}
