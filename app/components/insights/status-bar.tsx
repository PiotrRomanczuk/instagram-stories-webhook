'use client';

import { MONO_STACK, TT_INBOX_DAILY_CAP } from './insights-tokens';
import type { CompilationSummary } from './use-compilation-summary';

interface StatusBarProps {
	storyCount: number;
	inboxUsed: number;
	summary: CompilationSummary;
}

export function StatusBar({ storyCount, inboxUsed, summary }: StatusBarProps) {
	const inboxFull = inboxUsed >= TT_INBOX_DAILY_CAP;
	const { count, seconds, overBudget, target, fillPct } = summary;
	const cellLabel = `${Math.min(count, target)}/${Math.max(count, target)}`;

	return (
		<div
			className="flex flex-wrap items-center gap-x-7 gap-y-2 px-5 py-3.5 sm:px-6"
			style={{
				borderTop: '1px solid var(--line-2)',
				borderBottom: '1px solid var(--line-2)',
				background: 'var(--surface)',
				fontFamily: MONO_STACK,
				fontSize: 12.5,
				color: 'var(--muted)',
			}}
		>
			<span className="inline-flex items-center gap-2">
				<span
					className="inline-block h-1.5 w-1.5 rounded-full"
					style={{ background: 'oklch(0.62 0.13 150)' }}
				/>
				<span style={{ color: 'var(--ink)' }}>{storyCount}</span> active stories
			</span>
			<span aria-hidden style={{ color: 'var(--muted-2)' }}>
				·
			</span>

			<span className="inline-flex items-center gap-2.5">
				<span>Selected </span>
				<span
					style={{
						color: count > 0 ? 'var(--ink)' : 'var(--muted-2)',
						fontWeight: 600,
					}}
				>
					{count === 0 ? `0/${target}` : count <= target ? `${count}/${target}` : cellLabel}
				</span>
				<span
					className="relative h-1.5 w-24 overflow-hidden rounded-full sm:w-32"
					style={{ background: 'var(--bar-track)' }}
					aria-hidden
				>
					<span
						className="absolute inset-y-0 left-0 rounded-full transition-all"
						style={{
							width: `${fillPct}%`,
							background: overBudget ? 'var(--amber)' : 'var(--bar)',
						}}
					/>
				</span>
				<span style={{ color: overBudget ? 'var(--amber)' : 'var(--ink)' }}>
					≈{seconds}s
				</span>
				<span style={{ color: 'var(--muted-2)' }}>of 60s</span>
				{overBudget && <span style={{ color: 'var(--amber)', fontWeight: 600 }}>over</span>}
			</span>

			<span aria-hidden style={{ color: 'var(--muted-2)' }}>
				·
			</span>

			<span>
				Inbox{' '}
				<span style={{ color: inboxFull ? 'var(--amber)' : 'var(--ink)' }}>
					{inboxUsed}/{TT_INBOX_DAILY_CAP}
				</span>{' '}
				today
			</span>

			<span
				className="ml-auto"
				style={{ color: 'var(--muted-2)', letterSpacing: '0.04em' }}
			>
				24h window
			</span>
		</div>
	);
}
