'use client';

import useSWR from 'swr';
import {
	Clock,
	Calendar,
	Send,
	AlertCircle,
	Users,
	ClipboardCheck,
	Settings,
	ArrowRight,
} from 'lucide-react';
import { Link } from '@/i18n/routing';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { StatsCard, StatsCardSkeleton } from './stats-card';
import { TokenStatusCard } from './token-status-card';
import { QuotaCardNew } from '@/app/components/insights/quota-card-new';
import { ContentItem } from '@/lib/types';
import { useTour } from '@/app/hooks/use-tour';

interface AdminDashboardProps {
	userName: string;
	isDeveloper?: boolean;
}

interface QuotaResponse {
	limit?: {
		config?: { quota_total: number };
		quota_usage: number;
	};
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

function useQuota() {
	const { data, isLoading } = useSWR<QuotaResponse>('/api/schedule/quota', fetcher);
	const total = data?.limit?.config?.quota_total || 100;
	const used = data?.limit?.quota_usage ?? 0;
	return { total, used, isLoading };
}

export function AdminDashboard({ userName, isDeveloper }: AdminDashboardProps) {
	// Fetch content items for stats
	const { data: contentData, isLoading: contentLoading } = useSWR<{ items: ContentItem[] }>(
		'/api/content?limit=100',
		fetcher
	);

	// Fetch users count
	const { data: usersData, isLoading: usersLoading } = useSWR<{ users: unknown[] }>(
		'/api/users',
		fetcher
	);

	// Fetch real quota from Meta API (single source of truth)
	const { total: quotaTotal, used: quotaUsed, isLoading: quotaLoading } = useQuota();

	const items = contentData?.items || [];
	const users = usersData?.users || [];

	// Calculate stats
	const today = new Date();
	today.setHours(0, 0, 0, 0);
	const todayTimestamp = today.getTime();

	const stats = {
		pendingReview: items.filter(
			(i) => i.source === 'submission' && i.submissionStatus === 'pending'
		).length,
		scheduledToday: items.filter(
			(i) =>
				i.publishingStatus === 'scheduled' &&
				i.scheduledTime &&
				i.scheduledTime >= todayTimestamp &&
				i.scheduledTime < todayTimestamp + 86400000
		).length,
		failed: items.filter((i) => i.publishingStatus === 'failed').length,
		totalUsers: users.length,
	};

	const isLoading = contentLoading || usersLoading || quotaLoading;

	const quotaPercent = quotaTotal > 0 ? (quotaUsed / quotaTotal) * 100 : 0;

	// Initialize tour with stats
	const { startTour } = useTour({
		role: isDeveloper ? 'developer' : 'admin',
		autoStart: true,
		hasFailedPosts: stats.failed > 0,
	});

	// Quick actions
	const quickActions = [
		{
			label: 'Review Queue',
			href: '/review',
			icon: ClipboardCheck,
			badge: stats.pendingReview > 0 ? stats.pendingReview : undefined,
			color: 'text-yellow-600',
			bgColor: 'bg-yellow-50 hover:bg-yellow-100',
			dataTour: 'admin-action-review',
		},
		{
			label: 'Scheduled Posts',
			href: '/schedule',
			icon: Calendar,
			badge: stats.scheduledToday > 0 ? `${stats.scheduledToday} today` : undefined,
			color: 'text-blue-600',
			bgColor: 'bg-blue-50 hover:bg-blue-100',
			dataTour: 'admin-action-schedule',
		},
		{
			label: 'Manage Users',
			href: '/users',
			icon: Users,
			badge: stats.totalUsers > 0 ? `${stats.totalUsers} users` : undefined,
			color: 'text-purple-600',
			bgColor: 'bg-purple-50 hover:bg-purple-100',
			dataTour: 'admin-action-users',
		},
		...(isDeveloper
			? [
					{
						label: 'Developer Tools',
						href: '/developer',
						icon: Settings,
						color: 'text-slate-600',
						bgColor: 'bg-slate-50 hover:bg-slate-100',
						dataTour: undefined,
						badge: undefined,
					},
			  ]
			: []),
	];

	return (
		<div className="space-y-6">
			{/* Welcome Section */}
			<div data-tour="admin-welcome">
				<h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
					Welcome back, {userName}
				</h1>
				<p className="text-muted-foreground">
					Here's what's happening with your content today.
				</p>
			</div>

			{/* Failed Posts Alert */}
			{stats.failed > 0 && (
				<Card className="border-red-200 bg-red-50" data-tour="admin-failed-alert">
					<CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
						<div className="flex items-center gap-3">
							<div className="shrink-0 rounded-full bg-red-100 p-2">
								<AlertCircle className="h-5 w-5 text-red-600" />
							</div>
							<div>
								<p className="font-medium text-red-900">
									{stats.failed} post{stats.failed !== 1 ? 's' : ''} failed to publish
								</p>
								<p className="text-sm text-red-700">
									Review and retry failed posts in the schedule manager.
								</p>
							</div>
						</div>
						<Button variant="outline" size="sm" asChild className="shrink-0 self-end sm:self-auto">
							<Link href="/schedule?filter=failed">View Failed</Link>
						</Button>
					</CardContent>
				</Card>
			)}

			{/* Stats Grid — 4 cards on desktop, 2x2 on mobile */}
			{isLoading ? (
				<div className="grid grid-cols-2 gap-3 sm:gap-4">
					{Array.from({ length: 4 }).map((_, i) => (
						<StatsCardSkeleton key={i} />
					))}
				</div>
			) : (
				<div
					className="grid grid-cols-2 gap-3 sm:gap-4"
					data-tour="admin-stats-grid"
				>
					<div data-tour="admin-stat-pending">
						<StatsCard
							label="Pending Review"
							value={stats.pendingReview}
							icon={<Clock className="h-5 w-5 text-yellow-600" />}
							iconBgColor="bg-yellow-100"
							className={stats.pendingReview > 5 ? 'border-amber-200 bg-amber-50' : ''}
						/>
					</div>
					<StatsCard
						label="Scheduled Today"
						value={stats.scheduledToday}
						icon={<Calendar className="h-5 w-5 text-blue-600" />}
						iconBgColor="bg-blue-100"
					/>
					<div data-tour="admin-stat-quota">
						<StatsCard
							label="Published (24h)"
							value={quotaUsed}
							icon={<Send className={`h-5 w-5 ${quotaPercent > 95 ? 'text-red-600' : quotaPercent > 80 ? 'text-amber-600' : 'text-green-600'}`} />}
							iconBgColor={quotaPercent > 95 ? 'bg-red-100' : quotaPercent > 80 ? 'bg-amber-100' : 'bg-green-100'}
							progress={quotaPercent}
							progressColor={quotaPercent > 95 ? 'bg-red-500' : quotaPercent > 80 ? 'bg-amber-500' : 'bg-emerald-500'}
							description={`${quotaTotal - quotaUsed} of ${quotaTotal} remaining`}
							descriptionClassName="hidden sm:block"
						/>
					</div>
					<StatsCard
						label="Failed"
						value={stats.failed}
						icon={<AlertCircle className="h-5 w-5 text-red-600" />}
						iconBgColor="bg-red-100"
						className={stats.failed > 0 ? 'border-red-200 bg-red-50' : ''}
					/>
				</div>
			)}

			{/* Quick Actions + Token Status + Quota */}
			<div className="grid gap-6 lg:grid-cols-3">
				<Card className="lg:col-span-2">
					<CardHeader>
						<CardTitle>Quick Actions</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="grid gap-4 sm:grid-cols-2">
							{quickActions.map((action) => {
								const Icon = action.icon;
								return (
									<Link
										key={action.href}
										href={action.href}
										className={`group flex items-center justify-between rounded-lg border p-4 transition-colors ${action.bgColor}`}
										{...(action.dataTour && { 'data-tour': action.dataTour })}
									>
										<div className="flex items-center gap-3">
											<div className={`rounded-lg bg-white p-2 shadow-sm`}>
												<Icon className={`h-5 w-5 ${action.color}`} />
											</div>
											<div>
												<p className="font-medium">{action.label}</p>
												{action.badge && (
													<Badge variant="secondary" className="mt-1">
														{action.badge}
													</Badge>
												)}
											</div>
										</div>
										<ArrowRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-1" />
									</Link>
								);
							})}
						</div>
					</CardContent>
				</Card>

				<div className="space-y-6">
					{/* Token Status */}
					<div data-tour="admin-token-status">
						<TokenStatusCard />
					</div>

					{/* API Quota Detail */}
					<QuotaCardNew />
				</div>
			</div>
		</div>
	);
}
