'use client';

import { CalendarDays } from 'lucide-react';

interface TimelineEmptyStateProps {
	onScheduleClick?: () => void;
}

export function TimelineEmptyState({ onScheduleClick }: TimelineEmptyStateProps) {
	return (
		<div
			data-testid="timeline-empty-state"
			className="flex flex-col items-center justify-center py-12 px-6 text-center"
		>
			{/* Icon */}
			<div className="w-14 h-14 mb-4 rounded-2xl bg-[#2b6cee]/10 flex items-center justify-center">
				<CalendarDays className="w-7 h-7 text-[#2b6cee]" />
			</div>

			{/* Heading */}
			<h3 className="text-base font-bold text-white mb-2">
				No posts scheduled yet
			</h3>

			{/* Subtext */}
			<p className="text-slate-400 max-w-sm mb-5 text-sm leading-relaxed">
				Your scheduled Instagram stories will appear here
			</p>

			{/* CTA Button */}
			{onScheduleClick && (
				<button
					data-testid="schedule-first-story-button"
					onClick={onScheduleClick}
					className="px-5 py-2.5 bg-[#2b6cee] text-white font-semibold rounded-xl hover:bg-[#2557c9] active:bg-[#1e47a8] transition-all duration-200 shadow-lg min-h-[44px]"
				>
					Schedule your first story
				</button>
			)}
		</div>
	);
}
