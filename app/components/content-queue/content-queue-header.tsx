'use client';

/**
 * Content Queue Header Component
 * Displays 4 stat cards: Pending Review, Ready to Publish, Published Today, Rejected
 */

import { LucideIcon, Clock, CheckCircle, Send, XCircle, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface StatCardProps {
	label: string;
	value: number;
	icon: LucideIcon;
	iconColor: string;
	iconBgColor: string;
	trend?: {
		value: number | string;
		label: string;
		isPositive?: boolean;
		isNeutral?: boolean;
	};
}

function StatCard({ label, value, icon: Icon, iconColor, iconBgColor, trend }: StatCardProps) {
	return (
		<div className="relative overflow-hidden rounded-xl border border-[#2a3649] bg-[#1a2332] p-5">
			<div className="flex items-start justify-between">
				<div>
					<p className="text-sm font-medium text-[#92a4c9]">{label}</p>
					<h3 className="mt-2 text-3xl font-bold text-white">{value}</h3>
				</div>
				<div className={`rounded-lg p-2 ${iconBgColor}`}>
					<Icon className={`h-6 w-6 ${iconColor}`} />
				</div>
			</div>
			{trend && (
				<div className="mt-4 flex items-center text-xs text-[#92a4c9]">
					<span className={`flex items-center gap-1 font-medium ${
						trend.isNeutral
							? 'text-slate-400'
							: trend.isPositive
								? 'text-emerald-500'
								: 'text-red-400'
					}`}>
						{trend.isNeutral ? (
							<Minus className="h-4 w-4" />
						) : trend.isPositive ? (
							<TrendingUp className="h-4 w-4" />
						) : (
							<TrendingDown className="h-4 w-4" />
						)}
						{trend.value}
					</span>
					<span className="ml-2">{trend.label}</span>
				</div>
			)}
		</div>
	);
}

export interface ContentQueueStats {
	pendingReview: number;
	readyToPublish: number;
	publishedToday: number;
	rejected: number;
	trends?: {
		pendingChange?: number;
		completionRate?: number;
		publishedVsAvg?: number;
		rejectedChange?: number;
	};
}

interface ContentQueueHeaderProps {
	stats: ContentQueueStats;
	isLoading?: boolean;
}

export function ContentQueueHeader({ stats, isLoading }: ContentQueueHeaderProps) {
	if (isLoading) {
		return (
			<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
				{[1, 2, 3, 4].map((i) => (
					<div key={i} className="relative overflow-hidden rounded-xl border border-[#2a3649] bg-[#1a2332] p-5 animate-pulse">
						<div className="flex items-start justify-between">
							<div className="space-y-2">
								<div className="h-4 w-24 bg-[#2a3649] rounded" />
								<div className="h-8 w-16 bg-[#2a3649] rounded" />
							</div>
							<div className="h-10 w-10 bg-[#2a3649] rounded-lg" />
						</div>
						<div className="mt-4 h-4 w-32 bg-[#2a3649] rounded" />
					</div>
				))}
			</div>
		);
	}

	const { trends } = stats;

	return (
		<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
			<StatCard
				label="Pending Review"
				value={stats.pendingReview}
				icon={Clock}
				iconColor="text-yellow-500"
				iconBgColor="bg-yellow-500/10"
				trend={trends?.pendingChange !== undefined ? {
					value: `${trends.pendingChange > 0 ? '+' : ''}${trends.pendingChange}`,
					label: 'since yesterday',
					isPositive: trends.pendingChange > 0,
					isNeutral: trends.pendingChange === 0,
				} : undefined}
			/>
			<StatCard
				label="Ready to Publish"
				value={stats.readyToPublish}
				icon={CheckCircle}
				iconColor="text-emerald-500"
				iconBgColor="bg-emerald-500/10"
				trend={trends?.completionRate !== undefined ? {
					value: `+${trends.completionRate}%`,
					label: 'completion rate',
					isPositive: true,
				} : undefined}
			/>
			<StatCard
				label="Published Today"
				value={stats.publishedToday}
				icon={Send}
				iconColor="text-blue-500"
				iconBgColor="bg-blue-500/10"
				trend={trends?.publishedVsAvg !== undefined ? {
					value: `${trends.publishedVsAvg}%`,
					label: 'vs average',
					isNeutral: trends.publishedVsAvg === 0,
					isPositive: trends.publishedVsAvg > 0,
				} : undefined}
			/>
			<StatCard
				label="Rejected"
				value={stats.rejected}
				icon={XCircle}
				iconColor="text-red-500"
				iconBgColor="bg-red-500/10"
				trend={trends?.rejectedChange !== undefined ? {
					value: trends.rejectedChange,
					label: 'quality issues',
					isPositive: trends.rejectedChange < 0,
					isNeutral: trends.rejectedChange === 0,
				} : undefined}
			/>
		</div>
	);
}
