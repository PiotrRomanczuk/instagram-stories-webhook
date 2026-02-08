'use client';

import { useState, useCallback, useEffect } from 'react';
import useSWR, { mutate } from 'swr';
import { toast } from 'sonner';
import { Loader2, AlertTriangle, Inbox, Layers, MessageSquare, ChevronDown, ChevronUp } from 'lucide-react';
import { ReviewHistorySidebar } from './review-history-sidebar';
import { PhonePreview } from './phone-preview';
import { ReviewDetailsSidebar } from './review-details-sidebar';
import { ReviewActionBar } from './review-action-bar';
import { useKeyboardNav } from '../story-review/use-keyboard-nav';
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
	const [reviewHistory, setReviewHistory] = useState<ReviewedItem[]>([]);
	const [reviewComment, setReviewComment] = useState('');
	const [isActionLoading, setIsActionLoading] = useState(false);
	const [showMobileDetails, setShowMobileDetails] = useState(false);

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

	// Action handlers
	const handleApprove = async () => {
		if (!currentItem || isActionLoading) return;
		setIsActionLoading(true);
		try {
			const response = await fetch(`/api/content/${currentItem.id}/review`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ action: 'approve', feedback: reviewComment || undefined }),
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || 'Failed to approve');
			}

			addToHistory(currentItem, 'approved');
			toast.success('Story approved and ready to schedule');
			setReviewComment('');
			refreshList();

			// Adjust index if needed
			if (currentIndex >= items.length - 1) {
				setCurrentIndex(Math.max(0, currentIndex - 1));
			}
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Failed to approve');
		} finally {
			setIsActionLoading(false);
		}
	};

	const handleReject = async () => {
		if (!currentItem || isActionLoading) return;
		setIsActionLoading(true);
		try {
			const response = await fetch(`/api/content/${currentItem.id}/review`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					action: 'reject',
					rejectionReason: reviewComment || 'Content does not meet guidelines'
				}),
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || 'Failed to reject');
			}

			addToHistory(currentItem, 'rejected');
			toast.success('Story rejected');
			setReviewComment('');
			refreshList();

			if (currentIndex >= items.length - 1) {
				setCurrentIndex(Math.max(0, currentIndex - 1));
			}
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Failed to reject');
		} finally {
			setIsActionLoading(false);
		}
	};

	// Page tour
	const { startTour } = usePageTour({
		page: 'admin-review',
		steps: adminReviewTourSteps,
	});

	// Keyboard navigation
	useKeyboardNav({
		onNext: goToNext,
		onPrevious: goToPrevious,
		onApprove: handleApprove,
		onReject: handleReject,
		enabled: items.length > 0 && !isActionLoading,
	});

	// Loading state
	if (isLoading) {
		return (
			<div className={cn('flex h-[calc(100vh-120px)] items-center justify-center', className)}>
				<div className="text-center space-y-4">
					<Loader2 className="h-12 w-12 animate-spin text-[#2b6cee] mx-auto" />
					<p className="text-slate-500 dark:text-slate-400 font-medium">Loading stories...</p>
				</div>
			</div>
		);
	}

	// Error state
	if (error) {
		return (
			<div className={cn('flex flex-col items-center justify-center h-[calc(100vh-120px)]', className)}>
				<AlertTriangle className="h-12 w-12 text-red-400 mb-4" />
				<h3 className="text-lg font-semibold text-slate-900 dark:text-white">Failed to load stories</h3>
				<p className="text-sm text-slate-500 dark:text-slate-400 mt-2 mb-4">
					{error.message || 'An error occurred'}
				</p>
				<Button onClick={refreshList} variant="outline" className="border-slate-300 dark:border-[#2a3649] hover:bg-slate-100 dark:hover:bg-[#232f48]">
					Try Again
				</Button>
			</div>
		);
	}

	// Empty state
	if (items.length === 0) {
		return (
			<div className={cn('flex flex-col items-center justify-center h-[calc(100vh-120px)]', className)}>
				<div className="h-20 w-20 rounded-full bg-blue-100 dark:bg-[#232f48] flex items-center justify-center mb-4">
					<Inbox className="h-10 w-10 text-[#2b6cee]" />
				</div>
				<h3 className="text-lg font-semibold text-slate-900 dark:text-white">All caught up!</h3>
				<p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
					No stories pending review
				</p>
			</div>
		);
	}

	return (
		<div className={cn('flex h-[calc(100vh-120px)] bg-white dark:bg-[#101622]', className)}>
			{/* Left Sidebar: Review History (desktop only) */}
			<ReviewHistorySidebar history={reviewHistory} />

			{/* Main Content */}
			<main className="flex-1 flex flex-col bg-slate-50 dark:bg-black/20 overflow-y-auto">
				<div className="max-w-4xl mx-auto w-full px-3 py-4 sm:p-8 flex flex-col items-center">
					{/* Header */}
					<div data-tour="review-header" className="mb-4 sm:mb-6 text-center">
						<div className="flex items-center justify-center gap-2 mb-1">
							<h1 className="text-lg sm:text-2xl font-bold text-slate-900 dark:text-white">Story Review Queue</h1>
							<TourTriggerButton onStartTour={startTour} />
						</div>
						<p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm">
							{remainingCount} {remainingCount === 1 ? 'story' : 'stories'} pending review
							{reviewedCount > 0 && (
								<span className="ml-2 text-[#2b6cee]">
									({reviewedCount} reviewed)
								</span>
							)}
						</p>
					</div>

					{/* Phone Preview */}
					<div data-tour="review-phone-preview">
						<PhonePreview
							item={currentItem}
							onImageError={() => {
								// Handle image error gracefully - the component handles this internally
							}}
						/>
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
					/>

					{/* Mobile Details Section (visible below lg) */}
					<div className="w-full mt-4 lg:hidden">
						<button
							data-tour="review-mobile-details"
							onClick={() => setShowMobileDetails(!showMobileDetails)}
							className={cn(
								'w-full flex items-center justify-center gap-2',
								'bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10',
								'text-slate-700 dark:text-white py-2.5 rounded-xl text-sm font-medium transition-colors'
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
									<div className="p-3 bg-white dark:bg-white/5 rounded-xl border border-slate-200 dark:border-[#2a3649]">
										<div className="flex justify-between text-xs text-slate-500 dark:text-slate-400">
											<span>Author</span>
											<span className="font-medium text-slate-900 dark:text-white capitalize">
												{currentItem.userEmail?.split('@')[0] || 'Unknown'}
											</span>
										</div>
										{currentItem.caption && (
											<p className="mt-2 text-xs text-slate-600 dark:text-slate-300 line-clamp-2">
												{currentItem.caption}
											</p>
										)}
									</div>
								)}

								{/* Comment input */}
								<div className="space-y-1.5">
									<label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
										Review Comment
									</label>
									<textarea
										value={reviewComment}
										onChange={(e) => setReviewComment(e.target.value)}
										placeholder="Add notes about this review..."
										className={cn(
											'w-full min-h-[60px] p-3 rounded-xl resize-none',
											'bg-white dark:bg-black/20 border border-slate-200 dark:border-[#2a3649]',
											'text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 text-sm',
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
