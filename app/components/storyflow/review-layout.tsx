'use client';

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import useSWR, { mutate } from 'swr';
import { toast } from 'sonner';
import { Loader2, AlertTriangle, Inbox, Layers, MessageSquare, ChevronDown, ChevronUp, Clock, X } from 'lucide-react';
import {
	Drawer,
	DrawerContent,
	DrawerHeader,
	DrawerTitle,
} from '@/app/components/ui/drawer';
import { ReviewHistorySidebar } from './review-history-sidebar';
import { ReviewCardSwipeable } from './review-card-swipeable';

import { PhonePreview } from './phone-preview';
import { ReviewDetailsSidebar } from './review-details-sidebar';
import { ReviewActionBar } from './review-action-bar';
import { Button } from '@/app/components/ui/button';
import { TourTriggerButton } from '@/app/components/tour/tour-trigger-button';
import { cn } from '@/lib/utils';
import { ContentItem } from '@/lib/types';
import { usePageTour } from '@/app/hooks/use-page-tour';
import { adminReviewTourSteps } from '@/lib/tour/admin-review-tour';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface ReviewedItem {
	id: string;
	title: string;
	thumbnail: string;
	status: 'approved' | 'rejected';
	timestamp: Date;
}

interface StoryflowReviewLayoutProps {
	className?: string;
}

export function StoryflowReviewLayout({ className }: StoryflowReviewLayoutProps) {
	const [currentIndex, setCurrentIndex] = useState(0);
	const [reviewHistory, setReviewHistory] = useState<ReviewedItem[]>(() => {
		if (typeof window === 'undefined') return [];
		try {
			const stored = localStorage.getItem('reviewHistory');
			if (!stored) return [];
			const parsed = JSON.parse(stored) as Array<ReviewedItem & { timestamp: string }>;
			// Only keep today's reviews and rehydrate dates
			const todayStart = new Date();
			todayStart.setHours(0, 0, 0, 0);
			return parsed
				.map((item) => ({ ...item, timestamp: new Date(item.timestamp) }))
				.filter((item) => item.timestamp >= todayStart);
		} catch {
			return [];
		}
	});
	const [reviewComment, setReviewComment] = useState('');
	const [isActionLoading, setIsActionLoading] = useState(false);
	const [showMobileDetails, setShowMobileDetails] = useState(false);
	const [isHistoryOpen, setIsHistoryOpen] = useState(false);

	// Persist review history to localStorage
	useEffect(() => {
		try {
			localStorage.setItem('reviewHistory', JSON.stringify(reviewHistory));
		} catch {
			// localStorage full or unavailable
		}
	}, [reviewHistory]);

	// Fetch pending submissions
	const { data, isLoading, error } = useSWR<{ items: ContentItem[] }>(
		'/api/content?source=submission&submissionStatus=pending',
		fetcher
	);

	const items = data?.items || [];
	const currentItem = items[currentIndex] || null;

	// Calculate daily goal stats
	const dailyGoal = 50;
	const reviewedCount = reviewHistory.length;
	const progressPercent = Math.min(Math.round((reviewedCount / dailyGoal) * 100), 100);
	const remainingCount = items.length;

	const refreshList = useCallback(() => {
		mutate('/api/content?source=submission&submissionStatus=pending');
	}, []);

	// Navigation handlers
	const goToNext = useCallback(() => {
		if (currentIndex < items.length - 1) {
			setCurrentIndex(currentIndex + 1);
		}
	}, [currentIndex, items.length]);

	// Re-review handler for history items
	const handleHistoryItemClick = useCallback(async (item: ReviewedItem) => {
		setIsHistoryOpen(false); // Close drawer
		setIsActionLoading(true);

		try {
			// Fetch fresh item data
			const res = await fetch(`/api/content/${item.id}`);
			if (!res.ok) throw new Error('Failed to fetch item details');
			const json = await res.json();
			const freshItem = json.data || json; // Handle potential API response wrapper

			// Optimistically inject into current list at the front
			// This allows reviewing even if status is not 'pending'
			mutate(
				'/api/content?source=submission&submissionStatus=pending',
				(currentData: any) => {
					const existingItems = currentData?.items || [];
					// Remove if already exists to avoid duplicates
					const filtered = existingItems.filter((i: any) => i.id !== freshItem.id);
					return { ...currentData, items: [freshItem, ...filtered] };
				},
				false // Do not revalidate immediately to keep our injected item
			);

			// Set to view this new item
			setCurrentIndex(0);
			toast.info(`Re-reviewing: ${item.title}`);
		} catch (error) {
			toast.error('Could not load item details');
			console.error(error);
		} finally {
			setIsActionLoading(false);
		}
	}, []);

	const goToPrevious = useCallback(() => {
		if (currentIndex > 0) {
			setCurrentIndex(currentIndex - 1);
		}
	}, [currentIndex]);

	const skipStory = useCallback(() => {
		goToNext();
	}, [goToNext]);

	// Add to review history
	const addToHistory = useCallback((item: ContentItem, status: 'approved' | 'rejected') => {
		const historyItem: ReviewedItem = {
			id: item.id,
			title: item.title || item.caption?.slice(0, 30) || 'Untitled Story',
			thumbnail: item.mediaUrl,
			status,
			timestamp: new Date(),
		};
		setReviewHistory((prev) => [historyItem, ...prev].slice(0, 20)); // Keep last 20
	}, []);



	// Execute the actual review API call
	const executeReviewAction = useCallback(async (
		itemId: string,
		action: 'approve' | 'reject',
		payload: Record<string, unknown>,
	) => {
		try {
			const response = await fetch(`/api/content/${itemId}/review`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload),
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || `Failed to ${action}`);
			}

			refreshList();
		} catch (err) {
			toast.error(err instanceof Error ? err.message : `Failed to ${action}`);
			// Remove from history on failure
			setReviewHistory((prev) => prev.filter((h) => h.id !== itemId));
		}
	}, [refreshList]);

	// Action handlers
	const optimisticRemoveItem = useCallback((itemId: string) => {
		mutate(
			'/api/content?source=submission&submissionStatus=pending',
			(currentData: any) => {
				if (!currentData) return currentData;
				return {
					...currentData,
					items: currentData.items.filter((item: any) => item.id !== itemId),
				};
			},
			false // Do not revalidate immediately
		);
	}, []);

	const handleApprove = useCallback(() => {
		if (!currentItem || isActionLoading) return;

		const item = currentItem;
		const payload = { action: 'approve' as const, feedback: reviewComment || undefined };

		// Optimistically update UI
		addToHistory(item, 'approved');
		setReviewComment('');
		optimisticRemoveItem(item.id);

		// Adjust index
		if (currentIndex >= items.length - 1) {
			setCurrentIndex(Math.max(0, currentIndex - 1));
		}

		// Execute immediately
		executeReviewAction(item.id, 'approve', payload);
		toast.success('Story approved');
	}, [currentItem, isActionLoading, reviewComment, addToHistory, optimisticRemoveItem, currentIndex, items.length, executeReviewAction]);

	const handleReject = useCallback(() => {
		if (!currentItem || isActionLoading) return;

		const item = currentItem;
		const payload = { action: 'reject' as const, feedback: reviewComment || undefined };

		// Optimistically update UI
		addToHistory(item, 'rejected');
		setReviewComment('');
		optimisticRemoveItem(item.id);

		// Adjust index
		if (currentIndex >= items.length - 1) {
			setCurrentIndex(Math.max(0, currentIndex - 1));
		}

		// Execute immediately
		executeReviewAction(item.id, 'reject', payload);
		toast.success('Story rejected');
	}, [currentItem, isActionLoading, reviewComment, addToHistory, optimisticRemoveItem, currentIndex, items.length, executeReviewAction]);

	// Page tour
	const { startTour } = usePageTour({
		page: 'admin-review',
		steps: adminReviewTourSteps,
	});


	// Loading state
	if (isLoading) {
		return (
			<div className={cn('flex h-[calc(100vh-120px)] items-center justify-center', className)}>
				<div className="text-center space-y-4">
					<Loader2 className="h-12 w-12 animate-spin text-[#2b6cee] mx-auto" />
					<p className="text-slate-500 font-medium">Loading stories...</p>
				</div>
			</div>
		);
	}

	// Error state
	if (error) {
		return (
			<div className={cn('flex flex-col items-center justify-center h-[calc(100vh-120px)]', className)}>
				<AlertTriangle className="h-12 w-12 text-red-400 mb-4" />
				<h3 className="text-lg font-semibold text-slate-900">Failed to load stories</h3>
				<p className="text-sm text-slate-500 mt-2 mb-4">
					{error.message || 'An error occurred'}
				</p>
				<Button onClick={refreshList} variant="outline" className="border-slate-300 hover:bg-slate-100">
					Try Again
				</Button>
			</div>
		);
	}

	// Empty state
	if (items.length === 0) {
		return (
			<div className={cn('flex flex-col items-center justify-center h-[calc(100vh-120px)]', className)}>
				<div className="h-20 w-20 rounded-full bg-blue-100 flex items-center justify-center mb-4">
					<Inbox className="h-10 w-10 text-[#2b6cee]" />
				</div>
				<h3 className="text-lg font-semibold text-slate-900">All caught up!</h3>
				<p className="text-sm text-slate-500 mt-2">
					No stories pending review
				</p>
			</div>
		);
	}

	return (
		<div className={cn('flex h-[calc(100vh-120px)] bg-white', className)}>
			{/* Left Sidebar: Review History (desktop only) */}
			<ReviewHistorySidebar
				history={reviewHistory}
				className="hidden xl:flex"
				onItemClick={handleHistoryItemClick}
			/>

			{/* Mobile History Drawer */}
			<Drawer open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
				<DrawerContent className="h-[85vh] outline-none">
					<DrawerHeader className="border-b border-slate-100 pb-4">
						<DrawerTitle className="text-center text-slate-900">Review History</DrawerTitle>
					</DrawerHeader>
					<div className="flex-1 overflow-y-auto bg-slate-50">
						<ReviewHistorySidebar
							history={reviewHistory}
							className="flex w-full border-none bg-transparent shadow-none"
							onItemClick={handleHistoryItemClick}
						/>
					</div>
				</DrawerContent>
			</Drawer>

			{/* Main Content */}
			<main className="flex-1 flex flex-col bg-slate-50 overflow-y-auto">
				<div className="max-w-4xl mx-auto w-full px-3 py-4 sm:p-8 flex flex-col items-center">
					{/* Header */}
					<div data-tour="review-header" className="mb-4 sm:mb-6 text-center">
						<div className="flex items-center justify-center gap-2 mb-1">
							<h1 className="text-lg sm:text-2xl font-bold text-slate-900">Story Review Queue</h1>
							<TourTriggerButton onStartTour={startTour} />
							{/* Mobile History Toggle */}
							<button
								onClick={() => setIsHistoryOpen(true)}
								className="xl:hidden p-2 rounded-full hover:bg-slate-200 text-slate-500 transition-colors"
								aria-label="View History"
							>
								<Clock className="w-5 h-5" />
							</button>
						</div>
						<p className="text-slate-500 text-xs sm:text-sm">
							{remainingCount} {remainingCount === 1 ? 'story' : 'stories'} pending review
							{reviewedCount > 0 && (
								<span className="ml-2 text-[#2b6cee]">
									({reviewedCount} reviewed)
								</span>
							)}
						</p>
					</div>

					{/* Phone Preview with Swipe Gestures */}
					<div data-tour="review-phone-preview" className="relative touch-none">
						<ReviewCardSwipeable
							key={currentItem?.id} // Force new instance on item change
							onSwipeRight={currentIndex > 0 ? goToPrevious : undefined}
							onSwipeLeft={currentIndex < items.length - 1 ? goToNext : undefined}
							onSwipeUp={handleApprove}
							onSwipeDown={() => setShowMobileDetails(true)}
							disabled={isActionLoading || !currentItem}
						>
							<PhonePreview
								item={currentItem}
								onImageError={() => {
									// Handle image error gracefully - the component handles this internally
								}}
							/>
						</ReviewCardSwipeable>
					</div>

					{/* Action Buttons */}
					<ReviewActionBar
						onApprove={handleApprove}
						onReject={handleReject}
						onPrevious={goToPrevious}
						onSkip={skipStory}
						hasPrevious={currentIndex > 0}
						hasNext={currentIndex < items.length - 1}
						disabled={!currentItem || isActionLoading}
						isLoading={isActionLoading}
						currentIndex={currentIndex}
						totalCount={items.length}
					/>

					{/* Mobile Details Section (visible below lg) */}
					<div className="w-full mt-4 lg:hidden">
						<button
							data-tour="review-mobile-details"
							onClick={() => setShowMobileDetails(!showMobileDetails)}
							className={cn(
								'w-full flex items-center justify-center gap-2',
								'bg-slate-100 hover:bg-slate-200',
								'text-slate-700 py-2.5 rounded-xl text-sm font-medium transition-colors'
							)}
						>
							<MessageSquare className="h-4 w-4" />
							<span>{showMobileDetails ? 'Hide Details' : 'Details & Comment'}</span>
							{showMobileDetails ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
						</button>

						{showMobileDetails && (
							<div className="mt-3 space-y-3 animate-in slide-in-from-top-2 duration-200">
								{/* Story info */}
								{currentItem && (
									<div className="p-3 bg-white rounded-xl border border-slate-200">
										<div className="flex justify-between text-xs text-slate-500">
											<span>Author</span>
											<span className="font-medium text-slate-900 capitalize">
												{currentItem.userEmail?.split('@')[0] || 'Unknown'}
											</span>
										</div>
										{currentItem.caption && (
											<p className="mt-2 text-xs text-slate-600 line-clamp-2">
												{currentItem.caption}
											</p>
										)}
									</div>
								)}

								{/* Comment input */}
								<div className="space-y-1.5">
									<label className="text-xs font-bold text-slate-500 uppercase tracking-widest">
										Review Comment
									</label>
									<textarea
										value={reviewComment}
										onChange={(e) => setReviewComment(e.target.value)}
										placeholder="Add notes about this review..."
										className={cn(
											'w-full min-h-[60px] p-3 rounded-xl resize-none',
											'bg-white border border-slate-200',
											'text-slate-900 placeholder:text-slate-400 text-sm',
											'focus:outline-none focus:ring-2 focus:ring-[#2b6cee]/50 focus:border-[#2b6cee]'
										)}
									/>
								</div>
							</div>
						)}
					</div>
				</div>
			</main>

			{/* Right Sidebar: Stats & Metadata (desktop only) */}
			<ReviewDetailsSidebar
				item={currentItem}
				reviewedCount={reviewedCount}
				dailyGoal={dailyGoal}
				progressPercent={progressPercent}
				remainingCount={remainingCount}
				reviewComment={reviewComment}
				onReviewCommentChange={setReviewComment}
			/>
		</div>
	);
}
