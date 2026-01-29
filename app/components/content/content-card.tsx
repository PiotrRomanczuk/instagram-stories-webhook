'use client';

import React from 'react';
import { ContentItem } from '@/lib/types/posts';
import { MoreVertical } from 'lucide-react';

interface ContentCardProps {
	item: ContentItem;
	onPreview: () => void;
	onEdit: () => void;
	onRefresh: () => void;
	isAdmin: boolean;
	tab: 'all' | 'review' | 'queue' | 'published';
}

export function ContentCard({
	item,
	onPreview,
	onEdit,
	onRefresh,
	isAdmin,
	tab,
}: ContentCardProps) {
	return (
		<div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm hover:shadow-md transition-shadow">
			{/* Image */}
			<div className="relative h-40 bg-gray-100">
				<img
					src={item.mediaUrl}
					alt={item.title || 'content'}
					className="h-full w-full object-cover"
					onError={(e) => {
						(e.target as HTMLImageElement).src = '/placeholder.svg';
					}}
				/>
				<div className="absolute top-2 right-2">
					<span className={`inline-block rounded-full px-2 py-1 text-xs font-medium ${
						item.source === 'submission'
							? 'bg-purple-100 text-purple-800'
							: 'bg-blue-100 text-blue-800'
					}`}>
						{item.source === 'submission' ? 'Submission' : 'Direct'}
					</span>
				</div>
			</div>

			{/* Content */}
			<div className="p-4">
				{item.title && <h3 className="font-semibold text-gray-900 truncate">{item.title}</h3>}
				{item.caption && (
					<p className="mt-2 text-sm text-gray-600 line-clamp-2">{item.caption}</p>
				)}

				{/* Status badges */}
				<div className="mt-4 flex flex-wrap gap-2">
					<span className={`text-xs font-medium px-2 py-1 rounded ${
						item.publishingStatus === 'published'
							? 'bg-green-100 text-green-800'
							: item.publishingStatus === 'scheduled'
							? 'bg-blue-100 text-blue-800'
							: item.publishingStatus === 'failed'
							? 'bg-red-100 text-red-800'
							: 'bg-gray-100 text-gray-800'
					}`}>
						{item.publishingStatus}
					</span>
					{item.submissionStatus && (
						<span className={`text-xs font-medium px-2 py-1 rounded ${
							item.submissionStatus === 'approved'
								? 'bg-green-100 text-green-800'
								: item.submissionStatus === 'rejected'
								? 'bg-red-100 text-red-800'
								: 'bg-yellow-100 text-yellow-800'
						}`}>
							{item.submissionStatus}
						</span>
					)}
				</div>

				{/* Meta */}
				<div className="mt-4 text-xs text-gray-500">
					<div>by {item.userEmail}</div>
					<div>{new Date(item.createdAt).toLocaleDateString()}</div>
				</div>

				{/* Actions */}
				<div className="mt-4 flex gap-2">
					<button
						onClick={onPreview}
						className="flex-1 text-sm px-3 py-2 rounded border border-gray-300 hover:bg-gray-50 transition font-medium"
					>
						Preview
					</button>
					{item.publishingStatus !== 'published' && (
						<button
							onClick={onEdit}
							className="flex-1 text-sm px-3 py-2 rounded border border-gray-300 hover:bg-gray-50 transition font-medium"
						>
							Edit
						</button>
					)}
					<button className="px-2 py-2 rounded hover:bg-gray-100 transition">
						<MoreVertical className="h-4 w-4" />
					</button>
				</div>
			</div>
		</div>
	);
}
