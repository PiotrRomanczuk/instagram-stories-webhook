'use client';

import { useState } from 'react';
import { X, Loader2 } from 'lucide-react';

/**
 * Quick Reject Popover Component
 */
export function QuickRejectPopover({
	isOpen,
	onClose,
	onReject,
	isLoading,
}: {
	isOpen: boolean;
	onClose: () => void;
	onReject: (reason: string) => void;
	isLoading: boolean;
}) {
	const [reason, setReason] = useState('');

	if (!isOpen) return null;

	return (
		<div className='absolute right-0 top-full mt-2 z-50 bg-white rounded-xl shadow-2xl border border-gray-200 p-3 w-64'>
			<div className='flex items-center justify-between mb-2'>
				<span className='text-xs font-bold text-gray-700'>Rejection Reason</span>
				<button onClick={onClose} className='text-gray-400 hover:text-gray-600'>
					<X className='h-4 w-4' />
				</button>
			</div>
			<textarea
				value={reason}
				onChange={(e) => setReason(e.target.value)}
				placeholder='Why reject this?'
				className='w-full p-2 text-xs border border-gray-200 rounded-lg resize-none h-16 focus:outline-none focus:ring-2 focus:ring-rose-200'
				autoFocus
			/>
			<button
				onClick={() => {
					if (reason.trim()) {
						onReject(reason);
						setReason('');
					}
				}}
				disabled={!reason.trim() || isLoading}
				className='mt-2 w-full px-3 py-2 bg-rose-500 text-white text-xs font-bold rounded-lg hover:bg-rose-600 disabled:opacity-50 flex items-center justify-center gap-2'
			>
				{isLoading && <Loader2 className='h-3 w-3 animate-spin' />}
				Reject
			</button>
		</div>
	);
}
