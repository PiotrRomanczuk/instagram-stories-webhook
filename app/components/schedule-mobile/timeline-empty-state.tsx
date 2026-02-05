'use client';

import { CalendarDays } from 'lucide-react';

interface TimelineEmptyStateProps {
	onScheduleClick?: () => void;
}

export function TimelineEmptyState({ onScheduleClick }: TimelineEmptyStateProps) {
	return (
		<div
			data-testid="timeline-empty-state"
			className="flex flex-col items-center justify-center py-20 px-6 text-center"
		>
			{/* Icon */}
			<div className="w-20 h-20 mb-6 rounded-2xl bg-[#2b6cee]/10 flex items-center justify-center">
				<CalendarDays className="w-10 h-10 text-[#2b6cee]" />
			</div>

			{/* Heading */}
			<h3 className="text-xl font-bold text-white mb-3">
				No posts scheduled yet
			</h3>

			{/* Subtext */}
			<p className="text-slate-400 max-w-sm mb-8 text-sm leading-relaxed">
				Your scheduled Instagram stories will appear here
			</p>

			{/* CTA Button */}
			{onScheduleClick && (
				<button
					data-testid="schedule-first-story-button"
					onClick={onScheduleClick}
					className="px-6 py-3 bg-[#2b6cee] text-white font-semibold rounded-xl hover:bg-[#2557c9] active:bg-[#1e47a8] transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
				>
					Schedule your first story
				</button>
			)}
		</div>
	);
}
