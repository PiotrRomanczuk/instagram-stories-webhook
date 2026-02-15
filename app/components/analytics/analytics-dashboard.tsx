'use client';

import { useState, useEffect, useCallback } from 'react';
import {
	TrendingUp,
	Users,
	CheckCircle,
	Calendar,
	BarChart3,
	Clock,
	Award,
	Loader2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Progress } from '@/app/components/ui/progress';
import { ScrollArea } from '@/app/components/ui/scroll-area';

interface AnalyticsData {
	totalSubmissions: number;
	approvalRate: number;
	rejectionRate: number;
	scheduledCount: number;
	publishedCount: number;
	pendingCount: number;
	topContributor: { email: string; count: number } | null;
	recentActivity: Array<{
		action: string;
		timestamp: string;
		user: string;
	}>;
}

export function AnalyticsDashboard() {
	const [analytics, setAnalytics] = useState<AnalyticsData>({
		totalSubmissions: 0,
		approvalRate: 0,
		rejectionRate: 0,
		scheduledCount: 0,
		publishedCount: 0,
		pendingCount: 0,
		topContributor: null,
		recentActivity: [],
	});
	const [isLoading, setIsLoading] = useState(true);

	const fetchAnalytics = useCallback(async () => {
		setIsLoading(true);
		try {
			const res = await fetch('/api/analytics');
			if (res.ok) {
				const data = await res.json();
				setAnalytics(data);
			}
		} catch (error) {
			console.error('Failed to fetch analytics:', error);
		} finally {
			setIsLoading(false);
		}
	}, []);

	useEffect(() => {
		fetchAnalytics();
	}, [fetchAnalytics]);

	if (isLoading) {
		return (
			<div className="flex items-center justify-center py-24">
				<div className="text-center space-y-4">
					<Loader2 className="h-12 w-12 animate-spin text-muted-foreground mx-auto" />
					<p className="text-muted-foreground font-medium">Loading analytics...</p>
				</div>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			{/* Overview Cards */}
			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
				<StatCard
					icon={<TrendingUp className="h-5 w-5" />}
					label="Total Submissions"
					value={analytics.totalSubmissions}
					variant="indigo"
				/>
				<StatCard
					icon={<CheckCircle className="h-5 w-5" />}
					label="Approval Rate"
					value={`${analytics.approvalRate.toFixed(1)}%`}
					variant="emerald"
				/>
				<StatCard
					icon={<Calendar className="h-5 w-5" />}
					label="Scheduled Posts"
					value={analytics.scheduledCount}
					variant="purple"
				/>
				<StatCard
					icon={<BarChart3 className="h-5 w-5" />}
					label="Published"
					value={analytics.publishedCount}
					variant="blue"
				/>
			</div>

			{/* Detailed Stats */}
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
				{/* Status Breakdown */}
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2 text-base">
							<BarChart3 className="h-4 w-4" />
							Status Breakdown
						</CardTitle>
					</CardHeader>
					<CardContent className="space-y-4">
						<StatusBar
							label="Pending Review"
							count={analytics.pendingCount}
							total={analytics.totalSubmissions}
							variant="amber"
						/>
						<StatusBar
							label="Scheduled"
							count={analytics.scheduledCount}
							total={analytics.totalSubmissions}
							variant="indigo"
						/>
						<StatusBar
							label="Published"
							count={analytics.publishedCount}
							total={analytics.totalSubmissions}
							variant="emerald"
						/>
					</CardContent>
				</Card>

				{/* Top Contributor */}
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2 text-base">
							<Award className="h-4 w-4 text-yellow-500" />
							Top Contributor
						</CardTitle>
					</CardHeader>
					<CardContent>
						{analytics.topContributor ? (
							<div className="flex items-center gap-4 p-4 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg border border-yellow-200">
								<div className="h-12 w-12 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center">
									<Users className="h-6 w-6 text-white" />
								</div>
								<div>
									<p className="font-semibold">{analytics.topContributor.email}</p>
									<p className="text-sm text-muted-foreground">
										{analytics.topContributor.count} submissions
									</p>
								</div>
							</div>
						) : (
							<p className="text-muted-foreground text-sm italic">
								No submissions yet
							</p>
						)}
					</CardContent>
				</Card>
			</div>

			{/* Recent Activity */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2 text-base">
						<Clock className="h-4 w-4" />
						Recent Activity
					</CardTitle>
				</CardHeader>
				<CardContent>
					{analytics.recentActivity.length > 0 ? (
						<ScrollArea className="h-[200px]">
							<div className="space-y-2">
								{analytics.recentActivity.map((activity, i) => (
									<div
										key={i}
										className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg"
									>
										<div className="h-2 w-2 bg-primary rounded-full flex-shrink-0" />
										<div className="flex-1 min-w-0">
											<p className="text-sm font-medium truncate">
												{activity.action}
											</p>
											<p className="text-xs text-muted-foreground">
												{activity.user} &bull;{' '}
												{new Date(activity.timestamp).toLocaleString()}
											</p>
										</div>
									</div>
								))}
							</div>
						</ScrollArea>
					) : (
						<p className="text-muted-foreground text-sm italic">No recent activity</p>
					)}
				</CardContent>
			</Card>
		</div>
	);
}

function StatCard({
	icon,
	label,
	value,
	variant,
}: {
	icon: React.ReactNode;
	label: string;
	value: string | number;
	variant: 'indigo' | 'emerald' | 'purple' | 'blue';
}) {
	const variantClasses = {
		indigo: 'from-indigo-500 to-indigo-600',
		emerald: 'from-emerald-500 to-emerald-600',
		purple: 'from-purple-500 to-purple-600',
		blue: 'from-blue-500 to-blue-600',
	};

	return (
		<Card>
			<CardContent className="pt-6">
				<div
					className={`h-10 w-10 bg-gradient-to-br ${variantClasses[variant]} rounded-lg flex items-center justify-center text-white mb-3`}
				>
					{icon}
				</div>
				<p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
					{label}
				</p>
				<p className="text-2xl font-bold">{value}</p>
			</CardContent>
		</Card>
	);
}

function StatusBar({
	label,
	count,
	total,
	variant,
}: {
	label: string;
	count: number;
	total: number;
	variant: 'amber' | 'indigo' | 'emerald';
}) {
	const percentage = total > 0 ? (count / total) * 100 : 0;

	return (
		<div className="space-y-2">
			<div className="flex items-center justify-between">
				<span className="text-sm font-medium">{label}</span>
				<span className="text-sm font-semibold">{count}</span>
			</div>
			<Progress value={percentage} className="h-2" />
		</div>
	);
}
