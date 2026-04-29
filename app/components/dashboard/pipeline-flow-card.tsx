'use client';

import { ArrowRight, Archive, Film, Music, Send, Rocket } from 'lucide-react';
import { Link } from '@/i18n/routing';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Skeleton } from '@/app/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface PipelineFlowProps {
	stats:
		| {
				archived24h: number;
				composing: number;
				awaitingPublish: number;
				published24h: number;
				activeAudioTracks: number;
		  }
		| undefined;
	isLoading?: boolean;
}

interface Stage {
	id: string;
	label: string;
	sub: string;
	count: number;
	icon: React.ComponentType<{ className?: string }>;
	tone: 'blue' | 'purple' | 'amber' | 'emerald';
	href?: string;
}

const TONE_STYLES: Record<Stage['tone'], { ring: string; icon: string; pulse: string }> = {
	blue: { ring: 'ring-blue-200', icon: 'bg-blue-100 text-blue-700', pulse: 'bg-blue-500' },
	purple: { ring: 'ring-purple-200', icon: 'bg-purple-100 text-purple-700', pulse: 'bg-purple-500' },
	amber: { ring: 'ring-amber-200', icon: 'bg-amber-100 text-amber-700', pulse: 'bg-amber-500' },
	emerald: {
		ring: 'ring-emerald-200',
		icon: 'bg-emerald-100 text-emerald-700',
		pulse: 'bg-emerald-500',
	},
};

export function PipelineFlowCard({ stats, isLoading }: PipelineFlowProps) {
	const stages: Stage[] = [
		{
			id: 'archive',
			label: 'Archive',
			sub: 'Last 24h',
			count: stats?.archived24h ?? 0,
			icon: Archive,
			tone: 'blue',
			href: '/story-archive',
		},
		{
			id: 'compose',
			label: 'Compose',
			sub: 'In queue',
			count: stats?.composing ?? 0,
			icon: Film,
			tone: 'purple',
			href: '/compositions',
		},
		{
			id: 'publish',
			label: 'Publish',
			sub: 'Awaiting',
			count: stats?.awaitingPublish ?? 0,
			icon: Send,
			tone: 'amber',
			href: '/compositions?status=pending-publish',
		},
		{
			id: 'live',
			label: 'Live',
			sub: 'Posted 24h',
			count: stats?.published24h ?? 0,
			icon: Rocket,
			tone: 'emerald',
			href: '/posted-tiktok',
		},
	];

	const audio = stats?.activeAudioTracks ?? 0;

	return (
		<Card>
			<CardHeader className="pb-3">
				<div className="flex items-center justify-between">
					<CardTitle className="text-base">Pipeline flow</CardTitle>
					<Badge variant="outline" className="gap-1.5">
						<Music className="h-3 w-3" />
						{audio} audio {audio === 1 ? 'track' : 'tracks'} active
					</Badge>
				</div>
			</CardHeader>
			<CardContent className="pt-1">
				{isLoading ? (
					<div className="flex items-center gap-2">
						{Array.from({ length: 4 }).map((_, i) => (
							<Skeleton key={i} className="h-20 flex-1 rounded-xl" />
						))}
					</div>
				) : (
					<div className="flex items-stretch gap-1 sm:gap-2 overflow-x-auto">
						{stages.map((stage, idx) => {
							const Icon = stage.icon;
							const tone = TONE_STYLES[stage.tone];
							const active = stage.count > 0;
							const tileClass = cn(
								'flex flex-1 flex-col items-center gap-1 rounded-xl border bg-card px-2 py-3 sm:px-3 sm:py-4 transition-all min-w-0',
								active && `ring-2 ${tone.ring}`,
								stage.href && 'hover:bg-muted/50 cursor-pointer',
							);
							const tileContent = (
								<>
									<div className={cn('relative rounded-lg p-1.5 sm:p-2', tone.icon)}>
											<Icon className="h-4 w-4 sm:h-5 sm:w-5" />
											{active && (
												<span className="absolute -right-0.5 -top-0.5 flex h-2.5 w-2.5">
													<span
														className={cn(
															'absolute inline-flex h-full w-full animate-ping rounded-full opacity-75',
															tone.pulse,
														)}
													/>
													<span
														className={cn(
															'relative inline-flex h-2.5 w-2.5 rounded-full',
															tone.pulse,
														)}
													/>
												</span>
											)}
										</div>
									<div className="text-2xl font-bold leading-none tracking-tight">
										{stage.count}
									</div>
									<div className="text-center">
										<div className="text-xs font-semibold leading-tight">{stage.label}</div>
										<div className="text-[10px] text-muted-foreground leading-tight">
											{stage.sub}
										</div>
									</div>
								</>
							);
							return (
								<div key={stage.id} className="flex flex-1 items-center gap-1 sm:gap-2 min-w-0">
									{stage.href ? (
										<Link href={stage.href} className={tileClass}>
											{tileContent}
										</Link>
									) : (
										<div className={tileClass}>{tileContent}</div>
									)}
									{idx < stages.length - 1 && (
										<ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground/50" />
									)}
								</div>
							);
						})}
					</div>
				)}
			</CardContent>
		</Card>
	);
}
