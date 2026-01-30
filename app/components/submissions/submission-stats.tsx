'use client';

import { Clock, CheckCircle, Calendar, Send } from 'lucide-react';
import { Card, CardContent } from '@/app/components/ui/card';
import { Skeleton } from '@/app/components/ui/skeleton';

interface SubmissionStatsProps {
	pending: number;
	approved: number;
	scheduled: number;
	published: number;
	isLoading?: boolean;
}

interface StatCardProps {
	label: string;
	value: number;
	icon: React.ReactNode;
	color: string;
}

function StatCard({ label, value, icon, color }: StatCardProps) {
	return (
		<Card>
			<CardContent className="flex items-center gap-4 p-4">
				<div className={`rounded-lg p-2 ${color}`}>{icon}</div>
				<div>
					<p className="text-2xl font-bold">{value}</p>
					<p className="text-sm text-muted-foreground">{label}</p>
				</div>
			</CardContent>
		</Card>
	);
}

function StatCardSkeleton() {
	return (
		<Card>
			<CardContent className="flex items-center gap-4 p-4">
				<Skeleton className="h-10 w-10 rounded-lg" />
				<div className="space-y-2">
					<Skeleton className="h-6 w-12" />
					<Skeleton className="h-4 w-20" />
				</div>
			</CardContent>
		</Card>
	);
}

export function SubmissionStats({
	pending,
	approved,
	scheduled,
	published,
	isLoading,
}: SubmissionStatsProps) {
	if (isLoading) {
		return (
			<div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
				<StatCardSkeleton />
				<StatCardSkeleton />
				<StatCardSkeleton />
				<StatCardSkeleton />
			</div>
		);
	}

	return (
		<div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
			<StatCard
				label="Pending"
				value={pending}
				icon={<Clock className="h-5 w-5 text-yellow-600" />}
				color="bg-yellow-100"
			/>
			<StatCard
				label="Approved"
				value={approved}
				icon={<CheckCircle className="h-5 w-5 text-emerald-600" />}
				color="bg-emerald-100"
			/>
			<StatCard
				label="Scheduled"
				value={scheduled}
				icon={<Calendar className="h-5 w-5 text-blue-600" />}
				color="bg-blue-100"
			/>
			<StatCard
				label="Published"
				value={published}
				icon={<Send className="h-5 w-5 text-purple-600" />}
				color="bg-purple-100"
			/>
		</div>
	);
}
