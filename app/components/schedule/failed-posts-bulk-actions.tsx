'use client';

import { useState } from 'react';
import { RefreshCw, Trash2, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { ContentItem } from '@/lib/types/posts';
import { ConfirmationDialog } from '../ui/confirmation-dialog';

interface FailedPostsBulkActionsProps {
	failedItems: ContentItem[];
	onRefresh: () => void;
}

export function FailedPostsBulkActions({ failedItems, onRefresh }: FailedPostsBulkActionsProps) {
	const [isRetrying, setIsRetrying] = useState(false);
	const [isDeleting, setIsDeleting] = useState(false);
	const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

	if (failedItems.length === 0) return null;

	const handleRetryAll = async () => {
		setIsRetrying(true);
		let success = 0;
		let failed = 0;

		const results = await Promise.allSettled(
			failedItems.map((item) =>
				fetch(`/api/content/${item.id}/retry`, { method: 'POST' })
					.then((res) => {
						if (res.ok) success++;
						else failed++;
					})
			)
		);

		const errors = results.filter((r) => r.status === 'rejected').length;
		failed += errors;

		if (success > 0) {
			toast.success(`${success} post${success !== 1 ? 's' : ''} queued for retry`);
		}
		if (failed > 0) {
			toast.error(`${failed} post${failed !== 1 ? 's' : ''} failed to retry`);
		}

		setIsRetrying(false);
		onRefresh();
	};

	const handleDeleteAll = async () => {
		setIsDeleting(true);
		let success = 0;
		let failed = 0;

		const results = await Promise.allSettled(
			failedItems.map((item) =>
				fetch(`/api/content/${item.id}`, { method: 'DELETE' })
					.then((res) => {
						if (res.ok) success++;
						else failed++;
					})
			)
		);

		const errors = results.filter((r) => r.status === 'rejected').length;
		failed += errors;

		if (success > 0) {
			toast.success(`${success} post${success !== 1 ? 's' : ''} deleted`);
		}
		if (failed > 0) {
			toast.error(`${failed} post${failed !== 1 ? 's' : ''} failed to delete`);
		}

		setIsDeleting(false);
		setShowDeleteConfirm(false);
		onRefresh();
	};

	return (
		<>
			<div className="flex items-center gap-2 px-4 py-2.5 bg-red-50 dark:bg-red-900/10 border-b border-red-100 dark:border-red-900/20">
				<AlertCircle className="h-4 w-4 text-red-500 shrink-0" />
				<span className="text-sm font-semibold text-red-700 dark:text-red-400 flex-1">
					{failedItems.length} failed post{failedItems.length !== 1 ? 's' : ''}
				</span>
				<button
					onClick={handleRetryAll}
					disabled={isRetrying}
					className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-500 text-white rounded-lg text-xs font-bold hover:bg-orange-600 transition disabled:opacity-50 min-h-[32px]"
				>
					{isRetrying ? (
						<Loader2 className="h-3.5 w-3.5 animate-spin" />
					) : (
						<RefreshCw className="h-3.5 w-3.5" />
					)}
					Retry All
				</button>
				<button
					onClick={() => setShowDeleteConfirm(true)}
					disabled={isDeleting}
					className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500 text-white rounded-lg text-xs font-bold hover:bg-red-600 transition disabled:opacity-50 min-h-[32px]"
				>
					{isDeleting ? (
						<Loader2 className="h-3.5 w-3.5 animate-spin" />
					) : (
						<Trash2 className="h-3.5 w-3.5" />
					)}
					Delete All
				</button>
			</div>

			<ConfirmationDialog
				isOpen={showDeleteConfirm}
				onClose={() => setShowDeleteConfirm(false)}
				onConfirm={handleDeleteAll}
				title="Delete All Failed Posts?"
				message={`This will permanently delete ${failedItems.length} failed post${failedItems.length !== 1 ? 's' : ''}. This action cannot be undone.`}
				confirmLabel="Delete All"
				type="danger"
				isLoading={isDeleting}
			/>
		</>
	);
}
