'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { Grid, List, ImageOff } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/app/components/ui/toggle-group';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/app/components/ui/table';
import { SubmissionCard, SubmissionCardSkeleton } from './submission-card';
import { SfStatusBadge } from '@/app/components/storyflow';
import { ContentItem } from '@/lib/types';
import { cn } from '@/lib/utils';

type ViewMode = 'grid' | 'table';

interface SubmissionListProps {
	submissions: ContentItem[];
	isLoading?: boolean;
	onView?: (submission: ContentItem) => void;
	onEdit?: (submission: ContentItem) => void;
	onDelete?: (submission: ContentItem) => void;
	className?: string;
}

type StatusType = 'pending' | 'approved' | 'rejected' | 'published' | 'scheduled' | 'processing';

function getStatusType(submission: ContentItem): StatusType {
	if (submission.publishingStatus === 'published') return 'published';
	if (submission.publishingStatus === 'scheduled') return 'scheduled';
	if (submission.publishingStatus === 'processing') return 'processing';
	if (submission.submissionStatus === 'approved') return 'approved';
	if (submission.submissionStatus === 'rejected') return 'rejected';
	return 'pending';
}

function GridSkeleton() {
	return (
		<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-6">
			{Array.from({ length: 10 }).map((_, i) => (
				<SubmissionCardSkeleton key={i} />
			))}
		</div>
	);
}

function TableSkeleton() {
	return (
		<div className="rounded-xl border border-gray-200 dark:border-[var(--sf-border-dark)] bg-white dark:bg-[var(--sf-card-dark)] overflow-hidden">
			<Table>
				<TableHeader>
					<TableRow className="border-gray-200 dark:border-[var(--sf-border-dark)] hover:bg-transparent">
						<TableHead className="w-20 text-gray-500 dark:text-[var(--sf-text-secondary)]">Image</TableHead>
						<TableHead className="text-gray-500 dark:text-[var(--sf-text-secondary)]">Caption</TableHead>
						<TableHead className="w-24 text-gray-500 dark:text-[var(--sf-text-secondary)]">Status</TableHead>
						<TableHead className="w-32 text-gray-500 dark:text-[var(--sf-text-secondary)]">Date</TableHead>
						<TableHead className="w-20 text-gray-500 dark:text-[var(--sf-text-secondary)]">Actions</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{Array.from({ length: 5 }).map((_, i) => (
						<TableRow key={i} className="border-gray-200 dark:border-[var(--sf-border-dark)]">
							<TableCell>
								<div className="h-12 w-12 rounded bg-gray-200 dark:bg-[var(--sf-border-dark)] animate-pulse" />
							</TableCell>
							<TableCell>
								<div className="h-4 w-48 rounded bg-gray-200 dark:bg-[var(--sf-border-dark)] animate-pulse" />
							</TableCell>
							<TableCell>
								<div className="h-5 w-16 rounded-full bg-gray-200 dark:bg-[var(--sf-border-dark)] animate-pulse" />
							</TableCell>
							<TableCell>
								<div className="h-4 w-24 rounded bg-gray-200 dark:bg-[var(--sf-border-dark)] animate-pulse" />
							</TableCell>
							<TableCell>
								<div className="h-8 w-8 rounded bg-gray-200 dark:bg-[var(--sf-border-dark)] animate-pulse" />
							</TableCell>
						</TableRow>
					))}
				</TableBody>
			</Table>
		</div>
	);
}

function EmptyState() {
	return (
		<div className="flex flex-col items-center justify-center py-16 text-center">
			<div className="rounded-full bg-gray-100 dark:bg-[var(--sf-card-dark)] border border-gray-200 dark:border-[var(--sf-border-dark)] p-6">
				<List className="h-10 w-10 text-gray-500 dark:text-[var(--sf-text-secondary)]" />
			</div>
			<h3 className="mt-6 text-xl font-semibold text-gray-900 dark:text-white">No submissions yet</h3>
			<p className="mt-2 text-sm text-gray-500 dark:text-[var(--sf-text-secondary)] max-w-sm">
				You haven&apos;t submitted any content yet. Create your first submission to get started.
			</p>
		</div>
	);
}

function SubmissionThumbnail({ mediaUrl }: { mediaUrl: string }) {
	const [error, setError] = useState(false);
	const hasValidUrl = mediaUrl && !mediaUrl.startsWith('blob:');

	if (!hasValidUrl || error) {
		return (
			<div className="flex h-12 w-12 items-center justify-center rounded bg-gray-200 dark:bg-[var(--sf-border-dark)]">
				<ImageOff className="h-5 w-5 text-gray-500 dark:text-[var(--sf-text-secondary)] opacity-50" />
			</div>
		);
	}

	return (
		<img
			src={mediaUrl}
			alt=""
			className="h-12 w-12 rounded object-cover"
			onError={() => setError(true)}
		/>
	);
}

export function SubmissionList({
	submissions,
	isLoading,
	onView,
	onEdit,
	onDelete,
	className,
}: SubmissionListProps) {
	const [viewMode, setViewMode] = useState<ViewMode>('grid');

	if (isLoading) {
		return viewMode === 'grid' ? <GridSkeleton /> : <TableSkeleton />;
	}

	if (submissions.length === 0) {
		return <EmptyState />;
	}

	return (
		<div className={cn('space-y-6', className)}>
			{/* View toggle */}
			<div className="hidden sm:flex justify-end">
				<ToggleGroup
					type="single"
					value={viewMode}
					onValueChange={(value) => value && setViewMode(value as ViewMode)}
					className="bg-gray-100 dark:bg-[var(--sf-card-dark)] border border-gray-200 dark:border-[var(--sf-border-dark)] rounded-lg p-1"
				>
					<ToggleGroupItem
						value="grid"
						aria-label="Grid view"
						className="data-[state=on]:bg-[var(--sf-primary)] data-[state=on]:text-white text-gray-500 dark:text-[var(--sf-text-secondary)] hover:text-gray-900 dark:hover:text-white"
					>
						<Grid className="h-4 w-4" />
					</ToggleGroupItem>
					<ToggleGroupItem
						value="table"
						aria-label="Table view"
						className="data-[state=on]:bg-[var(--sf-primary)] data-[state=on]:text-white text-gray-500 dark:text-[var(--sf-text-secondary)] hover:text-gray-900 dark:hover:text-white"
					>
						<List className="h-4 w-4" />
					</ToggleGroupItem>
				</ToggleGroup>
			</div>

			{/* Grid view - 5 columns on xl, 4 on lg, 3 on md, 2 on mobile */}
			{viewMode === 'grid' && (
				<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-6">
					{submissions.map((submission) => (
						<SubmissionCard
							key={submission.id}
							submission={submission}
							onView={onView}
							onEdit={onEdit}
							onDelete={onDelete}
						/>
					))}
				</div>
			)}

			{/* Table view */}
			{viewMode === 'table' && (
				<div className="rounded-xl border border-gray-200 dark:border-[var(--sf-border-dark)] bg-white dark:bg-[var(--sf-card-dark)] overflow-x-auto overflow-hidden">
					<Table>
						<TableHeader>
							<TableRow className="border-gray-200 dark:border-[var(--sf-border-dark)] hover:bg-transparent">
								<TableHead className="w-20 text-gray-500 dark:text-[var(--sf-text-secondary)]">Image</TableHead>
								<TableHead className="text-gray-500 dark:text-[var(--sf-text-secondary)]">Caption</TableHead>
								<TableHead className="w-24 text-gray-500 dark:text-[var(--sf-text-secondary)]">Status</TableHead>
								<TableHead className="w-32 text-gray-500 dark:text-[var(--sf-text-secondary)]">Date</TableHead>
								<TableHead className="w-20 text-gray-500 dark:text-[var(--sf-text-secondary)]">Actions</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{submissions.map((submission) => (
								<TableRow
									key={submission.id}
									className="border-gray-200 dark:border-[var(--sf-border-dark)] hover:bg-gray-50 dark:hover:bg-[var(--sf-hover-dark)]"
								>
									<TableCell>
										<SubmissionThumbnail mediaUrl={submission.mediaUrl} />
									</TableCell>
									<TableCell className="max-w-xs truncate text-gray-900 dark:text-white">
										{submission.caption || <span className="text-gray-500 dark:text-[var(--sf-text-secondary)]">No caption</span>}
									</TableCell>
									<TableCell>
										<SfStatusBadge status={getStatusType(submission)} size="sm" />
									</TableCell>
									<TableCell className="text-gray-500 dark:text-[var(--sf-text-secondary)]">
										{format(new Date(submission.createdAt), 'MMM d, yyyy')}
									</TableCell>
									<TableCell>
										{submission.submissionStatus === 'pending' && onEdit && (
											<Button
												variant="ghost"
												size="sm"
												onClick={() => onEdit(submission)}
												className="text-gray-500 dark:text-[var(--sf-text-secondary)] hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-[var(--sf-hover-dark)]"
											>
												Edit
											</Button>
										)}
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</div>
			)}
		</div>
	);
}
