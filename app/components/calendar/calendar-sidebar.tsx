'use client';

import { useState } from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/app/components/ui/input';
import { Badge } from '@/app/components/ui/badge';
import { ScrollArea } from '@/app/components/ui/scroll-area';
import { CalendarStoryItem, StoryAsset } from './calendar-story-item';

interface CalendarSidebarProps {
	assets: StoryAsset[];
}

export function CalendarSidebar({ assets }: CalendarSidebarProps) {
	const [searchQuery, setSearchQuery] = useState('');

	const filteredAssets = assets.filter((asset) =>
		asset.title.toLowerCase().includes(searchQuery.toLowerCase())
	);

	return (
		<div className="flex h-full w-80 shrink-0 flex-col border-r border-[#2a3649] bg-[#0d1421]">
			<div className="border-b border-[#2a3649] p-4">
				<div className="mb-3 flex items-center justify-between">
					<h3 className="text-xs font-bold uppercase tracking-widest text-[#92a4c9]">
						Story Assets
					</h3>
					<Badge
						variant="secondary"
						className="bg-[#2b6cee]/20 text-[#2b6cee]"
					>
						{assets.length}
					</Badge>
				</div>
				<div className="relative">
					<Search className="absolute left-3 top-2.5 h-4 w-4 text-[#92a4c9]" />
					<Input
						placeholder="Search assets..."
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						className="border-[#2a3649] bg-[#1a2332] pl-9 text-white placeholder:text-[#92a4c9] focus-visible:ring-[#2b6cee]"
					/>
				</div>
			</div>

			<ScrollArea className="flex-1 p-4">
				<div className="grid grid-cols-2 gap-3">
					{filteredAssets.map((asset) => (
						<CalendarStoryItem key={asset.id} story={asset} />
					))}
				</div>

				{filteredAssets.length === 0 && (
					<div className="flex flex-col items-center justify-center py-12 text-center">
						<p className="text-sm text-[#92a4c9]">No assets found</p>
					</div>
				)}
			</ScrollArea>
		</div>
	);
}
