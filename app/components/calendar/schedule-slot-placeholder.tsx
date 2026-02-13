'use client';

import { Plus, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ScheduleSlotPlaceholderProps {
	time: string;
	label?: string;
	onClick?: () => void;
	variant?: 'default' | 'suggested';
	className?: string;
}

export function ScheduleSlotPlaceholder({
	time,
	label = 'Available Slot',
	onClick,
	variant = 'default',
	className,
}: ScheduleSlotPlaceholderProps) {
	return (
		<button
			type="button"
			onClick={onClick}
			className={cn(
				'flex w-full items-center gap-3 rounded-xl border-2 border-dashed p-3 transition-all',
				variant === 'suggested'
					? 'border-[#2b6cee]/30 bg-[#2b6cee]/5 hover:border-[#2b6cee]/50 hover:bg-[#2b6cee]/10'
					: 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50',
				className
			)}
		>
			{/* Plus icon */}
			<div
				className={cn(
					'flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg transition-colors',
					variant === 'suggested'
						? 'bg-[#2b6cee]/10 text-[#2b6cee]'
						: 'bg-gray-100 text-gray-400'
				)}
			>
				<Plus className="h-5 w-5" />
			</div>

			{/* Content */}
			<div className="min-w-0 flex-1 text-left">
				<div className="flex items-center gap-1.5">
					<Clock className="h-3 w-3 text-gray-400" />
					<span className="text-xs font-semibold text-gray-600">
						{time}
					</span>
				</div>
				<p
					className={cn(
						'mt-0.5 text-sm',
						variant === 'suggested'
							? 'font-medium text-[#2b6cee]'
							: 'text-gray-400'
					)}
				>
					{label}
				</p>
			</div>
		</button>
	);
}
