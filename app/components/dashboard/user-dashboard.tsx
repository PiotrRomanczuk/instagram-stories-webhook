'use client';

import useSWR from 'swr';
import { Clock, CheckCircle, Calendar, Send, Plus } from 'lucide-react';
import { Link } from '@/i18n/routing';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Skeleton } from '@/app/components/ui/skeleton';
import { StatsCard, StatsCardSkeleton } from './stats-card';
import { SubmissionCard } from '@/app/components/submissions/submission-card';
import { ContentItem } from '@/lib/types';
import { useTour } from '@/app/hooks/use-tour';

interface UserDashboardProps {
	userName: string;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function UserDashboard({ userName }: UserDashboardProps) {
	const { data, isLoading } = useSWR<{ items: ContentItem[] }>(
		'/api/content?source=submission&limit=5',
		fetcher
	);

	const submissions = data?.items || [];

	// Initialize tour
	useTour({
		role: 'user',
		autoStart: true,
		hasSubmissions: submissions.length > 0,
	});

	// Calculate stats from submissions
	const stats = {
		pending: submissions.filter((s) => s.submissionStatus === 'pending').length,
		approved: submissions.filter(
			(s) => s.submissionStatus === 'approved' && s.publishingStatus === 'draft'
		).length,
		scheduled: submissions.filter((s) => s.publishingStatus === 'scheduled').length,
		published: submissions.filter((s) => s.publishingStatus === 'published').length,
	};

	const recentSubmissions = submissions.slice(0, 4);

	return (
		<div className="space-y-8">
			{/* Welcome Section */}
			<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<div data-tour="user-welcome">
					<h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
						Hello, {userName}
					</h1>
					<p className="text-muted-foreground">
						Welcome back. Here's an overview of your submissions.
					</p>
				</div>
				<Button asChild size="lg" data-tour="user-submit-button">
					<Link href="/submit">
						<Plus className="mr-2 h-5 w-5" />
						Submit New
					</Link>
				</Button>
			</div>

			{/* Stats Grid */}
			{isLoading ? (
				<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
					<StatsCardSkeleton />
					<StatsCardSkeleton />
					<StatsCardSkeleton />
					<StatsCardSkeleton />
				</div>
			) : (
				<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" data-tour="user-stats-grid">
					<div data-tour="user-stat-pending">
						<StatsCard
							label="Pending Review"
							value={stats.pending}
							icon={<Clock className="h-5 w-5 text-yellow-600" />}
							iconBgColor="bg-yellow-100"
							description="Awaiting admin review"
						/>
					</div>
					<StatsCard
						label="Approved"
						value={stats.approved}
						icon={<CheckCircle className="h-5 w-5 text-emerald-600" />}
						iconBgColor="bg-emerald-100"
						description="Ready to be scheduled"
					/>
					<StatsCard
						label="Scheduled"
						value={stats.scheduled}
						icon={<Calendar className="h-5 w-5 text-blue-600" />}
						iconBgColor="bg-blue-100"
						description="Queued for publishing"
					/>
					<StatsCard
						label="Published"
						value={stats.published}
						icon={<Send className="h-5 w-5 text-purple-600" />}
						iconBgColor="bg-purple-100"
						description="Successfully posted"
					/>
				</div>
			)}

			{/* Recent Submissions */}
			<Card data-tour="user-recent-submissions">
				<CardHeader className="flex flex-row items-center justify-between">
					<CardTitle>Recent Submissions</CardTitle>
					<Button variant="outline" size="sm" asChild data-tour="user-view-all">
						<Link href="/submissions">View All</Link>
					</Button>
				</CardHeader>
				<CardContent>
					{isLoading ? (
						<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
							{Array.from({ length: 4 }).map((_, i) => (
								<div key={i} className="space-y-2">
									<Skeleton className="aspect-[9/16] rounded-lg" />
									<Skeleton className="h-4 w-3/4" />
								</div>
							))}
						</div>
					) : recentSubmissions.length > 0 ? (
						<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
							{recentSubmissions.map((submission, index) => (
								<div
									key={submission.id}
									{...(index === 0 && { 'data-tour': 'user-submission-card' })}
								>
									<SubmissionCard submission={submission} />
								</div>
							))}
						</div>
					) : (
						<div className="flex flex-col items-center justify-center py-12 text-center">
							<div className="rounded-full bg-muted p-4">
								<Send className="h-8 w-8 text-muted-foreground" />
							</div>
							<h3 className="mt-4 text-lg font-semibold">No submissions yet</h3>
							<p className="mt-1 text-sm text-muted-foreground">
								Get started by submitting your first content.
							</p>
							<Button className="mt-4" asChild>
								<Link href="/submit">
									<Plus className="mr-2 h-4 w-4" />
									Submit Now
								</Link>
							</Button>
						</div>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
