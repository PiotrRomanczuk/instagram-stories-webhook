'use client';

import { Loader2 } from 'lucide-react';

interface BulkRejectDialogProps {
	selectedCount: number;
	bulkRejectReason: string;
	isBulkProcessing: boolean;
	onReasonChange: (reason: string) => void;
	onConfirm: () => void;
	onCancel: () => void;
}

/**
 * Modal dialog for bulk rejection with reason textarea
 */
export function BulkRejectDialog({
	selectedCount,
	bulkRejectReason,
	isBulkProcessing,
	onReasonChange,
	onConfirm,
	onCancel,
}: BulkRejectDialogProps) {
	return (
		<div className='fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-in fade-in duration-200'>
			<div className='bg-white rounded-3xl shadow-2xl p-8 w-full max-w-md mx-4 animate-in zoom-in-95 duration-200'>
				<h3 className='text-xl font-black text-gray-900 mb-2'>
					Reject {selectedCount} Item{selectedCount !== 1 ? 's' : ''}?
				</h3>
				<p className='text-sm text-gray-500 mb-6'>
					Please provide a reason for rejecting these submissions.
				</p>
				<textarea
					value={bulkRejectReason}
					onChange={(e) => onReasonChange(e.target.value)}
					placeholder='Rejection reason...'
					className='w-full p-4 border border-gray-200 rounded-2xl resize-none h-32 focus:outline-none focus:ring-2 focus:ring-rose-200 focus:border-rose-400 text-sm'
					autoFocus
				/>
				<div className='flex gap-3 mt-6'>
					<button
						onClick={onCancel}
						className='flex-1 px-6 py-3 bg-gray-100 text-gray-700 rounded-2xl font-bold text-sm hover:bg-gray-200 transition-colors'
					>
						Cancel
					</button>
					<button
						onClick={onConfirm}
						disabled={!bulkRejectReason.trim() || isBulkProcessing}
						className='flex-1 px-6 py-3 bg-rose-500 text-white rounded-2xl font-bold text-sm hover:bg-rose-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2'
					>
						{isBulkProcessing && <Loader2 className='h-4 w-4 animate-spin' />}
						Reject All
					</button>
				</div>
			</div>
		</div>
	);
}
