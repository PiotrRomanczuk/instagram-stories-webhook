'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { PageHeader } from '@/app/components/layout/page-header';
import { MediaThumbnail } from '@/app/components/ui/media-thumbnail';
import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import { Skeleton } from '@/app/components/ui/skeleton';
import { EmptyState } from '@/app/components/ui/empty-state';
import { ContentItem } from '@/lib/types/posts';
import {
	CheckCircle2,
	Image as ImageIcon,
	Video,
	ChevronLeft,
	ChevronRight,
	Camera,
	User,
} from 'lucide-react';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const PAGE_SIZE = 20;

function formatDate(dateStr: string | undefined): string {
	if (!dateStr) return '-';
	return new Date(dateStr).toLocaleString('en-US', {
		month: 'short',
		day: 'numeric',
		hour: '2-digit',
		minute: '2-digit',
	});
}

export function PostedStoriesClient() {
	const [page, setPage] = useState(1);

	const apiParams = new URLSearchParams({
		tab: 'published',
		page: String(page),
		limit: String(PAGE_SIZE),
		sortBy: 'newest',
	});

	const { data, error, isLoading } = useSWR(
		`/api/content?${apiParams.toString()}`,
		fetcher,
		{ revalidateOnFocus: false, dedupingInterval: 5000 }
	);

	const items: ContentItem[] = data?.items || [];
	const pagination = data?.pagination;
	const totalPages = pagination ? Math.ceil(pagination.total / PAGE_SIZE) : 1;

	return (
		<main className="min-h-screen bg-gray-50 mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
			<div className="space-y-6">
				<PageHeader
					title="Posted Stories"
					description="View all published Instagram stories for testing and verification"
					badge={
						pagination ? (
							<Badge variant="secondary" className="text-xs">
								{pagination.total} total
							</Badge>
						) : null
					}
				/>

				{error && (
					<div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
						Failed to load posted stories. Please try again.
					</div>
				)}

				{isLoading && <LoadingSkeleton />}

				{!isLoading && !error && items.length === 0 && (
					<EmptyState
						icon={Camera}
						title="No published stories yet"
						description="Stories will appear here once they've been published to Instagram."
					/>
				)}

				{!isLoading && items.length > 0 && (
					<>
						<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
							{items.map((item) => (
								<StoryCard key={item.id} item={item} />
							))}
						</div>

						{totalPages > 1 && (
							<div className="flex items-center justify-between">
								<p className="text-sm text-muted-foreground">
									Page {page} of {totalPages}
								</p>
								<div className="flex items-center gap-2">
									<Button
										variant="outline"
										size="sm"
										onClick={() => setPage((p) => Math.max(1, p - 1))}
										disabled={page <= 1}
									>
										<ChevronLeft className="h-4 w-4" />
										Previous
									</Button>
									<Button
										variant="outline"
										size="sm"
										onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
										disabled={page >= totalPages}
									>
										Next
										<ChevronRight className="h-4 w-4" />
									</Button>
								</div>
							</div>
						)}
					</>
				)}
			</div>
		</main>
	);
}

function getStableMediaUrl(item: ContentItem): string {
	const url = item.thumbnailUrl || item.mediaUrl;
	if (url === 'https://picsum.photos/1080/1920') {
		return `https://picsum.photos/seed/${item.id}/1080/1920`;
	}
	return url;
}

function StoryCard({ item }: { item: ContentItem }) {
	return (
		<div className="group rounded-xl border bg-white shadow-sm overflow-hidden">
			{/* 9:16 aspect ratio preview */}
			<MediaThumbnail
				src={getStableMediaUrl(item)}
				alt={item.caption || 'Story media'}
				aspectRatio="story"
				showPlayIcon={item.mediaType === 'VIDEO'}
				className="w-full"
			/>

			{/* Info overlay */}
			<div className="p-3 space-y-2">
				{/* Type + Source */}
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-1">
						{item.mediaType === 'VIDEO' ? (
							<Video className="h-3 w-3 text-muted-foreground" />
						) : (
							<ImageIcon className="h-3 w-3 text-muted-foreground" />
						)}
						<span className="text-[10px] text-muted-foreground uppercase">
							{item.mediaType}
						</span>
					</div>
					<Badge variant="outline" className="text-[9px] px-1.5 py-0">
						{item.source}
					</Badge>
				</div>

				{/* Caption */}
				{item.caption && (
					<p className="text-xs text-foreground line-clamp-2 leading-relaxed">
						{item.caption}
					</p>
				)}

				{/* Published date */}
				<div className="flex items-center gap-1 text-[10px] text-muted-foreground">
					<CheckCircle2 className="h-3 w-3 text-green-600 shrink-0" />
					<span>{formatDate(item.publishedAt || item.updatedAt)}</span>
				</div>

				{/* User */}
				<div className="flex items-center gap-1 text-[10px] text-muted-foreground">
					<User className="h-3 w-3 shrink-0" />
					<span className="truncate">{item.userEmail || '-'}</span>
				</div>

				{/* IG Media ID */}
				{item.igMediaId && (
					<code className="block text-[9px] bg-muted px-1.5 py-0.5 rounded font-mono text-muted-foreground truncate">
						{item.igMediaId}
					</code>
				)}
			</div>
		</div>
	);
}

function LoadingSkeleton() {
	return (
		<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
			{Array.from({ length: 10 }).map((_, i) => (
				<div key={i} className="rounded-xl border bg-white shadow-sm overflow-hidden">
					<Skeleton className="w-full aspect-[9/16]" />
					<div className="p-3 space-y-2">
						<Skeleton className="h-3 w-16" />
						<Skeleton className="h-3 w-full" />
						<Skeleton className="h-3 w-24" />
					</div>
				</div>
			))}
		</div>
	);
}
