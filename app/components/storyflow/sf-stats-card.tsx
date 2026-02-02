'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { SfCard } from './sf-card';

interface SfStatsCardProps {
	/** The label/title of the stat */
	label: string;
	/** The main value to display */
	value: string | number;
	/** Icon to display (React node) */
	icon: React.ReactNode;
	/** Background color class for the icon container */
	iconBgColor?: string;
	/** Icon color class */
	iconColor?: string;
	/** Optional description text */
	description?: string;
	/** Optional trend indicator */
	trend?: {
		value: number;
		isPositive: boolean;
		label?: string;
	};
	/** Additional class name */
	className?: string;
}

/**
 * SfStatsCard - KPI stat card with icon, value, and trend indicator.
 * Part of the StoryFlow design system.
 */
export function SfStatsCard({
	label,
	value,
	icon,
	iconBgColor = 'bg-[var(--sf-primary)]/10',
	iconColor = 'text-[var(--sf-primary)]',
	description,
	trend,
	className,
}: SfStatsCardProps) {
	return (
		<SfCard className={cn('', className)}>
			<div className="flex items-start justify-between">
				<div className="space-y-2">
					<p className="text-sm font-medium text-[var(--sf-text-secondary)]">
						{label}
					</p>
					<div className="flex items-baseline gap-2">
						<h3 className="text-3xl font-bold text-slate-900 dark:text-white">
							{value}
						</h3>
						{trend && (
							<span
								className={cn(
									'text-xs font-medium',
									trend.isPositive ? 'text-emerald-500' : 'text-red-500'
								)}
							>
								{trend.isPositive ? '+' : ''}
								{trend.value}%
								{trend.label && (
									<span className="ml-1 text-[var(--sf-text-secondary)]">
										{trend.label}
									</span>
								)}
							</span>
						)}
					</div>
					{description && (
						<p className="text-xs text-[var(--sf-text-secondary)]">
							{description}
						</p>
					)}
				</div>
				<div className={cn('rounded-lg p-2', iconBgColor, iconColor)}>
					{icon}
				</div>
			</div>
		</SfCard>
	);
}

interface SfStatsCardSkeletonProps {
	className?: string;
}

export function SfStatsCardSkeleton({ className }: SfStatsCardSkeletonProps) {
	return (
		<SfCard className={cn('animate-pulse', className)}>
			<div className="flex items-start justify-between">
				<div className="space-y-2">
					<div className="h-4 w-24 rounded bg-slate-200 dark:bg-[var(--sf-border-dark)]" />
					<div className="h-8 w-16 rounded bg-slate-200 dark:bg-[var(--sf-border-dark)]" />
					<div className="h-3 w-32 rounded bg-slate-200 dark:bg-[var(--sf-border-dark)]" />
				</div>
				<div className="h-10 w-10 rounded-lg bg-slate-200 dark:bg-[var(--sf-border-dark)]" />
			</div>
		</SfCard>
	);
}
