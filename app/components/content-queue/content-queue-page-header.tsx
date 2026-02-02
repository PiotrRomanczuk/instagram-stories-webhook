'use client';

/**
 * Content Queue Page Header Component
 * Sticky header with breadcrumbs, title, search, and action buttons
 */

import { Search, Plus, RefreshCw } from 'lucide-react';

interface ContentQueuePageHeaderProps {
	searchQuery: string;
	onSearchChange: (query: string) => void;
	onRefresh: () => void;
	onNewUpload?: () => void;
	isLoading?: boolean;
}

export function ContentQueuePageHeader({
	searchQuery,
	onSearchChange,
	onRefresh,
	onNewUpload,
	isLoading,
}: ContentQueuePageHeaderProps) {
	return (
		<header className="sticky top-0 z-30 flex min-h-[80px] flex-col justify-center border-b border-[#2a3649] bg-[#101622]/95 px-6 backdrop-blur sm:px-8">
			<div className="flex flex-wrap items-center justify-between gap-4 py-4">
				{/* Title & Breadcrumbs */}
				<div className="flex flex-col gap-1">
					<div className="flex items-center gap-2 text-sm text-[#92a4c9]">
						<span>Dashboard</span>
						<span className="text-xs">/</span>
						<span className="font-medium text-blue-400">Content Queue</span>
					</div>
					<h1 className="text-2xl font-bold tracking-tight text-white">Review Queue</h1>
				</div>

				{/* Header Actions */}
				<div className="flex items-center gap-3">
					{/* Search */}
					<div className="relative hidden sm:block">
						<Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[#92a4c9]" />
						<input
							type="text"
							placeholder="Search content..."
							value={searchQuery}
							onChange={(e) => onSearchChange(e.target.value)}
							className="h-10 w-64 rounded-lg border-none bg-[#232f48] pl-10 pr-4 text-sm font-medium text-white placeholder-[#92a4c9] focus:ring-2 focus:ring-blue-500 focus:outline-none"
						/>
					</div>

					{/* Refresh */}
					<button
						onClick={onRefresh}
						className={`flex h-10 w-10 items-center justify-center rounded-lg text-[#92a4c9] hover:bg-[#232f48] hover:text-white transition-colors ${isLoading ? 'animate-spin' : ''}`}
						title="Refresh"
					>
						<RefreshCw className="h-5 w-5" />
					</button>

					{/* New Upload */}
					{onNewUpload && (
						<button
							onClick={onNewUpload}
							className="flex h-10 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-bold text-white transition-all hover:bg-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-[#101622]"
						>
							<Plus className="h-5 w-5" />
							<span className="hidden sm:inline">New Upload</span>
						</button>
					)}
				</div>
			</div>
		</header>
	);
}
