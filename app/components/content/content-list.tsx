'use client';

/**
 * Unified Content List Component
 * Displays content in grid or list view modes
 * List view includes drag handles when on queue tab
 */

import React, { useState } from 'react';
import { ContentItem } from '@/lib/types/posts';
import { ContentCard } from './content-card';
import { ConfirmationDialog } from '../ui/confirmation-dialog';
import { GripVertical, Calendar, Send, Eye, Clock } from 'lucide-react';

type ViewMode = 'grid' | 'list';

interface ContentListProps {
	items: ContentItem[];
	viewMode: ViewMode;
	onPreview: (item: ContentItem) => void;
	onEdit: (item: ContentItem) => void;
	onRefresh: () => void;
	isAdmin: boolean;
	tab: 'all' | 'review' | 'queue' | 'published';
}

export function ContentList({
	items,
	viewMode,
	onPreview,
	onEdit,
	onRefresh,
	isAdmin,
	tab,
}: ContentListProps) {
	const [selectedItemForPublish, setSelectedItemForPublish] =
		useState<ContentItem | null>(null);
	const [isPublishing, setIsPublishing] = useState(false);

	const handlePublishNow = async () => {
		if (!selectedItemForPublish) return;
		try {
			setIsPublishing(true);
			const response = await fetch(
				`/api/content/${selectedItemForPublish.id}/publish`,
				{
					method: 'POST',
				},
			);
			if (response.ok) {
				onRefresh();
				setSelectedItemForPublish(null);
			} else {
				const data = await response.json();
				console.error('Publish failed:', data.error);
			}
		} catch (err) {
			console.error('Failed to publish now', err);
		} finally {
			setIsPublishing(false);
		}
	};

	const isQueueTab = tab === 'queue';

	if (viewMode === 'grid') {
		return (
			<div className='grid gap-6 sm:grid-cols-2 lg:grid-cols-3'>
				{items.map((item) => (
					<ContentCard
						key={item.id}
						item={item}
						onPreview={() => onPreview(item)}
						onEdit={() => onEdit(item)}
						onRefresh={onRefresh}
						isAdmin={isAdmin}
						tab={tab}
					/>
				))}
			</div>
		);
	}

	// List view (with drag handles when on queue tab)
	return (
		<div className='bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden'>
			{isQueueTab && (
				<div className='p-4 bg-indigo-50 border-b border-indigo-100 flex items-center gap-3'>
					<Clock className='h-5 w-5 text-indigo-600' />
					<p className='text-sm font-bold text-indigo-900 leading-none'>
						Queue:{' '}
						<span className='font-medium text-indigo-700/70 ml-1'>
							Drag items to reorder publishing sequence.
						</span>
					</p>
				</div>
			)}
			<div className='overflow-x-auto'>
				<table className='w-full text-sm'>
					<thead>
						<tr className='bg-gray-50/50 border-b border-gray-100'>
							{isQueueTab && (
								<th className='w-12 px-2 py-5'></th>
							)}
							<th className='px-6 py-5 text-left text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]'>
								Content
							</th>
							<th className='px-6 py-5 text-left text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]'>
								Status
							</th>
							{isQueueTab ? (
								<th className='px-6 py-5 text-left text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]'>
									Scheduled
								</th>
							) : (
								<th className='px-6 py-5 text-left text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]'>
									Created
								</th>
							)}
							<th className='px-6 py-5 text-right text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]'>
								Actions
							</th>
						</tr>
					</thead>
					<tbody className='divide-y divide-gray-50'>
						{items.map((item) => (
							<tr
								key={item.id}
								className='group hover:bg-indigo-50/30 transition-colors'
							>
								{isQueueTab && (
									<td className='px-2 py-5'>
										<div className='cursor-grab active:cursor-grabbing p-2 text-gray-300 group-hover:text-indigo-400'>
											<GripVertical className='h-5 w-5' />
										</div>
									</td>
								)}
								<td className='px-6 py-5'>
									<div className='flex items-center gap-4'>
										<div className='w-12 h-12 rounded-xl overflow-hidden shadow-sm bg-gray-100 shrink-0'>
											<img
												src={item.mediaUrl}
												alt=''
												className='w-full h-full object-cover'
											/>
										</div>
										<div className='min-w-0'>
											<p className='font-bold text-gray-900 truncate max-w-[200px]'>
												{item.title || 'Untitled Post'}
											</p>
											<p className='text-[10px] text-gray-400 font-bold truncate max-w-[200px]'>
												{item.caption?.substring(0, 40)}
												{item.caption && item.caption.length > 40 ? '...' : ''}
											</p>
										</div>
									</div>
								</td>
								<td className='px-6 py-5'>
									<span
										className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-widest ${
											item.publishingStatus === 'published'
												? 'bg-emerald-100 text-emerald-700'
												: item.publishingStatus === 'scheduled'
													? 'bg-amber-100 text-amber-700'
													: item.publishingStatus === 'failed'
														? 'bg-rose-100 text-rose-700'
														: 'bg-gray-100 text-gray-600'
										}`}
									>
										{item.publishingStatus}
									</span>
								</td>
								<td className='px-6 py-5'>
									{isQueueTab && item.scheduledTime ? (
										<div className='flex items-center gap-2'>
											<Calendar className='h-3 w-3 text-amber-500' />
											<span className='text-xs font-bold text-amber-600'>
												{new Date(item.scheduledTime).toLocaleString([], {
													dateStyle: 'short',
													timeStyle: 'short',
												})}
											</span>
										</div>
									) : (
										<p className='text-xs font-bold text-gray-500'>
											{new Date(item.createdAt).toLocaleDateString()}
										</p>
									)}
								</td>
								<td className='px-6 py-5 text-right'>
									<div className='flex justify-end gap-2'>
										<button
											onClick={() => onPreview(item)}
											className='p-2 hover:bg-white rounded-lg transition-colors text-gray-400 hover:text-indigo-600 shadow-sm border border-transparent hover:border-indigo-100'
										>
											<Eye className='h-4 w-4' />
										</button>
										{isAdmin && item.publishingStatus !== 'published' && (
											<>
												<button
													onClick={() => onEdit(item)}
													className='p-2 hover:bg-white rounded-lg transition-colors text-gray-400 hover:text-amber-600 shadow-sm border border-transparent hover:border-amber-100'
												>
													<Calendar className='h-4 w-4' />
												</button>
												{(item.source !== 'submission' ||
													item.submissionStatus === 'approved') && (
													<button
														onClick={() => setSelectedItemForPublish(item)}
														className='p-2 hover:bg-white rounded-lg transition-colors text-gray-400 hover:text-emerald-600 shadow-sm border border-transparent hover:border-emerald-100'
													>
														<Send className='h-4 w-4' />
													</button>
												)}
											</>
										)}
									</div>
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>

			<ConfirmationDialog
				isOpen={!!selectedItemForPublish}
				onClose={() => setSelectedItemForPublish(null)}
				onConfirm={handlePublishNow}
				title='Publish Content?'
				message={`This will immediately publish "${selectedItemForPublish?.title || 'this post'}" to Instagram. Let's go live!`}
				confirmLabel='Publish Now'
				type='success'
				isLoading={isPublishing}
			/>
		</div>
	);
}
