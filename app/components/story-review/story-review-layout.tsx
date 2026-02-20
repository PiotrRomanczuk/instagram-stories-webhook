'use client';

import { useState, useCallback } from 'react';
import useSWR, { mutate } from 'swr';
import { toast } from 'sonner';
import { Loader2, AlertTriangle, Inbox } from 'lucide-react';
import { StoryPreviewStage } from './story-preview-stage';
import { StoryMetadataPanel } from './story-metadata-panel';
import { StoryFeedbackForm } from './story-feedback-form';
import { Button } from '@/app/components/ui/button';
import { cn } from '@/lib/utils';
import { ContentItem } from '@/lib/types';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface StoryReviewLayoutProps {
	className?: string;
}

export function StoryReviewLayout({ className }: StoryReviewLayoutProps) {
	const [currentIndex, setCurrentIndex] = useState(0);

	// Fetch pending submissions
	const { data, isLoading, error } = useSWR<{ items: ContentItem[] }>(
		'/api/content?source=submission&submissionStatus=pending',
		fetcher
	);

	const items = data?.items || [];
	const currentItem = items[currentIndex] || null;

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

	// Action handlers
	const handleApprove = async () => {
		if (!currentItem) return;
		try {
			const response = await fetch(`/api/content/${currentItem.id}/review`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ action: 'approve' }),
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || 'Failed to approve');
			}

			toast.success('Story approved and ready to schedule');
			refreshList();
			// Move to next item or stay if at end
			if (currentIndex >= items.length - 2) {
				setCurrentIndex(Math.max(0, currentIndex - 1));
			}
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Failed to approve');
		}
	};

	const handleRequestChanges = async (feedback: string) => {
		if (!currentItem) return;
		try {
			const response = await fetch(`/api/content/${currentItem.id}/review`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ action: 'request_changes', feedback }),
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || 'Failed to request changes');
			}

			toast.success('Change request sent to creator');
			refreshList();
		} catch (err) {
			toast.error(
				err instanceof Error ? err.message : 'Failed to request changes'
			);
		}
	};

	const handleReject = async (reason: string) => {
		if (!currentItem) return;
		try {
			const response = await fetch(`/api/content/${currentItem.id}/review`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ action: 'reject', rejectionReason: reason }),
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || 'Failed to reject');
			}

			toast.success('Story rejected');
			refreshList();
			if (currentIndex >= items.length - 2) {
				setCurrentIndex(Math.max(0, currentIndex - 1));
			}
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Failed to reject');
		}
	};


	// Loading state
	if (isLoading) {
		return (
			<div className="flex items-center justify-center min-h-[600px]">
				<div className="text-center space-y-4">
					<Loader2 className="h-12 w-12 animate-spin text-[#92a4c9] mx-auto" />
					<p className="text-[#92a4c9] font-medium">Loading stories...</p>
				</div>
			</div>
		);
	}

	// Error state
	if (error) {
		return (
			<div className="flex flex-col items-center justify-center min-h-[600px] text-center">
				<AlertTriangle className="h-12 w-12 text-red-400 mb-4" />
				<h3 className="text-lg font-semibold text-white">Failed to load stories</h3>
				<p className="text-sm text-[#92a4c9] mt-2 mb-4">
					{error.message || 'An error occurred'}
				</p>
				<Button onClick={refreshList} variant="outline">
					Try Again
				</Button>
			</div>
		);
	}

	// Empty state
	if (items.length === 0) {
		return (
			<div className="flex flex-col items-center justify-center min-h-[600px] text-center">
				<div className="h-20 w-20 rounded-full bg-[#1a2332] flex items-center justify-center mb-4">
					<Inbox className="h-10 w-10 text-[#92a4c9]" />
				</div>
				<h3 className="text-lg font-semibold text-white">All caught up!</h3>
				<p className="text-sm text-[#92a4c9] mt-2">
					No stories pending review
				</p>
			</div>
		);
	}

	// Build metadata from current item
	// Note: ContentItem has userEmail but not userName/userImage
	// We derive the name from email and use hashtags from the item if available
	const metadata = currentItem
		? {
			creator: {
				name: currentItem.userEmail?.split('@')[0] || 'Unknown Creator',
				handle: currentItem.userEmail?.split('@')[0] || 'unknown',
				avatarUrl: undefined,
			},
			mentions: extractMentions(currentItem.caption),
			hashtags: currentItem.hashtags || extractHashtags(currentItem.caption),
			location: undefined,
			creatorNotes: currentItem.title || undefined, // Use title as notes
			submittedAt: currentItem.createdAt,
		}
		: null;

	return (
		<div
			className={cn(
				'min-h-[calc(100vh-200px)] bg-[#101622] rounded-2xl p-6',
				className
			)}
		>
			{/* Header */}
			<div className="flex items-center justify-between mb-6">
				<div>
					<h2 className="text-xl font-bold text-white">Story Review</h2>
					<p className="text-sm text-[#92a4c9]">
						{items.length} {items.length === 1 ? 'story' : 'stories'} pending
						review
					</p>
				</div>
				<div className="px-3 py-1.5 rounded-full bg-amber-400/10 border border-amber-400/30">
					<span className="text-xs font-medium text-amber-400">
						Pending Review
					</span>
				</div>
			</div>

			{/* Main 3-Column Layout */}
			<div className="flex gap-6 items-start justify-center">
				{/* Center: Phone Preview with Navigation */}
				<div className="flex-1 flex justify-center">
					<StoryPreviewStage
						imageUrl={currentItem?.mediaUrl || null}
						username={metadata?.creator.handle}
						onPrevious={goToPrevious}
						onNext={goToNext}
						hasPrevious={currentIndex > 0}
						hasNext={currentIndex < items.length - 1}
						currentIndex={currentIndex}
						totalCount={items.length}
					/>
				</div>

				{/* Right: Metadata + Feedback */}
				<div className="space-y-4">
					<StoryMetadataPanel metadata={metadata} />
					<StoryFeedbackForm
						onApprove={handleApprove}
						onRequestChanges={handleRequestChanges}
						onReject={handleReject}
						disabled={!currentItem}
					/>
				</div>
			</div>
		</div>
	);
}

// Helper functions to extract mentions and hashtags from caption
function extractMentions(caption?: string | null): string[] {
	if (!caption) return [];
	const matches = caption.match(/@(\w+)/g);
	return matches ? matches.map((m) => m.slice(1)) : [];
}

function extractHashtags(caption?: string | null): string[] {
	if (!caption) return [];
	const matches = caption.match(/#(\w+)/g);
	return matches ? matches.map((m) => m.slice(1)) : [];
}
