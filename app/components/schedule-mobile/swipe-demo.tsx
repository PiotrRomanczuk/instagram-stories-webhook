'use client';

/**
 * Swipe Demo Page
 *
 * Demonstrates the swipeable timeline card functionality.
 * Use this page to test swipe gestures on mobile devices.
 */

import { useState } from 'react';
import { TimelineLayout, groupPostsByTime } from './timeline-layout';
import { TimelineCardPost } from './timeline-card';

// Mock data for demo
const mockPosts: TimelineCardPost[] = [
	{
		id: '1',
		url: 'https://picsum.photos/seed/1/400/711',
		caption: 'Beautiful sunset at the beach 🌅 #nature #photography',
		scheduledTime: Date.now() + 2 * 60 * 60 * 1000, // 2 hours from now
		publishingStatus: 'scheduled',
		mediaType: 'IMAGE',
		engagement: { predicted: 85 },
	},
	{
		id: '2',
		url: 'https://picsum.photos/seed/2/400/711',
		caption: 'Morning coffee vibes ☕️',
		scheduledTime: Date.now() + 24 * 60 * 60 * 1000, // tomorrow
		publishingStatus: 'scheduled',
		mediaType: 'IMAGE',
	},
	{
		id: '3',
		url: 'https://picsum.photos/seed/3/400/711',
		caption: 'New product launch coming soon! Stay tuned 🚀',
		scheduledTime: Date.now() + 3 * 24 * 60 * 60 * 1000, // 3 days from now
		publishingStatus: 'scheduled',
		mediaType: 'IMAGE',
		engagement: { predicted: 92 },
	},
	{
		id: '4',
		url: 'https://picsum.photos/seed/4/400/711',
		caption: 'Behind the scenes at our studio 🎬',
		scheduledTime: Date.now() + 5 * 24 * 60 * 60 * 1000, // 5 days from now
		publishingStatus: 'processing',
		mediaType: 'VIDEO',
	},
	{
		id: '5',
		url: 'https://picsum.photos/seed/5/400/711',
		caption: 'Weekend adventure inspiration 🏔',
		scheduledTime: Date.now() + 8 * 24 * 60 * 60 * 1000, // next week
		publishingStatus: 'scheduled',
		mediaType: 'IMAGE',
	},
];

export function SwipeDemo() {
	const [posts, setPosts] = useState<TimelineCardPost[]>(mockPosts);
	const [lastAction, setLastAction] = useState<string>('');

	const handlePostClick = (post: TimelineCardPost) => {
		setLastAction(`Clicked post: ${post.caption.slice(0, 30)}...`);
		console.log('Post clicked:', post);
	};

	const handleEdit = (post: TimelineCardPost) => {
		setLastAction(`Edit post: ${post.caption.slice(0, 30)}...`);
		console.log('Edit post:', post);
	};

	const handleReschedule = (post: TimelineCardPost) => {
		setLastAction(`Reschedule post: ${post.caption.slice(0, 30)}...`);
		console.log('Reschedule post:', post);
	};

	const handleCancel = (post: TimelineCardPost) => {
		setLastAction(`Cancel post: ${post.caption.slice(0, 30)}...`);
		console.log('Cancel post:', post);
		// Remove from list
		setPosts((prev) => prev.filter((p) => p.id !== post.id));
	};

	const handleRefresh = async () => {
		await new Promise((resolve) => setTimeout(resolve, 1000));
		console.log('Refreshed');
	};

	const groups = groupPostsByTime(posts);

	return (
		<div className="min-h-screen bg-[#101622] p-4">
			{/* Header */}
			<div className="mb-6">
				<h1 className="text-2xl font-bold text-white mb-2">
					Swipe Demo
				</h1>
				<p className="text-sm text-slate-400 mb-4">
					Swipe left on any card to reveal actions (mobile only)
				</p>

				{/* Instructions */}
				<div className="bg-[#1a1f2e] rounded-lg p-4 mb-4">
					<h2 className="text-sm font-bold text-white mb-2">How to use:</h2>
					<ul className="text-xs text-slate-300 space-y-1 list-disc list-inside">
						<li>Swipe left on a card to reveal action buttons</li>
						<li>Tap Edit (blue), Reschedule (amber), or Cancel (red)</li>
						<li>Swipe right or tap outside to close</li>
						<li>Only one card can be open at a time</li>
						<li>Haptic feedback triggers at 50px threshold</li>
					</ul>
				</div>

				{/* Last Action */}
				{lastAction && (
					<div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3">
						<p className="text-xs text-emerald-400">
							<strong>Last action:</strong> {lastAction}
						</p>
					</div>
				)}
			</div>

			{/* Timeline */}
			<TimelineLayout
				groups={groups}
				onPostClick={handlePostClick}
				onEdit={handleEdit}
				onReschedule={handleReschedule}
				onCancel={handleCancel}
				onRefresh={handleRefresh}
				enableSwipe={true}
			/>
		</div>
	);
}
