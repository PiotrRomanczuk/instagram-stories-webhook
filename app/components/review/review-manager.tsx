'use client';

import { useState, useCallback } from 'react';
import useSWR, { mutate } from 'swr';
import { toast } from 'sonner';
import { Check, X, AlertTriangle } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { ReviewList } from './review-list';
import { RejectDialog } from './reject-dialog';
import { ScheduleDialog } from './schedule-dialog';
import { PageHeader } from '@/app/components/layout/page-header';
import { ContentItem } from '@/lib/types';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function ReviewManager() {
	const [selectedIds, setSelectedIds] = useState<string[]>([]);
	const [rejectingId, setRejectingId] = useState<string | null>(null);
	const [schedulingId, setSchedulingId] = useState<string | null>(null);
	const [isBulkProcessing, setIsBulkProcessing] = useState(false);

	// Fetch pending submissions
	const { data, isLoading, error } = useSWR<{ items: ContentItem[] }>(
		'/api/content?source=submission&submissionStatus=pending',
		fetcher
	);

	const items = data?.items || [];
	const rejectingItem = items.find((item) => item.id === rejectingId);
	const schedulingItem = items.find((item) => item.id === schedulingId);

	const refreshList = useCallback(() => {
		mutate('/api/content?source=submission&submissionStatus=pending');
	}, []);

	const handleApprove = async (id: string) => {
		try {
			const response = await fetch(`/api/content/${id}/review`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ action: 'approve' }),
			});

			if (!response.ok) {
				const data = await response.json();
				throw new Error(data.error || 'Failed to approve');
			}

			toast.success('Submission approved');
			refreshList();
			setSelectedIds((prev) => prev.filter((selectedId) => selectedId !== id));
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Failed to approve');
			throw error;
		}
	};

	const handleReject = async (reason: string) => {
		if (!rejectingId) return;

		try {
			const response = await fetch(`/api/content/${rejectingId}/review`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ action: 'reject', rejectionReason: reason }),
			});

			if (!response.ok) {
				const data = await response.json();
				throw new Error(data.error || 'Failed to reject');
			}

			toast.success('Submission rejected');
			refreshList();
			setSelectedIds((prev) => prev.filter((id) => id !== rejectingId));
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Failed to reject');
			throw error;
		}
	};

	const handleSchedule = async (scheduledTime: number) => {
		if (!schedulingId) return;

		try {
			// First approve the submission
			const approveResponse = await fetch(`/api/content/${schedulingId}/review`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ action: 'approve' }),
			});

			if (!approveResponse.ok) {
				const data = await approveResponse.json();
				throw new Error(data.error || 'Failed to approve');
			}

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
			refreshList();
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
				<Button variant="outline" className="mt-4" onClick={refreshList}>
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
