'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';

export interface ChartDataPoint {
	date: string;
	views: number;
	completion: number;
}

interface PerformanceChartProps {
	data: ChartDataPoint[];
	className?: string;
}

type MetricType = 'views' | 'completion';

export function PerformanceChart({ data, className }: PerformanceChartProps) {
	const [activeMetric, setActiveMetric] = useState<MetricType>('views');
	const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

	// Get the values for the active metric
	const values = data.map((d) => (activeMetric === 'views' ? d.views : d.completion));
	const maxValue = Math.max(...values, 1);
	const minValue = Math.min(...values);

	// Calculate chart dimensions
	const chartHeight = 200;
	const chartWidth = 100; // percentage

	// Generate points for the line
	const points = values.map((value, index) => {
		const x = (index / (values.length - 1)) * 100;
		const y = chartHeight - ((value - minValue) / (maxValue - minValue || 1)) * chartHeight;
		return { x, y, value };
	});

	// Create SVG path for the line
	const linePath = points
		.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
		.join(' ');

	// Create path for the gradient fill area
	const areaPath = `${linePath} L ${100} ${chartHeight} L 0 ${chartHeight} Z`;

	// Format value for display
	const formatValue = (value: number) => {
		if (activeMetric === 'completion') {
			return `${value.toFixed(1)}%`;
		}
		if (value >= 1000000) {
			return `${(value / 1000000).toFixed(1)}M`;
		}
		if (value >= 1000) {
			return `${(value / 1000).toFixed(0)}K`;
		}
		return value.toString();
	};

	const hoveredPoint = hoveredIndex !== null ? points[hoveredIndex] : null;
	const hoveredData = hoveredIndex !== null ? data[hoveredIndex] : null;

	return (
		<div
			className={cn(
				'p-6 rounded-xl',
				'bg-[#1a2332] border border-[#2a3649]',
				className
			)}
		>
			{/* Header */}
			<div className="flex items-center justify-between mb-6">
				<div>
					<h3 className="text-lg font-semibold text-white">Performance Trends</h3>
					<p className="text-sm text-[#92a4c9]">
						Daily story views and engagement over the selected period
					</p>
				</div>

				{/* Metric Toggle */}
				<div className="flex items-center gap-1 p-1 rounded-lg bg-[#101622]">
					<button
						onClick={() => setActiveMetric('views')}
						className={cn(
							'px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
							activeMetric === 'views'
								? 'bg-[#2b6cee] text-white'
								: 'text-[#92a4c9] hover:text-white'
						)}
					>
						Views
					</button>
					<button
						onClick={() => setActiveMetric('completion')}
						className={cn(
							'px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
							activeMetric === 'completion'
								? 'bg-[#2b6cee] text-white'
								: 'text-[#92a4c9] hover:text-white'
						)}
					>
						Completion
					</button>
				</div>
			</div>

			{/* Chart */}
			<div className="relative" style={{ height: chartHeight + 40 }}>
				{/* Y-axis labels */}
				<div className="absolute left-0 top-0 bottom-8 w-12 flex flex-col justify-between text-xs text-[#92a4c9]">
					<span>{formatValue(maxValue)}</span>
					<span>{formatValue((maxValue + minValue) / 2)}</span>
					<span>{formatValue(minValue)}</span>
				</div>

				{/* Chart area */}
				<div className="ml-14 relative" style={{ height: chartHeight }}>
					<svg
						viewBox={`0 0 100 ${chartHeight}`}
						preserveAspectRatio="none"
						className="w-full h-full"
					>
						{/* Gradient definition */}
						<defs>
							<linearGradient id="chartGradient" x1="0%" y1="0%" x2="0%" y2="100%">
								<stop offset="0%" stopColor="#2b6cee" stopOpacity="0.3" />
								<stop offset="100%" stopColor="#2b6cee" stopOpacity="0" />
							</linearGradient>
						</defs>

						{/* Horizontal grid lines */}
						{[0, 0.25, 0.5, 0.75, 1].map((ratio) => (
							<line
								key={ratio}
								x1="0"
								y1={chartHeight * ratio}
								x2="100"
								y2={chartHeight * ratio}
								stroke="#2a3649"
								strokeWidth="0.5"
							/>
						))}

						{/* Gradient fill area */}
						<path d={areaPath} fill="url(#chartGradient)" />

						{/* Line */}
						<path
							d={linePath}
							fill="none"
							stroke="#2b6cee"
							strokeWidth="2"
							strokeLinecap="round"
							strokeLinejoin="round"
							vectorEffect="non-scaling-stroke"
						/>

						{/* Data points */}
						{points.map((point, index) => (
							<circle
								key={index}
								cx={point.x}
								cy={point.y}
								r={hoveredIndex === index ? 6 : 4}
								fill={hoveredIndex === index ? '#2b6cee' : '#1a2332'}
								stroke="#2b6cee"
								strokeWidth="2"
								className="cursor-pointer transition-all"
								onMouseEnter={() => setHoveredIndex(index)}
								onMouseLeave={() => setHoveredIndex(null)}
							/>
						))}
					</svg>

					{/* Hover tooltip */}
					{hoveredPoint && hoveredData && (
						<div
							className={cn(
								'absolute z-10 px-3 py-2 rounded-lg',
								'bg-[#101622] border border-[#2a3649]',
								'text-sm shadow-lg transform -translate-x-1/2',
								'pointer-events-none'
							)}
							style={{
								left: `${hoveredPoint.x}%`,
								top: hoveredPoint.y - 50,
							}}
						>
							<p className="text-white font-medium">{formatValue(hoveredPoint.value)}</p>
							<p className="text-xs text-[#92a4c9]">{hoveredData.date}</p>
						</div>
					)}
				</div>

				{/* X-axis labels */}
				<div className="ml-14 flex justify-between text-xs text-[#92a4c9] mt-2">
					{data.filter((_, i) => i % Math.ceil(data.length / 5) === 0 || i === data.length - 1).map((d) => (
						<span key={d.date}>{d.date}</span>
					))}
				</div>
			</div>
		</div>
	);
}
