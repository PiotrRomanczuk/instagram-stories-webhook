'use client';

import { useState, useCallback } from 'react';
import useSWR, { mutate } from 'swr';
import { toast } from 'sonner';
import { AlertTriangle, RefreshCcw } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { ScheduledList } from './scheduled-list';
import { ScheduleDialog } from '@/app/components/review/schedule-dialog';
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from '@/app/components/ui/alert-dialog';
import { PageHeader } from '@/app/components/layout/page-header';
import { ContentItem } from '@/lib/types';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

type ScheduleFilter = 'all' | 'today' | 'week' | 'overdue' | 'failed';

export function ScheduleManagerNew() {
	const [filter, setFilter] = useState<ScheduleFilter>('all');
	const [editingId, setEditingId] = useState<string | null>(null);
	const [cancelingId, setCancelingId] = useState<string | null>(null);
	const [isRescheduling, setIsRescheduling] = useState(false);

	// Build API URL based on filter
	const getApiUrl = useCallback(() => {
		if (filter === 'failed') {
			return '/api/content?publishingStatus=failed&limit=100';
		}
		if (filter === 'overdue') {
			return '/api/content?tab=queue&scheduleFilter=overdue&limit=100';
		}
		let url = '/api/content?tab=queue&limit=100';
		if (filter === 'today') {
			url += '&scheduleFilter=today';
		} else if (filter === 'week') {
			url += '&scheduleFilter=week';
		}
		return url;
	}, [filter]);

	const { data, isLoading, error } = useSWR<{ data: ContentItem[] }>(
		getApiUrl(),
		fetcher
	);

	const items = data?.data || [];
	const editingItem = items.find((item) => item.id === editingId);

	// Calculate counts for badges
	const now = Date.now();
	const overdueCount = items.filter(
		(item) => item.scheduledTime && item.scheduledTime < now && item.publishingStatus === 'scheduled'
	).length;
	const failedCount = items.filter((item) => item.publishingStatus === 'failed').length;

	const refreshList = useCallback(() => {
		mutate(getApiUrl());
	}, [getApiUrl]);

	const handleEditSchedule = async (scheduledTime: number) => {
		if (!editingId) return;

		try {
			const response = await fetch(`/api/content/${editingId}/schedule`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ scheduledTime }),
			});

			if (!response.ok) {
				const result = await response.json();
				throw new Error(result.error || 'Failed to update schedule');
			}

			toast.success('Schedule updated');
			refreshList();
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Failed to update schedule');
			throw err;
		}
	};

	const handleCancelPost = async () => {
		if (!cancelingId) return;

		try {
			const response = await fetch(`/api/content/${cancelingId}`, {
				method: 'DELETE',
			});

			if (!response.ok) {
				const result = await response.json();
				throw new Error(result.error || 'Failed to cancel post');
			}

			toast.success('Post cancelled');
			refreshList();
			setCancelingId(null);
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Failed to cancel post');
		}
	};

	const handleRescheduleOverdue = async () => {
		setIsRescheduling(true);
		try {
			const response = await fetch('/api/content/reschedule-overdue', {
				method: 'POST',
			});

			if (!response.ok) {
				const result = await response.json();
				throw new Error(result.error || 'Failed to reschedule');
			}

			const result = await response.json();
			toast.success(`Rescheduled ${result.count || 0} posts`);
			refreshList();
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Failed to reschedule');
		} finally {
			setIsRescheduling(false);
		}
	};

	if (error) {
		return (
			<div className="flex flex-col items-center justify-center rounded-lg border border-destructive/20 bg-destructive/5 p-12 text-center">
				<AlertTriangle className="h-12 w-12 text-destructive" />
				<h3 className="mt-4 text-lg font-semibold">Failed to load schedule</h3>
				<p className="mt-2 text-sm text-muted-foreground">
					{error.message || 'An error occurred while fetching scheduled posts.'}
				</p>
				<Button variant="outline" className="mt-4" onClick={refreshList}>
					Try Again
				</Button>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<PageHeader
				title="Scheduled Posts"
				description="Manage your scheduled content for publishing."
				badge={
					items.length > 0 ? (
						<Badge variant="secondary">{items.length} posts</Badge>
					) : undefined
				}
			/>

			{/* Filter Tabs */}
			<div className="flex items-center justify-between gap-4 flex-wrap">
				<Tabs value={filter} onValueChange={(v) => setFilter(v as ScheduleFilter)}>
					<TabsList>
						<TabsTrigger value="all">All</TabsTrigger>
						<TabsTrigger value="today">Today</TabsTrigger>
						<TabsTrigger value="week">This Week</TabsTrigger>
						<TabsTrigger value="overdue" className="gap-1">
							Overdue
							{overdueCount > 0 && (
								<Badge variant="destructive" className="ml-1 h-5 px-1.5">
									{overdueCount}
								</Badge>
							)}
						</TabsTrigger>
						<TabsTrigger value="failed" className="gap-1">
							Failed
							{failedCount > 0 && (
								<Badge variant="destructive" className="ml-1 h-5 px-1.5">
									{failedCount}
								</Badge>
							)}
						</TabsTrigger>
					</TabsList>
				</Tabs>

				{filter === 'overdue' && overdueCount > 0 && (
					<Button
						variant="outline"
						size="sm"
						onClick={handleRescheduleOverdue}
						disabled={isRescheduling}
					>
						<RefreshCcw className={`mr-2 h-4 w-4 ${isRescheduling ? 'animate-spin' : ''}`} />
						Reschedule All Overdue
					</Button>
				)}
			</div>

			{/* Overdue Alert */}
			{filter !== 'overdue' && overdueCount > 0 && (
				<div className="flex items-center justify-between rounded-lg border border-yellow-200 bg-yellow-50 p-4">
					<div className="flex items-center gap-3">
						<div className="rounded-full bg-yellow-100 p-2">
							<AlertTriangle className="h-5 w-5 text-yellow-600" />
						</div>
						<div>
							<p className="font-medium text-yellow-900">
								{overdueCount} post{overdueCount !== 1 ? 's' : ''} overdue
							</p>
							<p className="text-sm text-yellow-700">
								These posts were scheduled but not published on time.
							</p>
						</div>
					</div>
					<Button
						variant="outline"
						size="sm"
						onClick={() => setFilter('overdue')}
					>
						View Overdue
					</Button>
				</div>
			)}

			{/* Scheduled List */}
			<ScheduledList
				items={items}
				isLoading={isLoading}
				onEdit={(id) => setEditingId(id)}
				onCancel={(id) => setCancelingId(id)}
			/>

			{/* Edit Schedule Dialog */}
			<ScheduleDialog
				open={!!editingId}
				onOpenChange={(open) => !open && setEditingId(null)}
				onConfirm={handleEditSchedule}
				itemTitle={editingItem?.title}
			/>

			{/* Cancel Confirmation Dialog */}
			<AlertDialog open={!!cancelingId} onOpenChange={(open) => !open && setCancelingId(null)}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Cancel Scheduled Post?</AlertDialogTitle>
						<AlertDialogDescription>
							This will permanently remove this post from the schedule. This action cannot be undone.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Keep Scheduled</AlertDialogCancel>
						<AlertDialogAction
							onClick={handleCancelPost}
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
						>
							Cancel Post
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}
