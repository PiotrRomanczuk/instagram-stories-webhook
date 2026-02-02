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
import { Skeleton } from '@/app/components/ui/skeleton';
import { SubmissionCard } from './submission-card';
import { ContentItem } from '@/lib/types';
import { cn } from '@/lib/utils';

type ViewMode = 'grid' | 'table';

interface SubmissionListProps {
	submissions: ContentItem[];
	isLoading?: boolean;
	onEdit?: (submission: ContentItem) => void;
	className?: string;
}

function getStatusLabel(submission: ContentItem): string {
	if (submission.publishingStatus === 'published') return 'Published';
	if (submission.publishingStatus === 'scheduled') return 'Scheduled';
	if (submission.publishingStatus === 'processing') return 'Processing';
	if (submission.publishingStatus === 'failed') return 'Failed';
	if (submission.submissionStatus === 'approved') return 'Approved';
	if (submission.submissionStatus === 'rejected') return 'Rejected';
	return 'Pending';
}

function GridSkeleton() {
	return (
		<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
			{Array.from({ length: 8 }).map((_, i) => (
				<div key={i} className="space-y-2">
					<Skeleton className="aspect-[9/16] rounded-lg" />
					<Skeleton className="h-4 w-3/4" />
					<Skeleton className="h-3 w-1/2" />
				</div>
			))}
		</div>
	);
}

function TableSkeleton() {
	return (
		<div className="rounded-md border">
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead className="w-20">Image</TableHead>
						<TableHead>Caption</TableHead>
						<TableHead className="w-24">Status</TableHead>
						<TableHead className="w-32">Date</TableHead>
						<TableHead className="w-20">Actions</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{Array.from({ length: 5 }).map((_, i) => (
						<TableRow key={i}>
							<TableCell>
								<Skeleton className="h-12 w-12 rounded" />
							</TableCell>
							<TableCell>
								<Skeleton className="h-4 w-48" />
							</TableCell>
							<TableCell>
								<Skeleton className="h-5 w-16 rounded-full" />
							</TableCell>
							<TableCell>
								<Skeleton className="h-4 w-24" />
							</TableCell>
							<TableCell>
								<Skeleton className="h-8 w-8 rounded" />
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
		<div className="flex flex-col items-center justify-center py-12 text-center">
			<div className="rounded-full bg-muted p-4">
				<List className="h-8 w-8 text-muted-foreground" />
			</div>
			<h3 className="mt-4 text-lg font-semibold">No submissions</h3>
			<p className="mt-1 text-sm text-muted-foreground">
				You haven't submitted anything yet.
			</p>
		</div>
	);
}

function SubmissionThumbnail({ mediaUrl }: { mediaUrl: string }) {
	const [error, setError] = useState(false);
	const hasValidUrl = mediaUrl && !mediaUrl.startsWith('blob:');

	if (!hasValidUrl || error) {
		return (
			<div className="flex h-12 w-12 items-center justify-center rounded bg-muted">
				<ImageOff className="h-5 w-5 text-muted-foreground opacity-50" />
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
	onEdit,
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
		<div className={cn('space-y-4', className)}>
			{/* View toggle */}
			<div className="flex justify-end">
				<ToggleGroup
					type="single"
					value={viewMode}
					onValueChange={(value) => value && setViewMode(value as ViewMode)}
				>
					<ToggleGroupItem value="grid" aria-label="Grid view">
						<Grid className="h-4 w-4" />
					</ToggleGroupItem>
					<ToggleGroupItem value="table" aria-label="Table view">
						<List className="h-4 w-4" />
					</ToggleGroupItem>
				</ToggleGroup>
			</div>

			{/* Grid view */}
			{viewMode === 'grid' && (
				<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
					{submissions.map((submission) => (
						<SubmissionCard
							key={submission.id}
							submission={submission}
							onEdit={onEdit}
						/>
					))}
				</div>
			)}

			{/* Table view */}
			{viewMode === 'table' && (
				<div className="rounded-md border">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead className="w-20">Image</TableHead>
								<TableHead>Caption</TableHead>
								<TableHead className="w-24">Status</TableHead>
								<TableHead className="w-32">Date</TableHead>
								<TableHead className="w-20">Actions</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{submissions.map((submission) => (
								<TableRow key={submission.id}>
									<TableCell>
										<SubmissionThumbnail mediaUrl={submission.mediaUrl} />
									</TableCell>
									<TableCell className="max-w-xs truncate">
										{submission.caption || '-'}
									</TableCell>
									<TableCell>{getStatusLabel(submission)}</TableCell>
									<TableCell>
										{format(new Date(submission.createdAt), 'MMM d, yyyy')}
									</TableCell>
									<TableCell>
										{submission.submissionStatus === 'pending' && onEdit && (
											<Button
												variant="ghost"
												size="sm"
												onClick={() => onEdit(submission)}
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
