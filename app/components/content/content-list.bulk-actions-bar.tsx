'use client';

import { X, ThumbsUp, ThumbsDown, Loader2 } from 'lucide-react';

interface BulkActionsBarProps {
	selectedCount: number;
	isBulkProcessing: boolean;
	onClearSelection: () => void;
	onBulkApprove: () => void;
	onShowBulkRejectDialog: () => void;
}

/**
 * Sticky bulk actions bar shown when items are selected
 */
export function BulkActionsBar({
	selectedCount,
	isBulkProcessing,
	onClearSelection,
	onBulkApprove,
	onShowBulkRejectDialog,
}: BulkActionsBarProps) {
	return (
		<div className='sticky top-0 z-20 bg-indigo-600 text-white px-6 py-4 flex items-center justify-between shadow-lg animate-in slide-in-from-top-2 duration-200'>
			<div className='flex items-center gap-4'>
				<button
					onClick={onClearSelection}
					className='p-1.5 hover:bg-white/20 rounded-lg transition-colors'
					title='Clear selection'
				>
					<X className='h-4 w-4' />
				</button>
				<span className='text-sm font-bold'>
					{selectedCount} item{selectedCount !== 1 ? 's' : ''} selected
				</span>
			</div>
			<div className='flex items-center gap-3'>
				<button
					onClick={onBulkApprove}
					disabled={isBulkProcessing}
					className='px-4 py-2 bg-emerald-500 hover:bg-emerald-400 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center gap-2 transition-colors disabled:opacity-50'
				>
					{isBulkProcessing ? (
						<Loader2 className='h-4 w-4 animate-spin' />
					) : (
						<ThumbsUp className='h-4 w-4' />
					)}
					Approve All
				</button>
				<button
					onClick={onShowBulkRejectDialog}
					disabled={isBulkProcessing}
					className='px-4 py-2 bg-rose-500 hover:bg-rose-400 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center gap-2 transition-colors disabled:opacity-50'
				>
					<ThumbsDown className='h-4 w-4' />
					Reject All
				</button>
			</div>
		</div>
	);
}
