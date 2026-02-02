'use client';

import { User, AtSign, Hash, MapPin, StickyNote } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatRelativeTime } from '@/lib/utils';

interface Creator {
	name: string;
	handle: string;
	avatarUrl?: string;
}

interface StoryMetadata {
	creator: Creator;
	mentions: string[];
	hashtags: string[];
	location?: string;
	creatorNotes?: string;
	submittedAt: Date | string;
}

interface StoryMetadataPanelProps {
	metadata: StoryMetadata | null;
	className?: string;
}

export function StoryMetadataPanel({
	metadata,
	className,
}: StoryMetadataPanelProps) {
	if (!metadata) {
		return (
			<div
				className={cn(
					'w-[360px] p-6 rounded-xl',
					'bg-[#1a2332] border border-[#2a3649]',
					'flex items-center justify-center text-[#92a4c9]',
					className
				)}
			>
				<p className="text-sm">Select a story to view details</p>
			</div>
		);
	}

	const { creator, mentions, hashtags, location, creatorNotes, submittedAt } =
		metadata;

	return (
		<div
			className={cn(
				'w-[360px] rounded-xl overflow-hidden',
				'bg-[#1a2332] border border-[#2a3649]',
				className
			)}
		>
			{/* Creator Section */}
			<div className="p-4 border-b border-[#2a3649]">
				<div className="flex items-center gap-3">
					{creator.avatarUrl ? (
						<img
							src={creator.avatarUrl}
							alt={creator.name}
							className="h-12 w-12 rounded-full object-cover"
						/>
					) : (
						<div className="h-12 w-12 rounded-full bg-[#2a3649] flex items-center justify-center">
							<User className="h-6 w-6 text-[#92a4c9]" />
						</div>
					)}
					<div>
						<h3 className="font-semibold text-white">{creator.name}</h3>
						<p className="text-sm text-[#92a4c9]">@{creator.handle}</p>
					</div>
				</div>
				<p className="mt-2 text-xs text-[#92a4c9]">
					Submitted {formatRelativeTime(submittedAt)}
				</p>
			</div>

			{/* Story Details Section */}
			<div className="p-4 space-y-4">
				<h4 className="text-xs font-semibold uppercase tracking-wider text-[#92a4c9]">
					Story Details
				</h4>

				{/* Mentions */}
				{mentions.length > 0 && (
					<div className="space-y-2">
						<div className="flex items-center gap-2 text-[#92a4c9]">
							<AtSign className="h-4 w-4" />
							<span className="text-xs font-medium">Mentions</span>
						</div>
						<div className="flex flex-wrap gap-2">
							{mentions.map((mention) => (
								<span
									key={mention}
									className="px-2 py-1 text-xs rounded-md bg-[#2a3649] text-[#2b6cee]"
								>
									@{mention}
								</span>
							))}
						</div>
					</div>
				)}

				{/* Hashtags */}
				{hashtags.length > 0 && (
					<div className="space-y-2">
						<div className="flex items-center gap-2 text-[#92a4c9]">
							<Hash className="h-4 w-4" />
							<span className="text-xs font-medium">Hashtags</span>
						</div>
						<div className="flex flex-wrap gap-2">
							{hashtags.map((tag) => (
								<span
									key={tag}
									className="px-2 py-1 text-xs rounded-md bg-[#2a3649] text-emerald-400"
								>
									#{tag}
								</span>
							))}
						</div>
					</div>
				)}

				{/* Location */}
				{location && (
					<div className="space-y-2">
						<div className="flex items-center gap-2 text-[#92a4c9]">
							<MapPin className="h-4 w-4" />
							<span className="text-xs font-medium">Location</span>
						</div>
						<p className="text-sm text-white">{location}</p>
					</div>
				)}

				{/* No details message */}
				{mentions.length === 0 && hashtags.length === 0 && !location && (
					<p className="text-sm text-[#92a4c9] italic">
						No additional details provided
					</p>
				)}
			</div>

			{/* Creator Notes Section */}
			<div className="p-4 border-t border-[#2a3649]">
				<div className="flex items-center gap-2 text-[#92a4c9] mb-2">
					<StickyNote className="h-4 w-4" />
					<span className="text-xs font-semibold uppercase tracking-wider">
						Creator Notes
					</span>
				</div>
				<div className="p-3 rounded-lg bg-[#101622] text-sm text-[#92a4c9] min-h-[60px]">
					{creatorNotes || (
						<span className="italic">No notes from creator</span>
					)}
				</div>
			</div>
		</div>
	);
}
