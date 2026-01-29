'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { FileText, ChevronDown } from 'lucide-react';
import { Panel } from '@/app/components/ui/panel';

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
				title="📋 Recent Logs"
				icon={<FileText className="w-6 h-6" />}
			>
				<div className="text-center py-4 text-red-600">
					Failed to load logs
				</div>
			</Panel>
		);
	}

	return (
		<Panel title="📋 Recent Logs" icon={<FileText className="w-6 h-6" />}>
			<div className="mb-4 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
				<div className="flex gap-3">
					<button
						onClick={() => {
							setLogType('system');
							setOffset(0);
						}}
						className={`px-4 py-2 rounded-lg font-bold text-sm transition ${
							logType === 'system'
								? 'bg-indigo-600 text-white'
								: 'bg-slate-200 text-slate-700 hover:bg-slate-300'
						}`}
					>
						System Logs
					</button>
					<button
						onClick={() => {
							setLogType('publishing');
							setOffset(0);
						}}
						className={`px-4 py-2 rounded-lg font-bold text-sm transition ${
							logType === 'publishing'
								? 'bg-indigo-600 text-white'
								: 'bg-slate-200 text-slate-700 hover:bg-slate-300'
						}`}
					>
						Publishing Logs
					</button>
				</div>

				<select
					value={hours}
					onChange={(e) => {
						setHours(e.target.value);
						setOffset(0);
						mutate();
					}}
					className="px-3 py-2 border border-slate-300 rounded-lg text-sm font-medium"
				>
					<option value="1">Last 1 hour</option>
					<option value="6">Last 6 hours</option>
					<option value="24">Last 24 hours</option>
				</select>
			</div>

			{isLoading || !data ? (
				<div className="space-y-2">
					{[1, 2, 3].map((i) => (
						<div
							key={i}
							className="h-12 bg-slate-200 rounded-lg animate-pulse"
						></div>
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
								<div
									key={id}
									className="border border-slate-200 rounded-lg overflow-hidden"
								>
									<button
										onClick={() =>
											setExpandedId(isExpanded ? null : id)
										}
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
														<span
															className={`px-2 py-0.5 rounded text-xs font-bold ${
																(log as SystemLog)
																	.level ===
																'error'
																	? 'bg-rose-100 text-rose-700'
																	: (log as SystemLog)
																			.level ===
																		  'warn'
																	? 'bg-amber-100 text-amber-700'
																	: 'bg-emerald-100 text-emerald-700'
															}`}
														>
															{(
																log as SystemLog
															).level.toUpperCase()}
														</span>
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
														<span
															className={`px-2 py-0.5 rounded text-xs font-bold ${
																(log as PublishingLog)
																	.status ===
																'SUCCESS'
																	? 'bg-emerald-100 text-emerald-700'
																	: 'bg-rose-100 text-rose-700'
															}`}
														>
															{(log as PublishingLog).status}
														</span>
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

									{isExpanded && (
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
									)}
								</div>
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
							<button
								onClick={handlePrevious}
								disabled={offset === 0}
								className="px-4 py-2 rounded-lg bg-slate-200 text-slate-700 font-bold text-sm hover:bg-slate-300 disabled:opacity-50 transition"
							>
								← Previous
							</button>
							<button
								onClick={handleNext}
								disabled={
									!data ||
									offset + 50 >= data.total
								}
								className="px-4 py-2 rounded-lg bg-slate-200 text-slate-700 font-bold text-sm hover:bg-slate-300 disabled:opacity-50 transition"
							>
								Next →
							</button>
						</div>
					</div>
				</div>
			)}
		</Panel>
	);
}
