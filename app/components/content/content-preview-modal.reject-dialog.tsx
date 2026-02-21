'use client';

import React from 'react';
import { Loader2 } from 'lucide-react';

interface RejectDialogProps {
	isOpen: boolean;
	rejectionReason: string;
	onReasonChange: (reason: string) => void;
	onConfirm: () => void;
	onCancel: () => void;
	isLoading: boolean;
}

/**
 * Rejection dialog with textarea for rejection reason
 */
export function RejectDialog({
	isOpen,
	rejectionReason,
	onReasonChange,
	onConfirm,
	onCancel,
	isLoading,
}: RejectDialogProps) {
	if (!isOpen) return null;

	return (
		<>
			<div
				className='fixed inset-0 z-[100] bg-black/50'
				onClick={onCancel}
			/>
			<div className='fixed inset-0 z-[110] flex items-center justify-center p-4'>
				<div className='bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl'>
					<h3 className='text-xl font-black text-gray-900 mb-2'>Reject Submission</h3>
					<p className='text-sm text-gray-500 mb-6'>
						Please provide a reason for rejection. This will be shared with the submitter.
					</p>
					<textarea
						value={rejectionReason}
						onChange={(e) => onReasonChange(e.target.value)}
						placeholder='Reason for rejection...'
						className='w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-rose-200 focus:border-rose-300 outline-none transition-all min-h-[100px] text-sm'
					/>
					<div className='flex gap-3 mt-6'>
						<button
							onClick={onCancel}
							className='flex-1 h-12 bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200 font-bold text-sm transition-all'
						>
							Cancel
						</button>
						<button
							onClick={onConfirm}
							disabled={!rejectionReason.trim() || isLoading}
							className='flex-1 h-12 bg-rose-500 text-white rounded-xl hover:bg-rose-600 font-bold text-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2'
						>
							{isLoading && <Loader2 className='h-4 w-4 animate-spin' />}
							Reject
						</button>
					</div>
				</div>
			</div>
		</>
	);
}
