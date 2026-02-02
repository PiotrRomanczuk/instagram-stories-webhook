'use client';

import { User, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface CreatorData {
	id: string;
	name: string;
	email: string;
	avatarUrl?: string;
	submissionCount: number;
	approvalRate: number;
	totalViews: number;
	trend: 'up' | 'down' | 'stable';
}

interface CreatorsTableProps {
	creators: CreatorData[];
	className?: string;
	onViewAll?: () => void;
}

export function CreatorsTable({
	creators,
	className,
	onViewAll,
}: CreatorsTableProps) {
	const formatViews = (views: number): string => {
		if (views >= 1000000) {
			return `${(views / 1000000).toFixed(1)}M`;
		}
		if (views >= 1000) {
			return `${(views / 1000).toFixed(0)}K`;
		}
		return views.toString();
	};

	const getApprovalBadge = (rate: number) => {
		if (rate >= 80) {
			return {
				label: `${rate}% Approved`,
				className: 'text-emerald-400 bg-emerald-400/10',
			};
		}
		if (rate >= 50) {
			return {
				label: `${rate}% Approved`,
				className: 'text-amber-400 bg-amber-400/10',
			};
		}
		return {
			label: `${rate}% Approved`,
			className: 'text-red-400 bg-red-400/10',
		};
	};

	return (
		<div
			className={cn(
				'rounded-xl overflow-hidden',
				'bg-[#1a2332] border border-[#2a3649]',
				className
			)}
		>
			{/* Header */}
			<div className="flex items-center justify-between p-4 border-b border-[#2a3649]">
				<h3 className="text-lg font-semibold text-white">Top Creators</h3>
				{onViewAll && (
					<button
						onClick={onViewAll}
						className="text-sm text-[#2b6cee] hover:text-[#2b6cee]/80 font-medium"
					>
						View All Creators
					</button>
				)}
			</div>

			{/* Table */}
			<div className="overflow-x-auto">
				<table className="w-full">
					<thead>
						<tr className="border-b border-[#2a3649]">
							<th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[#92a4c9]">
								Creator
							</th>
							<th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[#92a4c9]">
								Submission Volume
							</th>
							<th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[#92a4c9]">
								Approval Rate
							</th>
							<th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[#92a4c9]">
								Total Views
							</th>
							<th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[#92a4c9]">
								Trend
							</th>
						</tr>
					</thead>
					<tbody>
						{creators.length === 0 ? (
							<tr>
								<td colSpan={5} className="px-4 py-8 text-center text-[#92a4c9]">
									No creator data available
								</td>
							</tr>
						) : (
							creators.map((creator) => {
								const approvalBadge = getApprovalBadge(creator.approvalRate);

								return (
									<tr
										key={creator.id}
										className="border-b border-[#2a3649] last:border-0 hover:bg-[#101622] transition-colors"
									>
										{/* Creator */}
										<td className="px-4 py-3">
											<div className="flex items-center gap-3">
												{creator.avatarUrl ? (
													<img
														src={creator.avatarUrl}
														alt={creator.name}
														className="h-9 w-9 rounded-full object-cover"
													/>
												) : (
													<div className="h-9 w-9 rounded-full bg-[#2a3649] flex items-center justify-center">
														<User className="h-4 w-4 text-[#92a4c9]" />
													</div>
												)}
												<div>
													<p className="text-sm font-medium text-white">
														{creator.name}
													</p>
													<p className="text-xs text-[#92a4c9]">
														{creator.email}
													</p>
												</div>
											</div>
										</td>

										{/* Submission Volume */}
										<td className="px-4 py-3">
											<span className="text-sm text-white">
												{creator.submissionCount} posts
											</span>
										</td>

										{/* Approval Rate */}
										<td className="px-4 py-3">
											<span
												className={cn(
													'inline-block px-2 py-1 rounded text-xs font-medium',
													approvalBadge.className
												)}
											>
												{approvalBadge.label}
											</span>
										</td>

										{/* Total Views */}
										<td className="px-4 py-3">
											<span className="text-sm text-white">
												{formatViews(creator.totalViews)}
											</span>
										</td>

										{/* Trend */}
										<td className="px-4 py-3">
											{creator.trend === 'up' && (
												<div className="flex items-center gap-1 text-emerald-400">
													<TrendingUp className="h-4 w-4" />
													<span className="text-sm">Rising</span>
												</div>
											)}
											{creator.trend === 'down' && (
												<div className="flex items-center gap-1 text-red-400">
													<TrendingDown className="h-4 w-4" />
													<span className="text-sm">Declining</span>
												</div>
											)}
											{creator.trend === 'stable' && (
												<div className="flex items-center gap-1 text-[#92a4c9]">
													<div className="h-0.5 w-4 bg-[#92a4c9] rounded" />
													<span className="text-sm">Stable</span>
												</div>
											)}
										</td>
									</tr>
								);
							})
						)}
					</tbody>
				</table>
			</div>
		</div>
	);
}
