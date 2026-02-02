import * as React from 'react';
import { cn } from '@/lib/utils';

interface SfCardProps extends React.HTMLAttributes<HTMLDivElement> {
	/** Enable hover glow effect */
	hoverGlow?: boolean;
	/** Card variant */
	variant?: 'default' | 'outlined' | 'elevated';
	/** Card padding size */
	padding?: 'none' | 'sm' | 'md' | 'lg';
}

const paddingClasses = {
	none: '',
	sm: 'p-3',
	md: 'p-5',
	lg: 'p-6',
};

const variantClasses = {
	default:
		'bg-white dark:bg-[var(--sf-card-dark)] border border-gray-200 dark:border-[var(--sf-border-dark)]',
	outlined:
		'bg-transparent border border-gray-200 dark:border-[var(--sf-border-dark)]',
	elevated:
		'bg-white dark:bg-[var(--sf-card-dark)] border border-gray-200 dark:border-[var(--sf-border-dark)] shadow-lg',
};

/**
 * SfCard - Dark-themed card component with optional border glow on hover.
 * Part of the StoryFlow design system.
 */
export function SfCard({
	className,
	children,
	hoverGlow = false,
	variant = 'default',
	padding = 'md',
	...props
}: SfCardProps) {
	return (
		<div
			className={cn(
				'relative overflow-hidden rounded-xl transition-all duration-200',
				variantClasses[variant],
				paddingClasses[padding],
				hoverGlow && [
					'hover:border-[var(--sf-primary)]/50',
					'hover:shadow-[0_0_20px_rgba(43,108,238,0.15)]',
					'dark:hover:shadow-[0_0_20px_rgba(43,108,238,0.25)]',
				],
				className
			)}
			{...props}
		>
			{children}
		</div>
	);
}

interface SfCardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
	/** Show border below header */
	bordered?: boolean;
}

export function SfCardHeader({
	className,
	children,
	bordered = false,
	...props
}: SfCardHeaderProps) {
	return (
		<div
			className={cn(
				'flex items-center justify-between',
				bordered && 'border-b border-gray-200 dark:border-[var(--sf-border-dark)] pb-4 mb-4',
				className
			)}
			{...props}
		>
			{children}
		</div>
	);
}

export function SfCardTitle({
	className,
	children,
	...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
	return (
		<h3
			className={cn(
				'text-lg font-semibold text-slate-900 dark:text-white',
				className
			)}
			{...props}
		>
			{children}
		</h3>
	);
}

export function SfCardContent({
	className,
	children,
	...props
}: React.HTMLAttributes<HTMLDivElement>) {
	return (
		<div className={cn('', className)} {...props}>
			{children}
		</div>
	);
}

export function SfCardFooter({
	className,
	children,
	...props
}: React.HTMLAttributes<HTMLDivElement>) {
	return (
		<div
			className={cn(
				'flex items-center pt-4 border-t border-gray-200 dark:border-[var(--sf-border-dark)] mt-4',
				className
			)}
			{...props}
		>
			{children}
		</div>
	);
}
