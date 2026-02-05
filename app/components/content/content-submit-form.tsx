'use client';

import React, { useState } from 'react';
import { X, Loader2, Upload } from 'lucide-react';
import { ImageUploader } from '@/app/components/media/image-uploader';
import { VideoUploader } from '@/app/components/media/video-uploader';
import { VideoThumbnailSelector } from '@/app/components/media/video-thumbnail-selector';
import { TagInput } from '@/app/components/ui/tag-input';
import { MediaDimensions, VideoMetadata, UserTag } from '@/lib/types';

interface ContentSubmitFormProps {
	onClose: () => void;
	onSubmit: () => void;
}

export function ContentSubmitForm({
	onClose,
	onSubmit,
}: ContentSubmitFormProps) {
	const [mediaUrl, setMediaUrl] = useState('');
	const [mediaType, setMediaType] = useState<'IMAGE' | 'VIDEO'>('IMAGE');
	const [storagePath, setStoragePath] = useState('');
	const [dimensions, setDimensions] = useState<MediaDimensions | undefined>();
	const [thumbnailUrl, setThumbnailUrl] = useState('');
	const [videoMetadata, setVideoMetadata] = useState<VideoMetadata | undefined>();
	const [showThumbnailSelector, setShowThumbnailSelector] = useState(false);
	const [title, setTitle] = useState('');
	const [caption, setCaption] = useState('');
	const [tags, setTags] = useState<string[]>([]);
	const [source, setSource] = useState('submission');
	const [scheduledTime, setScheduledTime] = useState('');
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [error, setError] = useState('');

	const handleMediaUpload = (
		url: string | null,
		metadata?: MediaDimensions | VideoMetadata,
		path?: string
	) => {
		setMediaUrl(url || '');
		setStoragePath(path || '');

		if (mediaType === 'IMAGE' && metadata && 'width' in metadata) {
			setDimensions(metadata as MediaDimensions);
		} else if (mediaType === 'VIDEO' && metadata && 'duration' in metadata) {
			setVideoMetadata(metadata as VideoMetadata);
			setDimensions({
				width: metadata.width,
				height: metadata.height,
			});
			// Show thumbnail selector after video upload
			if (url) {
				setShowThumbnailSelector(true);
			}
		}
	};

	const handleThumbnailSelect = (thumbnail: string) => {
		setThumbnailUrl(thumbnail);
		setShowThumbnailSelector(false);
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		try {
			setIsSubmitting(true);
			setError('');

			if (!mediaUrl || !mediaType) {
				throw new Error('Please upload media');
			}

			// For videos, require thumbnail selection
			if (mediaType === 'VIDEO' && !thumbnailUrl) {
				throw new Error('Please select a thumbnail for the video');
			}

			// Map usernames to UserTag objects with default center position
			const userTags: UserTag[] | undefined = tags.length > 0
				? tags.map((username) => ({
						username,
						x: 0.5,
						y: 0.5,
				  }))
				: undefined;

			const response = await fetch('/api/content', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					source,
					mediaUrl,
					mediaType,
					title: title || undefined,
					caption: caption || undefined,
					userTags,
					scheduledTime: scheduledTime
						? new Date(scheduledTime).getTime()
						: undefined,
					storagePath: storagePath || undefined,
					dimensions,
					thumbnailUrl: mediaType === 'VIDEO' ? thumbnailUrl : undefined,
					videoDuration: videoMetadata?.duration,
					videoCodec: videoMetadata?.codec,
					videoFramerate: videoMetadata?.frameRate,
					needsProcessing: false, // Already processed by uploader if needed
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

						{/* Media Type Selector */}
						<div className='space-y-2'>
							<label className='block text-sm font-medium text-gray-700'>
								Media Type *
							</label>
							<div className='grid grid-cols-2 gap-2'>
								<button
									type='button'
									onClick={() => {
										setMediaType('IMAGE');
										setMediaUrl('');
										setThumbnailUrl('');
										setVideoMetadata(undefined);
									}}
									className={`px-4 py-2 border rounded transition ${
										mediaType === 'IMAGE'
											? 'border-indigo-500 bg-indigo-50 text-indigo-700 font-medium'
											: 'border-gray-300 hover:border-gray-400'
									}`}
								>
									📷 Image
								</button>
								<button
									type='button'
									onClick={() => {
										setMediaType('VIDEO');
										setMediaUrl('');
										setThumbnailUrl('');
										setDimensions(undefined);
									}}
									className={`px-4 py-2 border rounded transition ${
										mediaType === 'VIDEO'
											? 'border-indigo-500 bg-indigo-50 text-indigo-700 font-medium'
											: 'border-gray-300 hover:border-gray-400'
									}`}
								>
									🎥 Video
								</button>
							</div>
						</div>

						{/* Media Upload */}
						<div className='space-y-2'>
							<label className='block text-sm font-medium text-gray-700'>
								{mediaType === 'IMAGE' ? 'Upload Image' : 'Upload Video'} *
							</label>
							{mediaType === 'IMAGE' ? (
								<ImageUploader
									value={mediaUrl}
									onChange={handleMediaUpload}
								/>
							) : (
								<VideoUploader
									value={mediaUrl}
									onChange={handleMediaUpload}
									autoProcess={true}
								/>
							)}
						</div>

						{/* Thumbnail Selector for Videos */}
						{mediaType === 'VIDEO' && mediaUrl && showThumbnailSelector && (
							<div className='space-y-2 border rounded-lg p-4 bg-gray-50'>
								<VideoThumbnailSelector
									videoUrl={mediaUrl}
									onThumbnailSelect={handleThumbnailSelect}
								/>
							</div>
						)}

						{/* Show selected thumbnail */}
						{mediaType === 'VIDEO' && thumbnailUrl && (
							<div className='space-y-2'>
								<label className='block text-sm font-medium text-gray-700'>
									Selected Thumbnail
								</label>
								<div className='relative inline-block'>
									<img
										src={thumbnailUrl}
										alt='Video thumbnail'
										className='max-h-32 rounded-lg border'
									/>
									<button
										type='button'
										onClick={() => {
											setThumbnailUrl('');
											setShowThumbnailSelector(true);
										}}
										className='absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600'
									>
										<X className='h-4 w-4' />
									</button>
								</div>
							</div>
						)}

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

						{/* User Tags */}
						<div className='space-y-2'>
							<label className='block text-sm font-medium text-gray-700'>
								Tag Users (optional)
							</label>
							<TagInput
								tags={tags}
								onChange={setTags}
								placeholder='@username'
								maxTags={20}
							/>
							<p className='text-xs text-gray-500 pl-1'>
								Tags will be positioned at the center of the media by default
							</p>
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
								disabled={isSubmitting || !mediaUrl || (mediaType === 'VIDEO' && !thumbnailUrl)}
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
