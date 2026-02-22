import { Bug, Shield, Sparkles, Zap, Palette, type LucideIcon } from 'lucide-react';

type Category = 'feature' | 'improvement' | 'fix' | 'security' | 'design';

export interface ReleaseNoteItem {
	title: string;
	description: string;
	category: Category;
	devHours: number;
}

export interface ReleaseNote {
	version: string;
	date: string;
	title: string;
	totalDevHours: number;
	highlights: ReleaseNoteItem[];
}

export const CATEGORY_CONFIG: Record<
	Category,
	{ icon: LucideIcon; color: string }
> = {
	feature: { icon: Sparkles, color: 'text-purple-500' },
	improvement: { icon: Zap, color: 'text-blue-500' },
	fix: { icon: Bug, color: 'text-orange-500' },
	security: { icon: Shield, color: 'text-green-500' },
	design: { icon: Palette, color: 'text-pink-500' },
};

// Add new entries to the FRONT of this array (newest first)
export const RELEASE_NOTES: ReleaseNote[] = [
	{
		version: '0.27.0',
		date: '2026-02-21',
		title: 'Swipe Hint Animation',
		totalDevHours: 9,
		highlights: [
			{
				title: 'Swipe hint on Review page',
				description:
					'A subtle wiggle animation nudges you to swipe through stories during review.',
				category: 'feature',
				devHours: 4,
			},
			{
				title: 'WebSocket crash recovery',
				description:
					'Realtime sync now catches and recovers from WebSocket disconnections.',
				category: 'fix',
				devHours: 3,
			},
			{
				title: 'Improved error boundaries',
				description:
					'Better error handling and Suspense fallbacks on the Schedule page.',
				category: 'improvement',
				devHours: 2,
			},
		],
	},
];
