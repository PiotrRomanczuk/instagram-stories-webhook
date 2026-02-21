'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ContentItem } from '@/lib/types/posts';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { ConfirmationDialog } from '../ui/confirmation-dialog';
import { InsightsPanel } from './content-preview-modal.insights-panel';
import { MediaPanel } from './content-preview-modal.media-panel';
import { TimelineSection } from './content-preview-modal.timeline-section';
import { FooterActions } from './content-preview-modal.footer-actions';
import { RejectDialog } from './content-preview-modal.reject-dialog';
import { MetadataGrid } from './content-preview-modal.metadata-grid';
import { PanelHeader } from './content-preview-modal.panel-header';
import { useModalActions } from './content-preview-modal.use-modal-actions';

interface ContentPreviewModalProps {
	item: ContentItem;
	onClose: () => void;
	onEdit: (item: ContentItem) => void;
	onRefresh?: () => void;
	isAdmin?: boolean;
	items?: ContentItem[];
	currentIndex?: number;
	onNavigate?: (item: ContentItem, index: number) => void;
}

export function ContentPreviewModal({
	item, onClose, onEdit, onRefresh, isAdmin = false, items, currentIndex, onNavigate,
}: ContentPreviewModalProps) {
	const [showStoryFrame, setShowStoryFrame] = useState(false);
	const { showConfirmPublish, setShowConfirmPublish, showConfirmDelete, setShowConfirmDelete,
		isPublishing, isRetrying, isDeleting, isReviewing,
		showRejectDialog, setShowRejectDialog, rejectionReason, setRejectionReason,
		handlePublishNow, handleRetry, handleApprove, handleReject, handleDelete,
	} = useModalActions(item, onRefresh, onClose);

	const hasNavigation = items && items.length > 1 && currentIndex !== undefined && onNavigate;
	const canGoPrevious = hasNavigation && currentIndex > 0;
	const canGoNext = hasNavigation && currentIndex < items.length - 1;

	const goToPrevious = useCallback(() => {
		if (canGoPrevious && items && onNavigate) onNavigate(items[currentIndex - 1], currentIndex - 1);
	}, [canGoPrevious, items, currentIndex, onNavigate]);

	const goToNext = useCallback(() => {
		if (canGoNext && items && onNavigate) onNavigate(items[currentIndex + 1], currentIndex + 1);
	}, [canGoNext, items, currentIndex, onNavigate]);

	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
			if (e.key === 'Escape') { if (showRejectDialog) setShowRejectDialog(false); else if (showConfirmPublish) setShowConfirmPublish(false); else onClose(); }
			else if (e.key === 'ArrowLeft') { e.preventDefault(); goToPrevious(); }
			else if (e.key === 'ArrowRight') { e.preventDefault(); goToNext(); }
		};
		window.addEventListener('keydown', handleKeyDown);
		return () => window.removeEventListener('keydown', handleKeyDown);
	}, [onClose, goToPrevious, goToNext, showRejectDialog, showConfirmPublish, setShowRejectDialog, setShowConfirmPublish]);

	const hasBeenProcessed = ['scheduled', 'processing', 'published', 'failed'].includes(item.publishingStatus);
	const isPendingSubmission = item.source === 'submission' && item.submissionStatus === 'pending' && !hasBeenProcessed;

	return (
		<>
			<div className='fixed inset-0 z-[80] bg-black/70 backdrop-blur-md transition-all' onClick={onClose} />
			<div className='fixed inset-0 z-[90] flex items-end md:items-center justify-center md:p-6'>
				{hasNavigation && (
					<>
						<button onClick={goToPrevious} disabled={!canGoPrevious} className={`hidden md:flex fixed left-4 md:left-8 top-1/2 -translate-y-1/2 z-[95] p-4 rounded-full bg-white/90 backdrop-blur shadow-2xl transition-all ${canGoPrevious ? 'hover:bg-white hover:scale-110 text-gray-700' : 'opacity-30 cursor-not-allowed text-gray-400'}`} title='Previous (←)'>
							<ChevronLeft className='h-6 w-6' />
						</button>
						<button onClick={goToNext} disabled={!canGoNext} className={`hidden md:flex fixed right-4 md:right-8 top-1/2 -translate-y-1/2 z-[95] p-4 rounded-full bg-white/90 backdrop-blur shadow-2xl transition-all ${canGoNext ? 'hover:bg-white hover:scale-110 text-gray-700' : 'opacity-30 cursor-not-allowed text-gray-400'}`} title='Next (→)'>
							<ChevronRight className='h-6 w-6' />
						</button>
						<div className='fixed bottom-4 left-1/2 -translate-x-1/2 z-[95] bg-black/60 backdrop-blur-md text-white px-4 py-2 rounded-full text-xs font-bold tracking-wider hidden md:block'>
							{currentIndex + 1} / {items.length}
						</div>
					</>
				)}
				<div className='relative h-[calc(100dvh-4rem)] md:h-auto md:max-h-[92vh] w-full max-w-6xl overflow-hidden rounded-t-3xl md:rounded-[2.5rem] bg-white shadow-2xl ring-1 ring-black/5 flex flex-col md:flex-row animate-in slide-in-from-bottom-4 md:fade-in md:zoom-in duration-300'>
					<button onClick={onClose} className='absolute top-4 right-4 z-50 md:hidden p-2 bg-black/30 backdrop-blur-sm text-white rounded-full hover:bg-black/50 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center'>
						<X className='h-5 w-5' />
					</button>
					<MediaPanel item={item} showStoryFrame={showStoryFrame} onToggleStoryFrame={setShowStoryFrame} />
					<div className='flex-1 min-h-0 md:flex-none md:w-[450px] bg-white flex flex-col'>
						<PanelHeader item={item} onClose={onClose} hasNavigation={!!hasNavigation} canGoPrevious={!!canGoPrevious} canGoNext={!!canGoNext} currentIndex={currentIndex ?? 0} itemsCount={items?.length ?? 0} onGoToPrevious={goToPrevious} onGoToNext={goToNext} />
						<div className='flex-1 overflow-y-auto p-4 md:p-8 space-y-6 md:space-y-10'>
							<TimelineSection item={item} />
							{item.publishingStatus === 'published' && item.igMediaId && <InsightsPanel contentId={item.id} />}
							{item.caption && (
								<section className='space-y-4'>
									<h3 className='text-xs font-black text-gray-400 uppercase tracking-[0.2em]'>Final Caption</h3>
									<div className='p-6 bg-gray-50 rounded-[2rem] border border-gray-100/50'>
										<p className='text-sm text-gray-600 font-medium leading-[1.8] tracking-tight whitespace-pre-wrap select-all'>{item.caption}</p>
									</div>
								</section>
							)}
							<MetadataGrid item={item} />
							<FooterActions item={item} isAdmin={isAdmin} isPendingSubmission={isPendingSubmission} isReviewing={isReviewing} isRetrying={isRetrying} isDeleting={isDeleting} onApprove={handleApprove} onShowRejectDialog={() => setShowRejectDialog(true)} onRetry={handleRetry} onEdit={onEdit} onClose={onClose} onShowConfirmDelete={() => setShowConfirmDelete(true)} />
						</div>
					</div>
				</div>
			</div>
			<ConfirmationDialog isOpen={showConfirmPublish} onClose={() => setShowConfirmPublish(false)} onConfirm={handlePublishNow} title='Ready to Publish?' message="This bypasses any scheduled time and reveals this masterpiece to the world immediately. Let's do it!" confirmLabel='Go Live Now' type='success' isLoading={isPublishing} />
			<ConfirmationDialog isOpen={showConfirmDelete} onClose={() => setShowConfirmDelete(false)} onConfirm={handleDelete} title='Delete Content?' message='This will permanently delete this content. This action cannot be undone.' confirmLabel='Delete' type='danger' isLoading={isDeleting} />
			<RejectDialog isOpen={showRejectDialog} rejectionReason={rejectionReason} onReasonChange={setRejectionReason} onConfirm={handleReject} onCancel={() => setShowRejectDialog(false)} isLoading={isReviewing} />
		</>
	);
}
