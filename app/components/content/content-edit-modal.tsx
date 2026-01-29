'use client';

import React, { useState } from 'react';
import { ContentItem } from '@/lib/types/posts';
import { X, Loader2 } from 'lucide-react';

interface ContentEditModalProps {
	item: ContentItem;
	onClose: () => void;
	onSave: () => void;
}

export function ContentEditModal({
	item,
	onClose,
	onSave,
}: ContentEditModalProps) {
	const [caption, setCaption] = useState(item.caption || '');
	const [title, setTitle] = useState(item.title || '');
	const [isSaving, setIsSaving] = useState(false);
	const [error, setError] = useState('');

	const handleSave = async () => {
		try {
			setIsSaving(true);
			setError('');

			const response = await fetch(`/api/content/${item.id}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					caption,
					title,
					version: item.version,
				}),
			});

			if (!response.ok) {
				const data = await response.json();
				throw new Error(data.error || 'Failed to save');
			}

			onSave();
			onClose();
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Failed to save');
		} finally {
			setIsSaving(false);
		}
	};

	return (
		<>
			<div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={onClose} />
			<div className="fixed inset-0 z-50 flex items-center justify-center p-4">
				<div className="relative w-full max-w-2xl rounded-lg bg-white overflow-hidden">
					{/* Header */}
					<div className="flex items-center justify-between border-b p-6">
						<h2 className="text-lg font-semibold text-gray-900">Edit Content</h2>
						<button onClick={onClose} className="text-gray-400 hover:text-gray-600">
							<X className="h-6 w-6" />
						</button>
					</div>

					{/* Content */}
					<div className="space-y-6 p-6 max-h-[80vh] overflow-y-auto">
						{/* Title */}
						<div className="space-y-2">
							<label className="block text-sm font-medium text-gray-700">
								Title
							</label>
							<input
								type="text"
								value={title}
								onChange={(e) => setTitle(e.target.value)}
								placeholder="Enter title (optional)"
								disabled={item.publishingStatus === 'published'}
								className="w-full px-3 py-2 border border-gray-300 rounded hover:border-gray-400 focus:outline-none focus:border-indigo-500 disabled:bg-gray-100"
							/>
						</div>

						{/* Caption */}
						<div className="space-y-2">
							<label className="block text-sm font-medium text-gray-700">
								Caption ({caption.length}/2200)
							</label>
							<textarea
								value={caption}
								onChange={(e) => setCaption(e.target.value)}
								placeholder="Enter caption..."
								maxLength={2200}
								disabled={item.publishingStatus === 'published'}
								className="w-full min-h-32 px-3 py-2 border border-gray-300 rounded hover:border-gray-400 focus:outline-none focus:border-indigo-500 disabled:bg-gray-100 font-mono text-sm"
							/>
						</div>

						{/* Error */}
						{error && (
							<div className="rounded-lg bg-red-50 p-4 text-sm text-red-800">
								{error}
							</div>
						)}

						{/* Actions */}
						<div className="flex gap-2 border-t pt-6">
							<button
								onClick={onClose}
								disabled={isSaving}
								className="flex-1 px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 transition font-medium text-sm"
							>
								Cancel
							</button>
							<button
								onClick={handleSave}
								disabled={isSaving}
								className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50 transition font-medium text-sm flex items-center justify-center gap-2"
							>
								{isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
								Save Changes
							</button>
						</div>
					</div>
				</div>
			</div>
		</>
	);
}
