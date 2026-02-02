'use client';

import React, { useState } from 'react';
import { ContentItem } from '@/lib/types/posts';
import {
	X,
	Loader2,
	Calendar,
	Type,
	AlignLeft,
	Send,
} from 'lucide-react';
import { DateTimePicker } from '../ui/datetime-picker';
import { StoryPreview } from '../media/story-preview';

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
	const [scheduledDate, setScheduledDate] = useState<Date>(
		item.scheduledTime
			? new Date(item.scheduledTime)
			: new Date(Date.now() + 3600000),
	);
	const [isSaving, setIsSaving] = useState(false);
	const [error, setError] = useState('');

	const handleSchedule = async () => {
		try {
			setIsSaving(true);
			setError('');

			// First update caption/title if changed
			const updateResponse = await fetch(`/api/content/${item.id}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					caption,
					title,
					scheduledTime: scheduledDate.getTime(),
					version: item.version,
				}),
			});

			if (!updateResponse.ok) {
				const data = await updateResponse.json();
				throw new Error(data.error || 'Failed to schedule');
			}

			onSave();
			onClose();
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Failed to schedule');
		} finally {
			setIsSaving(false);
		}
	};

	const handlePublishNow = async () => {
		try {
			setIsSaving(true);
			setError('');

			// First update caption/title if changed
			if (caption !== item.caption || title !== item.title) {
				const updateResponse = await fetch(`/api/content/${item.id}`, {
					method: 'PATCH',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						caption,
						title,
						version: item.version,
					}),
				});

				if (!updateResponse.ok) {
					const data = await updateResponse.json();
					throw new Error(data.error || 'Failed to update content');
				}
			}

			// Then publish directly to Instagram
			const publishResponse = await fetch(`/api/content/${item.id}/publish`, {
				method: 'POST',
			});

			if (!publishResponse.ok) {
				const data = await publishResponse.json();
				throw new Error(data.error || 'Failed to publish');
			}

			onSave();
			onClose();
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Failed to publish');
		} finally {
			setIsSaving(false);
		}
	};

	return (
		<>
			<div
				className='fixed inset-0 z-[60] bg-black/60 backdrop-blur-md transition-all'
				onClick={onClose}
			/>
			<div className='fixed inset-0 z-[70] flex items-center justify-center p-4 sm:p-6'>
				<div className='relative w-full max-w-4xl rounded-3xl bg-white overflow-hidden shadow-2xl ring-1 ring-black/5 flex flex-col md:flex-row max-h-[90vh] animate-in fade-in zoom-in duration-300'>
					{/* Left Side: Phone Preview */}
					<div className='hidden md:flex md:w-2/5 bg-gray-50 dark:bg-[#101622] flex-col border-r border-gray-100 dark:border-slate-800'>
						<div className='p-6 border-b border-gray-100 dark:border-slate-800 flex items-center gap-2'>
							<Calendar className='h-5 w-5 text-indigo-600' />
							<span className='font-bold text-gray-900 dark:text-white'>Story Preview</span>
						</div>
						<div className='flex-1 p-8 flex items-center justify-center bg-gray-100/50 dark:bg-black/20'>
							<StoryPreview imageUrl={item.mediaUrl} alt={title || 'Story preview'} />
						</div>
					</div>

					{/* Right Side: Configuration */}
					<div className='flex-1 flex flex-col overflow-hidden'>
						{/* Header */}
						<div className='flex items-center justify-between border-b p-6 bg-white'>
							<div>
								<h2 className='text-2xl font-black text-gray-900 tracking-tight'>
									Configure Post
								</h2>
								<p className='text-sm text-gray-500 font-medium'>
									Finalize details and set publishing time
								</p>
							</div>
							<button
								onClick={onClose}
								className='text-gray-400 hover:text-gray-900 p-2 rounded-full hover:bg-gray-100 transition-colors'
							>
								<X className='h-6 w-6' />
							</button>
						</div>

						{/* Scrollable Content */}
						<div className='flex-1 overflow-y-auto p-8 space-y-8 bg-white'>
							{/* Scheduling Section */}
							<section className='space-y-4'>
								<div className='flex items-center gap-2 mb-2'>
									<div className='p-2 bg-indigo-50 rounded-lg text-indigo-600'>
										<Calendar className='h-4 w-4' />
									</div>
									<h3 className='font-bold text-gray-900'>
										Publishing Schedule
									</h3>
								</div>

								<div className='p-1 bg-gray-50 rounded-2xl border border-gray-100'>
									<DateTimePicker
										value={scheduledDate}
										onChange={setScheduledDate}
										minDate={new Date()}
									/>
								</div>
								<p className='text-xs text-gray-400 pl-2 font-medium'>
									Select a future date and time for automatic publishing.
								</p>
							</section>

							{/* Post Content Section */}
							<section className='space-y-6'>
								<div className='flex items-center gap-2 mb-2'>
									<div className='p-2 bg-pink-50 rounded-lg text-pink-600'>
										<AlignLeft className='h-4 w-4' />
									</div>
									<h3 className='font-bold text-gray-900'>Post Metadata</h3>
								</div>

								<div className='space-y-4'>
									<div className='group'>
										<label className='block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1 transition-colors group-focus-within:text-pink-600'>
											Internal Title
										</label>
										<div className='relative'>
											<Type className='absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-300 group-focus-within:text-pink-600 transition-colors' />
											<input
												type='text'
												value={title}
												onChange={(e) => setTitle(e.target.value)}
												placeholder='Give this post a title...'
												className='w-full pl-11 pr-4 py-3 bg-gray-50 border border-transparent rounded-xl focus:bg-white focus:border-pink-200 focus:ring-4 focus:ring-pink-50/50 outline-none transition-all font-medium text-gray-900'
											/>
										</div>
									</div>

									<div className='group'>
										<label className='block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1 transition-colors group-focus-within:text-pink-600'>
											Instagram Caption
										</label>
										<div className='relative'>
											<textarea
												value={caption}
												onChange={(e) => setCaption(e.target.value)}
												placeholder='Write a catchy caption...'
												maxLength={2200}
												className='w-full p-4 bg-gray-50 border border-transparent rounded-2xl focus:bg-white focus:border-pink-200 focus:ring-4 focus:ring-pink-50/50 outline-none transition-all font-mono text-sm min-h-[120px] text-gray-900 leading-relaxed'
											/>
											<div className='absolute bottom-3 right-4 text-[10px] font-bold text-gray-400'>
												{caption.length} / 2200
											</div>
										</div>
									</div>
								</div>
							</section>

							{/* Error Message */}
							{error && (
								<div className='p-4 bg-red-50 rounded-xl border border-red-100 flex gap-3 animate-in slide-in-from-top-2'>
									<X className='h-5 w-5 text-red-500 shrink-0' />
									<p className='text-sm text-red-700 font-medium'>{error}</p>
								</div>
							)}
						</div>

						{/* Sticky Footer */}
						<div className='p-6 border-t bg-gray-50 flex flex-col sm:flex-row gap-4'>
							<button
								onClick={onClose}
								disabled={isSaving}
								className='px-6 py-3 text-gray-500 font-bold hover:text-gray-900 transition-colors'
							>
								Cancel
							</button>
							<div className='flex-1 flex flex-col sm:flex-row gap-3'>
								{(item.source !== 'submission' ||
									item.submissionStatus === 'approved') && (
									<button
										onClick={handlePublishNow}
										disabled={isSaving}
										className='flex-1 px-6 py-4 bg-emerald-500 text-white rounded-2xl hover:bg-emerald-600 active:scale-[0.98] transition-all font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-200/50'
									>
										{isSaving && <Loader2 className='h-4 w-4 animate-spin' />}
										<Send className='h-4 w-4' />
										Publish Now
									</button>
								)}
								<button
									onClick={handleSchedule}
									disabled={isSaving}
									className='flex-1 px-6 py-4 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 active:scale-[0.98] transition-all font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-indigo-200/50'
								>
									{isSaving && <Loader2 className='h-4 w-4 animate-spin' />}
									<Calendar className='h-4 w-4' />
									Schedule Post
								</button>
							</div>
						</div>
					</div>
				</div>
			</div>
		</>
	);
}
