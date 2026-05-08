'use client';

import { Archive, Send, Inbox, AlertCircle } from 'lucide-react';
import { Card, CardContent } from '@/app/components/ui/card';
import { Skeleton } from '@/app/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface FunnelStats {
	archived24h: number;
	published24h: number;
	failedComposing: number;
	failedPublishing: number;
}

interface FunnelKpisProps {
	stats: FunnelStats | undefined;
	isLoading?: boolean;
}

const TT_INBOX_DAILY_CAP = 5;

export function FunnelKpis({ stats, isLoading }: FunnelKpisProps) {
	const draftsSent = stats?.published24h ?? 0;
	const failed = (stats?.failedComposing ?? 0) + (stats?.failedPublishing ?? 0);
	const slotsUsed = Math.min(draftsSent, TT_INBOX_DAILY_CAP);

	const items = [
		{
			label: 'Archived 24h',
			value: stats?.archived24h ?? 0,
			icon: Archive,
			tone: 'text-sky-600 bg-sky-100 dark:bg-sky-950',
			hint: 'New IG stories pulled in',
		},
		{
			label: 'Drafts → TT',
			value: draftsSent,
			icon: Send,
			tone: 'text-purple-600 bg-purple-100 dark:bg-purple-950',
			hint: 'Last 24h sent to TikTok inbox',
		},
		{
			label: 'Inbox slots',
			value: `${slotsUsed} / ${TT_INBOX_DAILY_CAP}`,
			icon: Inbox,
			tone:
				slotsUsed >= TT_INBOX_DAILY_CAP
					? 'text-amber-600 bg-amber-100 dark:bg-amber-950'
					: 'text-emerald-600 bg-emerald-100 dark:bg-emerald-950',
			hint: 'TikTok pending-uploads cap',
		},
		{
			label: 'Failed',
			value: failed,
			icon: AlertCircle,
			tone:
				failed > 0
					? 'text-red-600 bg-red-100 dark:bg-red-950'
					: 'text-muted-foreground bg-muted',
			hint: 'Compose or publish errors',
		},
	];

	if (isLoading) {
		return (
			<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
				{Array.from({ length: 4 }).map((_, i) => (
					<Skeleton key={i} className="h-[88px] rounded-lg" />
				))}
			</div>
		);
	}

	return (
		<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
			{items.map((item) => {
				const Icon = item.icon;
				return (
					<Card key={item.label} className="overflow-hidden">
						<CardContent className="flex items-center gap-3 p-4">
							<div
								className={cn(
									'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg',
									item.tone,
								)}
							>
								<Icon className="h-5 w-5" />
							</div>
							<div className="min-w-0 flex-1">
								<div className="text-xs font-medium text-muted-foreground">
									{item.label}
								</div>
								<div className="text-2xl font-bold leading-tight">{item.value}</div>
								<div className="truncate text-[11px] text-muted-foreground/80">
									{item.hint}
								</div>
							</div>
						</CardContent>
					</Card>
				);
			})}
		</div>
	);
}
