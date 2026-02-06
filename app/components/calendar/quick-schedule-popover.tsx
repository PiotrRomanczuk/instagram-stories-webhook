'use client';

/**
 * Quick Schedule Popover - Allows fast scheduling with a single click
 * Shows thumbnail preview and DateTimePicker
 */

import { useState, useRef, useEffect, ReactNode } from 'react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { Calendar, Loader2 } from 'lucide-react';
import { DateTimePicker } from '@/app/components/ui/datetime-picker';
import { ContentItem } from '@/lib/types/posts';

interface QuickSchedulePopoverProps {
	item: ContentItem;
	isOpen: boolean;
	onOpenChange: (open: boolean) => void;
	onScheduleComplete: () => void;
	children: ReactNode;
}

export function QuickSchedulePopover({
	item,
	isOpen,
	onOpenChange,
	onScheduleComplete,
	children,
}: QuickSchedulePopoverProps) {
	const [scheduledTime, setScheduledTime] = useState(() => {
		// Default to next hour
		const now = new Date();
		now.setHours(now.getHours() + 1);
		now.setMinutes(0, 0, 0);
		return now;
	});
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [imageError, setImageError] = useState(false);
	const popoverRef = useRef<HTMLDivElement>(null);
	const triggerRef = useRef<HTMLDivElement>(null);

	// Close on outside click
	useEffect(() => {
		if (!isOpen) return;

		const handleClickOutside = (e: MouseEvent) => {
			const target = e.target as Node;
			if (
				popoverRef.current &&
				!popoverRef.current.contains(target) &&
				triggerRef.current &&
				!triggerRef.current.contains(target)
			) {
				onOpenChange(false);
			}
		};

		document.addEventListener('mousedown', handleClickOutside);
		return () => document.removeEventListener('mousedown', handleClickOutside);
	}, [isOpen, onOpenChange]);

	// Close on escape
	useEffect(() => {
		if (!isOpen) return;

		const handleEscape = (e: KeyboardEvent) => {
			if (e.key === 'Escape') {
				onOpenChange(false);
			}
		};

		document.addEventListener('keydown', handleEscape);
		return () => document.removeEventListener('keydown', handleEscape);
	}, [isOpen, onOpenChange]);

	const handleSchedule = async () => {
		setIsSubmitting(true);

		try {
			const response = await fetch(`/api/content/${item.id}/schedule`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					scheduledTime: scheduledTime.getTime(),
				}),
			});

			if (response.ok) {
				toast.success(`Scheduled for ${format(scheduledTime, 'MMM d, h:mm a')}`);
				onOpenChange(false);
				onScheduleComplete();
			} else {
				const errorData = await response.json();
				toast.error(errorData.error || 'Failed to schedule');
			}
		} catch (err) {
			console.error('Failed to schedule:', err);
			toast.error('Failed to schedule item');
		} finally {
			setIsSubmitting(false);
		}
	};

	const title = item.title || item.caption?.slice(0, 30) || 'Untitled';

	return (
		<div className="relative">
			<div ref={triggerRef}>{children}</div>

			{isOpen && (
				<div
					ref={popoverRef}
					className="fixed inset-x-4 bottom-4 z-[60] w-auto rounded-xl border border-gray-200 bg-white p-4 shadow-xl dark:border-slate-700 dark:bg-slate-900 sm:absolute sm:inset-auto sm:left-0 sm:top-full sm:z-50 sm:mt-2 sm:w-72"
				>
					{/* Header with thumbnail */}
					<div className="mb-4 flex gap-3">
						{/* Thumbnail 64x114 (9:16 aspect) */}
						<div className="relative h-[114px] w-16 flex-shrink-0 overflow-hidden rounded-lg bg-black">
							{!imageError ? (
								<img
									src={item.mediaUrl}
									alt={title}
									className="h-full w-full object-contain"
									onError={() => setImageError(true)}
								/>
							) : (
								<div className="flex h-full w-full items-center justify-center bg-gray-200 dark:bg-slate-800">
									<span className="text-[8px] text-gray-500 dark:text-slate-500">
										No preview
									</span>
								</div>
							)}
						</div>

						{/* Content info */}
						<div className="flex flex-1 flex-col justify-center">
							<p className="mb-1 line-clamp-2 text-sm font-bold text-gray-900 dark:text-white">
								{title}
							</p>
							<p className="text-xs text-gray-500 dark:text-slate-400">
								Quick schedule
							</p>
						</div>
					</div>

					{/* Date Time Picker */}
					<div className="mb-4">
						<label className="mb-2 block text-xs font-bold uppercase text-gray-500 dark:text-slate-400">
							Schedule for
						</label>
						<DateTimePicker
							value={scheduledTime}
							onChange={setScheduledTime}
							minDate={new Date()}
							hideQuickPicks
						/>
					</div>

					{/* Actions */}
					<div className="flex gap-2">
						<button
							type="button"
							onClick={() => onOpenChange(false)}
							disabled={isSubmitting}
							className="flex-1 rounded-lg border border-gray-200 px-4 py-2 text-xs font-bold text-gray-700 transition hover:bg-gray-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
						>
							Cancel
						</button>
						<button
							type="button"
							onClick={handleSchedule}
							disabled={isSubmitting}
							className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-[#2b6cee] px-4 py-2 text-xs font-bold text-white transition hover:bg-[#2456c4] disabled:opacity-50"
						>
							{isSubmitting ? (
								<>
									<Loader2 className="h-3 w-3 animate-spin" />
									Scheduling...
								</>
							) : (
								<>
									<Calendar className="h-3 w-3" />
									Schedule
								</>
							)}
						</button>
					</div>
				</div>
			)}
		</div>
	);
}
