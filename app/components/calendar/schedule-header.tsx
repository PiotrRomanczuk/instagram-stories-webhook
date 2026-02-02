'use client';

/**
 * Schedule Header - Top navigation bar with date controls and actions
 */

import { ChevronLeft, ChevronRight, Search, Zap, Plus } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { format, addWeeks, subWeeks, addDays, subDays, startOfWeek, endOfWeek, addMonths, subMonths, startOfMonth, endOfMonth } from 'date-fns';

export type ViewMode = 'day' | 'week' | 'month';

interface ScheduleHeaderProps {
	currentDate: Date;
	viewMode: ViewMode;
	onDateChange: (date: Date) => void;
	onViewModeChange: (mode: ViewMode) => void;
	onPublishNow?: () => void;
	onNewSchedule?: () => void;
	searchQuery?: string;
	onSearchChange?: (query: string) => void;
}

export function ScheduleHeader({
	currentDate,
	viewMode,
	onDateChange,
	onViewModeChange,
	onPublishNow,
	onNewSchedule,
	searchQuery = '',
	onSearchChange,
}: ScheduleHeaderProps) {
	const getDateRangeText = () => {
		switch (viewMode) {
			case 'day':
				return format(currentDate, 'MMMM d, yyyy');
			case 'week': {
				const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
				const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
				if (weekStart.getMonth() === weekEnd.getMonth()) {
					return `${format(weekStart, 'MMMM d')} - ${format(weekEnd, 'd, yyyy')}`;
				}
				return `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d, yyyy')}`;
			}
			case 'month': {
				return format(currentDate, 'MMMM yyyy');
			}
		}
	};

	const handlePrevious = () => {
		switch (viewMode) {
			case 'day':
				onDateChange(subDays(currentDate, 1));
				break;
			case 'week':
				onDateChange(subWeeks(currentDate, 1));
				break;
			case 'month':
				onDateChange(subMonths(currentDate, 1));
				break;
		}
	};

	const handleNext = () => {
		switch (viewMode) {
			case 'day':
				onDateChange(addDays(currentDate, 1));
				break;
			case 'week':
				onDateChange(addWeeks(currentDate, 1));
				break;
			case 'month':
				onDateChange(addMonths(currentDate, 1));
				break;
		}
	};

	const handleToday = () => {
		onDateChange(new Date());
	};

	return (
		<header className="flex h-16 shrink-0 items-center justify-between border-b border-gray-200 bg-white px-6 dark:border-slate-800 dark:bg-[#101622]">
			{/* Left side: Date navigation */}
			<div className="flex items-center gap-6">
				<div className="flex items-center gap-2">
					<Button
						variant="ghost"
						size="icon"
						onClick={handlePrevious}
						className="h-8 w-8 text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
					>
						<ChevronLeft className="h-5 w-5" />
					</Button>
					<h2 className="min-w-[180px] text-center text-lg font-bold text-gray-900 dark:text-white">
						{getDateRangeText()}
					</h2>
					<Button
						variant="ghost"
						size="icon"
						onClick={handleNext}
						className="h-8 w-8 text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
					>
						<ChevronRight className="h-5 w-5" />
					</Button>
				</div>

				{/* View mode indicator - day only */}
				<div className="flex rounded-lg bg-gray-100 p-1 dark:bg-slate-800">
					<span className="rounded-md bg-white px-3 py-1 text-xs font-medium text-gray-900 shadow-sm dark:bg-slate-700 dark:text-white">
						Day
					</span>
				</div>

				<Button
					variant="ghost"
					size="sm"
					onClick={handleToday}
					className="text-xs text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
				>
					Today
				</Button>
			</div>

			{/* Right side: Search and actions */}
			<div className="flex items-center gap-4">
				{onSearchChange && (
					<div className="relative">
						<Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-slate-400" />
						<Input
							placeholder="Search events..."
							value={searchQuery}
							onChange={(e) => onSearchChange(e.target.value)}
							className="w-64 border-gray-200 bg-gray-50 pl-10 text-sm text-gray-900 placeholder:text-gray-400 focus-visible:ring-[#2b6cee] dark:border-none dark:bg-slate-800 dark:text-white dark:placeholder:text-slate-400"
						/>
					</div>
				)}

				{onPublishNow && (
					<Button
						onClick={onPublishNow}
						className="gap-2 bg-[#2b6cee] text-white hover:bg-[#2b6cee]/90"
					>
						<Zap className="h-4 w-4" />
						Publish Now
					</Button>
				)}

				{onNewSchedule && (
					<Button
						onClick={onNewSchedule}
						variant="outline"
						className="gap-2 border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700"
					>
						<Plus className="h-4 w-4" />
						New Schedule
					</Button>
				)}
			</div>
		</header>
	);
}
