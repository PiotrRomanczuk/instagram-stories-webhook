'use client';

import React, { useState } from 'react';
import { ContentItem } from '@/lib/types/posts';
import { X, Loader2, ChevronDown } from 'lucide-react';

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
	const [scheduledTime, setScheduledTime] = useState<string>(
		item.scheduledTime
			? new Date(item.scheduledTime).toISOString().slice(0, 16)
			: '',
	);
	const [isSaving, setIsSaving] = useState(false);
	const [error, setError] = useState('');

	const handleSave = async (publishNow = false) => {
		try {
			setIsSaving(true);
			setError('');

			const timeToSchedule = publishNow
				? Date.now()
				: scheduledTime
					? new Date(scheduledTime).getTime()
					: item.scheduledTime;

			const response = await fetch(`/api/content/${item.id}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					caption,
					title,
					scheduledTime: timeToSchedule,
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
			<div
				className='fixed inset-0 z-40 bg-black/50 backdrop-blur-sm'
				onClick={onClose}
			/>
			<div className='fixed inset-0 z-50 flex items-center justify-center p-4'>
				<div className='relative w-full max-w-2xl rounded-lg bg-white overflow-hidden shadow-2xl'>
					{/* Header */}
					<div className='flex items-center justify-between border-b p-6'>
						<div>
							<h2 className='text-xl font-bold text-gray-900'>
								Configure Post
							</h2>
							<p className='text-sm text-gray-500'>
								Set schedule and optional details
							</p>
						</div>
						<button
							onClick={onClose}
							className='text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-100'
						>
							<X className='h-6 w-6' />
						</button>
					</div>

					{/* Content */}
					<div className='space-y-6 p-6 max-h-[80vh] overflow-y-auto'>
						{/* Scheduling */}
						<div className='space-y-2 p-4 bg-indigo-50 rounded-xl border border-indigo-100'>
							<label className='block text-sm font-bold text-indigo-900'>
								Scheduled Time
							</label>
							<input
								type='datetime-local'
								value={scheduledTime}
								onChange={(e) => setScheduledTime(e.target.value)}
								disabled={item.publishingStatus === 'published'}
								className='w-full px-4 py-3 border border-indigo-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-indigo-50/50'
							/>
							<p className='text-xs text-indigo-700'>
								Leave empty to keep as draft, or set a time to schedule.
							</p>
						</div>

						{/* Title & Caption - simplified/demoted as per user feedback */}
						<details className='group'>
							<summary className='flex items-center justify-between cursor-pointer list-none p-4 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors'>
								<span className='text-sm font-semibold text-gray-700'>
									Edit Title & Caption (Optional)
								</span>
								<ChevronDown className='h-4 w-4 text-gray-500 group-open:rotate-180 transition-transform' />
							</summary>
							<div className='space-y-4 pt-4 px-1'>
								<div className='space-y-2'>
									<label className='block text-xs font-medium text-gray-500 uppercase tracking-wider'>
										Title
									</label>
									<input
										type='text'
										value={title}
										onChange={(e) => setTitle(e.target.value)}
										placeholder='Enter title (optional)'
										disabled={item.publishingStatus === 'published'}
										className='w-full px-3 py-2 border border-gray-300 rounded-lg hover:border-gray-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:bg-gray-100'
									/>
								</div>

								<div className='space-y-2'>
									<label className='block text-xs font-medium text-gray-500 uppercase tracking-wider'>
										Caption ({caption.length}/2200)
									</label>
									<textarea
										value={caption}
										onChange={(e) => setCaption(e.target.value)}
										placeholder='Enter caption...'
										maxLength={2200}
										disabled={item.publishingStatus === 'published'}
										className='w-full min-h-24 px-3 py-2 border border-gray-300 rounded-lg hover:border-gray-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:bg-gray-100 font-mono text-sm'
									/>
								</div>
							</div>
						</details>

						{/* Error */}
						{error && (
							<div className='rounded-lg bg-red-50 p-4 text-sm text-red-800 border border-red-100'>
								{error}
							</div>
						)}

						{/* Actions */}
						<div className='flex flex-col sm:flex-row gap-3 border-t pt-6'>
							<button
								onClick={onClose}
								disabled={isSaving}
								className='order-3 sm:order-1 px-4 py-2 text-gray-600 hover:bg-gray-50 rounded-lg transition font-medium text-sm'
							>
								Cancel
							</button>
							<div className='order-1 sm:order-2 flex-1 flex gap-2'>
								<button
									onClick={() => handleSave(true)}
									disabled={isSaving || item.publishingStatus === 'published'}
									className='flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition font-bold text-sm flex items-center justify-center gap-2 shadow-sm'
								>
									{isSaving && <Loader2 className='h-4 w-4 animate-spin' />}
									Publish Now
								</button>
								<button
									onClick={() => handleSave(false)}
									disabled={isSaving || item.publishingStatus === 'published'}
									className='flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition font-bold text-sm flex items-center justify-center gap-2 shadow-sm'
								>
									{isSaving && <Loader2 className='h-4 w-4 animate-spin' />}
									{scheduledTime ? 'Schedule Post' : 'Save Changes'}
								</button>
							</div>
						</div>
					</div>
				</div>
			</div>
		</>
	);
}
