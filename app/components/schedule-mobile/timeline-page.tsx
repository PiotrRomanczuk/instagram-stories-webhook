'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import useSWR from 'swr';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { TimelineHeader } from './timeline-header';
import { TimelineNavigation } from './timeline-navigation';
import { TimelineCard, TimelineCardPost } from './timeline-card';
import { TimelineEmptyState } from './timeline-empty-state';
import { ConnectionStatus } from './connection-status';
import type { FilterType } from './timeline-filters';
import type { ContentItem, PublishingStatus } from '@/lib/types/posts';
import { useRealtimeContent } from '@/app/hooks/use-realtime-content';
import { formatDistanceToNow } from 'date-fns';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

/**
 * Maps ContentItem to TimelineCardPost
 */
function mapContentItemToPost(item: ContentItem): TimelineCardPost {
	return {
		id: item.id,
		url: item.mediaUrl,
		caption: item.caption || '',
		scheduledTime: item.scheduledTime || Date.now(),
		publishingStatus: item.publishingStatus as any,
		mediaType: item.mediaType,
	};
}

/**
 * Utility function to group posts by time period
 */
export interface TimelineGroup {
	label: string;
	items: ContentItem[];
}

function groupItemsByTime(items: ContentItem[]): TimelineGroup[] {
	const now = Date.now();
	const today = new Date(now);
	today.setHours(0, 0, 0, 0);
	const todayStart = today.getTime();
	const tomorrowStart = todayStart + 24 * 60 * 60 * 1000;
	const weekStart = todayStart + 2 * 24 * 60 * 60 * 1000;
	const weekEnd = todayStart + 7 * 24 * 60 * 60 * 1000;

	const groups: TimelineGroup[] = [
		{ label: 'TODAY', items: [] },
		{ label: 'TOMORROW', items: [] },
		{ label: 'THIS WEEK', items: [] },
		{ label: 'LATER', items: [] },
	];

	// Sort items by scheduled time
	const sortedItems = [...items].sort(
		(a, b) => (a.scheduledTime || 0) - (b.scheduledTime || 0),
	);

	// Group items
	for (const item of sortedItems) {
		const scheduledTime = item.scheduledTime || 0;
		if (scheduledTime < todayStart) {
			groups[0].items.push(item);
		} else if (scheduledTime < tomorrowStart) {
			groups[0].items.push(item);
		} else if (scheduledTime < weekStart) {
			groups[1].items.push(item);
		} else if (scheduledTime < weekEnd) {
			groups[2].items.push(item);
		} else {
			groups[3].items.push(item);
		}
	}

	return groups;
}

/**
 * Main timeline page component
 * - Fetches scheduled content from /api/content
 * - Filters by publishing status
 * - Groups posts by time period
 * - Handles search and filter interactions
 */
export function TimelinePage() {
	const [searchQuery, setSearchQuery] = useState('');
	const [activeFilter, setActiveFilter] = useState<FilterType>('all');
	const [realtimeConnected, setRealtimeConnected] = useState(false);

	// Fetch content with SWR
	const { data, error, isLoading, mutate } = useSWR<{
		items: ContentItem[];
		pagination: {
			page: number;
			limit: number;
			total: number;
			hasMore: boolean;
		};
	}>('/api/content?limit=100&sortBy=schedule-asc', fetcher, {
		refreshInterval: 30000, // Refresh every 30 seconds
		revalidateOnFocus: true,
	});

	// Filter items with scheduledTime
	const scheduledItems = useMemo(() => {
		if (!data?.items) return [];
		return data.items.filter((item) => item.scheduledTime);
	}, [data?.items]);

	// Apply filters
	const filteredItems = useMemo(() => {
		let items = scheduledItems;

		// Apply status filter
		if (activeFilter !== 'all') {
			const statusMap: Record<FilterType, PublishingStatus | null> = {
				all: null,
				scheduled: 'scheduled',
				published: 'published',
				failed: 'failed',
			};
			const status = statusMap[activeFilter];
			if (status) {
				items = items.filter((item) => item.publishingStatus === status);
			}
		}

		// Apply search filter
		if (searchQuery.trim()) {
			const query = searchQuery.toLowerCase();
			items = items.filter(
				(item) =>
					item.caption?.toLowerCase().includes(query) ||
					item.title?.toLowerCase().includes(query),
			);
		}

		return items;
	}, [scheduledItems, activeFilter, searchQuery]);

	// Calculate counts for filter chips
	const counts = useMemo(() => {
		return {
			all: scheduledItems.length,
			scheduled: scheduledItems.filter((item) => item.publishingStatus === 'scheduled')
				.length,
			published: scheduledItems.filter((item) => item.publishingStatus === 'published')
				.length,
			failed: scheduledItems.filter((item) => item.publishingStatus === 'failed')
				.length,
		};
	}, [scheduledItems]);

	// Group filtered items by time
	const groups = useMemo(() => groupItemsByTime(filteredItems), [filteredItems]);

	// Calculate total items
	const totalItems = groups.reduce((sum, group) => sum + group.items.length, 0);

	// Handlers
	const handleSearchChange = useCallback((query: string) => {
		setSearchQuery(query);
	}, []);

	const handleFilterChange = useCallback((filter: FilterType) => {
		setActiveFilter(filter);
	}, []);

	const handlePostClick = useCallback((post: TimelineCardPost) => {
		// Preview modal handled by TimelineCard actions
		console.log('Post clicked:', post.id);
	}, []);

	const handleRefresh = useCallback(async () => {
		await mutate();
	}, [mutate]);

	// Real-time updates with WebSocket
	const { isConnected } = useRealtimeContent({
		onUpdate: () => {
			mutate(); // Revalidate SWR cache
			setRealtimeConnected(true);
		},
		onEvent: (event) => {
			const { eventType, new: newData, old: oldData } = event;

			// Handle different event types
			if (eventType === 'INSERT' && newData) {
				const scheduledTime = newData.scheduled_time
					? Number(newData.scheduled_time)
					: Date.now();
				const timeStr = formatDistanceToNow(scheduledTime, { addSuffix: true });
				toast.success(`New post scheduled ${timeStr}`);
			} else if (eventType === 'UPDATE' && newData && oldData) {
				// Status changes
				if (newData.publishing_status !== oldData.publishing_status) {
					if (newData.publishing_status === 'published') {
						toast.success('Post published successfully');
					} else if (newData.publishing_status === 'failed') {
						toast.error('Post publishing failed', {
							description: newData.error || 'Unknown error',
						});
					} else if (newData.publishing_status === 'processing') {
						toast.info('Publishing post...');
					}
				}
				// Schedule time changes
				else if (newData.scheduled_time !== oldData.scheduled_time) {
					const newTime = newData.scheduled_time
						? Number(newData.scheduled_time)
						: Date.now();
					const timeStr = formatDistanceToNow(newTime, { addSuffix: true });
					toast.info(`Post rescheduled to ${timeStr}`);
				}
			} else if (eventType === 'DELETE' && oldData) {
				toast.info('Post cancelled');
			}
		},
		scheduledOnly: true,
		debounceMs: 500,
	});

	// Update connection state
	useEffect(() => {
		setRealtimeConnected(isConnected);
	}, [isConnected]);

	// Error state
	if (error) {
		return (
			<div className="min-h-screen bg-[#0f1419] text-white flex items-center justify-center p-4">
				<div className="text-center">
					<div className="mb-4 text-red-400">
						<svg
							className="w-16 h-16 mx-auto"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
							/>
						</svg>
					</div>
					<h2 className="text-xl font-bold mb-2">Failed to load content</h2>
					<p className="text-slate-400 mb-4">{error.message || 'Unknown error'}</p>
					<button
						onClick={handleRefresh}
						className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
					>
						Retry
					</button>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-[#0f1419] text-white pb-20 md:pl-60">
			{/* Navigation */}
			<TimelineNavigation />

			{/* Main Content */}
			<div className="max-w-7xl mx-auto px-4 py-6">
				{/* Page Header */}
				<div className="mb-6">
					<div className="flex items-start justify-between gap-4">
						<div className="flex-1">
							<h1 className="text-2xl font-bold mb-2">Stories Schedule</h1>
							<p className="text-slate-400">Manage your scheduled Instagram stories</p>
						</div>
						{/* Connection Status */}
						<ConnectionStatus isConnected={realtimeConnected} />
					</div>
				</div>

				{/* Search & Filters */}
				<div className="mb-6">
					<TimelineHeader
						onSearchChange={handleSearchChange}
						onFilterChange={handleFilterChange}
						activeFilter={activeFilter}
						counts={counts}
					/>
				</div>

				{/* Timeline Content */}
				{!isLoading && totalItems === 0 ? (
					<TimelineEmptyState />
				) : (
					<div className="space-y-8">
						{groups.map((group, groupIndex) => {
							if (group.items.length === 0) return null;

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
											{group.label} • {group.items.length}{' '}
											{group.items.length === 1 ? 'POST' : 'POSTS'}
										</h2>
									</div>

									{/* Responsive Grid with Animations */}
									<div
										data-testid="timeline-grid"
										className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
									>
										<AnimatePresence mode="popLayout">
											{group.items.map((item) => (
												<motion.div
													key={item.id}
													layout
													initial={{ opacity: 0, scale: 0.9, y: -20 }}
													animate={{ opacity: 1, scale: 1, y: 0 }}
													exit={{ opacity: 0, scale: 0.9, y: 20 }}
													transition={{
														duration: 0.3,
														ease: 'easeInOut',
														layout: { duration: 0.2 },
													}}
												>
													<TimelineCard
														post={mapContentItemToPost(item)}
														item={item}
														onClick={handlePostClick}
														onUpdate={handleRefresh}
													/>
												</motion.div>
											))}
										</AnimatePresence>
									</div>
								</div>
							);
						})}
					</div>
				)}

				{/* Loading State */}
				{isLoading && (
					<div className="flex items-center justify-center py-12">
						<div className="animate-spin rounded-full h-8 w-8 border-2 border-[#2b6cee] border-t-transparent"></div>
					</div>
				)}
			</div>
		</div>
	);
}
