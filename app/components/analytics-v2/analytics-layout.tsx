'use client';

import { useState, useEffect, useCallback } from 'react';
import { Calendar, Download, Loader2, AlertTriangle } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { AnalyticsKPIRow } from './analytics-kpi-row';
import { PerformanceChart, ChartDataPoint } from './performance-chart';
import { CreatorsTable, CreatorData } from './creators-table';
import { cn } from '@/lib/utils';

interface AnalyticsData {
	totalViews: number;
	viewsChange: number;
	completionRate: number;
	completionChange: number;
	storiesPosted: number;
	storiesChange: number;
	activeCreators: number;
	creatorsChange: number;
	chartData: ChartDataPoint[];
	topCreators: CreatorData[];
}

type DateRange = '7d' | '30d' | '90d';

export function AnalyticsLayout() {
	const [dateRange, setDateRange] = useState<DateRange>('30d');
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);

	const fetchAnalytics = useCallback(async () => {
		setIsLoading(true);
		setError(null);

		try {
			const res = await fetch(`/api/analytics?range=${dateRange}`);

			if (!res.ok) {
				throw new Error('Failed to fetch analytics');
			}

			const data = await res.json();

			// Transform API response to our expected format with fallback mock data
			setAnalytics({
				totalViews: data.totalViews ?? generateMockData().totalViews,
				viewsChange: data.viewsChange ?? generateMockData().viewsChange,
				completionRate: data.completionRate ?? generateMockData().completionRate,
				completionChange: data.completionChange ?? generateMockData().completionChange,
				storiesPosted: data.publishedCount ?? data.storiesPosted ?? generateMockData().storiesPosted,
				storiesChange: data.storiesChange ?? generateMockData().storiesChange,
				activeCreators: data.activeCreators ?? generateMockData().activeCreators,
				creatorsChange: data.creatorsChange ?? generateMockData().creatorsChange,
				chartData: data.chartData ?? generateMockChartData(dateRange),
				topCreators: data.topCreators ?? generateMockCreators(),
			});
		} catch (err) {
			console.error('Analytics fetch error:', err);
			// Use mock data as fallback
			setAnalytics({
				...generateMockData(),
				chartData: generateMockChartData(dateRange),
				topCreators: generateMockCreators(),
			});
		} finally {
			setIsLoading(false);
		}
	}, [dateRange]);

	useEffect(() => {
		fetchAnalytics();
	}, [fetchAnalytics]);

	const handleExportReport = () => {
		// TODO: Implement CSV export
		console.log('Exporting report...');
	};

	// Loading state
	if (isLoading) {
		return (
			<div className="flex items-center justify-center min-h-[600px]">
				<div className="text-center space-y-4">
					<Loader2 className="h-12 w-12 animate-spin text-[#92a4c9] mx-auto" />
					<p className="text-[#92a4c9] font-medium">Loading analytics...</p>
				</div>
			</div>
		);
	}

	// Error state
	if (error && !analytics) {
		return (
			<div className="flex flex-col items-center justify-center min-h-[600px] text-center">
				<AlertTriangle className="h-12 w-12 text-red-400 mb-4" />
				<h3 className="text-lg font-semibold text-white">
					Failed to load analytics
				</h3>
				<p className="text-sm text-[#92a4c9] mt-2 mb-4">{error}</p>
				<Button onClick={fetchAnalytics} variant="outline">
					Try Again
				</Button>
			</div>
		);
	}

	if (!analytics) return null;

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
				<div>
					<h1 className="text-2xl font-bold text-white">Analytics Dashboard</h1>
					<p className="text-sm text-[#92a4c9]">
						Track creator performance, story engagement, and approval workflows
					</p>
				</div>

				<div className="flex items-center gap-3">
					{/* Date Range Selector */}
					<div className="flex items-center gap-1 p-1 rounded-lg bg-[#1a2332] border border-[#2a3649]">
						{(['7d', '30d', '90d'] as DateRange[]).map((range) => (
							<button
								key={range}
								onClick={() => setDateRange(range)}
								className={cn(
									'px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
									dateRange === range
										? 'bg-[#2b6cee] text-white'
										: 'text-[#92a4c9] hover:text-white'
								)}
							>
								{range === '7d' && 'Last 7 Days'}
								{range === '30d' && 'Last 30 Days'}
								{range === '90d' && 'Last 90 Days'}
							</button>
						))}
					</div>

					{/* Export Button */}
					<Button
						variant="outline"
						size="sm"
						onClick={handleExportReport}
						className="bg-transparent border-[#2a3649] text-[#92a4c9] hover:text-white hover:border-[#2b6cee]"
					>
						<Download className="h-4 w-4 mr-2" />
						Export Report
					</Button>
				</div>
			</div>

			{/* KPI Cards */}
			<AnalyticsKPIRow
				totalViews={analytics.totalViews}
				viewsChange={analytics.viewsChange}
				completionRate={analytics.completionRate}
				completionChange={analytics.completionChange}
				storiesPosted={analytics.storiesPosted}
				storiesChange={analytics.storiesChange}
				activeCreators={analytics.activeCreators}
				creatorsChange={analytics.creatorsChange}
			/>

			{/* Performance Chart */}
			<PerformanceChart data={analytics.chartData} />

			{/* Top Creators Table */}
			<CreatorsTable
				creators={analytics.topCreators}
				onViewAll={() => (window.location.href = '/users')}
			/>
		</div>
	);
}

// Mock data generators for fallback/demo
function generateMockData() {
	return {
		totalViews: 2400000,
		viewsChange: 12,
		completionRate: 84,
		completionChange: 3,
		storiesPosted: 145,
		storiesChange: 8,
		activeCreators: 12,
		creatorsChange: -2,
	};
}

function generateMockChartData(range: DateRange): ChartDataPoint[] {
	const days = range === '7d' ? 7 : range === '30d' ? 30 : 90;
	const data: ChartDataPoint[] = [];

	for (let i = days - 1; i >= 0; i--) {
		const date = new Date();
		date.setDate(date.getDate() - i);
		const dateStr = date.toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
		});

		data.push({
			date: dateStr,
			views: Math.floor(50000 + Math.random() * 150000),
			completion: Math.floor(70 + Math.random() * 25),
		});
	}

	return data;
}

function generateMockCreators(): CreatorData[] {
	return [
		{
			id: '1',
			name: 'Sarah Jenkins',
			email: 'sarah@example.com',
			submissionCount: 32,
			approvalRate: 94,
			totalViews: 450230,
			trend: 'up',
		},
		{
			id: '2',
			name: 'Mike Ross',
			email: 'mike@example.com',
			submissionCount: 28,
			approvalRate: 78,
			totalViews: 320105,
			trend: 'stable',
		},
		{
			id: '3',
			name: 'Emily Chen',
			email: 'emily@example.com',
			submissionCount: 24,
			approvalRate: 88,
			totalViews: 285420,
			trend: 'up',
		},
		{
			id: '4',
			name: 'Alex Morgan',
			email: 'alex@example.com',
			submissionCount: 19,
			approvalRate: 65,
			totalViews: 198750,
			trend: 'down',
		},
	];
}
