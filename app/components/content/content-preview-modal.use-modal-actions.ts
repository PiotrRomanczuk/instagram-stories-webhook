'use client';

import { useState } from 'react';
import { ContentItem } from '@/lib/types/posts';
import { toast } from 'sonner';

/**
 * Hook encapsulating state and handlers for ContentPreviewModal
 */
export function useModalActions(item: ContentItem, onRefresh: (() => void) | undefined, onClose: () => void) {
	const [showConfirmPublish, setShowConfirmPublish] = useState(false);
	const [showConfirmDelete, setShowConfirmDelete] = useState(false);
	const [isPublishing, setIsPublishing] = useState(false);
	const [isRetrying, setIsRetrying] = useState(false);
	const [isDeleting, setIsDeleting] = useState(false);
	const [isReviewing, setIsReviewing] = useState(false);
	const [showRejectDialog, setShowRejectDialog] = useState(false);
	const [rejectionReason, setRejectionReason] = useState('');

	const handlePublishNow = async () => {
		try {
			setIsPublishing(true);
			const response = await fetch(`/api/content/${item.id}/publish`, { method: 'POST' });
			if (response.ok) { onRefresh?.(); onClose(); }
		} catch (err) { console.error('Failed to publish now', err); }
		finally { setIsPublishing(false); }
	};

	const handleRetry = async () => {
		try {
			setIsRetrying(true);
			const response = await fetch(`/api/content/${item.id}/retry`, { method: 'POST' });
			if (response.ok) { toast.success('Post queued for retry'); onRefresh?.(); onClose(); }
			else { const data = await response.json(); toast.error(data.error || 'Failed to retry'); }
		} catch (err) { console.error('Failed to retry', err); toast.error('Failed to retry post'); }
		finally { setIsRetrying(false); }
	};

	const handleApprove = async () => {
		try {
			setIsReviewing(true);
			const response = await fetch(`/api/content/${item.id}/review`, {
				method: 'POST', headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ action: 'approve' }),
			});
			if (response.ok) { onRefresh?.(); onClose(); }
		} catch (err) { console.error('Failed to approve', err); }
		finally { setIsReviewing(false); }
	};

	const handleReject = async () => {
		if (!rejectionReason.trim()) return;
		try {
			setIsReviewing(true);
			const response = await fetch(`/api/content/${item.id}/review`, {
				method: 'POST', headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ action: 'reject', rejectionReason }),
			});
			if (response.ok) { onRefresh?.(); onClose(); }
		} catch (err) { console.error('Failed to reject', err); }
		finally { setIsReviewing(false); setShowRejectDialog(false); }
	};

	const handleDelete = async () => {
		try {
			setIsDeleting(true);
			const response = await fetch(`/api/content/${item.id}`, { method: 'DELETE' });
			if (response.ok) { onRefresh?.(); onClose(); }
		} catch (err) { console.error('Failed to delete', err); }
		finally { setIsDeleting(false); setShowConfirmDelete(false); }
	};

	return {
		showConfirmPublish, setShowConfirmPublish,
		showConfirmDelete, setShowConfirmDelete,
		isPublishing, isRetrying, isDeleting, isReviewing,
		showRejectDialog, setShowRejectDialog,
		rejectionReason, setRejectionReason,
		handlePublishNow, handleRetry, handleApprove, handleReject, handleDelete,
	};
}
