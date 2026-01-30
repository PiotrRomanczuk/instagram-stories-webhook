'use client';

import React from 'react';
import {
	X,
	AlertCircle,
	CheckCircle2,
	AlertTriangle,
	Loader2,
} from 'lucide-react';

interface ConfirmationDialogProps {
	isOpen: boolean;
	onClose: () => void;
	onConfirm: () => void | Promise<void>;
	title: string;
	message: string;
	confirmLabel?: string;
	cancelLabel?: string;
	type?: 'info' | 'success' | 'warning' | 'danger';
	isLoading?: boolean;
}

export function ConfirmationDialog({
	isOpen,
	onClose,
	onConfirm,
	title,
	message,
	confirmLabel = 'Confirm',
	cancelLabel = 'Cancel',
	type = 'info',
	isLoading = false,
}: ConfirmationDialogProps) {
	if (!isOpen) return null;

	const icons = {
		info: <AlertCircle className='h-10 w-10 text-blue-500' />,
		success: <CheckCircle2 className='h-10 w-10 text-green-500' />,
		warning: <AlertTriangle className='h-10 w-10 text-yellow-500' />,
		danger: <AlertTriangle className='h-10 w-10 text-red-500' />,
	};

	const buttonColors = {
		info: 'bg-blue-600 hover:bg-blue-700',
		success: 'bg-green-600 hover:bg-green-700',
		warning: 'bg-yellow-600 hover:bg-yellow-700',
		danger: 'bg-red-600 hover:bg-red-700',
	};

	const handleConfirm = async () => {
		await onConfirm();
	};

	return (
		<>
			<div
				className='fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm transition-opacity'
				onClick={onClose}
			/>
			<div className='fixed inset-0 z-[110] flex items-center justify-center p-4'>
				<div
					className='w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl ring-1 ring-black/5 animate-in fade-in zoom-in duration-200'
					onClick={(e) => e.stopPropagation()}
				>
					<div className='flex flex-col items-center text-center'>
						<div className='mb-4 rounded-full bg-gray-50 p-3'>
							{icons[type]}
						</div>
						<h3 className='text-xl font-bold text-gray-900'>{title}</h3>
						<p className='mt-2 text-sm text-gray-500 leading-relaxed'>
							{message}
						</p>
					</div>

					<div className='mt-8 flex flex-col gap-2'>
						<button
							onClick={handleConfirm}
							disabled={isLoading}
							className={`w-full py-3 rounded-xl text-white font-bold transition-all shadow-md active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 ${buttonColors[type]}`}
						>
							{isLoading && <Loader2 className='h-4 w-4 animate-spin' />}
							{confirmLabel}
						</button>
						<button
							onClick={onClose}
							disabled={isLoading}
							className='w-full py-3 rounded-xl text-gray-600 font-semibold hover:bg-gray-100 transition-colors'
						>
							{cancelLabel}
						</button>
					</div>
				</div>
			</div>
		</>
	);
}
