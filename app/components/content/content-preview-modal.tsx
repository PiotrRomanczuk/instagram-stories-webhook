'use client';

import React, { useState } from 'react';
import { ContentItem } from '@/lib/types/posts';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

interface ContentPreviewModalProps {
	item: ContentItem;
	onClose: () => void;
	onEdit: (item: ContentItem) => void;
	onRefresh: () => void;
}

export function ContentPreviewModal({
	item,
	onClose,
	onEdit,
	onRefresh,
}: ContentPreviewModalProps) {
	const [showStoryFrame, setShowStoryFrame] = useState(false);

	return (
		<>
			<div
				className='fixed inset-0 z-40 bg-black/60 backdrop-blur-sm'
				onClick={onClose}
			/>
			<div className='fixed inset-0 z-50 flex items-center justify-center p-4'>
				<div className='relative max-h-[95vh] w-full max-w-5xl overflow-y-auto rounded-2xl bg-white shadow-2xl ring-1 ring-black/5'>
					{/* Header */}
					<div className='sticky top-0 z-10 flex items-center justify-between border-b bg-white/80 backdrop-blur-md px-6 py-4'>
						<div>
							<h2 className='text-xl font-bold text-gray-900'>
								{item.title || 'Content Preview'}
							</h2>
							<p className='text-xs text-gray-500 uppercase tracking-wider font-semibold mt-0.5'>
								{item.source} • {item.mediaType}
							</p>
						</div>
						<button
							onClick={onClose}
							className='rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors'
						>
							<X className='h-6 w-6' />
						</button>
					</div>

					{/* Content */}
					<div className='grid gap-8 p-8 md:grid-cols-2'>
						{/* Media Preview */}
						<div className='flex flex-col gap-6'>
							<div className='group relative overflow-hidden rounded-xl bg-gray-950 shadow-inner min-h-[400px] flex items-center justify-center'>
								{showStoryFrame ? (
									<div className='h-full w-full aspect-[9/16] flex items-center justify-center bg-zinc-950 text-white relative overflow-hidden'>
										{/* Blurred Background Mockup */}
										<img
											src={item.mediaUrl}
											alt=''
											className='absolute inset-0 h-full w-full object-cover blur-2xl opacity-40 scale-110'
										/>

										{/* Main Image Fitted */}
										<img
											src={item.mediaUrl}
											alt='preview'
											className='relative z-10 max-h-full max-w-full object-contain drop-shadow-2xl'
											onError={(e) => {
												(e.target as HTMLImageElement).src = '/placeholder.svg';
											}}
										/>

										{/* Story UI Overlays */}
										<div className='absolute inset-0 z-20 pointer-events-none p-4 flex flex-col justify-between'>
											<div className='space-y-4'>
												{/* Progress Bar Mockup */}
												<div className='flex gap-1 h-1'>
													<div className='flex-1 bg-white/80 rounded-full h-full' />
													<div className='flex-1 bg-white/30 rounded-full h-full' />
													<div className='flex-1 bg-white/30 rounded-full h-full' />
												</div>
												{/* Profile Mockup */}
												<div className='flex items-center gap-2'>
													<div className='w-8 h-8 rounded-full bg-gradient-to-tr from-yellow-400 to-purple-600 p-0.5'>
														<div className='w-full h-full rounded-full bg-zinc-800 border-2 border-zinc-950 flex items-center justify-center'>
															<span className='text-[10px] font-bold'>IG</span>
														</div>
													</div>
													<div className='flex flex-col'>
														<span className='text-[12px] font-bold text-white leading-none'>
															Your Story
														</span>
														<span className='text-[10px] text-zinc-400 font-medium tracking-tight'>
															Sponsored
														</span>
													</div>
												</div>
											</div>
										</div>

										{/* Tags */}
										{item.userTags && item.userTags.length > 0 && (
											<div className='absolute inset-0 z-30 pointer-events-none'>
												{item.userTags.map((tag, i) => (
													<div
														key={i}
														className='absolute px-3 py-1.5 bg-black/40 backdrop-blur-md rounded-lg flex items-center gap-1.5 text-white text-[11px] font-bold border border-white/20 whitespace-nowrap'
														style={{
															left: `${tag.x * 100}%`,
															top: `${tag.y * 100}%`,
															transform: 'translate(-50%, -50%)',
														}}
													>
														<span className='opacity-70 text-xs'>@</span>
														{tag.username}
													</div>
												))}
											</div>
										)}
									</div>
								) : (
									<div className='relative group'>
										<img
											src={item.mediaUrl}
											alt='preview'
											className='max-w-full h-auto object-contain rounded-lg'
											onError={(e) => {
												(e.target as HTMLImageElement).src = '/placeholder.svg';
											}}
										/>
										<div className='absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors pointer-events-none rounded-lg' />
									</div>
								)}
							</div>

							<div className='flex gap-3'>
								<button
									onClick={() => setShowStoryFrame(!showStoryFrame)}
									className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl border font-bold text-sm transition-all shadow-sm ${
										showStoryFrame
											? 'bg-zinc-900 text-white border-zinc-800 hover:bg-zinc-800'
											: 'bg-white text-zinc-700 border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50'
									}`}
								>
									{showStoryFrame ? 'Show Original Image' : 'Preview as Story'}
								</button>
							</div>
						</div>

						{/* Details */}
						<div className='space-y-6'>
							{/* Status Timeline */}
							<div className='space-y-3'>
								<h3 className='font-semibold text-gray-900'>Timeline</h3>
								<div className='space-y-2'>
									<div className='flex items-center gap-3'>
										<div className='flex h-8 w-8 items-center justify-center rounded-full bg-green-100 text-green-800 text-xs font-bold'>
											✓
										</div>
										<div>
											<div className='text-sm font-medium text-gray-900'>
												Submitted
											</div>
											<div className='text-xs text-gray-500'>
												{new Date(item.createdAt).toLocaleString()}
											</div>
										</div>
									</div>

									{item.source === 'submission' && item.submissionStatus && (
										<div className='flex items-center gap-3'>
											<div
												className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
													item.submissionStatus === 'approved'
														? 'bg-green-100 text-green-800'
														: item.submissionStatus === 'rejected'
															? 'bg-red-100 text-red-800'
															: 'bg-yellow-100 text-yellow-800'
												}`}
											>
												{item.submissionStatus === 'approved'
													? '✓'
													: item.submissionStatus === 'rejected'
														? '✕'
														: '⏳'}
											</div>
											<div>
												<div className='text-sm font-medium capitalize text-gray-900'>
													{item.submissionStatus}
												</div>
												{item.reviewedAt && (
													<div className='text-xs text-gray-500'>
														{new Date(item.reviewedAt).toLocaleString()}
													</div>
												)}
											</div>
										</div>
									)}

									{item.scheduledTime && (
										<div className='flex items-center gap-3'>
											<div className='flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-800 text-xs font-bold'>
												📅
											</div>
											<div>
												<div className='text-sm font-medium text-gray-900'>
													Scheduled
												</div>
												<div className='text-xs text-gray-500'>
													{new Date(item.scheduledTime).toLocaleString()}
												</div>
											</div>
										</div>
									)}

									{item.publishedAt && (
										<div className='flex items-center gap-3'>
											<div className='flex h-8 w-8 items-center justify-center rounded-full bg-green-100 text-green-800 text-xs font-bold'>
												✓
											</div>
											<div>
												<div className='text-sm font-medium text-gray-900'>
													Published
												</div>
												<div className='text-xs text-gray-500'>
													{new Date(item.publishedAt).toLocaleString()}
												</div>
											</div>
										</div>
									)}

									{item.error && (
										<div className='flex items-center gap-3'>
											<div className='flex h-8 w-8 items-center justify-center rounded-full bg-red-100 text-red-800 text-xs font-bold'>
												✕
											</div>
											<div>
												<div className='text-sm font-medium text-gray-900'>
													Failed
												</div>
												<div className='text-xs text-gray-500'>
													{item.error}
												</div>
											</div>
										</div>
									)}
								</div>
							</div>

							{/* Caption */}
							{item.caption && (
								<div className='space-y-2'>
									<h3 className='font-semibold text-gray-900'>Caption</h3>
									<p className='text-sm text-gray-700 whitespace-pre-wrap'>
										{item.caption}
									</p>
								</div>
							)}

							{/* Metadata */}
							<div className='space-y-2 border-t pt-4'>
								<h3 className='font-semibold text-gray-900'>Details</h3>
								<dl className='space-y-2 text-sm'>
									<div className='flex justify-between'>
										<dt className='text-gray-600'>Source:</dt>
										<dd className='font-medium capitalize text-gray-900'>
											{item.source}
										</dd>
									</div>
									<div className='flex justify-between'>
										<dt className='text-gray-600'>Media Type:</dt>
										<dd className='font-medium text-gray-900'>
											{item.mediaType}
										</dd>
									</div>
									<div className='flex justify-between'>
										<dt className='text-gray-600'>Status:</dt>
										<dd className='font-medium capitalize text-gray-900'>
											{item.source === 'submission' &&
											item.submissionStatus &&
											item.submissionStatus !== 'approved'
												? `${item.submissionStatus} (${item.publishingStatus})`
												: item.publishingStatus}
										</dd>
									</div>
								</dl>
							</div>

							{/* Actions */}
							<div className='flex flex-col gap-3 border-t pt-6'>
								{item.publishingStatus !== 'published' && (
									<div className='flex gap-2'>
										<button
											onClick={async () => {
												if (confirm('Publish this post immediately?')) {
													try {
														const response = await fetch(
															`/api/content/${item.id}`,
															{
																method: 'PATCH',
																headers: { 'Content-Type': 'application/json' },
																body: JSON.stringify({
																	scheduledTime: Date.now(),
																	version: item.version,
																}),
															},
														);
														if (response.ok) {
															onRefresh();
															onClose();
														}
													} catch (err) {
														console.error('Failed to publish now', err);
													}
												}
											}}
											className='flex-1 px-6 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition font-bold text-sm shadow-md'
										>
											Publish Now
										</button>
										<button
											onClick={() => onEdit(item)}
											className='flex-1 px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition font-bold text-sm shadow-md flex items-center justify-center gap-2'
										>
											{item.publishingStatus === 'scheduled'
												? 'Reschedule'
												: 'Schedule Post'}
										</button>
									</div>
								)}
								<button
									onClick={onClose}
									className='w-full px-6 py-3 border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 transition font-medium text-sm'
								>
									Close Preview
								</button>
							</div>
						</div>
					</div>
				</div>
			</div>
		</>
	);
}
