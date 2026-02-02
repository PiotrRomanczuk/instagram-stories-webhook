'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { ChevronDown, Search, X } from 'lucide-react';

interface SfToolbarProps extends React.HTMLAttributes<HTMLDivElement> {
	children: React.ReactNode;
}

/** Filter toolbar container for dropdowns and toggles */
export function SfToolbar({ className, children, ...props }: SfToolbarProps) {
	return (
		<div
			className={cn(
				'flex flex-wrap items-center gap-3 rounded-lg p-3',
				'bg-slate-50 dark:bg-[var(--sf-card-dark)]',
				'border border-gray-200 dark:border-[var(--sf-border-dark)]',
				className
			)}
			{...props}
		>
			{children}
		</div>
	);
}

interface SfToolbarDropdownProps {
	label: string;
	value: string;
	options: Array<{ value: string; label: string }>;
	onChange: (value: string) => void;
	icon?: React.ReactNode;
	className?: string;
}

export function SfToolbarDropdown({ label, value, options, onChange, icon, className }: SfToolbarDropdownProps) {
	const [isOpen, setIsOpen] = React.useState(false);
	const dropdownRef = React.useRef<HTMLDivElement>(null);
	const selectedOption = options.find((opt) => opt.value === value);

	React.useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) setIsOpen(false);
		};
		document.addEventListener('mousedown', handleClickOutside);
		return () => document.removeEventListener('mousedown', handleClickOutside);
	}, []);

	return (
		<div ref={dropdownRef} className={cn('relative', className)}>
			<button
				type="button"
				onClick={() => setIsOpen(!isOpen)}
				className={cn(
					'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
					'bg-white dark:bg-[var(--sf-hover-dark)] border border-gray-200 dark:border-[var(--sf-border-dark)]',
					'text-slate-700 dark:text-white hover:bg-slate-50 dark:hover:bg-[var(--sf-border-dark)]'
				)}
			>
				{icon}
				<span className="text-[var(--sf-text-secondary)]">{label}:</span>
				<span>{selectedOption?.label || value}</span>
				<ChevronDown className={cn('h-4 w-4 transition-transform', isOpen && 'rotate-180')} />
			</button>
			{isOpen && (
				<div className="absolute left-0 top-full z-50 mt-1 min-w-[160px] rounded-lg border border-gray-200 dark:border-[var(--sf-border-dark)] bg-white dark:bg-[var(--sf-card-dark)] py-1 shadow-lg">
					{options.map((option) => (
						<button
							key={option.value}
							type="button"
							onClick={() => { onChange(option.value); setIsOpen(false); }}
							className={cn(
								'w-full px-3 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-[var(--sf-hover-dark)]',
								option.value === value ? 'text-[var(--sf-primary)] font-medium' : 'text-slate-700 dark:text-white'
							)}
						>
							{option.label}
						</button>
					))}
				</div>
			)}
		</div>
	);
}

interface SfToolbarToggleProps {
	label: string;
	checked: boolean;
	onChange: (checked: boolean) => void;
	className?: string;
}

export function SfToolbarToggle({ label, checked, onChange, className }: SfToolbarToggleProps) {
	return (
		<label className={cn('flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-700 dark:text-white', className)}>
			<button
				type="button"
				role="switch"
				aria-checked={checked}
				onClick={() => onChange(!checked)}
				className={cn(
					'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full transition-colors duration-200',
					'focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sf-primary)]',
					checked ? 'bg-[var(--sf-primary)]' : 'bg-slate-300 dark:bg-[var(--sf-border-dark)]'
				)}
			>
				<span className={cn(
					'pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-sm transition duration-200 translate-y-0.5',
					checked ? 'translate-x-4' : 'translate-x-0.5'
				)} />
			</button>
			{label}
		</label>
	);
}

interface SfToolbarSearchProps {
	placeholder?: string;
	value: string;
	onChange: (value: string) => void;
	className?: string;
}

export function SfToolbarSearch({ placeholder = 'Search...', value, onChange, className }: SfToolbarSearchProps) {
	return (
		<div className={cn('relative', className)}>
			<Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--sf-text-secondary)]" />
			<input
				type="text"
				value={value}
				onChange={(e) => onChange(e.target.value)}
				placeholder={placeholder}
				className={cn(
					'h-10 w-full rounded-lg border-none pl-10 pr-8 text-sm font-medium',
					'bg-white dark:bg-[var(--sf-hover-dark)] text-slate-900 dark:text-white',
					'placeholder-[var(--sf-text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--sf-primary)]'
				)}
			/>
			{value && (
				<button
					type="button"
					onClick={() => onChange('')}
					className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--sf-text-secondary)] hover:text-slate-700 dark:hover:text-white"
				>
					<X className="h-4 w-4" />
				</button>
			)}
		</div>
	);
}

export function SfToolbarDivider() {
	return <div className="h-6 w-px bg-gray-200 dark:bg-[var(--sf-border-dark)]" />;
}
