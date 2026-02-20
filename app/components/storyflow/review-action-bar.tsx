'use client';

import { Check, X, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ReviewActionBarProps {
	onApprove: () => void;
	onReject: () => void;
	onPrevious: () => void;
	onSkip: () => void;
	hasPrevious: boolean;
	hasNext: boolean;
	disabled?: boolean;
	isLoading?: boolean;
	totalCount: number;
	currentIndex: number;
	className?: string;
}

export function ReviewActionBar({
	onApprove,
	onReject,
	onPrevious,
	onSkip,
	hasPrevious,
	hasNext,
	disabled = false,
	isLoading = false,
	totalCount,
	currentIndex,
	className,
}: ReviewActionBarProps) {
	return (
		<div className={cn('w-full flex flex-col items-center', className)}>
			{/* Primary Action Buttons */}
			<div data-tour="review-action-bar" className="mt-6 sm:mt-10 flex items-center gap-3 sm:gap-6 w-full max-w-sm px-2 sm:px-0">
				{/* Reject Button */}
				<button
					onClick={onReject}
					disabled={disabled}
					className={cn(
						'flex-1 flex items-center justify-center gap-3',
						'bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white',
						'border border-red-500/30 min-h-[48px] py-3 sm:py-4 rounded-xl font-bold transition-all group',
						'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-red-500/10 disabled:hover:text-red-500'
					)}
				>
					{isLoading ? (
						<Loader2 className="h-5 w-5 animate-spin" />
					) : (
						<X className="h-5 w-5" />
					)}
					<span>Reject</span>
				</button>

				{/* Approve Button */}
				<button
					onClick={onApprove}
					disabled={disabled}
					className={cn(
						'flex-1 flex items-center justify-center gap-3',
						'bg-[#2b6cee]/20 hover:bg-[#2b6cee] text-[#2b6cee] hover:text-white',
						'border border-[#2b6cee]/30 min-h-[48px] py-3 sm:py-4 rounded-xl font-bold transition-all group',
						'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-[#2b6cee]/20 disabled:hover:text-[#2b6cee]'
					)}
				>
					{isLoading ? (
						<Loader2 className="h-5 w-5 animate-spin" />
					) : (
						<Check className="h-5 w-5" />
					)}
					<span>Approve</span>
				</button>
			</div>

			{/* Navigation Buttons */}
			<div data-tour="review-navigation" className="mt-4 sm:mt-8 flex gap-4">
				<button
					onClick={onPrevious}
					disabled={!hasPrevious || disabled || isLoading}
					className={cn(
						'flex items-center gap-2 min-h-[48px] min-w-[48px] px-4 text-slate-500 hover:text-slate-900 transition-colors',
						'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:text-slate-500'
					)}
				>
					<ChevronLeft className="h-5 w-5" />
					<span className="text-sm">Previous</span>
				</button>

				<button
					onClick={onSkip}
					disabled={!hasNext || disabled || isLoading}
					className={cn(
						'flex items-center gap-2 min-h-[48px] px-4 text-slate-500 hover:text-slate-900 transition-colors',
						'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:text-slate-500'
					)}
				>
					<span className="text-sm">Skip Story</span>
					<ChevronRight className="h-5 w-5" />
				</button>
			</div>

			{/* Progress Indicator Mobile-friendly */}
			<div className="mt-4 flex items-center gap-2 px-4 py-1.5 bg-slate-100 rounded-full border border-slate-200 shadow-inner">
				<span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Progress</span>
				<div className="h-4 w-[1px] bg-slate-200 mx-1" />
				<span className="text-xs font-bold text-slate-900">
					{currentIndex + 1} <span className="text-slate-400 font-medium mx-0.5">/</span> {totalCount}
				</span>
				<div className="h-4 w-[1px] bg-slate-200 mx-1" />
				<span className="text-[10px] font-black text-[#2b6cee] uppercase tracking-widest">
					{totalCount - currentIndex - 1} more
				</span>
			</div>
		</div>
	);
}
