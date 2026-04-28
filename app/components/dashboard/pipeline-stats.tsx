'use client';

import { Archive, Film, Send, Rocket } from 'lucide-react';
import { StatsCard, StatsCardSkeleton } from './stats-card';

interface PipelineStatsValue {
	archived24h: number;
	composing: number;
	awaitingPublish: number;
	published24h: number;
}

interface PipelineStatsProps {
	stats: PipelineStatsValue | undefined;
	isLoading?: boolean;
}

export function PipelineStats({ stats, isLoading }: PipelineStatsProps) {
	if (isLoading || !stats) {
		return (
			<div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
				{Array.from({ length: 4 }).map((_, i) => (
					<StatsCardSkeleton key={i} />
				))}
			</div>
		);
	}

	return (
		<div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
			<StatsCard
				label="Archived (24h)"
				value={stats.archived24h}
				icon={<Archive className="h-5 w-5 text-blue-600" />}
				iconBgColor="bg-blue-100"
				description="IG stories pulled in"
			/>
			<StatsCard
				label="Composing"
				value={stats.composing}
				icon={<Film className="h-5 w-5 text-purple-600" />}
				iconBgColor="bg-purple-100"
				className={stats.composing > 0 ? 'border-purple-200 bg-purple-50/40' : ''}
				description="Videos in FFmpeg queue"
			/>
			<StatsCard
				label="Awaiting Publish"
				value={stats.awaitingPublish}
				icon={<Send className="h-5 w-5 text-amber-600" />}
				iconBgColor="bg-amber-100"
				className={stats.awaitingPublish > 0 ? 'border-amber-200 bg-amber-50/40' : ''}
				description="Ready for TikTok"
			/>
			<StatsCard
				label="Published (24h)"
				value={stats.published24h}
				icon={<Rocket className="h-5 w-5 text-emerald-600" />}
				iconBgColor="bg-emerald-100"
				description="Live on TikTok"
			/>
		</div>
	);
}
