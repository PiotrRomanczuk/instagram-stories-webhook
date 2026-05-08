'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';

export interface ChartDataPoint {
	date: string; // ISO yyyy-mm-dd
	archived: number;
	drafted: number;
	published: number;
}

interface PerformanceChartProps {
	data: ChartDataPoint[];
	className?: string;
}

const SERIES = [
	{ key: 'archived' as const, label: 'Archived', color: '#7e57f7' },
	{ key: 'drafted' as const, label: 'Drafted to TT', color: '#2b6cee' },
	{ key: 'published' as const, label: 'Published', color: '#10b981' },
];

// Pixel-space viewBox so circles stay round (no preserveAspectRatio="none").
const VB_WIDTH = 800;
const VB_HEIGHT = 240;
const PADDING = { top: 16, right: 16, bottom: 28, left: 36 };

function fmtDate(iso: string): string {
	const d = new Date(iso);
	return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function PerformanceChart({ data, className }: PerformanceChartProps) {
	const [hovered, setHovered] = useState<number | null>(null);

	const innerW = VB_WIDTH - PADDING.left - PADDING.right;
	const innerH = VB_HEIGHT - PADDING.top - PADDING.bottom;

	const maxValue = Math.max(
		1,
		...data.flatMap((d) => [d.archived, d.drafted, d.published]),
	);

	function xFor(idx: number): number {
		if (data.length <= 1) return PADDING.left + innerW / 2;
		return PADDING.left + (idx / (data.length - 1)) * innerW;
	}
	function yFor(value: number): number {
		return PADDING.top + innerH - (value / maxValue) * innerH;
	}

	const yTicks = [0, 0.25, 0.5, 0.75, 1].map((r) => ({
		ratio: r,
		value: Math.round(maxValue * r),
		y: PADDING.top + innerH - r * innerH,
	}));

	const xLabels = (() => {
		if (data.length === 0) return [];
		const stride = Math.max(1, Math.ceil(data.length / 6));
		const labels: { x: number; label: string }[] = [];
		for (let i = 0; i < data.length; i += stride) {
			labels.push({ x: xFor(i), label: fmtDate(data[i].date) });
		}
		const last = data.length - 1;
		if (labels[labels.length - 1]?.label !== fmtDate(data[last].date)) {
			labels.push({ x: xFor(last), label: fmtDate(data[last].date) });
		}
		return labels;
	})();

	const empty = data.every((d) => d.archived + d.drafted + d.published === 0);

	return (
		<div className={cn('rounded-xl border border-[#2a3649] bg-[#1a2332] p-6', className)}>
			<div className="mb-4 flex flex-wrap items-start justify-between gap-3">
				<div>
					<h3 className="text-lg font-semibold text-white">Pipeline throughput</h3>
					<p className="text-sm text-[#92a4c9]">
						Daily counts of archived stories, drafts pushed to TT inbox, and drafts that
						reached published status.
					</p>
				</div>
				<div className="flex items-center gap-3 text-xs text-[#92a4c9]">
					{SERIES.map((s) => (
						<span key={s.key} className="flex items-center gap-1.5">
							<span
								className="inline-block h-2.5 w-2.5 rounded-full"
								style={{ backgroundColor: s.color }}
							/>
							{s.label}
						</span>
					))}
				</div>
			</div>

			<div className="relative">
				<svg
					viewBox={`0 0 ${VB_WIDTH} ${VB_HEIGHT}`}
					className="block h-auto w-full"
					role="img"
					aria-label="Pipeline throughput trend"
				>
					{/* Grid + Y axis labels */}
					{yTicks.map((t) => (
						<g key={t.ratio}>
							<line
								x1={PADDING.left}
								x2={VB_WIDTH - PADDING.right}
								y1={t.y}
								y2={t.y}
								stroke="#2a3649"
								strokeWidth="1"
							/>
							<text
								x={PADDING.left - 6}
								y={t.y + 4}
								textAnchor="end"
								fontSize="10"
								fill="#92a4c9"
							>
								{t.value}
							</text>
						</g>
					))}

					{/* X axis labels */}
					{xLabels.map((l, i) => (
						<text
							key={i}
							x={l.x}
							y={VB_HEIGHT - 8}
							textAnchor="middle"
							fontSize="10"
							fill="#92a4c9"
						>
							{l.label}
						</text>
					))}

					{/* Series */}
					{SERIES.map((s) => {
						const path = data
							.map((d, i) => `${i === 0 ? 'M' : 'L'} ${xFor(i)} ${yFor(d[s.key])}`)
							.join(' ');
						return (
							<g key={s.key}>
								<path
									d={path}
									fill="none"
									stroke={s.color}
									strokeWidth="2"
									strokeLinecap="round"
									strokeLinejoin="round"
								/>
								{data.map((d, i) => (
									<circle
										key={i}
										cx={xFor(i)}
										cy={yFor(d[s.key])}
										r={hovered === i ? 4 : 2.5}
										fill={s.color}
									/>
								))}
							</g>
						);
					})}

					{/* Hover hit areas (one column per data index) */}
					{data.map((_, i) => {
						const half = data.length > 1 ? innerW / (data.length - 1) / 2 : innerW;
						const cx = xFor(i);
						return (
							<rect
								key={`hit-${i}`}
								x={cx - half}
								y={PADDING.top}
								width={half * 2}
								height={innerH}
								fill="transparent"
								onMouseEnter={() => setHovered(i)}
								onMouseLeave={() => setHovered(null)}
							/>
						);
					})}
				</svg>

				{empty && (
					<div className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-[#92a4c9]">
						No pipeline activity in this range yet.
					</div>
				)}

				{hovered !== null && data[hovered] && (
					<div
						className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-md border border-[#2a3649] bg-[#101622] px-3 py-2 text-xs shadow-lg"
						style={{
							left: `${(xFor(hovered) / VB_WIDTH) * 100}%`,
							top: `${(yFor(maxValue) / VB_HEIGHT) * 100}%`,
						}}
					>
						<p className="mb-1 font-medium text-white">{fmtDate(data[hovered].date)}</p>
						{SERIES.map((s) => (
							<p key={s.key} className="flex items-center gap-1.5 text-[#92a4c9]">
								<span
									className="inline-block h-2 w-2 rounded-full"
									style={{ backgroundColor: s.color }}
								/>
								<span className="text-white">{data[hovered][s.key]}</span>
								<span>{s.label.toLowerCase()}</span>
							</p>
						))}
					</div>
				)}
			</div>
		</div>
	);
}
