'use client';

import React, { useState } from 'react';
import { ContentItem } from '@/lib/types/posts';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

interface ContentPreviewModalProps {
	item: ContentItem;
	onClose: () => void;
	onEdit: (item: ContentItem) => void;
}

export function ContentPreviewModal({
	item,
	onClose,
	onEdit,
}: ContentPreviewModalProps) {
	const [showStoryFrame, setShowStoryFrame] = useState(true);

	return (
		<>
			<div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={onClose} />
			<div className="fixed inset-0 z-50 flex items-center justify-center p-4">
				<div className="relative max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-lg bg-white">
					{/* Header */}
					<div className="sticky top-0 flex items-center justify-between border-b bg-white p-4">
						<h2 className="text-lg font-semibold text-gray-900">
							{item.title || 'Content Preview'}
						</h2>
						<button
							onClick={onClose}
							className="text-gray-400 hover:text-gray-600"
						>
							<X className="h-6 w-6" />
						</button>
					</div>

					{/* Content */}
					<div className="grid gap-6 p-6 md:grid-cols-2">
						{/* Media Preview */}
						<div className="flex flex-col gap-4">
							<div className="overflow-hidden rounded-lg bg-gray-100">
								{showStoryFrame ? (
									<div className="aspect-[9/16] flex items-center justify-center bg-gray-900 text-white relative">
										<img
											src={item.mediaUrl}
											alt="preview"
											className="h-full w-full object-cover"
											onError={(e) => {
												(e.target as HTMLImageElement).src = '/placeholder.svg';
											}}
										/>
										{item.userTags && item.userTags.length > 0 && (
											<div className="absolute inset-0 pointer-events-none">
												{item.userTags.map((tag, i) => (
													<div
														key={i}
														className="absolute w-16 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-bold border-2 border-white"
														style={{
															left: `${tag.x * 100}%`,
															top: `${tag.y * 100}%`,
															transform: 'translate(-50%, -50%)',
														}}
													>
														@{tag.username.substring(0, 6)}
													</div>
												))}
											</div>
										)}
									</div>
								) : (
									<img
										src={item.mediaUrl}
										alt="preview"
										className="w-full object-cover"
										onError={(e) => {
											(e.target as HTMLImageElement).src = '/placeholder.svg';
										}}
									/>
								)}
							</div>
							<button
								onClick={() => setShowStoryFrame(!showStoryFrame)}
								className="w-full px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 transition font-medium text-sm"
							>
								{showStoryFrame ? 'Show Full Image' : 'Show Story Frame'}
							</button>
						</div>

						{/* Details */}
						<div className="space-y-6">
							{/* Status Timeline */}
							<div className="space-y-3">
								<h3 className="font-semibold text-gray-900">Timeline</h3>
								<div className="space-y-2">
									<div className="flex items-center gap-3">
										<div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100 text-green-800 text-xs font-bold">
											✓
										</div>
										<div>
											<div className="text-sm font-medium text-gray-900">Submitted</div>
											<div className="text-xs text-gray-500">
												{new Date(item.createdAt).toLocaleString()}
											</div>
										</div>
									</div>

									{item.source === 'submission' && item.submissionStatus && (
										<div className="flex items-center gap-3">
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
												<div className="text-sm font-medium capitalize text-gray-900">
													{item.submissionStatus}
												</div>
												{item.reviewedAt && (
													<div className="text-xs text-gray-500">
														{new Date(item.reviewedAt).toLocaleString()}
													</div>
												)}
											</div>
										</div>
									)}

									{item.scheduledTime && (
										<div className="flex items-center gap-3">
											<div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-800 text-xs font-bold">
												📅
											</div>
											<div>
												<div className="text-sm font-medium text-gray-900">Scheduled</div>
												<div className="text-xs text-gray-500">
													{new Date(item.scheduledTime).toLocaleString()}
												</div>
											</div>
										</div>
									)}

									{item.publishedAt && (
										<div className="flex items-center gap-3">
											<div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100 text-green-800 text-xs font-bold">
												✓
											</div>
											<div>
												<div className="text-sm font-medium text-gray-900">Published</div>
												<div className="text-xs text-gray-500">
													{new Date(item.publishedAt).toLocaleString()}
												</div>
											</div>
										</div>
									)}

									{item.error && (
										<div className="flex items-center gap-3">
											<div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-100 text-red-800 text-xs font-bold">
												✕
											</div>
											<div>
												<div className="text-sm font-medium text-gray-900">Failed</div>
												<div className="text-xs text-gray-500">{item.error}</div>
											</div>
										</div>
									)}
								</div>
							</div>

							{/* Caption */}
							{item.caption && (
								<div className="space-y-2">
									<h3 className="font-semibold text-gray-900">Caption</h3>
									<p className="text-sm text-gray-700 whitespace-pre-wrap">{item.caption}</p>
								</div>
							)}

							{/* Metadata */}
							<div className="space-y-2 border-t pt-4">
								<h3 className="font-semibold text-gray-900">Details</h3>
								<dl className="space-y-2 text-sm">
									<div className="flex justify-between">
										<dt className="text-gray-600">Source:</dt>
										<dd className="font-medium capitalize text-gray-900">{item.source}</dd>
									</div>
									<div className="flex justify-between">
										<dt className="text-gray-600">Media Type:</dt>
										<dd className="font-medium text-gray-900">{item.mediaType}</dd>
									</div>
									<div className="flex justify-between">
										<dt className="text-gray-600">Status:</dt>
										<dd className="font-medium capitalize text-gray-900">
											{item.publishingStatus}
										</dd>
									</div>
								</dl>
							</div>

							{/* Actions */}
							<div className="flex gap-2 border-t pt-4">
								<button
									onClick={() => onEdit(item)}
									className="flex-1 px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 transition font-medium text-sm"
								>
									Edit
								</button>
								<button
									onClick={onClose}
									className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition font-medium text-sm"
								>
									Close
								</button>
							</div>
						</div>
					</div>
				</div>
			</div>
		</>
	);
}
