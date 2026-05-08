'use client';

import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { cn } from '@/lib/utils';
import type { SortDir, TypeFilter } from './stories-table-utils';

export function SortableTh({
	active,
	dir,
	onClick,
	className,
	children,
}: {
	active: boolean;
	dir: SortDir;
	onClick: () => void;
	className?: string;
	children: React.ReactNode;
}) {
	const Icon = !active ? ArrowUpDown : dir === 'asc' ? ArrowUp : ArrowDown;
	const isRight = className?.includes('text-right');
	return (
		<th
			className={cn('cursor-pointer select-none whitespace-nowrap', className)}
			onClick={onClick}
		>
			<span className={cn('inline-flex items-center gap-1', isRight && 'flex-row-reverse')}>
				{children}
				<Icon className={cn('h-3 w-3', !active && 'opacity-30')} />
			</span>
		</th>
	);
}

export function TypeFilterBar({
	value,
	onChange,
	counts,
}: {
	value: TypeFilter;
	onChange: (v: TypeFilter) => void;
	counts: Record<TypeFilter, number>;
}) {
	const opts: Array<{ key: TypeFilter; label: string }> = [
		{ key: 'all', label: 'All' },
		{ key: 'IMAGE', label: 'Images' },
		{ key: 'VIDEO', label: 'Videos' },
	];
	return (
		<div className="flex flex-wrap items-center gap-1">
			{opts.map((o) => (
				<Button
					key={o.key}
					variant={value === o.key ? 'default' : 'outline'}
					size="sm"
					onClick={() => onChange(o.key)}
					className="gap-1.5"
				>
					{o.label}
					<span className="rounded bg-background/20 px-1 text-[10px] font-medium">
						{counts[o.key]}
					</span>
				</Button>
			))}
		</div>
	);
}
