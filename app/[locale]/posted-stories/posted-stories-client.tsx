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
	AlertCircle,
	XCircle,
} from 'lucide-react';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const PAGE_SIZE = 20;

type TabKey = 'published' | 'failed';

const TABS: { key: TabKey; label: string }[] = [
	{ key: 'published', label: 'Published' },
	{ key: 'failed', label: 'Failed' },
];

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
	const [activeTab, setActiveTab] = useState<TabKey>('published');

	const handleTabChange = (tab: TabKey) => {
		setActiveTab(tab);
		setPage(1);
	};

	const apiParams = new URLSearchParams({
		tab: activeTab,
		page: String(page),
		limit: String(PAGE_SIZE),
		sortBy: 'newest',
	});

	const { data, error, isLoading } = useSWR(
		`/api/content?${apiParams.toString()}`,
		fetcher,
		{ revalidateOnFocus: false, dedupingInterval: 5000 },
	);

	const items: ContentItem[] = data?.items || [];
	const pagination = data?.pagination;
	const totalPages = pagination ? Math.ceil(pagination.total / PAGE_SIZE) : 1;

	const emptyConfig =
		activeTab === 'published'
			? {
					icon: Camera,
					title: 'No published stories yet',
					description:
						"Stories will appear here once they've been published to Instagram.",
				}
			: {
					icon: AlertCircle,
					title: 'No failed stories',
					description:
						'Great news! There are no failed publishing attempts.',
				};

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

				{/* Tab navigation */}
				<div className="flex gap-1 border-b">
					{TABS.map((tab) => (
						<button
							key={tab.key}
							onClick={() => handleTabChange(tab.key)}
							className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
								activeTab === tab.key
									? 'border-primary text-primary'
									: 'border-transparent text-muted-foreground hover:text-foreground hover:border-gray-300'
							}`}
						>
							{tab.label}
						</button>
					))}
				</div>

				{error && (
					<div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
						Failed to load stories. Please try again.
					</div>
				)}

				{isLoading && <LoadingSkeleton />}

				{!isLoading && !error && items.length === 0 && (
					<EmptyState
						icon={emptyConfig.icon}
						title={emptyConfig.title}
						description={emptyConfig.description}
					/>
				)}

				{!isLoading && items.length > 0 && (
					<>
						<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
							{items.map((item) =>
								activeTab === 'failed' ? (
									<FailedStoryCard key={item.id} item={item} />
								) : (
									<StoryCard key={item.id} item={item} />
								),
							)}
						</div>

						{totalPages > 1 && (
							<div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
								<p className="text-sm text-muted-foreground">
									Page {page} of {totalPages}
								</p>
								<div className="flex items-center gap-2">
									<Button
										variant="outline"
										size="sm"
										className="min-h-[44px] min-w-[44px]"
										onClick={() => setPage((p) => Math.max(1, p - 1))}
										disabled={page <= 1}
									>
										<ChevronLeft className="h-4 w-4" />
										<span className="hidden sm:inline">Previous</span>
									</Button>
									<Button
										variant="outline"
										size="sm"
										className="min-h-[44px] min-w-[44px]"
										onClick={() =>
											setPage((p) => Math.min(totalPages, p + 1))
										}
										disabled={page >= totalPages}
									>
										<span className="hidden sm:inline">Next</span>
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
			<MediaThumbnail
				src={getStableMediaUrl(item)}
				alt={item.caption || 'Story media'}
				aspectRatio="story"
				showPlayIcon={item.mediaType === 'VIDEO'}
				className="w-full"
			/>

			<div className="p-3 space-y-2">
				<div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
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

				{item.caption && (
					<p className="text-xs text-foreground line-clamp-2 leading-relaxed">
						{item.caption}
					</p>
				)}

				<div className="flex items-center gap-1 text-[10px] text-muted-foreground">
					<CheckCircle2 className="h-3 w-3 text-green-600 shrink-0" />
					<span>{formatDate(item.publishedAt || item.updatedAt)}</span>
				</div>

				<div className="flex items-center gap-1 text-[10px] text-muted-foreground">
					<User className="h-3 w-3 shrink-0" />
					<span className="truncate">{item.userEmail || '-'}</span>
				</div>

				{item.igMediaId && (
					<code className="block text-[9px] bg-muted px-1.5 py-0.5 rounded font-mono text-muted-foreground truncate">
						{item.igMediaId}
					</code>
				)}
			</div>
		</div>
	);
}

function FailedStoryCard({ item }: { item: ContentItem }) {
	return (
		<div className="group rounded-xl border border-red-200 bg-white shadow-sm overflow-hidden">
			<div className="relative">
				<MediaThumbnail
					src={getStableMediaUrl(item)}
					alt={item.caption || 'Story media'}
					aspectRatio="story"
					showPlayIcon={item.mediaType === 'VIDEO'}
					className="w-full opacity-60 saturate-50"
				/>
				{item.retryCount !== undefined && item.retryCount > 0 && (
					<div className="absolute top-2 right-2">
						<Badge variant="destructive" className="text-[9px] px-1.5 py-0">
							{item.retryCount}/3 retries
						</Badge>
					</div>
				)}
			</div>

			<div className="p-3 space-y-2">
				<div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
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
					<Badge variant="destructive" className="text-[9px] px-1.5 py-0">
						Failed
					</Badge>
				</div>

				{item.error && (
					<div className="rounded bg-red-50 border border-red-100 px-2 py-1">
						<p className="text-[10px] text-red-700 line-clamp-3">
							{item.error}
						</p>
					</div>
				)}

				{item.caption && (
					<p className="text-xs text-foreground line-clamp-2 leading-relaxed">
						{item.caption}
					</p>
				)}

				<div className="flex items-center gap-1 text-[10px] text-muted-foreground">
					<XCircle className="h-3 w-3 text-red-500 shrink-0" />
					<span>{formatDate(item.updatedAt)}</span>
				</div>

				<div className="flex items-center gap-1 text-[10px] text-muted-foreground">
					<User className="h-3 w-3 shrink-0" />
					<span className="truncate">{item.userEmail || '-'}</span>
				</div>
			</div>
		</div>
	);
}

function LoadingSkeleton() {
	return (
		<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
			{Array.from({ length: 10 }).map((_, i) => (
				<div
					key={i}
					className="rounded-xl border bg-white shadow-sm overflow-hidden"
				>
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
