'use client';

import { Clock, CheckCircle, Calendar, Send } from 'lucide-react';
import { SfStatsCard, SfStatsCardSkeleton } from '@/app/components/storyflow';

interface SubmissionStatsProps {
	pending: number;
	approved: number;
	scheduled: number;
	published: number;
	isLoading?: boolean;
}

/**
 * Stats cards showing submission counts by status.
 * Uses the StoryFlow design system with light/dark theme support.
 */
export function SubmissionStats({
	pending,
	approved,
	scheduled,
	published,
	isLoading,
}: SubmissionStatsProps) {
	if (isLoading) {
		return (
			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
				<SfStatsCardSkeleton />
				<SfStatsCardSkeleton />
				<SfStatsCardSkeleton />
				<SfStatsCardSkeleton />
			</div>
		);
	}

	return (
		<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
			<SfStatsCard
				label="Pending"
				value={pending}
				icon={<Clock className="h-5 w-5" />}
				iconBgColor="bg-yellow-500/10 dark:bg-yellow-500/20"
				iconColor="text-yellow-600 dark:text-yellow-500"
				className="hover:border-yellow-500/50 transition-colors"
			/>
			<SfStatsCard
				label="Approved"
				value={approved}
				icon={<CheckCircle className="h-5 w-5" />}
				iconBgColor="bg-emerald-500/10 dark:bg-emerald-500/20"
				iconColor="text-emerald-600 dark:text-emerald-500"
				className="hover:border-emerald-500/50 transition-colors"
			/>
			<SfStatsCard
				label="Scheduled"
				value={scheduled}
				icon={<Calendar className="h-5 w-5" />}
				iconBgColor="bg-[var(--sf-primary)]/10 dark:bg-[var(--sf-primary)]/20"
				iconColor="text-[var(--sf-primary)]"
				className="hover:border-[var(--sf-primary)]/50 transition-colors"
			/>
			<SfStatsCard
				label="Published"
				value={published}
				icon={<Send className="h-5 w-5" />}
				iconBgColor="bg-purple-500/10 dark:bg-purple-500/20"
				iconColor="text-purple-600 dark:text-purple-500"
				className="hover:border-purple-500/50 transition-colors"
			/>
		</div>
	);
}
