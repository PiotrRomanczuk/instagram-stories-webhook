'use client';

import { MemeSubmission } from '@/lib/types/posts';
import { MemeStatusBadge } from '../ui/meme-status-badge';
import Image from 'next/image';
import {
	CheckSquare,
	Square,
	Trash2,
	CheckCircle,
	XCircle,
	Calendar,
	Edit2,
} from 'lucide-react';

interface MemeListViewProps {
	memes: MemeSubmission[];
	isLoading: boolean;
	selectedMemes?: Set<string>;
	onToggleSelect?: (id: string) => void;
	onPreview?: (meme: MemeSubmission) => void;
	onEdit?: (meme: MemeSubmission) => void;
	onDelete?: (id: string) => void;
	onAction?: (
		id: string,
		action: 'approve' | 'reject' | 'schedule',
		data?: { rejectionReason?: string; scheduledFor?: string },
	) => void;
	isAdmin?: boolean;
}

export function MemeListView({
	memes,
	isLoading,
	selectedMemes = new Set(),
	onToggleSelect,
	onPreview,
	onEdit,
	onDelete,
	onAction,
	isAdmin = false,
}: MemeListViewProps) {
	if (isLoading) {
		return (
			<div className='bg-white rounded-2xl border border-slate-200 p-8 text-center'>
				<div className='animate-pulse space-y-4'>
					{[...Array(5)].map((_, i) => (
						<div key={i} className='h-16 bg-slate-100 rounded-lg' />
					))}
				</div>
			</div>
		);
	}

	if (memes.length === 0) {
		return (
			<div className='bg-white rounded-2xl border border-slate-200 p-12 text-center'>
				<p className='text-slate-500 font-medium'>No memes found</p>
			</div>
		);
	}

	return (
		<div className='bg-white rounded-2xl border border-slate-200 overflow-hidden'>
			{/* Desktop Table View */}
			<div className='hidden md:block overflow-x-auto'>
				<table className='w-full'>
					<thead className='bg-slate-50 border-b border-slate-200'>
						<tr>
							{isAdmin && onToggleSelect && (
								<th className='w-12 px-4 py-3 text-left'>
									<span className='sr-only'>Select</span>
								</th>
							)}
							<th className='w-20 px-4 py-3 text-left'>
								<span className='sr-only'>Preview</span>
							</th>
							<th className='px-4 py-3 text-left text-xs font-black text-slate-600 uppercase tracking-wider'>
								Title
							</th>
							{isAdmin && (
								<th className='px-4 py-3 text-left text-xs font-black text-slate-600 uppercase tracking-wider'>
									User
								</th>
							)}
							<th className='px-4 py-3 text-left text-xs font-black text-slate-600 uppercase tracking-wider'>
								Status
							</th>
							<th className='px-4 py-3 text-left text-xs font-black text-slate-600 uppercase tracking-wider'>
								Date
							</th>
							<th className='px-4 py-3 text-right text-xs font-black text-slate-600 uppercase tracking-wider'>
								Actions
							</th>
						</tr>
					</thead>
					<tbody className='divide-y divide-slate-100'>
						{memes.map((meme) => (
							<tr
								key={meme.id}
								onClick={() => onPreview?.(meme)}
								className='hover:bg-slate-50 transition-colors cursor-pointer group'
							>
								{isAdmin && onToggleSelect && (
									<td className='px-4 py-3'>
										<button
											onClick={(e) => {
												e.stopPropagation();
												onToggleSelect(meme.id!);
											}}
											className='p-1 hover:bg-slate-100 rounded transition'
										>
											{selectedMemes.has(meme.id!) ? (
												<CheckSquare className='w-4 h-4 text-indigo-600' />
											) : (
												<Square className='w-4 h-4 text-slate-400' />
											)}
										</button>
									</td>
								)}
								<td className='px-4 py-3'>
									<div className='relative w-12 h-12 rounded-lg overflow-hidden bg-slate-100'>
										<Image
											src={meme.media_url}
											alt={meme.title || 'Meme'}
											fill
											className='object-cover'
											unoptimized
										/>
									</div>
								</td>
								<td className='px-4 py-3'>
									<div className='max-w-xs'>
										<p className='font-bold text-slate-900 truncate'>
											{meme.title || 'Untitled'}
										</p>
										{meme.caption && (
											<p className='text-xs text-slate-500 truncate mt-0.5'>
												{meme.caption}
											</p>
										)}
									</div>
								</td>
								{isAdmin && (
									<td className='px-4 py-3'>
										<p className='text-sm text-slate-600 truncate max-w-[150px]'>
											{meme.user_email}
										</p>
									</td>
								)}
								<td className='px-4 py-3'>
									<MemeStatusBadge status={meme.status} />
								</td>
								<td className='px-4 py-3'>
									<p className='text-sm text-slate-500'>
										{meme.created_at
											? new Date(meme.created_at).toLocaleDateString()
											: 'Just now'}
									</p>
								</td>
								<td className='px-4 py-3'>
									<div
										className='flex items-center justify-end gap-1'
										onClick={(e) => e.stopPropagation()}
									>
										{isAdmin && meme.status === 'pending' && onAction && (
											<>
												<button
													onClick={() => onAction(meme.id!, 'approve')}
													className='p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition'
													title='Approve'
												>
													<CheckCircle className='w-4 h-4' />
												</button>
												<button
													onClick={() => {
														const reason = prompt('Rejection reason:');
														if (reason) {
															onAction(meme.id!, 'reject', {
																rejectionReason: reason,
															});
														}
													}}
													className='p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition'
													title='Reject'
												>
													<XCircle className='w-4 h-4' />
												</button>
											</>
										)}
										{!isAdmin && meme.status === 'pending' && onEdit && (
											<button
												onClick={() => onEdit(meme)}
												className='p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition'
												title='Edit'
											>
												<Edit2 className='w-4 h-4' />
											</button>
										)}
										{onDelete && (
											<button
												onClick={() => onDelete(meme.id!)}
												className='p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition'
												title='Delete'
											>
												<Trash2 className='w-4 h-4' />
											</button>
										)}
									</div>
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>

			{/* Mobile Card View */}
			<div className='md:hidden divide-y divide-slate-100'>
				{memes.map((meme) => (
					<div
						key={meme.id}
						onClick={() => onPreview?.(meme)}
						className='p-4 hover:bg-slate-50 transition-colors cursor-pointer'
					>
						<div className='flex gap-3'>
							{isAdmin && onToggleSelect && (
								<button
									onClick={(e) => {
										e.stopPropagation();
										onToggleSelect(meme.id!);
									}}
									className='flex-shrink-0 self-start mt-1'
								>
									{selectedMemes.has(meme.id!) ? (
										<CheckSquare className='w-5 h-5 text-indigo-600' />
									) : (
										<Square className='w-5 h-5 text-slate-400' />
									)}
								</button>
							)}
							<div className='relative w-16 h-16 rounded-lg overflow-hidden bg-slate-100 flex-shrink-0'>
								<Image
									src={meme.media_url}
									alt={meme.title || 'Meme'}
									fill
									className='object-cover'
									unoptimized
								/>
							</div>
							<div className='flex-1 min-w-0'>
								<div className='flex items-start justify-between gap-2 mb-1'>
									<p className='font-bold text-slate-900 truncate'>
										{meme.title || 'Untitled'}
									</p>
									<MemeStatusBadge status={meme.status} />
								</div>
								{isAdmin && (
									<p className='text-xs text-slate-500 truncate mb-1'>
										{meme.user_email}
									</p>
								)}
								<p className='text-xs text-slate-400'>
									{meme.created_at
										? new Date(meme.created_at).toLocaleDateString()
										: 'Just now'}
								</p>
								<div
									className='flex items-center gap-1 mt-2'
									onClick={(e) => e.stopPropagation()}
								>
									{isAdmin && meme.status === 'pending' && onAction && (
										<>
											<button
												onClick={() => onAction(meme.id!, 'approve')}
												className='px-2 py-1 text-xs font-bold text-green-600 bg-green-50 rounded-lg'
											>
												Approve
											</button>
											<button
												onClick={() => {
													const reason = prompt('Rejection reason:');
													if (reason) {
														onAction(meme.id!, 'reject', {
															rejectionReason: reason,
														});
													}
												}}
												className='px-2 py-1 text-xs font-bold text-red-600 bg-red-50 rounded-lg'
											>
												Reject
											</button>
										</>
									)}
									{!isAdmin && meme.status === 'pending' && onEdit && (
										<button
											onClick={() => onEdit(meme)}
											className='px-2 py-1 text-xs font-bold text-indigo-600 bg-indigo-50 rounded-lg'
										>
											Edit
										</button>
									)}
									{onDelete && (
										<button
											onClick={() => onDelete(meme.id!)}
											className='px-2 py-1 text-xs font-bold text-red-600 bg-red-50 rounded-lg ml-auto'
										>
											Delete
										</button>
									)}
								</div>
							</div>
						</div>
					</div>
				))}
			</div>
		</div>
	);
}
