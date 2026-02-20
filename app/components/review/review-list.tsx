'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import Image from 'next/image';
import { Eye, CheckSquare, Play } from 'lucide-react';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/app/components/ui/table';
import { Checkbox } from '@/app/components/ui/checkbox';
import { Skeleton } from '@/app/components/ui/skeleton';
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from '@/app/components/ui/dialog';
import { extractThumbnailFromVideo } from '@/lib/media/client-utils';
import { VideoPreview } from '@/app/components/media/video-preview';
import { ReviewActions } from './review-actions';
import { ContentItem } from '@/lib/types';

interface ReviewListProps {
	items: ContentItem[];
	isLoading?: boolean;
	selectedIds: string[];
	onSelectionChange: (ids: string[]) => void;
	onApprove: (id: string) => Promise<void>;
	onReject: (id: string) => void;
	onSchedule: (id: string) => void;
}

export function ReviewList({
	items,
	isLoading = false,
	selectedIds,
	onSelectionChange,
	onApprove,
	onReject,
	onSchedule,
}: ReviewListProps) {
	const [previewItem, setPreviewItem] = useState<ContentItem | null>(null);
	const [generatedThumbnails, setGeneratedThumbnails] = useState<Map<string, string>>(new Map());

	// Generate thumbnails for videos without stored thumbnails
	useEffect(() => {
		let isMounted = true;
		const generateThumbnails = async () => {
			const videosNeedingThumbnails = items.filter(
				(item) => item.mediaType === 'VIDEO' && !item.thumbnailUrl && item.mediaUrl && !generatedThumbnails.has(item.id)
			);

			// Process sequentially to avoid browser overload
			for (const item of videosNeedingThumbnails) {
				if (!isMounted) break;
				try {
					const thumbnail = await extractThumbnailFromVideo(item.mediaUrl);
					if (thumbnail && isMounted) {
						setGeneratedThumbnails((prev) => new Map(prev).set(item.id, thumbnail));
					}
				} catch (error) {
					console.error(`Failed to generate thumbnail for ${item.id}:`, error);
				}
			}
		};

		generateThumbnails();
		return () => {
			isMounted = false;
		};
	}, [items]); // Only re-run when items change

	const handleSelectAll = () => {
		if (selectedIds.length === items.length) {
			onSelectionChange([]);
		} else {
			onSelectionChange(items.map((item) => item.id));
		}
	};

	const handleSelectItem = (id: string) => {
		if (selectedIds.includes(id)) {
			onSelectionChange(selectedIds.filter((selectedId) => selectedId !== id));
		} else {
			onSelectionChange([...selectedIds, id]);
		}
	};

	if (isLoading) {
		return <ReviewListSkeleton />;
	}

	if (items.length === 0) {
		return (
			<div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
				<CheckSquare className="h-12 w-12 text-muted-foreground/50" />
				<h3 className="mt-4 text-lg font-semibold">No pending submissions</h3>
				<p className="mt-2 text-sm text-muted-foreground">
					All submissions have been reviewed. Check back later for new content.
				</p>
			</div>
		);
	}

	return (
		<>
			<div className="rounded-md border">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead className="w-12">
								<Checkbox
									checked={selectedIds.length === items.length && items.length > 0}
									onCheckedChange={handleSelectAll}
									aria-label="Select all"
								/>
							</TableHead>
							<TableHead className="w-20">Preview</TableHead>
							<TableHead>Caption</TableHead>
							<TableHead>Submitted By</TableHead>
							<TableHead>Date</TableHead>
							<TableHead className="text-right">Actions</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{items.map((item) => {
							const isItemVideo = item.mediaType === 'VIDEO';
							// For videos, use: DB thumbnail → generated thumbnail → null
							const thumbSrc = isItemVideo
								? (item.thumbnailUrl || generatedThumbnails.get(item.id) || null)
								: item.mediaUrl;
							return (
								<TableRow key={item.id}>
									<TableCell>
										<Checkbox
											checked={selectedIds.includes(item.id)}
											onCheckedChange={() => handleSelectItem(item.id)}
											aria-label={`Select submission from ${item.userEmail}`}
										/>
									</TableCell>
									<TableCell>
										<button
											onClick={() => setPreviewItem(item)}
											className="relative h-14 w-14 overflow-hidden rounded-md border hover:opacity-80 transition-opacity"
										>
											{thumbSrc ? (
												<>
													<Image
														src={thumbSrc}
														alt={item.title || 'Submission'}
														fill
														className="object-cover"
														sizes="56px"
														unoptimized
													/>
													{isItemVideo && (
														<div className="absolute inset-0 flex items-center justify-center">
															<Play className="h-4 w-4 text-white drop-shadow-md" fill="white" />
														</div>
													)}
													<div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 hover:opacity-100 transition-opacity">
														<Eye className="h-4 w-4 text-white" />
													</div>
												</>
											) : (
												<div className="flex h-full w-full items-center justify-center bg-gray-100">
													<Play className="h-6 w-6 text-gray-400" />
												</div>
											)}
										</button>
									</TableCell>
									<TableCell className="max-w-xs">
										<p className="truncate text-sm" title={item.caption}>
											{item.caption || item.title || 'No caption'}
										</p>
									</TableCell>
									<TableCell>
										<span className="text-sm text-muted-foreground">
											{item.userEmail}
										</span>
									</TableCell>
									<TableCell>
										<span className="text-sm text-muted-foreground">
											{format(new Date(item.createdAt), 'MMM d, yyyy')}
										</span>
									</TableCell>
									<TableCell className="text-right">
										<div className="hidden lg:block">
											<ReviewActions
												itemId={item.id}
												onApprove={onApprove}
												onReject={onReject}
												onSchedule={onSchedule}
											/>
										</div>
										<div className="lg:hidden">
											<ReviewActions
												itemId={item.id}
												onApprove={onApprove}
												onReject={onReject}
												onSchedule={onSchedule}
												compact
											/>
										</div>
									</TableCell>
								</TableRow>
							);
						})}
					</TableBody>
				</Table>
			</div>

			{/* Preview Dialog */}
			<Dialog open={!!previewItem} onOpenChange={() => setPreviewItem(null)}>
				<DialogContent className="max-w-2xl">
					<DialogHeader>
						<DialogTitle>
							{previewItem?.title || 'Submission Preview'}
						</DialogTitle>
					</DialogHeader>
					{previewItem && (
						<div className="space-y-4">
							<div className="relative aspect-[9/16] max-h-[60vh] w-full overflow-hidden rounded-lg bg-muted">
								{previewItem.mediaType === 'VIDEO' ? (
									<VideoPreview
										videoUrl={previewItem.mediaUrl}
										thumbnailUrl={previewItem.thumbnailUrl}
										duration={previewItem.videoDuration}
										resolution={previewItem.dimensions ? { width: previewItem.dimensions.width, height: previewItem.dimensions.height } : undefined}
										codec={previewItem.videoCodec}
										framerate={previewItem.videoFramerate}
										className="h-full w-full object-contain"
									/>
								) : (
									<Image
										src={previewItem.mediaUrl}
										alt={previewItem.title || 'Submission'}
										fill
										className="object-contain"
										unoptimized
									/>
								)}
							</div>
							{previewItem.caption && (
								<div className="space-y-2">
									<h4 className="text-sm font-medium">Caption</h4>
									<p className="text-sm text-muted-foreground whitespace-pre-wrap">
										{previewItem.caption}
									</p>
								</div>
							)}
							<div className="flex items-center justify-between text-sm text-muted-foreground">
								<span>By: {previewItem.userEmail}</span>
								<span>
									{format(new Date(previewItem.createdAt), 'PPP p')}
								</span>
							</div>
							<div className="flex justify-end pt-4">
								<ReviewActions
									itemId={previewItem.id}
									onApprove={async (id) => {
										await onApprove(id);
										setPreviewItem(null);
									}}
									onReject={(id) => {
										onReject(id);
										setPreviewItem(null);
									}}
									onSchedule={(id) => {
										onSchedule(id);
										setPreviewItem(null);
									}}
								/>
							</div>
						</div>
					)}
				</DialogContent>
			</Dialog>
		</>
	);
}

function ReviewListSkeleton() {
	return (
		<div className="rounded-md border">
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead className="w-12">
							<Skeleton className="h-4 w-4" />
						</TableHead>
						<TableHead className="w-20">Preview</TableHead>
						<TableHead>Caption</TableHead>
						<TableHead>Submitted By</TableHead>
						<TableHead>Date</TableHead>
						<TableHead className="text-right">Actions</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{Array.from({ length: 5 }).map((_, i) => (
						<TableRow key={i}>
							<TableCell>
								<Skeleton className="h-4 w-4" />
							</TableCell>
							<TableCell>
								<Skeleton className="h-14 w-14 rounded-md" />
							</TableCell>
							<TableCell>
								<Skeleton className="h-4 w-48" />
							</TableCell>
							<TableCell>
								<Skeleton className="h-4 w-32" />
							</TableCell>
							<TableCell>
								<Skeleton className="h-4 w-24" />
							</TableCell>
							<TableCell>
								<Skeleton className="ml-auto h-8 w-24" />
							</TableCell>
						</TableRow>
					))}
				</TableBody>
			</Table>
		</div>
	);
}
