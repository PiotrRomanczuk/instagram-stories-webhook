'use client';

import { cn } from '@/lib/utils';

export type UserFilterTab = 'all' | 'managers' | 'senior-creators' | 'creators';

interface UsersTabFilterProps {
	activeTab: UserFilterTab;
	onTabChange: (tab: UserFilterTab) => void;
	counts?: {
		all: number;
		managers: number;
		seniorCreators: number;
		creators: number;
	};
}

const TABS: { id: UserFilterTab; label: string }[] = [
	{ id: 'all', label: 'All Users' },
	{ id: 'managers', label: 'Managers' },
	{ id: 'senior-creators', label: 'Senior Creators' },
	{ id: 'creators', label: 'Creators' },
];

export function UsersTabFilter({
	activeTab,
	onTabChange,
	counts,
}: UsersTabFilterProps) {
	return (
		<div className="flex gap-8 border-b border-[#2a3649]">
			{TABS.map((tab) => {
				const isActive = activeTab === tab.id;
				const count = counts
					? tab.id === 'all'
						? counts.all
						: tab.id === 'managers'
							? counts.managers
							: tab.id === 'senior-creators'
								? counts.seniorCreators
								: counts.creators
					: undefined;

				return (
					<button
						key={tab.id}
						onClick={() => onTabChange(tab.id)}
						className={cn(
							'border-b-2 pb-3 pt-2 text-sm font-bold transition-colors',
							isActive
								? 'border-[#2b6cee] text-white'
								: 'border-transparent text-[#92a4c9] hover:text-white'
						)}
					>
						{tab.label}
						{count !== undefined && (
							<span className="ml-1.5 text-xs opacity-60">({count})</span>
						)}
					</button>
				);
			})}
		</div>
	);
}
