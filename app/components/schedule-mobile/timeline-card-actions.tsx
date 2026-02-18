'use client';

import { useState } from 'react';
import { Pencil, Clock, Trash2 } from 'lucide-react';
import { ContentItem } from '@/lib/types/posts';
import { ContentEditModal } from '../content/content-edit-modal';
import { ConfirmationDialog } from '../ui/confirmation-dialog';
import { toast } from 'sonner';

interface TimelineCardActionsProps {
	item: ContentItem;
	onUpdate: () => void;
}

export function TimelineCardActions({ item, onUpdate }: TimelineCardActionsProps) {
	const [showEditModal, setShowEditModal] = useState(false);
	const [showCancelDialog, setShowCancelDialog] = useState(false);
	const [isDeleting, setIsDeleting] = useState(false);

	const handleEdit = (e: React.MouseEvent) => {
		e.stopPropagation();
		setShowEditModal(true);
	};

	const handleCancel = (e: React.MouseEvent) => {
		e.stopPropagation();
		setShowCancelDialog(true);
	};

	const handleDelete = async () => {
		try {
			setIsDeleting(true);
			const response = await fetch(`/api/content/${item.id}`, {
				method: 'DELETE',
			});

			if (!response.ok) {
				const data = await response.json();
				throw new Error(data.error || 'Failed to delete post');
			}

			toast.success('Post deleted successfully');
			setShowCancelDialog(false);
			onUpdate();
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Failed to delete post');
		} finally {
			setIsDeleting(false);
		}
	};

	const handleSave = () => {
		toast.success('Post updated successfully');
		onUpdate();
	};

	// Only show actions for scheduled posts
	if (item.publishingStatus !== 'scheduled') {
		return null;
	}

	return (
		<>
			<div
				className="flex gap-2 mt-3 pt-3 border-t border-slate-700/50"
				onClick={(e) => e.stopPropagation()}
			>
				<button
					onClick={handleEdit}
					className="flex-1 flex items-center justify-center gap-1.5 px-3 py-3 min-h-[44px] bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 hover:text-blue-300 rounded-lg transition-colors text-xs font-semibold"
					title="Edit post"
				>
					<Pencil className="w-3.5 h-3.5" />
					<span>Edit</span>
				</button>

				<button
					onClick={handleEdit}
					className="flex-1 flex items-center justify-center gap-1.5 px-3 py-3 min-h-[44px] bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 hover:text-amber-300 rounded-lg transition-colors text-xs font-semibold"
					title="Reschedule"
				>
					<Clock className="w-3.5 h-3.5" />
					<span>Reschedule</span>
				</button>

				<button
					onClick={handleCancel}
					className="flex items-center justify-center gap-1.5 px-3 py-3 min-h-[44px] bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 rounded-lg transition-colors text-xs font-semibold"
					title="Cancel post"
				>
					<Trash2 className="w-3.5 h-3.5" />
					<span>Cancel</span>
				</button>
			</div>

			{showEditModal && (
				<ContentEditModal
					item={item}
					onClose={() => setShowEditModal(false)}
					onSave={handleSave}
				/>
			)}

			<ConfirmationDialog
				isOpen={showCancelDialog}
				onClose={() => setShowCancelDialog(false)}
				onConfirm={handleDelete}
				title="Cancel Scheduled Post?"
				message="This will permanently delete this scheduled post. This action cannot be undone."
				confirmLabel="Delete Post"
				cancelLabel="Keep Post"
				type="danger"
				isLoading={isDeleting}
			/>
		</>
	);
}
