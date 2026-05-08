'use client';

import useSWR from 'swr';
import { Plus } from 'lucide-react';
import { Link } from '@/i18n/routing';
import { Button } from '@/app/components/ui/button';
import { Skeleton } from '@/app/components/ui/skeleton';
import { ContentItem } from '@/lib/types';
import { useTour } from '@/app/hooks/use-tour';

interface UserDashboardProps {
	userName: string;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function UserDashboard({ userName }: UserDashboardProps) {
	const { data, isLoading } = useSWR<{ items: ContentItem[] }>(
		'/api/content?source=submission&limit=50',
		fetcher,
	);

	const submissions = data?.items || [];

	useTour({
		role: 'user',
		autoStart: true,
		hasSubmissions: submissions.length > 0,
	});

	const stats = {
		pending: submissions.filter((s) => s.submissionStatus === 'pending').length,
		approved: submissions.filter(
			(s) => s.submissionStatus === 'approved' && s.publishingStatus === 'draft',
		).length,
		scheduled: submissions.filter((s) => s.publishingStatus === 'scheduled').length,
		published: submissions.filter((s) => s.publishingStatus === 'published').length,
	};

	return (
		<div className="space-y-6">
			<div
				className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
				data-tour="user-welcome"
			>
				<div>
					<h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
						Hello, {userName}
					</h1>
					<p className="text-sm text-muted-foreground">
						Submit content for review and publishing to Instagram.
					</p>
				</div>
				<Button asChild size="lg" data-tour="user-submit-button">
					<Link href="/submit">
						<Plus className="mr-2 h-5 w-5" />
						Submit New
					</Link>
				</Button>
			</div>

			<div
				className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-lg border bg-card px-4 py-3 text-sm"
				data-tour="user-stats-grid"
			>
				{isLoading ? (
					<>
						<Skeleton className="h-4 w-24" />
						<Skeleton className="h-4 w-24" />
						<Skeleton className="h-4 w-24" />
						<Skeleton className="h-4 w-24" />
					</>
				) : (
					<>
						<StatPill label="Pending" value={stats.pending} tone="text-yellow-600" />
						<StatPill label="Approved" value={stats.approved} tone="text-emerald-600" />
						<StatPill label="Scheduled" value={stats.scheduled} tone="text-blue-600" />
						<StatPill label="Published" value={stats.published} tone="text-purple-600" />
						<Button
							asChild
							variant="ghost"
							size="sm"
							className="ml-auto h-8 text-xs"
							data-tour="user-view-all"
						>
							<Link href="/submissions">View all submissions →</Link>
						</Button>
					</>
				)}
			</div>
		</div>
	);
}

function StatPill({ label, value, tone }: { label: string; value: number; tone: string }) {
	return (
		<div className="flex items-baseline gap-1.5">
			<span className={`text-lg font-bold tabular-nums ${tone}`}>{value}</span>
			<span className="text-xs text-muted-foreground">{label}</span>
		</div>
	);
}
