'use client';

import {
	Archive,
	Send,
	CheckCircle,
	Inbox,
	TrendingUp,
	TrendingDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface KpiDelta {
	value: number;
	change: number | null;
}

interface AnalyticsKPIRowProps {
	archived: KpiDelta;
	drafted: KpiDelta;
	publishRate: KpiDelta;
	inboxToday: { used: number; cap: number };
}

interface KpiCardProps {
	label: string;
	value: string;
	hint: string;
	change?: number | null;
	icon: React.ReactNode;
}

function KpiCard({ label, value, hint, change, icon }: KpiCardProps) {
	const isPositive = change != null && change > 0;
	const isNegative = change != null && change < 0;

	return (
		<div className="flex flex-col gap-2 rounded-xl border border-[#2a3649] bg-[#1a2332] p-5">
			<div className="flex items-center justify-between">
				<span className="text-xs font-medium uppercase tracking-wider text-[#92a4c9]">
					{label}
				</span>
				<div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#2b6cee]/10 text-[#2b6cee]">
					{icon}
				</div>
			</div>

			<div className="flex items-end justify-between gap-2">
				<span className="text-2xl font-bold text-white">{value}</span>
				{change != null && (
					<div
						className={cn(
							'flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium',
							isPositive && 'bg-emerald-400/10 text-emerald-400',
							isNegative && 'bg-red-400/10 text-red-400',
							!isPositive && !isNegative && 'bg-[#2a3649] text-[#92a4c9]',
						)}
					>
						{isPositive && <TrendingUp className="h-3 w-3" />}
						{isNegative && <TrendingDown className="h-3 w-3" />}
						<span>
							{isPositive && '+'}
							{change}%
						</span>
					</div>
				)}
			</div>

			<span className="text-[11px] text-[#92a4c9]">{hint}</span>
		</div>
	);
}

export function AnalyticsKPIRow({
	archived,
	drafted,
	publishRate,
	inboxToday,
}: AnalyticsKPIRowProps) {
	const inboxFull = inboxToday.used >= inboxToday.cap;

	return (
		<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
			<KpiCard
				label="Stories archived"
				value={archived.value.toString()}
				change={archived.change}
				hint="IG stories pulled into the archive over this range"
				icon={<Archive className="h-4 w-4" />}
			/>
			<KpiCard
				label="Drafted to TT"
				value={drafted.value.toString()}
				change={drafted.change}
				hint="Compositions uploaded to the TikTok inbox over this range"
				icon={<Send className="h-4 w-4" />}
			/>
			<KpiCard
				label="Publish rate"
				value={drafted.value === 0 ? '—' : `${publishRate.value}%`}
				change={drafted.value === 0 ? null : publishRate.change}
				hint="Drafts that reached SEND_TO_USER_INBOX vs failed"
				icon={<CheckCircle className="h-4 w-4" />}
			/>
			<KpiCard
				label="Inbox today"
				value={`${inboxToday.used} / ${inboxToday.cap}`}
				hint={inboxFull ? "TikTok's daily inbox cap reached" : 'TikTok pending-uploads cap'}
				icon={<Inbox className="h-4 w-4" />}
			/>
		</div>
	);
}
