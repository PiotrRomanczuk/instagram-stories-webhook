'use client';

import React, { useState } from 'react';
import { X, Loader2, Upload } from 'lucide-react';

interface ContentSubmitFormProps {
	onClose: () => void;
	onSubmit: () => void;
}

export function ContentSubmitForm({
	onClose,
	onSubmit,
}: ContentSubmitFormProps) {
	const [mediaUrl, setMediaUrl] = useState('');
	const [mediaType, setMediaType] = useState('IMAGE');
	const [title, setTitle] = useState('');
	const [caption, setCaption] = useState('');
	const [source, setSource] = useState('submission');
	const [scheduledTime, setScheduledTime] = useState('');
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [error, setError] = useState('');

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		try {
			setIsSubmitting(true);
			setError('');

			if (!mediaUrl || !mediaType) {
				throw new Error('Please fill in all required fields');
			}

			const response = await fetch('/api/content', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					source,
					mediaUrl,
					mediaType,
					title: title || undefined,
					caption: caption || undefined,
					scheduledTime: scheduledTime
						? new Date(scheduledTime).getTime()
						: undefined,
				}),
			});

			if (!response.ok) {
				const data = await response.json();
				throw new Error(data.error || 'Failed to submit');
			}

			onSubmit();
			onClose();
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Failed to submit');
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<>
			<div
				className='fixed inset-0 z-40 bg-black/50 backdrop-blur-sm'
				onClick={onClose}
			/>
			<div className='fixed inset-0 z-50 flex items-center justify-center p-4'>
				<div className='relative w-full max-w-2xl rounded-lg bg-white overflow-hidden'>
					{/* Header */}
					<div className='flex items-center justify-between border-b p-6'>
						<h2 className='text-lg font-semibold text-gray-900'>
							Create New Post
						</h2>
						<button
							onClick={onClose}
							className='text-gray-400 hover:text-gray-600'
						>
							<X className='h-6 w-6' />
						</button>
					</div>

					{/* Form */}
					<form
						onSubmit={handleSubmit}
						className='space-y-6 p-6 max-h-[80vh] overflow-y-auto'
					>
						{/* Source */}
						<div className='space-y-2'>
							<label className='block text-sm font-medium text-gray-700'>
								Post Type
							</label>
							<select
								value={source}
								onChange={(e) => setSource(e.target.value)}
								className='w-full px-3 py-2 border border-gray-300 rounded hover:border-gray-400 focus:outline-none focus:border-indigo-500'
							>
								<option value='submission'>Community Submission</option>
								<option value='direct'>Direct Schedule (Admin only)</option>
							</select>
						</div>

						{/* Media Type */}
						<div className='space-y-2'>
							<label className='block text-sm font-medium text-gray-700'>
								Media Type
							</label>
							<select
								value={mediaType}
								onChange={(e) => setMediaType(e.target.value)}
								className='w-full px-3 py-2 border border-gray-300 rounded hover:border-gray-400 focus:outline-none focus:border-indigo-500'
							>
								<option value='IMAGE'>Image</option>
								<option value='VIDEO'>Video</option>
							</select>
						</div>

						{/* Media URL */}
						<div className='space-y-2'>
							<label className='block text-sm font-medium text-gray-700'>
								Media URL *
							</label>
							<input
								type='url'
								value={mediaUrl}
								onChange={(e) => setMediaUrl(e.target.value)}
								placeholder='https://example.com/image.jpg'
								required
								className='w-full px-3 py-2 border border-gray-300 rounded hover:border-gray-400 focus:outline-none focus:border-indigo-500'
							/>
							<p className='text-xs text-gray-500'>
								{mediaType === 'IMAGE'
									? 'JPEG, PNG, or WebP (max 8 MB)'
									: 'MP4 or MOV (max 100 MB)'}
							</p>
						</div>

						{/* Title */}
						<div className='space-y-2'>
							<label className='block text-sm font-medium text-gray-700'>
								Title (optional)
							</label>
							<input
								type='text'
								value={title}
								onChange={(e) => setTitle(e.target.value)}
								placeholder='Enter a title...'
								maxLength={100}
								className='w-full px-3 py-2 border border-gray-300 rounded hover:border-gray-400 focus:outline-none focus:border-indigo-500'
							/>
						</div>

						{/* Caption */}
						<div className='space-y-2'>
							<label className='block text-sm font-medium text-gray-700'>
								Caption ({caption.length}/2200)
							</label>
							<textarea
								value={caption}
								onChange={(e) => setCaption(e.target.value)}
								placeholder='Enter caption for Instagram post...'
								maxLength={2200}
								className='w-full min-h-32 px-3 py-2 border border-gray-300 rounded hover:border-gray-400 focus:outline-none focus:border-indigo-500 font-mono text-sm'
							/>
						</div>

						{/* Scheduled Time */}
						{source === 'direct' && (
							<div className='space-y-2 p-4 bg-indigo-50 rounded-lg border border-indigo-100'>
								<label className='block text-sm font-bold text-indigo-900'>
									Scheduled Time (optional)
								</label>
								<input
									type='datetime-local'
									value={scheduledTime}
									onChange={(e) => setScheduledTime(e.target.value)}
									className='w-full px-3 py-2 border border-indigo-200 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500'
								/>
								<p className='text-xs text-indigo-700'>
									If left empty, the post will be saved as a draft.
								</p>
							</div>
						)}

						{/* Info */}
						<div className='rounded-lg bg-blue-50 p-4 text-sm text-blue-800'>
							{source === 'submission'
								? 'Your submission will be reviewed by our team before being scheduled.'
								: 'This will be scheduled directly for publishing (admin only).'}
						</div>

						{/* Error */}
						{error && (
							<div className='rounded-lg bg-red-50 p-4 text-sm text-red-800'>
								{error}
							</div>
						)}

						{/* Actions */}
						<div className='flex gap-2 border-t pt-6'>
							<button
								type='button'
								onClick={onClose}
								disabled={isSubmitting}
								className='flex-1 px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 transition font-medium text-sm'
							>
								Cancel
							</button>
							<button
								type='submit'
								disabled={isSubmitting}
								className='flex-1 px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50 transition font-medium text-sm flex items-center justify-center gap-2'
							>
								{isSubmitting && <Loader2 className='h-4 w-4 animate-spin' />}
								<Upload className='h-4 w-4' />
								Submit
							</button>
						</div>
					</form>
				</div>
			</div>
		</>
	);
}
