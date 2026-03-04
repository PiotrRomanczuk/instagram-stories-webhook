'use client';

import React from 'react';
import { ContentItem } from '@/lib/types/posts';
import { ThumbsUp, ThumbsDown, RefreshCw, CalendarClock, Trash2, Loader2 } from 'lucide-react';

interface FooterActionsProps {
	item: ContentItem;
	isAdmin: boolean;
	isDemo?: boolean;
	isPendingSubmission: boolean;
	isReviewing: boolean;
	isRetrying: boolean;
	isDeleting: boolean;
	onApprove: () => void;
	onShowRejectDialog: () => void;
	onRetry: () => void;
	onEdit: (item: ContentItem) => void;
	onClose: () => void;
	onShowConfirmDelete: () => void;
}

/**
 * Footer action buttons for the preview modal
 */
export function FooterActions({
	item,
	isAdmin,
	isDemo = false,
	isPendingSubmission,
	isReviewing,
	isRetrying,
	isDeleting: _isDeleting,
	onApprove,
	onShowRejectDialog,
	onRetry,
	onEdit,
	onClose,
	onShowConfirmDelete,
}: FooterActionsProps) {
	return (
		<div className='flex flex-col gap-3 pt-4 pb-40 md:pb-0'>
			{/* Approval buttons for pending submissions */}
			{isAdmin && !isDemo && isPendingSubmission && (
				<div className='flex gap-2'>
					<button
						onClick={onApprove}
						disabled={isReviewing}
						className='flex-1 h-14 bg-emerald-500 text-white rounded-2xl hover:bg-emerald-600 active:scale-[0.98] transition-all font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-xl shadow-emerald-200 disabled:opacity-50'
					>
						{isReviewing ? <Loader2 className='h-4 w-4 animate-spin' /> : <ThumbsUp className='h-4 w-4' />}
						Approve
					</button>
					<button
						onClick={onShowRejectDialog}
						disabled={isReviewing}
						className='flex-1 h-14 bg-rose-500 text-white rounded-2xl hover:bg-rose-600 active:scale-[0.98] transition-all font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-xl shadow-rose-200 disabled:opacity-50'
					>
						<ThumbsDown className='h-4 w-4' />
						Reject
					</button>
				</div>
			)}

			{/* Retry button for failed posts */}
			{item.publishingStatus === 'failed' && isAdmin && !isDemo && (
				<div className='flex gap-2'>
					<button
						onClick={onRetry}
						disabled={isRetrying}
						className='flex-1 h-14 bg-orange-500 text-white rounded-2xl hover:bg-orange-600 active:scale-[0.98] transition-all font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-xl shadow-orange-200 disabled:opacity-50'
					>
						{isRetrying ? <Loader2 className='h-4 w-4 animate-spin' /> : <RefreshCw className='h-4 w-4' />}
						Retry
					</button>
				</div>
			)}

			{/* Publish/Schedule buttons for non-pending, non-failed items */}
			{!isDemo && item.publishingStatus !== 'published' && item.publishingStatus !== 'failed' && !isPendingSubmission && (
				<div className='flex gap-2'>
					<button
						onClick={() => { onClose(); onEdit(item); }}
						className='flex-1 h-14 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 active:scale-[0.98] transition-all font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-xl shadow-indigo-200'
					>
						<CalendarClock className='h-4 w-4' />
						{item.publishingStatus === 'scheduled' ? 'Update' : 'Schedule'}
					</button>
				</div>
			)}
			<div className='flex gap-2'>
				<button
					onClick={onClose}
					className='flex-1 h-14 bg-gray-50 text-gray-400 rounded-2xl hover:bg-gray-100 hover:text-gray-900 transition-all font-bold text-xs uppercase tracking-widest'
				>
					Dismiss
				</button>
				{isAdmin && !isDemo && (
					<button
						onClick={onShowConfirmDelete}
						className='h-14 px-6 bg-rose-50 text-rose-500 rounded-2xl hover:bg-rose-100 hover:text-rose-600 transition-all font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2'
						title='Delete this content'
					>
						<Trash2 className='h-4 w-4' />
					</button>
				)}
			</div>
		</div>
	);
}
