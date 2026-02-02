import * as React from 'react';
import { cn } from '@/lib/utils';

type StatusType = 'pending' | 'approved' | 'rejected' | 'published' | 'scheduled' | 'processing';

interface SfStatusBadgeProps {
	/** The status to display */
	status: StatusType;
	/** Size of the badge */
	size?: 'sm' | 'md' | 'lg';
	/** Show dot indicator */
	showDot?: boolean;
	/** Additional class name */
	className?: string;
}

const statusConfig: Record<
	StatusType,
	{ bg: string; text: string; border: string; dot: string; label: string }
> = {
	pending: {
		bg: 'bg-yellow-500/10 dark:bg-yellow-500/20',
		text: 'text-yellow-700 dark:text-yellow-400',
		border: 'border-yellow-500/20',
		dot: 'bg-yellow-500',
		label: 'Pending',
	},
	approved: {
		bg: 'bg-emerald-500/10 dark:bg-emerald-500/20',
		text: 'text-emerald-700 dark:text-emerald-400',
		border: 'border-emerald-500/20',
		dot: 'bg-emerald-500',
		label: 'Approved',
	},
	rejected: {
		bg: 'bg-red-500/10 dark:bg-red-500/20',
		text: 'text-red-700 dark:text-red-400',
		border: 'border-red-500/20',
		dot: 'bg-red-500',
		label: 'Rejected',
	},
	published: {
		bg: 'bg-[var(--sf-primary)]/10 dark:bg-[var(--sf-primary)]/20',
		text: 'text-[var(--sf-primary)] dark:text-[var(--sf-primary-light)]',
		border: 'border-[var(--sf-primary)]/20',
		dot: 'bg-[var(--sf-primary)]',
		label: 'Published',
	},
	scheduled: {
		bg: 'bg-purple-500/10 dark:bg-purple-500/20',
		text: 'text-purple-700 dark:text-purple-400',
		border: 'border-purple-500/20',
		dot: 'bg-purple-500',
		label: 'Scheduled',
	},
	processing: {
		bg: 'bg-blue-500/10 dark:bg-blue-500/20',
		text: 'text-blue-700 dark:text-blue-400',
		border: 'border-blue-500/20',
		dot: 'bg-blue-500 animate-pulse',
		label: 'Processing',
	},
};

const sizeClasses = {
	sm: 'text-[10px] px-2 py-0.5',
	md: 'text-xs px-2.5 py-1',
	lg: 'text-sm px-3 py-1.5',
};

const dotSizeClasses = {
	sm: 'h-1.5 w-1.5',
	md: 'h-2 w-2',
	lg: 'h-2.5 w-2.5',
};

/**
 * SfStatusBadge - Status pill component for displaying content status.
 * Part of the StoryFlow design system.
 *
 * Colors: Pending=yellow, Approved=green, Rejected=red, Published=blue
 */
export function SfStatusBadge({
	status,
	size = 'md',
	showDot = false,
	className,
}: SfStatusBadgeProps) {
	const config = statusConfig[status] || statusConfig.pending;

	return (
		<span
			className={cn(
				'inline-flex items-center gap-1.5 rounded-full font-semibold uppercase tracking-wide',
				'border',
				config.bg,
				config.text,
				config.border,
				sizeClasses[size],
				className
			)}
		>
			{showDot && (
				<span className={cn('rounded-full', config.dot, dotSizeClasses[size])} />
			)}
			{config.label}
		</span>
	);
}

/** Get the label for a status type */
export function getStatusLabel(status: StatusType): string {
	return statusConfig[status]?.label || status;
}

/** Get available status types */
export function getStatusTypes(): StatusType[] {
	return Object.keys(statusConfig) as StatusType[];
}
