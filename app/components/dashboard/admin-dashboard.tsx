'use client';

import useSWR from 'swr';
import {
	Clock,
	Calendar,
	Send,
	AlertCircle,
	Users,
	Gauge,
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
import { ContentItem } from '@/lib/types';

interface AdminDashboardProps {
	userName: string;
	isDeveloper?: boolean;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

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
		publishedToday: items.filter(
			(i) =>
				i.publishingStatus === 'published' &&
				i.publishedAt &&
				new Date(i.publishedAt).getTime() >= todayTimestamp
		).length,
		failed: items.filter((i) => i.publishingStatus === 'failed').length,
		totalUsers: users.length,
	};

	const isLoading = contentLoading || usersLoading;

	// Quick actions
	const quickActions = [
		{
			label: 'Review Queue',
			href: '/review',
			icon: ClipboardCheck,
			badge: stats.pendingReview > 0 ? stats.pendingReview : undefined,
			color: 'text-yellow-600',
			bgColor: 'bg-yellow-50 hover:bg-yellow-100',
		},
		{
			label: 'Scheduled Posts',
			href: '/schedule',
			icon: Calendar,
			badge: stats.scheduledToday > 0 ? `${stats.scheduledToday} today` : undefined,
			color: 'text-blue-600',
			bgColor: 'bg-blue-50 hover:bg-blue-100',
		},
		{
			label: 'Manage Users',
			href: '/users',
			icon: Users,
			color: 'text-purple-600',
			bgColor: 'bg-purple-50 hover:bg-purple-100',
		},
		...(isDeveloper
			? [
					{
						label: 'Developer Tools',
						href: '/developer',
						icon: Settings,
						color: 'text-slate-600',
						bgColor: 'bg-slate-50 hover:bg-slate-100',
					},
			  ]
			: []),
	];

	return (
		<div className="space-y-8">
			{/* Welcome Section */}
			<div>
				<h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
					Welcome back, {userName}
				</h1>
				<p className="text-muted-foreground">
					Here's what's happening with your content today.
				</p>
			</div>

			{/* Stats Grid */}
			{isLoading ? (
				<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
					{Array.from({ length: 6 }).map((_, i) => (
						<StatsCardSkeleton key={i} />
					))}
				</div>
			) : (
				<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
					<StatsCard
						label="Pending Review"
						value={stats.pendingReview}
						icon={<Clock className="h-5 w-5 text-yellow-600" />}
						iconBgColor="bg-yellow-100"
					/>
					<StatsCard
						label="Scheduled Today"
						value={stats.scheduledToday}
						icon={<Calendar className="h-5 w-5 text-blue-600" />}
						iconBgColor="bg-blue-100"
					/>
					<StatsCard
						label="Published Today"
						value={stats.publishedToday}
						icon={<Send className="h-5 w-5 text-green-600" />}
						iconBgColor="bg-green-100"
					/>
					<StatsCard
						label="Failed"
						value={stats.failed}
						icon={<AlertCircle className="h-5 w-5 text-red-600" />}
						iconBgColor="bg-red-100"
					/>
					<StatsCard
						label="Total Users"
						value={stats.totalUsers}
						icon={<Users className="h-5 w-5 text-purple-600" />}
						iconBgColor="bg-purple-100"
					/>
					<StatsCard
						label="API Quota"
						value="OK"
						icon={<Gauge className="h-5 w-5 text-emerald-600" />}
						iconBgColor="bg-emerald-100"
						description="Within limits"
					/>
				</div>
			)}

			{/* Quick Actions + Token Status */}
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

				{/* Token Status */}
				<TokenStatusCard />
			</div>

			{/* Failed Posts Alert */}
			{stats.failed > 0 && (
				<Card className="border-red-200 bg-red-50">
					<CardContent className="flex items-center justify-between p-4">
						<div className="flex items-center gap-3">
							<div className="rounded-full bg-red-100 p-2">
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
						<Button variant="outline" size="sm" asChild>
							<Link href="/schedule?filter=failed">View Failed</Link>
						</Button>
					</CardContent>
				</Card>
			)}
		</div>
	);
}
