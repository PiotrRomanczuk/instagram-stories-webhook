'use client';

import { useState, useMemo } from 'react';
import Image from 'next/image';
import { X, Check, Clock, ZoomIn, Loader2, Calendar } from 'lucide-react';
import { ScheduledPostWithUser } from '@/lib/types';
import { TagInput } from '../ui/tag-input';
import { TimePicker } from '../ui/time-picker';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '../ui/select';
import { Label } from '../ui/label';
import { generateDayOptions } from '@/lib/utils/date-time';
import { useMediaValidation } from '@/app/hooks/use-media-validation';
import {
	AspectRatioIndicator,
	ProcessingPrompt,
} from '../media/aspect-ratio-indicator';

interface PostEditModalProps {
	isOpen: boolean;
	onClose: () => void;
	post: ScheduledPostWithUser;
	onSave: (
		newTime: Date,
		tags: string[],
		updatedPost?: { url?: string; caption?: string },
	) => void;
	onCancel?: () => void;
}

export function PostEditModal({
	isOpen,
	onClose,
	post,
	onSave,
	onCancel,
}: PostEditModalProps) {
	const [editDate, setEditDate] = useState(new Date(post.scheduledTime));
	const [editTags, setEditTags] = useState(
		post.userTags?.map((t) => t.username) || [],
	);
	const [editUrl, setEditUrl] = useState(post.url);
	const [editCaption, setEditCaption] = useState(post.caption || '');
	const [isSaving, setIsSaving] = useState(false);
	const [isProcessing, setIsProcessing] = useState(false);
	const [showMediaPreview, setShowMediaPreview] = useState(false);
	const [urlError, setUrlError] = useState('');

	const mediaValidation = useMediaValidation();

	// Initial validation
	useState(() => {
		if (post.url && post.type === 'IMAGE') {
			mediaValidation.validateUrl(post.url);
		}
	});

	// Generate day items for date select (next 30 days)
	const dayItems = useMemo(() => {
		return generateDayOptions(30);
	}, []);

	const selectedDayValue = useMemo(() => {
		const valueDate = new Date(editDate);
		valueDate.setHours(0, 0, 0, 0);
		const idx = dayItems.findIndex((item) => {
			const itemDate = new Date(item.date);
			itemDate.setHours(0, 0, 0, 0);
			return itemDate.getTime() === valueDate.getTime();
		});
		return String(idx >= 0 ? idx : 0);
	}, [editDate, dayItems]);

	const handleDayChange = (dayValue: string) => {
		const idx = parseInt(dayValue, 10);
		const newDate = new Date(dayItems[idx].date);
		newDate.setHours(editDate.getHours(), editDate.getMinutes(), 0, 0);
		setEditDate(newDate);
	};

	const handleSave = async () => {
		setUrlError('');

		if (!editUrl) {
			setUrlError('Media URL is required');
			return;
		}

		try {
			new URL(editUrl);
		} catch {
			setUrlError('Please enter a valid URL');
			return;
		}

		// Validate: must be at least 3 minutes from now
		const now = new Date();
		const minTime = new Date(now.getTime() + 3 * 60 * 1000); // 3 minutes
		if (editDate < minTime) {
			setUrlError('Scheduled time must be at least 3 minutes from now');
			return;
		}

		setIsSaving(true);
		try {
			onSave(editDate, editTags, {
				url: editUrl,
				caption: editCaption,
			});
			onClose();
		} finally {
			setIsSaving(false);
		}
	};

	const handleProcessImage = async (options: { blurBackground: boolean }) => {
		if (!editUrl || post.type !== 'IMAGE') return;

		setIsProcessing(true);
		try {
			const response = await fetch('/api/media/process', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					imageUrl: editUrl,
					blurBackground: options.blurBackground,
					backgroundColor: '#000000',
				}),
			});

			const data = await response.json();

			if (!response.ok) throw new Error(data.error || 'Processing failed');

			if (data.wasProcessed) {
				setEditUrl(data.processedUrl);
				await mediaValidation.validateUrl(data.processedUrl);
			}
		} catch (error) {
			console.error('Processing failed:', error);
		} finally {
			setIsProcessing(false);
		}
	};

	const handleCancel = () => {
		if (onCancel) {
			onCancel();
		}
		onClose();
	};

	if (!isOpen) return null;

	return (
		<>
			{/* Backdrop */}
			<div
				className='fixed inset-0 bg-black/50 z-40 backdrop-blur-sm'
				onClick={onClose}
			/>

			{/* Modal */}
			<div className='fixed inset-0 z-50 flex items-center justify-center p-4'>
				<div
					className='bg-white rounded-2xl shadow-2xl overflow-hidden max-w-2xl w-full max-h-[90vh] overflow-y-auto'
					onClick={(e) => e.stopPropagation()}
				>
					{/* Header */}
					<div className='sticky top-0 flex items-center justify-between p-6 bg-gradient-to-r from-indigo-50 to-white border-b border-gray-200 z-10'>
						<h2 className='text-lg font-bold text-gray-900'>Reschedule Post</h2>
						<button
							onClick={onClose}
							className='p-2 hover:bg-gray-100 rounded-lg transition'
						>
							<X className='w-5 h-5 text-gray-500' />
						</button>
					</div>

					{/* Content */}
					<div className='p-6 space-y-6'>
						{/* Media Preview */}
						<div className='bg-gray-50 rounded-xl p-4 border border-gray-200'>
							<div className='flex items-center justify-between mb-3'>
								<span className='text-xs font-bold text-gray-600 uppercase tracking-wide'>
									Media Preview
								</span>
								<button
									onClick={() => setShowMediaPreview(!showMediaPreview)}
									className='p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition'
									title='Expand preview'
								>
									<ZoomIn className='w-4 h-4' />
								</button>
							</div>

							<div
								className={`relative bg-gray-100 rounded-lg overflow-hidden ${showMediaPreview ? 'h-96' : 'h-48'} transition-all duration-200`}
							>
								{post.type === 'VIDEO' ? (
									<video
										src={post.url}
										className='w-full h-full object-cover'
										controls={false}
									/>
								) : (
									<Image
										src={post.url}
										alt='Post preview'
										fill
										className='object-cover'
										unoptimized
									/>
								)}
							</div>

							{/* Type Badge */}
							<div className='mt-3 flex items-center gap-2'>
								<span className='px-2 py-1 bg-black text-white text-[10px] font-bold rounded-lg'>
									{post.type}
								</span>
								{post.caption && (
									<p className='text-xs text-gray-600 line-clamp-1 flex-1'>
										{post.caption}
									</p>
								)}
							</div>

							{/* Aspect Ratio Analysis */}
							{post.type === 'IMAGE' && (
								<div className='mt-4 space-y-3'>
									<AspectRatioIndicator
										aspectInfo={mediaValidation.aspectInfo}
										dimensions={mediaValidation.dimensions}
										isLoading={mediaValidation.isLoading}
									/>
									<ProcessingPrompt
										aspectInfo={mediaValidation.aspectInfo!}
										onProcess={handleProcessImage}
										isProcessing={isProcessing}
									/>
								</div>
							)}
						</div>

						{/* Edit Fields */}
						<div className='space-y-4'>
							{/* Media URL */}
							<div>
								<label className='block text-sm font-bold text-gray-700 mb-2'>
									Media URL
								</label>
								<input
									type='url'
									value={editUrl}
									onChange={(e) => {
										setEditUrl(e.target.value);
										setUrlError('');
									}}
									placeholder='https://example.com/image.jpg'
									className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 ${
										urlError
											? 'border-rose-300 bg-rose-50 focus:ring-rose-500'
											: 'border-gray-200 focus:ring-indigo-500'
									}`}
								/>
								{urlError && (
									<p className='text-xs text-rose-600 mt-1'>{urlError}</p>
								)}
							</div>

							{/* Caption */}
							<div>
								<label className='block text-sm font-bold text-gray-700 mb-2'>
									Caption
								</label>
								<textarea
									value={editCaption}
									onChange={(e) => setEditCaption(e.target.value)}
									placeholder='Add a caption (optional)'
									maxLength={2200}
									rows={3}
									className='w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none'
								/>
								<p className='text-[10px] text-gray-400 mt-1 text-right'>
									{editCaption.length}/2200
								</p>
							</div>

							{/* Date & Time - Inline */}
							<div>
								<label className='block text-sm font-bold text-gray-700 mb-3'>
									<Clock className='w-4 h-4 inline mr-1.5' />
									Scheduled Time
								</label>

								<div className='space-y-3 p-3 bg-gray-50 rounded-xl border border-gray-200'>
									{/* Date Select */}
									<div className='space-y-2'>
										<Label className='text-xs font-semibold text-gray-600 flex items-center gap-1.5'>
											<Calendar className='h-3.5 w-3.5' />
											Date
										</Label>
										<Select value={selectedDayValue} onValueChange={handleDayChange}>
											<SelectTrigger className='w-full bg-white'>
												<SelectValue />
											</SelectTrigger>
											<SelectContent>
												{dayItems.map((item) => (
													<SelectItem key={item.value} value={item.value}>
														{item.label}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
									</div>

									{/* Time Picker */}
									<div className='space-y-2'>
										<Label className='text-xs font-semibold text-gray-600 flex items-center gap-1.5'>
											<Clock className='h-3.5 w-3.5' />
											Time
										</Label>
										<TimePicker value={editDate} onChange={setEditDate} />
									</div>
								</div>

								<p className='text-[10px] text-gray-400 mt-1.5 pl-1'>
									Timezone:{' '}
									{new Intl.DateTimeFormat().resolvedOptions().timeZone}
								</p>
							</div>

							{/* Quick Adjust Buttons */}
							<div>
								<label className='block text-xs font-bold text-gray-600 mb-2 uppercase tracking-wide'>
									Quick Adjust
								</label>
								<div className='flex flex-wrap gap-2'>
									{[
										{ label: '-1h', minutes: -60 },
										{ label: '-15m', minutes: -15 },
										{ label: '+15m', minutes: 15 },
										{ label: '+1h', minutes: 60 },
									].map(({ label, minutes }) => (
										<button
											key={label}
											type='button'
											onClick={() => {
												const newDate = new Date(editDate);
												newDate.setMinutes(newDate.getMinutes() + minutes);
												setEditDate(newDate);
											}}
											className='px-3 py-1.5 text-xs font-bold bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition'
										>
											{label}
										</button>
									))}
								</div>
							</div>

							{/* Tags - Hidden per user request */}
							{/* <div>
								<label className='block text-sm font-bold text-gray-700 mb-2'>
									Edit Tags
								</label>
								<TagInput
									tags={editTags}
									onChange={setEditTags}
									placeholder='@username'
									maxTags={20}
								/>
							</div> */}
						</div>

						{/* Error if exists */}
						{post.error && (
							<div className='p-3 bg-rose-50 border border-rose-200 rounded-lg'>
								<p className='text-xs font-bold text-rose-600 uppercase tracking-tight'>
									Error: {post.error}
								</p>
							</div>
						)}
					</div>

					{/* Footer */}
					<div className='sticky bottom-0 flex items-center justify-end gap-3 p-6 bg-gray-50 border-t border-gray-200'>
						<button
							onClick={handleCancel}
							className='px-4 py-2 text-sm font-bold text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition'
						>
							Cancel
						</button>
						<button
							onClick={handleSave}
							disabled={isSaving}
							className='flex items-center gap-2 px-4 py-2 text-sm font-bold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition disabled:opacity-50'
						>
							<Check className='w-4 h-4' />
							{isSaving ? 'Saving...' : 'Save Changes'}
						</button>
					</div>
				</div>
			</div>
		</>
	);
}
