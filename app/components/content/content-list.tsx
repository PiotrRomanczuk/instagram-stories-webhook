'use client';

/**
 * Unified Content List Component
 * Displays content in grid or list view modes with bulk selection and sorting.
 */

import React from 'react';
import { ContentItem } from '@/lib/types/posts';
import { ContentCard } from './content-card';
import { ConfirmationDialog } from '../ui/confirmation-dialog';
import { Clock } from 'lucide-react';
import { ViewMode } from './content-list.helpers';
import { BulkActionsBar } from './content-list.bulk-actions-bar';
import { BulkRejectDialog } from './content-list.bulk-reject-dialog';
import { ContentListRow } from './content-list.list-row';
import { ContentListTableHeader } from './content-list.table-header';
import { useListActions } from './content-list.use-list-actions';

interface ContentListProps {
	items: ContentItem[];
	viewMode: ViewMode;
	onPreview: (item: ContentItem) => void;
	onEdit: (item: ContentItem) => void;
	onRefresh: () => void;
	isAdmin: boolean;
	isDemo?: boolean;
	tab: 'all' | 'review' | 'queue' | 'published' | 'rejected';
}

export function ContentList({
	items, viewMode, onPreview, onEdit, onRefresh, isAdmin, isDemo = false, tab,
}: ContentListProps) {
	const {
		selectedItemForPublish, setSelectedItemForPublish, isPublishing,
		approvingId, rejectingId, showRejectPopover, setShowRejectPopover,
		selectedIds, isBulkProcessing, showBulkRejectDialog, setShowBulkRejectDialog,
		bulkRejectReason, setBulkRejectReason,
		sortConfig, handleSort, sortedItems,
		selectableItems, allSelectableSelected, someSelectableSelected,
		toggleSelect, toggleSelectAll, clearSelection,
		handleBulkApprove, handleBulkReject, handlePublishNow,
		handleQuickApprove, handleQuickReject,
	} = useListActions(items, onRefresh);

	const isQueueTab = tab === 'queue';
	const isPendingSubmission = (item: ContentItem) =>
		item.source === 'submission' && item.submissionStatus === 'pending';

	if (viewMode === 'grid') {
		return (
			<div className='grid gap-6 sm:grid-cols-2 lg:grid-cols-3'>
				{items.map((item) => (
					<ContentCard key={item.id} item={item} onPreview={() => onPreview(item)} onEdit={() => onEdit(item)} onRefresh={onRefresh} isAdmin={isAdmin} tab={tab} />
				))}
			</div>
		);
	}

	const showBulkSelection = isAdmin && !isDemo && selectableItems.length > 0;

	return (
		<div className='bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden relative'>
			{selectedIds.size > 0 && (
				<BulkActionsBar
					selectedCount={selectedIds.size}
					isBulkProcessing={isBulkProcessing}
					onClearSelection={clearSelection}
					onBulkApprove={handleBulkApprove}
					onShowBulkRejectDialog={() => setShowBulkRejectDialog(true)}
				/>
			)}

			{isQueueTab && (
				<div className='p-4 bg-indigo-50 border-b border-indigo-100 flex items-center gap-3'>
					<Clock className='h-5 w-5 text-indigo-600' />
					<p className='text-sm font-bold text-indigo-900 leading-none'>
						Queue:{' '}
						<span className='font-medium text-indigo-700/70 ml-1'>Drag items to reorder publishing sequence.</span>
					</p>
				</div>
			)}

			<div className='overflow-x-auto'>
				<table className='w-full text-sm'>
					<thead>
						<ContentListTableHeader
							tab={tab}
							isQueueTab={isQueueTab}
							showBulkSelection={showBulkSelection}
							allSelectableSelected={allSelectableSelected}
							someSelectableSelected={someSelectableSelected}
							sortConfig={sortConfig}
							onToggleSelectAll={toggleSelectAll}
							onSort={handleSort}
						/>
					</thead>
					<tbody className='divide-y divide-gray-50'>
						{sortedItems.map((item) => (
							<ContentListRow
								key={item.id}
								item={item}
								tab={tab}
								isAdmin={isAdmin}
								isDemo={isDemo}
								isQueueTab={isQueueTab}
								showBulkSelection={showBulkSelection}
								isPendingSubmission={isPendingSubmission(item)}
								isSelected={selectedIds.has(item.id)}
								approvingId={approvingId}
								rejectingId={rejectingId}
								showRejectPopover={showRejectPopover}
								onToggleSelect={toggleSelect}
								onPreview={onPreview}
								onEdit={onEdit}
								onQuickApprove={handleQuickApprove}
								onShowRejectPopover={setShowRejectPopover}
								onCloseRejectPopover={() => setShowRejectPopover(null)}
								onQuickReject={handleQuickReject}
							/>
						))}
					</tbody>
				</table>
			</div>

			<ConfirmationDialog
				isOpen={!!selectedItemForPublish}
				onClose={() => setSelectedItemForPublish(null)}
				onConfirm={handlePublishNow}
				title='Publish Content?'
				message={`This will immediately publish "${selectedItemForPublish?.title || 'this post'}" to Instagram. Let's go live!`}
				confirmLabel='Publish Now'
				type='success'
				isLoading={isPublishing}
			/>

			{showBulkRejectDialog && (
				<BulkRejectDialog
					selectedCount={selectedIds.size}
					bulkRejectReason={bulkRejectReason}
					isBulkProcessing={isBulkProcessing}
					onReasonChange={setBulkRejectReason}
					onConfirm={handleBulkReject}
					onCancel={() => { setShowBulkRejectDialog(false); setBulkRejectReason(''); }}
				/>
			)}
		</div>
	);
}
