'use client';

import { ChevronLeft, ChevronRight, Zap } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { format, addWeeks, subWeeks, startOfWeek, endOfWeek } from 'date-fns';

type ViewMode = 'weekly' | 'daily';

interface CalendarHeaderProps {
	currentDate: Date;
	viewMode: ViewMode;
	onDateChange: (date: Date) => void;
	onViewModeChange: (mode: ViewMode) => void;
	onAutoSchedule?: () => void;
	hasChanges?: boolean;
}

export function CalendarHeader({
	currentDate,
	viewMode,
	onDateChange,
	onViewModeChange,
	onAutoSchedule,
}: CalendarHeaderProps) {
	const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
	const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });

	const dateRangeText =
		viewMode === 'weekly'
			? `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d, yyyy')}`
			: format(currentDate, 'MMMM d, yyyy');

	const handlePrevious = () => {
		onDateChange(subWeeks(currentDate, 1));
	};

	const handleNext = () => {
		onDateChange(addWeeks(currentDate, 1));
	};

	return (
		<header className="shrink-0 border-b border-[#2a3649] bg-[#0d1421]">
			<div className="flex flex-col gap-4 px-6 py-4">
				<div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
					<div className="flex items-center gap-4">
						<h2 className="text-xl font-bold text-white">Story Calendar</h2>
						<div className="mx-2 hidden h-6 w-px bg-[#2a3649] md:block" />
						<div className="flex items-center gap-2 rounded-lg bg-[#1a2332] p-1">
							<Button
								variant="ghost"
								size="sm"
								onClick={handlePrevious}
								className="h-8 w-8 p-0 text-[#92a4c9] hover:bg-[#2a3649] hover:text-white"
							>
								<ChevronLeft className="h-5 w-5" />
							</Button>
							<span className="min-w-[160px] px-2 text-center text-sm font-medium text-slate-200">
								{dateRangeText}
							</span>
							<Button
								variant="ghost"
								size="sm"
								onClick={handleNext}
								className="h-8 w-8 p-0 text-[#92a4c9] hover:bg-[#2a3649] hover:text-white"
							>
								<ChevronRight className="h-5 w-5" />
							</Button>
						</div>
					</div>

					<div className="flex items-center gap-3">
						<div className="flex rounded-lg bg-[#1a2332] p-1">
							<Button
								variant={viewMode === 'weekly' ? 'default' : 'ghost'}
								size="sm"
								onClick={() => onViewModeChange('weekly')}
								className={
									viewMode === 'weekly'
										? 'bg-[#2b6cee] text-white shadow-sm hover:bg-[#2b6cee]/90'
										: 'text-[#92a4c9] hover:bg-transparent hover:text-white'
								}
							>
								Weekly
							</Button>
							<Button
								variant={viewMode === 'daily' ? 'default' : 'ghost'}
								size="sm"
								onClick={() => onViewModeChange('daily')}
								className={
									viewMode === 'daily'
										? 'bg-[#2b6cee] text-white shadow-sm hover:bg-[#2b6cee]/90'
										: 'text-[#92a4c9] hover:bg-transparent hover:text-white'
								}
							>
								Daily
							</Button>
						</div>

						{onAutoSchedule && (
							<Button
								onClick={onAutoSchedule}
								className="gap-2 bg-[#2b6cee] shadow-lg shadow-[#2b6cee]/20 hover:bg-[#2b6cee]/90"
							>
								<Zap className="h-4 w-4" />
								Auto-Schedule
							</Button>
						)}
					</div>
				</div>
			</div>
		</header>
	);
}
