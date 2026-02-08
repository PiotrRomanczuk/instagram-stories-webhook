'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { FileText, ChevronDown } from 'lucide-react';
import { Panel } from '@/app/components/ui/panel';
import { Tabs, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/app/components/ui/select';
import { Skeleton } from '@/app/components/ui/skeleton';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/app/components/ui/collapsible';
import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';

interface SystemLog {
	id: string;
	level: string;
	module: string;
	message: string;
	details: unknown;
	created_at: string;
}

interface PublishingLog {
	id: string;
	status: string;
	ig_media_id: string | null;
	error_message: string | null;
	created_at: string;
	user_id: string;
	media_type: string;
	post_type: string;
}

interface LogsData {
	logs: SystemLog[] | PublishingLog[];
	total: number;
	type: string;
}

const fetcher = async (url: string) => {
	const res = await fetch(url);
	if (!res.ok) throw new Error('Failed to fetch logs');
	return res.json();
};

export function LogsViewer() {
	const [logType, setLogType] = useState<'system' | 'publishing'>('system');
	const [hours, setHours] = useState('1');
	const [offset, setOffset] = useState(0);

	const url =
		logType === 'system'
			? `/api/developer/cron-debug/logs?type=system&module=cron&hours=${hours}&limit=50&offset=${offset}`
			: `/api/developer/cron-debug/logs?type=publishing&hours=${hours}&limit=50&offset=${offset}`;

	const { data, isLoading, error, mutate } = useSWR<LogsData>(url, fetcher, {
		refreshInterval: 10000,
		revalidateOnFocus: true,
	});

	const [expandedId, setExpandedId] = useState<string | null>(null);

	const handlePrevious = () => {
		setOffset(Math.max(0, offset - 50));
		mutate();
	};

	const handleNext = () => {
		if (data && offset + 50 < data.total) {
			setOffset(offset + 50);
			mutate();
		}
	};

	if (error) {
		return (
			<Panel
				title="Recent Logs"
				icon={<FileText className="w-6 h-6" />}
			>
				<div className="text-center py-4 text-red-600">
					Failed to load logs
				</div>
			</Panel>
		);
	}

	return (
		<Panel title="Recent Logs" icon={<FileText className="w-6 h-6" />}>
			<div className="mb-4 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
				<Tabs
					value={logType}
					onValueChange={(value) => {
						setLogType(value as 'system' | 'publishing');
						setOffset(0);
					}}
				>
					<TabsList>
						<TabsTrigger value="system">System Logs</TabsTrigger>
						<TabsTrigger value="publishing">Publishing Logs</TabsTrigger>
					</TabsList>
				</Tabs>

				<Select
					value={hours}
					onValueChange={(value) => {
						setHours(value);
						setOffset(0);
						mutate();
					}}
				>
					<SelectTrigger className="w-[160px]">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="1">Last 1 hour</SelectItem>
						<SelectItem value="6">Last 6 hours</SelectItem>
						<SelectItem value="24">Last 24 hours</SelectItem>
					</SelectContent>
				</Select>
			</div>

			{isLoading || !data ? (
				<div className="space-y-2">
					{[1, 2, 3].map((i) => (
						<Skeleton key={i} className="h-12 w-full rounded-lg" />
					))}
				</div>
			) : data.logs.length === 0 ? (
				<div className="text-center py-8 text-slate-600">
					<p className="font-semibold">No logs found</p>
					<p className="text-sm text-slate-500 mt-1">
						Try adjusting the time range or filters.
					</p>
				</div>
			) : (
				<div>
					<div className="space-y-2 mb-4">
						{data.logs.map((log) => {
							const isSystemLog = 'level' in log;
							const id = log.id;
							const isExpanded = expandedId === id;

							return (
								<Collapsible
									key={id}
									open={isExpanded}
									onOpenChange={(open) =>
										setExpandedId(open ? id : null)
									}
								>
									<div className="border border-slate-200 rounded-lg overflow-hidden">
										<CollapsibleTrigger asChild>
											<button
												className="w-full p-3 hover:bg-slate-50 transition flex items-start gap-3 text-left"
											>
												<ChevronDown
													className={`w-4 h-4 mt-1 flex-shrink-0 transition ${
														isExpanded
															? 'rotate-180'
															: ''
													}`}
												/>
												<div className="flex-1 min-w-0">
													{isSystemLog ? (
														<>
															<div className="flex items-center gap-2 mb-1">
																<Badge
																	variant="outline"
																	className={
																		(log as SystemLog)
																			.level ===
																		'error'
																			? 'bg-rose-100 text-rose-700 border-rose-200'
																			: (log as SystemLog)
																					.level ===
																				  'warn'
																			? 'bg-amber-100 text-amber-700 border-amber-200'
																			: 'bg-emerald-100 text-emerald-700 border-emerald-200'
																	}
																>
																	{(
																		log as SystemLog
																	).level.toUpperCase()}
																</Badge>
																<span className="text-xs text-slate-600">
																	{(
																		log as SystemLog
																	).module}
																</span>
																<span className="text-xs text-slate-500">
																	{new Date(
																		(log as SystemLog)
																			.created_at,
																	).toLocaleTimeString()}
																</span>
															</div>
															<p className="text-sm text-slate-900 line-clamp-2">
																{(log as SystemLog).message}
															</p>
														</>
													) : (
														<>
															<div className="flex items-center gap-2 mb-1">
																<Badge
																	variant="outline"
																	className={
																		(log as PublishingLog)
																			.status ===
																		'SUCCESS'
																			? 'bg-emerald-100 text-emerald-700 border-emerald-200'
																			: 'bg-rose-100 text-rose-700 border-rose-200'
																	}
																>
																	{(log as PublishingLog).status}
																</Badge>
																<span className="text-xs text-slate-600">
																	{(log as PublishingLog)
																		.post_type}
																</span>
																<span className="text-xs text-slate-500">
																	{new Date(
																		(log as PublishingLog)
																			.created_at,
																	).toLocaleTimeString()}
																</span>
															</div>
															<p className="text-sm text-slate-900">
																{(log as PublishingLog)
																	.error_message ||
																	`Published successfully`}
															</p>
														</>
													)}
												</div>
											</button>
										</CollapsibleTrigger>

										<CollapsibleContent>
											<div className="p-3 bg-slate-50 border-t border-slate-200">
												<pre className="text-xs text-slate-700 overflow-auto max-h-48 font-mono whitespace-pre-wrap break-words">
													{isSystemLog
														? JSON.stringify(
																(log as SystemLog)
																	.details,
																null,
																2,
															)
														: JSON.stringify(log, null, 2)}
												</pre>
											</div>
										</CollapsibleContent>
									</div>
								</Collapsible>
							);
						})}
					</div>

					{/* Pagination */}
					<div className="flex items-center justify-between pt-4 border-t border-slate-200">
						<div className="text-sm text-slate-600">
							Showing {offset + 1}-
							{Math.min(offset + 50, data.total)} of {data.total}
						</div>
						<div className="flex gap-2">
							<Button
								onClick={handlePrevious}
								disabled={offset === 0}
								variant="outline"
								size="sm"
							>
								Previous
							</Button>
							<Button
								onClick={handleNext}
								disabled={
									!data ||
									offset + 50 >= data.total
								}
								variant="outline"
								size="sm"
							>
								Next
							</Button>
						</div>
					</div>
				</div>
			)}
		</Panel>
	);
}
