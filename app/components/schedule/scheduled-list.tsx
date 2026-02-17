'use client';

import { format, isPast, isToday, isTomorrow, differenceInHours } from 'date-fns';
import Image from 'next/image';
import { Clock, Calendar, AlertTriangle, Edit2, X, Eye, MoreHorizontal } from 'lucide-react';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/app/components/ui/table';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { Skeleton } from '@/app/components/ui/skeleton';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@/app/components/ui/dropdown-menu';
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from '@/app/components/ui/dialog';
import { ContentItem, PublishingStatus } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useState } from 'react';

interface ScheduledListProps {
	items: ContentItem[];
	isLoading?: boolean;
	onEdit: (id: string) => void;
	onCancel: (id: string) => void;
}

function getStatusBadge(status: PublishingStatus, scheduledTime?: number) {
	const isOverdue = scheduledTime && isPast(new Date(scheduledTime)) && status === 'scheduled';

	switch (status) {
		case 'scheduled':
			if (isOverdue) {
				return (
					<Badge variant="destructive" className="gap-1">
						<AlertTriangle className="h-3 w-3" />
						Overdue
					</Badge>
				);
			}
			return (
				<Badge variant="secondary" className="gap-1 bg-blue-100 text-blue-700 hover:bg-blue-200">
					<Clock className="h-3 w-3" />
					Scheduled
				</Badge>
			);
		case 'processing':
			return (
				<Badge variant="secondary" className="gap-1 bg-yellow-100 text-yellow-700 hover:bg-yellow-200">
					<Clock className="h-3 w-3 animate-spin" />
					Processing
				</Badge>
			);
		case 'published':
			return (
				<Badge variant="secondary" className="gap-1 bg-green-100 text-green-700 hover:bg-green-200">
					Published
				</Badge>
			);
		case 'failed':
			return (
				<Badge variant="destructive" className="gap-1">
					<AlertTriangle className="h-3 w-3" />
					Failed
				</Badge>
			);
		default:
			return <Badge variant="secondary">{status}</Badge>;
	}
}

function getTimeLabel(scheduledTime: number) {
	const date = new Date(scheduledTime);
	const hoursUntil = differenceInHours(date, new Date());

	if (isPast(date)) {
		return (
			<span className="text-destructive font-medium">
				{format(date, 'MMM d, HH:mm')}
			</span>
		);
	}

	if (isToday(date)) {
		return (
			<span className="font-medium">
				Today at {format(date, 'HH:mm')}
			</span>
		);
	}

	if (isTomorrow(date)) {
		return (
			<span>Tomorrow at {format(date, 'HH:mm')}</span>
		);
	}

	if (hoursUntil < 24 * 7) {
		return (
			<span>{format(date, 'EEEE \'at\' HH:mm')}</span>
		);
	}

	return <span>{format(date, 'MMM d \'at\' HH:mm')}</span>;
}

export function ScheduledList({
	items,
	isLoading = false,
	onEdit,
	onCancel,
}: ScheduledListProps) {
	const [previewItem, setPreviewItem] = useState<ContentItem | null>(null);

	if (isLoading) {
		return <ScheduledListSkeleton />;
	}

	if (items.length === 0) {
		return (
			<div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
				<Calendar className="h-12 w-12 text-muted-foreground/50" />
				<h3 className="mt-4 text-lg font-semibold">No scheduled posts</h3>
				<p className="mt-2 text-sm text-muted-foreground">
					Approved submissions will appear here when scheduled.
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
							<TableHead className="w-20">Preview</TableHead>
							<TableHead>Caption</TableHead>
							<TableHead>Scheduled For</TableHead>
							<TableHead>Status</TableHead>
							<TableHead className="text-right">Actions</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{items.map((item) => {
							const isOverdue = item.scheduledTime && isPast(new Date(item.scheduledTime)) && item.publishingStatus === 'scheduled';

							return (
								<TableRow
									key={item.id}
									className={cn(isOverdue && 'bg-red-50/50')}
								>
									<TableCell>
										<button
											onClick={() => setPreviewItem(item)}
											className="relative h-14 w-14 overflow-hidden rounded-md border hover:opacity-80 transition-opacity"
										>
											<Image
												src={item.mediaUrl}
												alt={item.title || 'Scheduled post'}
												fill
												className="object-cover"
												sizes="56px"
											/>
											<div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 hover:opacity-100 transition-opacity">
												<Eye className="h-4 w-4 text-white" />
											</div>
										</button>
									</TableCell>
									<TableCell className="max-w-xs">
										<p className="truncate text-sm" title={item.caption}>
											{item.caption || item.title || 'No caption'}
										</p>
										{item.error && (
											<p className="text-xs text-destructive mt-1 truncate" title={item.error}>
												Error: {item.error}
											</p>
										)}
									</TableCell>
									<TableCell>
										{item.scheduledTime ? (
											getTimeLabel(item.scheduledTime)
										) : (
											<span className="text-muted-foreground">Not scheduled</span>
										)}
									</TableCell>
									<TableCell>
										{getStatusBadge(item.publishingStatus, item.scheduledTime)}
									</TableCell>
									<TableCell className="text-right">
										<DropdownMenu>
											<DropdownMenuTrigger asChild>
												<Button variant="ghost" size="sm">
													<MoreHorizontal className="h-4 w-4" />
												</Button>
											</DropdownMenuTrigger>
											<DropdownMenuContent align="end">
												<DropdownMenuItem onClick={() => onEdit(item.id)}>
													<Edit2 className="mr-2 h-4 w-4" />
													Edit Schedule
												</DropdownMenuItem>
												<DropdownMenuItem
													onClick={() => onCancel(item.id)}
													className="text-destructive focus:text-destructive"
												>
													<X className="mr-2 h-4 w-4" />
													Cancel
												</DropdownMenuItem>
											</DropdownMenuContent>
										</DropdownMenu>
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
							{previewItem?.title || 'Scheduled Post Preview'}
						</DialogTitle>
					</DialogHeader>
					{previewItem && (
						<div className="space-y-4">
							<div className="relative aspect-[9/16] max-h-[60vh] w-full overflow-hidden rounded-lg bg-muted">
								<Image
									src={previewItem.mediaUrl}
									alt={previewItem.title || 'Scheduled post'}
									fill
									className="object-contain"
								/>
							</div>
							{previewItem.caption && (
								<div className="space-y-2">
									<h4 className="text-sm font-medium">Caption</h4>
									<p className="text-sm text-muted-foreground whitespace-pre-wrap">
										{previewItem.caption}
									</p>
								</div>
							)}
							<div className="flex items-center justify-between text-sm">
								<div className="flex items-center gap-2">
									{getStatusBadge(previewItem.publishingStatus, previewItem.scheduledTime)}
								</div>
								<div className="text-muted-foreground">
									{previewItem.scheduledTime && getTimeLabel(previewItem.scheduledTime)}
								</div>
							</div>
							<div className="flex justify-end gap-2 pt-4">
								<Button variant="outline" onClick={() => onEdit(previewItem.id)}>
									<Edit2 className="mr-2 h-4 w-4" />
									Edit Schedule
								</Button>
								<Button variant="destructive" onClick={() => {
									onCancel(previewItem.id);
									setPreviewItem(null);
								}}>
									<X className="mr-2 h-4 w-4" />
									Cancel Post
								</Button>
							</div>
						</div>
					)}
				</DialogContent>
			</Dialog>
		</>
	);
}

function ScheduledListSkeleton() {
	return (
		<div className="rounded-md border">
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead className="w-20">Preview</TableHead>
						<TableHead>Caption</TableHead>
						<TableHead>Scheduled For</TableHead>
						<TableHead>Status</TableHead>
						<TableHead className="text-right">Actions</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{Array.from({ length: 5 }).map((_, i) => (
						<TableRow key={i}>
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
								<Skeleton className="h-6 w-24" />
							</TableCell>
							<TableCell>
								<Skeleton className="ml-auto h-8 w-8" />
							</TableCell>
						</TableRow>
					))}
				</TableBody>
			</Table>
		</div>
	);
}
