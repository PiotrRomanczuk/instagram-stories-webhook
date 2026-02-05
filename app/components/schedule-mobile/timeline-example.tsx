'use client';

import { TimelineLayout, groupPostsByTime } from './timeline-layout';
import { TimelineCardPost } from './timeline-card';

/**
 * Example usage of the Timeline components
 * This can be used in Storybook or as a reference for integration
 */

// Sample data
const samplePosts: TimelineCardPost[] = [
	{
		id: '1',
		url: 'https://images.unsplash.com/photo-1682687220742-aba13b6e50ba?w=400&h=711&fit=crop',
		caption: 'Summer collection dropping soon! Stay tuned for our latest designs.',
		scheduledTime: Date.now() + 2 * 60 * 60 * 1000, // 2 hours from now
		publishingStatus: 'scheduled',
		mediaType: 'IMAGE',
		engagement: { predicted: 85 },
	},
	{
		id: '2',
		url: 'https://images.unsplash.com/photo-1682687220742-aba13b6e50ba?w=400&h=711&fit=crop',
		caption: 'Check out our new arrivals! Limited stock available.',
		scheduledTime: Date.now() + 25 * 60 * 60 * 1000, // tomorrow
		publishingStatus: 'scheduled',
		mediaType: 'IMAGE',
	},
	{
		id: '3',
		url: 'https://images.unsplash.com/photo-1682687220742-aba13b6e50ba?w=400&h=711&fit=crop',
		caption: 'Flash sale alert! 50% off on selected items.',
		scheduledTime: Date.now() + 3 * 24 * 60 * 60 * 1000, // 3 days from now
		publishingStatus: 'scheduled',
		mediaType: 'IMAGE',
		warning: 'Caption may be too short',
	},
	{
		id: '4',
		url: 'https://images.unsplash.com/photo-1682687220742-aba13b6e50ba?w=400&h=711&fit=crop',
		caption: 'Behind the scenes of our photoshoot.',
		scheduledTime: Date.now() + 10 * 24 * 60 * 60 * 1000, // 10 days from now
		publishingStatus: 'scheduled',
		mediaType: 'VIDEO',
	},
];

export function TimelineExample() {
	const groups = groupPostsByTime(samplePosts);

	const handlePostClick = (post: TimelineCardPost) => {
		console.log('Post clicked:', post);
	};

	const handleScheduleClick = () => {
		console.log('Schedule button clicked');
	};

	const handleRefresh = async () => {
		console.log('Refreshing...');
		await new Promise((resolve) => setTimeout(resolve, 1000));
	};

	return (
		<div className="min-h-screen bg-[#101622] p-6">
			<TimelineLayout
				groups={groups}
				onPostClick={handlePostClick}
				onScheduleClick={handleScheduleClick}
				onRefresh={handleRefresh}
			/>
		</div>
	);
}

export function TimelineEmptyExample() {
	return (
		<div className="min-h-screen bg-[#101622] p-6">
			<TimelineLayout
				groups={[]}
				onScheduleClick={() => console.log('Schedule clicked')}
			/>
		</div>
	);
}
