'use client';

import { MONO_STACK } from './insights-tokens';

export type FilterMode = 'all' | 'photos' | 'videos';
export type SortMode = 'top' | 'newest' | 'oldest';

interface LeaderboardToolbarProps {
	filter: FilterMode;
	sort: SortMode;
	qualifiedOnly: boolean;
	total: number;
	shown: number;
	onFilterChange: (v: FilterMode) => void;
	onSortChange: (v: SortMode) => void;
	onQualifiedOnlyChange: (v: boolean) => void;
}

const FILTERS: { k: FilterMode; label: string }[] = [
	{ k: 'all', label: 'All' },
	{ k: 'photos', label: 'Photos' },
	{ k: 'videos', label: 'Videos' },
];

const SORTS: { k: SortMode; label: string }[] = [
	{ k: 'top', label: 'Top rate' },
	{ k: 'newest', label: 'Newest' },
	{ k: 'oldest', label: 'Oldest' },
];

export function LeaderboardToolbar({
	filter,
	sort,
	qualifiedOnly,
	total,
	shown,
	onFilterChange,
	onSortChange,
	onQualifiedOnlyChange,
}: LeaderboardToolbarProps) {
	return (
		<div className="flex flex-wrap items-center gap-3 px-5 py-3.5 sm:px-6">
			<div
				className="inline-flex p-1"
				style={{
					borderRadius: 8,
					background: 'var(--bg-2)',
					boxShadow: 'inset 0 0 0 1px var(--line-2)',
				}}
			>
				{FILTERS.map((it) => {
					const active = it.k === filter;
					return (
						<button
							key={it.k}
							onClick={() => onFilterChange(it.k)}
							className="rounded-md px-3 py-1 text-[12.5px] transition-colors"
							style={{
								background: active ? 'var(--surface-2)' : 'transparent',
								color: active ? 'var(--ink)' : 'var(--muted)',
								fontWeight: active ? 600 : 500,
								boxShadow: active
									? '0 1px 2px rgba(0,0,0,0.05), inset 0 0 0 1px var(--line-2)'
									: 'none',
							}}
						>
							{it.label}
						</button>
					);
				})}
			</div>

			<span
				aria-hidden
				className="hidden sm:block"
				style={{ width: 1, height: 18, background: 'var(--line-2)' }}
			/>

			<label
				className="inline-flex items-center gap-2 text-[12.5px]"
				style={{ color: 'var(--muted)' }}
			>
				Sort
				<select
					value={sort}
					onChange={(e) => onSortChange(e.target.value as SortMode)}
					className="cursor-pointer rounded-md px-2.5 py-1 text-[12.5px]"
					style={{
						background: 'var(--surface-2)',
						boxShadow: 'inset 0 0 0 1px var(--line-2)',
						color: 'var(--ink)',
						fontWeight: 600,
						appearance: 'none',
						paddingRight: '1.75rem',
						backgroundImage:
							"url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 12'><path d='M3 4.5l3 3 3-3' fill='none' stroke='%23999' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/></svg>\")",
						backgroundRepeat: 'no-repeat',
						backgroundPosition: 'right 0.4rem center',
						backgroundSize: '12px 12px',
					}}
				>
					{SORTS.map((s) => (
						<option key={s.k} value={s.k}>
							{s.label}
						</option>
					))}
				</select>
			</label>

			<div
				className="ml-auto inline-flex items-center gap-2.5 text-[12.5px]"
				style={{ color: 'var(--muted)' }}
			>
				<button
					type="button"
					role="switch"
					aria-checked={qualifiedOnly}
					onClick={() => onQualifiedOnlyChange(!qualifiedOnly)}
					className="relative inline-flex"
					style={{
						width: 28,
						height: 16,
						borderRadius: 999,
						background: qualifiedOnly ? 'var(--accent)' : 'var(--bar-track)',
						boxShadow: qualifiedOnly ? 'none' : 'inset 0 0 0 1px var(--line)',
						cursor: 'pointer',
						border: 'none',
						padding: 0,
					}}
				>
					<span
						className="absolute"
						style={{
							top: 2,
							left: qualifiedOnly ? 14 : 2,
							width: 12,
							height: 12,
							borderRadius: '50%',
							background: '#fff',
							boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
							transition: 'left 0.18s',
						}}
					/>
				</button>
				<span>Qualified only</span>
				<span
					aria-hidden
					className="hidden sm:inline"
					style={{ color: 'var(--muted-2)' }}
				>
					·
				</span>
				<span
					className="hidden sm:inline"
					style={{ fontFamily: MONO_STACK, color: 'var(--muted)' }}
				>
					<span style={{ color: 'var(--ink)' }}>{shown}</span> of {total}
				</span>
			</div>
		</div>
	);
}
