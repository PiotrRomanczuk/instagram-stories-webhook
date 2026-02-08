'use client';

import useSWR from 'swr';
import { CheckCircle2, XCircle, Clock } from 'lucide-react';
import { Panel } from '@/app/components/ui/panel';
import { Skeleton } from '@/app/components/ui/skeleton';
import { Card } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';

interface CronJob {
	name: string;
	schedule: string;
	lastRun: string | null;
	lastRunRelative: string;
	lastStatus: 'success' | 'error' | 'unknown';
	lastMessage: string;
	nextExpectedRun: string;
	nextRunCountdown: string;
}

interface StatusData {
	jobs: CronJob[];
	timestamp: string;
}

const fetcher = async (url: string) => {
	const res = await fetch(url);
	if (!res.ok) throw new Error('Failed to fetch cron status');
	return res.json();
};

export function CronStatusPanel() {
	const { data, isLoading, error } = useSWR<StatusData>(
		'/api/developer/cron-debug/status',
		fetcher,
		{ refreshInterval: 10000, revalidateOnFocus: true },
	);

	if (error) {
		return (
			<Panel title="Cron Jobs" icon={<Clock className="w-6 h-6" />}>
				<div className="text-center py-4 text-red-600">
					Failed to load cron status
				</div>
			</Panel>
		);
	}

	if (isLoading || !data) {
		return (
			<Panel title="Cron Jobs" icon={<Clock className="w-6 h-6" />}>
				<div className="space-y-4">
					{[1, 2, 3].map((i) => (
						<Skeleton key={i} className="h-24 w-full rounded-lg" />
					))}
				</div>
			</Panel>
		);
	}

	return (
		<Panel title="Cron Jobs" icon={<Clock className="w-6 h-6" />}>
			<div className="space-y-4">
				{data.jobs.map((job) => (
					<Card
						key={job.name}
						className="p-4 hover:border-slate-300 transition-colors"
					>
						<div className="flex items-start justify-between mb-2">
							<div>
								<h3 className="font-bold text-slate-900 capitalize">
									{job.name.replace(/-/g, ' ')}
								</h3>
								<p className="text-xs text-slate-500 mt-1">
									Schedule: <code className="font-mono">{job.schedule}</code>
								</p>
							</div>
							<Badge
								variant="outline"
								className={
									job.lastStatus === 'success'
										? 'bg-emerald-100 text-emerald-700 border-emerald-200'
										: job.lastStatus === 'error'
											? 'bg-rose-100 text-rose-700 border-rose-200'
											: 'bg-slate-100 text-slate-700 border-slate-200'
								}
							>
								{job.lastStatus === 'success' ? (
									<CheckCircle2 className="w-3 h-3 mr-1" />
								) : job.lastStatus === 'error' ? (
									<XCircle className="w-3 h-3 mr-1" />
								) : (
									<Clock className="w-3 h-3 mr-1" />
								)}
								{job.lastStatus}
							</Badge>
						</div>

						<div className="grid grid-cols-2 gap-4 text-sm">
							<div>
								<div className="text-xs font-bold text-slate-500 uppercase mb-1">
									Last Run
								</div>
								<div className="text-slate-900">
									{job.lastRun ? (
										<>
											<div className="font-semibold">{job.lastRunRelative}</div>
											<div className="text-xs text-slate-600">
												{new Date(job.lastRun).toLocaleTimeString()}
											</div>
										</>
									) : (
										<span className="text-slate-500 italic">Never</span>
									)}
								</div>
							</div>
							<div>
								<div className="text-xs font-bold text-slate-500 uppercase mb-1">
									Next Run
								</div>
								<div className="text-slate-900">
									<div className="font-semibold">{job.nextRunCountdown}</div>
									<div className="text-xs text-slate-600">
										{new Date(job.nextExpectedRun).toLocaleTimeString()}
									</div>
								</div>
							</div>
						</div>

						{job.lastMessage && (
							<div className="mt-3 pt-3 border-t border-slate-200">
								<p className="text-xs text-slate-600 truncate">
									<span className="font-semibold">Message:</span> {job.lastMessage}
								</p>
							</div>
						)}
					</Card>
				))}
			</div>
		</Panel>
	);
}
