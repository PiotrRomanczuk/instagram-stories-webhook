'use client';

import { useMemo, useState } from 'react';
import { StoriesTableRow } from './stories-table-row';
import { SortableTh, TypeFilterBar } from './stories-table-controls';
import {
	METRIC_KEYS,
	METRIC_LABELS,
	type SortDir,
	type SortKey,
	type TypeFilter,
	computeTotals,
	findLeaders,
	formatNumber,
	sortStories,
} from './stories-table-utils';
import type { InstagramStory } from '@/lib/instagram/media';
import type { StoryInsightsResponse } from '@/app/api/instagram/stories/insights/route';

interface StoriesTableProps {
	stories: InstagramStory[];
	insights?: StoryInsightsResponse['insights'];
	insightsLoading?: boolean;
}

function countByType(stories: InstagramStory[]): Record<TypeFilter, number> {
	const c: Record<TypeFilter, number> = { all: stories.length, IMAGE: 0, VIDEO: 0 };
	for (const s of stories) c[s.media_type]++;
	return c;
}

export function StoriesTable({ stories, insights, insightsLoading }: StoriesTableProps) {
	const [sortKey, setSortKey] = useState<SortKey>('timestamp');
	const [sortDir, setSortDir] = useState<SortDir>('desc');
	const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');

	const filtered = useMemo(
		() =>
			typeFilter === 'all'
				? stories
				: stories.filter((s) => s.media_type === typeFilter),
		[stories, typeFilter],
	);
	const sorted = useMemo(
		() => sortStories(filtered, insights, sortKey, sortDir),
		[filtered, insights, sortKey, sortDir],
	);
	const totals = useMemo(
		() => computeTotals(insights, sorted.map((s) => s.id)),
		[insights, sorted],
	);
	const leaders = useMemo(() => findLeaders(sorted, insights), [sorted, insights]);

	const handleSort = (key: SortKey) => {
		if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
		else {
			setSortKey(key);
			setSortDir('desc');
		}
	};

	return (
		<div className="space-y-3">
			<TypeFilterBar
				value={typeFilter}
				onChange={setTypeFilter}
				counts={countByType(stories)}
			/>

			<div className="overflow-x-auto rounded-xl border bg-card shadow-sm">
				<table className="w-full text-sm">
					<thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
						<tr>
							<SortableTh
								active={sortKey === 'timestamp'}
								dir={sortDir}
								onClick={() => handleSort('timestamp')}
								className="pl-3 pr-2 py-2 text-left"
							>
								Story
							</SortableTh>
							<SortableTh
								active={sortKey === 'media_type'}
								dir={sortDir}
								onClick={() => handleSort('media_type')}
								className="px-2 py-2 text-left"
							>
								Type
							</SortableTh>
							{METRIC_KEYS.map((k) => (
								<SortableTh
									key={k}
									active={sortKey === k}
									dir={sortDir}
									onClick={() => handleSort(k)}
									className="px-2 py-2 text-right"
								>
									{METRIC_LABELS[k]}
								</SortableTh>
							))}
							<th className="px-2 py-2 text-right" />
						</tr>
					</thead>
					<tbody>
						{sorted.map((s) => (
							<StoriesTableRow
								key={s.id}
								story={s}
								insights={insights?.[s.id]}
								insightsLoading={insightsLoading}
								leaders={leaders}
							/>
						))}
					</tbody>
					<tfoot className="bg-muted/30 text-xs font-medium">
						<tr>
							<td className="pl-3 pr-2 py-2" colSpan={2}>
								Totals · {sorted.length}{' '}
								{sorted.length === 1 ? 'story' : 'stories'}
							</td>
							{METRIC_KEYS.map((k) => (
								<td key={k} className="px-2 py-2 text-right tabular-nums">
									{formatNumber(totals[k])}
								</td>
							))}
							<td className="px-2 py-2" />
						</tr>
					</tfoot>
				</table>
			</div>
		</div>
	);
}
