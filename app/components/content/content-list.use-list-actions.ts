'use client';

import { useState, useMemo } from 'react';
import { ContentItem } from '@/lib/types/posts';
import { formatCreatorName } from './content-list.helpers';
import { SortConfig, SortColumn } from './content-list.sortable-header';

/**
 * Hook encapsulating all state and handlers for ContentList
 */
export function useListActions(items: ContentItem[], onRefresh: () => void) {
	const [selectedItemForPublish, setSelectedItemForPublish] = useState<ContentItem | null>(null);
	const [isPublishing, setIsPublishing] = useState(false);
	const [approvingId, setApprovingId] = useState<string | null>(null);
	const [rejectingId, setRejectingId] = useState<string | null>(null);
	const [showRejectPopover, setShowRejectPopover] = useState<string | null>(null);
	const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
	const [isBulkProcessing, setIsBulkProcessing] = useState(false);
	const [showBulkRejectDialog, setShowBulkRejectDialog] = useState(false);
	const [bulkRejectReason, setBulkRejectReason] = useState('');
	const [sortConfig, setSortConfig] = useState<SortConfig>({ column: null, direction: 'asc' });

	const handleSort = (column: SortColumn) => {
		setSortConfig((prev) => ({
			column,
			direction: prev.column === column && prev.direction === 'asc' ? 'desc' : 'asc',
		}));
	};

	const sortedItems = useMemo(() => {
		if (!sortConfig.column) return items;
		return [...items].sort((a, b) => {
			let comparison = 0;
			if (sortConfig.column === 'creator') {
				comparison = formatCreatorName(a.userEmail).toLowerCase().localeCompare(formatCreatorName(b.userEmail).toLowerCase());
			} else if (sortConfig.column === 'status') {
				const order = ['published', 'scheduled', 'processing', 'draft', 'failed'];
				comparison = order.indexOf(a.publishingStatus) - order.indexOf(b.publishingStatus);
			} else if (sortConfig.column === 'scheduled') {
				comparison = (a.scheduledTime ?? 0) - (b.scheduledTime ?? 0);
			}
			return sortConfig.direction === 'asc' ? comparison : -comparison;
		});
	}, [items, sortConfig]);

	const selectableItems = useMemo(
		() => items.filter((item) => item.source === 'submission' && item.submissionStatus === 'pending'),
		[items]
	);

	const allSelectableSelected = selectableItems.length > 0 && selectableItems.every((item) => selectedIds.has(item.id));
	const someSelectableSelected = selectableItems.some((item) => selectedIds.has(item.id)) && !allSelectableSelected;

	const toggleSelect = (id: string) => setSelectedIds((prev) => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
	const toggleSelectAll = () => { if (allSelectableSelected) setSelectedIds(new Set()); else setSelectedIds(new Set(selectableItems.map((i) => i.id))); };
	const clearSelection = () => setSelectedIds(new Set());

	const handleBulkApprove = async () => {
		if (selectedIds.size === 0) return;
		setIsBulkProcessing(true);
		try {
			await Promise.all(Array.from(selectedIds).map((id) => fetch(`/api/content/${id}/review`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'approve' }) })));
			clearSelection(); onRefresh();
		} catch (err) { console.error('Bulk approve failed', err); }
		finally { setIsBulkProcessing(false); }
	};

	const handleBulkReject = async () => {
		if (selectedIds.size === 0 || !bulkRejectReason.trim()) return;
		setIsBulkProcessing(true);
		try {
			await Promise.all(Array.from(selectedIds).map((id) => fetch(`/api/content/${id}/review`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'reject', rejectionReason: bulkRejectReason }) })));
			clearSelection(); setShowBulkRejectDialog(false); setBulkRejectReason(''); onRefresh();
		} catch (err) { console.error('Bulk reject failed', err); }
		finally { setIsBulkProcessing(false); }
	};

	const handlePublishNow = async () => {
		if (!selectedItemForPublish) return;
		setIsPublishing(true);
		try {
			const res = await fetch(`/api/content/${selectedItemForPublish.id}/publish`, { method: 'POST' });
			if (res.ok) { onRefresh(); setSelectedItemForPublish(null); }
			else { const data = await res.json(); console.error('Publish failed:', data.error); }
		} catch (err) { console.error('Failed to publish now', err); }
		finally { setIsPublishing(false); }
	};

	const handleQuickApprove = async (itemId: string) => {
		setApprovingId(itemId);
		try {
			const res = await fetch(`/api/content/${itemId}/review`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'approve' }) });
			if (res.ok) onRefresh();
		} catch (err) { console.error('Failed to approve', err); }
		finally { setApprovingId(null); }
	};

	const handleQuickReject = async (itemId: string, reason: string) => {
		setRejectingId(itemId);
		try {
			const res = await fetch(`/api/content/${itemId}/review`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'reject', rejectionReason: reason }) });
			if (res.ok) { onRefresh(); setShowRejectPopover(null); }
		} catch (err) { console.error('Failed to reject', err); }
		finally { setRejectingId(null); }
	};

	return {
		selectedItemForPublish, setSelectedItemForPublish, isPublishing,
		approvingId, rejectingId, showRejectPopover, setShowRejectPopover,
		selectedIds, isBulkProcessing, showBulkRejectDialog, setShowBulkRejectDialog,
		bulkRejectReason, setBulkRejectReason,
		sortConfig, handleSort, sortedItems,
		selectableItems, allSelectableSelected, someSelectableSelected,
		toggleSelect, toggleSelectAll, clearSelection,
		handleBulkApprove, handleBulkReject, handlePublishNow,
		handleQuickApprove, handleQuickReject,
	};
}
