'use client';

import { Card, CardContent } from '@/app/components/ui/card';
import { Skeleton } from '@/app/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface StatsCardProps {
	label: string;
	value: number | string;
	icon: React.ReactNode;
	iconBgColor?: string;
	description?: string;
	descriptionClassName?: string;
	trend?: {
		value: number;
		isPositive: boolean;
	};
	progress?: number;
	progressColor?: string;
	className?: string;
}

export function StatsCard({
	label,
	value,
	icon,
	iconBgColor = 'bg-primary/10',
	description,
	descriptionClassName,
	trend,
	progress,
	progressColor = 'bg-emerald-500',
	className,
}: StatsCardProps) {
	const isZero = value === 0 || value === '0';

	return (
		<Card className={cn('', className)}>
			<CardContent className="p-4 sm:p-6">
				<div className="flex items-start justify-between">
					<div className="space-y-2">
						<p className="text-sm font-medium text-muted-foreground">{label}</p>
						<div className="flex items-baseline gap-2">
							<p
								className={cn(
									'text-2xl sm:text-3xl font-bold tracking-tight',
									isZero && 'text-muted-foreground/50'
								)}
							>
								{value}
							</p>
							{trend && (
								<span
									className={cn(
										'text-xs font-medium',
										trend.isPositive ? 'text-green-600' : 'text-red-600'
									)}
								>
									{trend.isPositive ? '+' : ''}{trend.value}%
								</span>
							)}
						</div>
						{progress !== undefined && (
							<div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
								<div
									className={cn('h-full rounded-full transition-all', progressColor)}
									style={{ width: `${Math.min(progress, 100)}%` }}
								/>
							</div>
						)}
						{description && (
							<p className={cn('text-xs text-muted-foreground', descriptionClassName)}>
								{description}
							</p>
						)}
					</div>
					<div className={cn('rounded-lg p-2 sm:p-3', iconBgColor)}>{icon}</div>
				</div>
			</CardContent>
		</Card>
	);
}

export function StatsCardSkeleton({ className }: { className?: string }) {
	return (
		<Card className={className}>
			<CardContent className="p-4 sm:p-6">
				<div className="flex items-start justify-between">
					<div className="space-y-2">
						<Skeleton className="h-4 w-24" />
						<Skeleton className="h-7 sm:h-8 w-16" />
						<Skeleton className="h-3 w-32" />
					</div>
					<Skeleton className="h-10 w-10 sm:h-12 sm:w-12 rounded-lg" />
				</div>
			</CardContent>
		</Card>
	);
}
