'use client';

/**
 * Unified Content List Component
 * Displays content in different view modes (grid, list, queue)
 */

import React from 'react';
import { ContentItem } from '@/lib/types/posts';
import { ContentCard } from './content-card';

type ViewMode = 'grid' | 'list' | 'queue';

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
	if (viewMode === 'grid') {
		return (
			<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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

	if (viewMode === 'list') {
		return (
			<div className="space-y-2 overflow-x-auto">
				<table className="w-full text-sm">
					<thead>
						<tr className="border-b">
							<th className="py-3 text-left font-medium text-gray-700">Title</th>
							<th className="py-3 text-left font-medium text-gray-700">Status</th>
							<th className="py-3 text-left font-medium text-gray-700">Created</th>
							<th className="py-3 text-left font-medium text-gray-700">Actions</th>
						</tr>
					</thead>
					<tbody>
						{items.map((item) => (
							<tr key={item.id} className="border-b hover:bg-gray-50">
								<td className="py-3 font-medium">{item.title || item.caption?.substring(0, 50)}</td>
								<td className="py-3">
									<span className={`inline-block rounded-full px-3 py-1 text-xs font-medium ${
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
								</td>
								<td className="py-3 text-gray-500">
									{new Date(item.createdAt).toLocaleDateString()}
								</td>
								<td className="py-3">
									<button
										onClick={() => onPreview(item)}
										className="text-blue-600 hover:underline"
									>
										Preview
									</button>
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
		);
	}

	if (viewMode === 'queue') {
		return (
			<div className="space-y-2">
				<div className="rounded-lg bg-blue-50 p-4 text-sm text-blue-800">
					Drag items to reorder. Times are recalculated automatically.
				</div>
				{items.map((item, index) => (
					<div
						key={item.id}
						className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-4 hover:shadow-md"
					>
						<div className="cursor-grab active:cursor-grabbing">☰</div>
						<div className="flex-1">
							<div className="font-medium">{item.title || item.caption?.substring(0, 50)}</div>
							<div className="text-xs text-gray-500">
								{item.scheduledTime && new Date(item.scheduledTime).toLocaleString()}
							</div>
						</div>
						<button
							onClick={() => onPreview(item)}
							className="text-sm text-blue-600 hover:underline"
						>
							Preview
						</button>
					</div>
				))}
			</div>
		);
	}

	return null;
}
