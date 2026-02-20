'use client';

import { useState, useCallback } from 'react';
import useSWR from 'swr';
import { toast } from 'sonner';
import { Check, X, AlertTriangle } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { ReviewList } from './review-list';
import { RejectDialog } from './reject-dialog';
import { ScheduleDialog } from './schedule-dialog';
import { PageHeader } from '@/app/components/layout/page-header';
import { ContentItem } from '@/lib/types';
import { contentKeys } from '@/lib/swr/query-keys';
import { useRealtimeSync } from '@/hooks/use-realtime-sync';
import { useApproveContent, useRejectContent } from '@/lib/swr/mutations';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function ReviewManager() {
	const [selectedIds, setSelectedIds] = useState<string[]>([]);
	const [rejectingId, setRejectingId] = useState<string | null>(null);
	const [schedulingId, setSchedulingId] = useState<string | null>(null);
	const [isBulkProcessing, setIsBulkProcessing] = useState(false);

	// Subscribe to realtime updates
	useRealtimeSync();

	// Centralized mutations
	const approveContent = useApproveContent();
	const rejectContent = useRejectContent();

	// Fetch pending submissions using array-based key
	const { data, isLoading, error, mutate: revalidate } = useSWR<{ items: ContentItem[] }>(
		contentKeys.list({ source: 'submission', submissionStatus: 'pending' }),
		async () => {
			const res = await fetch('/api/content?source=submission&submissionStatus=pending');
			if (!res.ok) throw new Error('Failed to fetch submissions');
			return res.json();
		}
	);

	const items = data?.items || [];
	const rejectingItem = items.find((item) => item.id === rejectingId);
	const schedulingItem = items.find((item) => item.id === schedulingId);

	const handleApprove = async (id: string) => {
		try {
			// Use centralized mutation with automatic cache invalidation
			await approveContent(id);
			toast.success('Submission approved');
			setSelectedIds((prev) => prev.filter((selectedId) => selectedId !== id));
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Failed to approve');
			throw error;
		}
	};

	const handleReject = async (reason: string) => {
		if (!rejectingId) return;

		try {
			// Use centralized mutation with automatic cache invalidation
			await rejectContent(rejectingId, reason);
			toast.success('Submission rejected');
			setSelectedIds((prev) => prev.filter((id) => id !== rejectingId));
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Failed to reject');
			throw error;
		}
	};

	const handleSchedule = async (scheduledTime: number) => {
		if (!schedulingId) return;

		try {
			// First approve the submission using centralized mutation
			await approveContent(schedulingId);

			// Then schedule it
			const scheduleResponse = await fetch(`/api/content/${schedulingId}/schedule`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ scheduledTime }),
			});

			if (!scheduleResponse.ok) {
				const data = await scheduleResponse.json();
				throw new Error(data.error || 'Failed to schedule');
			}

			toast.success('Submission approved and scheduled');
			// No manual refresh needed - realtime sync handles it automatically
			setSelectedIds((prev) => prev.filter((id) => id !== schedulingId));
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Failed to schedule');
			throw error;
		}
	};

	const handleBulkApprove = async () => {
		if (selectedIds.length === 0) return;

		setIsBulkProcessing(true);
		let successCount = 0;
		let failCount = 0;

		for (const id of selectedIds) {
			try {
				await handleApprove(id);
				successCount++;
			} catch {
				failCount++;
			}
		}

		setIsBulkProcessing(false);
		setSelectedIds([]);

		if (successCount > 0) {
			toast.success(`Approved ${successCount} submission${successCount > 1 ? 's' : ''}`);
		}
		if (failCount > 0) {
			toast.error(`Failed to approve ${failCount} submission${failCount > 1 ? 's' : ''}`);
		}
	};

	if (error) {
		return (
			<div className="flex flex-col items-center justify-center rounded-lg border border-destructive/20 bg-destructive/5 p-12 text-center">
				<AlertTriangle className="h-12 w-12 text-destructive" />
				<h3 className="mt-4 text-lg font-semibold">Failed to load submissions</h3>
				<p className="mt-2 text-sm text-muted-foreground">
					{error.message || 'An error occurred while fetching submissions.'}
				</p>
				<Button variant="outline" className="mt-4" onClick={() => revalidate()}>
					Try Again
				</Button>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<PageHeader
				title="Review Queue"
				description="Review and approve user submissions for publishing."
				badge={
					items.length > 0 ? (
						<Badge variant="secondary">{items.length} pending</Badge>
					) : undefined
				}
			/>

			{/* Bulk Actions */}
			{selectedIds.length > 0 && (
				<div className="flex items-center gap-4 rounded-lg border bg-muted/50 p-4">
					<span className="text-sm font-medium">
						{selectedIds.length} selected
					</span>
					<div className="flex items-center gap-2">
						<Button
							size="sm"
							variant="outline"
							onClick={handleBulkApprove}
							disabled={isBulkProcessing}
							className="text-green-600 hover:text-green-700 hover:bg-green-50"
						>
							<Check className="mr-1 h-4 w-4" />
							Approve All
						</Button>
						<Button
							size="sm"
							variant="outline"
							onClick={() => setSelectedIds([])}
							disabled={isBulkProcessing}
						>
							<X className="mr-1 h-4 w-4" />
							Clear Selection
						</Button>
					</div>
				</div>
			)}

			{/* Review List */}
			<ReviewList
				items={items}
				isLoading={isLoading}
				selectedIds={selectedIds}
				onSelectionChange={setSelectedIds}
				onApprove={handleApprove}
				onReject={(id) => setRejectingId(id)}
				onSchedule={(id) => setSchedulingId(id)}
			/>

			{/* Reject Dialog */}
			<RejectDialog
				open={!!rejectingId}
				onOpenChange={(open) => !open && setRejectingId(null)}
				onConfirm={handleReject}
				itemTitle={rejectingItem?.title}
			/>

			{/* Schedule Dialog */}
			<ScheduleDialog
				open={!!schedulingId}
				onOpenChange={(open) => !open && setSchedulingId(null)}
				onConfirm={handleSchedule}
				needsApproval
				itemTitle={schedulingItem?.title}
			/>
		</div>
	);
}
