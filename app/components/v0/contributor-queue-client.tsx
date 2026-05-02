'use client';

import { useState } from 'react';
import {
	type V0Contributor,
	submissionsByContributor,
	contributorDisplayName,
	categoryBySlug,
} from '@/lib/fixtures/v0';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { V0StatusBadge } from './status-badge';

const CURRENT_MONTH = '2026-05';

interface Props {
	contributors: V0Contributor[];
}

export function V0ContributorQueueClient({ contributors }: Props) {
	const [activeId, setActiveId] = useState(contributors[0]?.id ?? '');
	const subs = submissionsByContributor(activeId);
	const monthSubs = subs.filter(
		(s) => s.status === 'published' && s.payoutPeriod === CURRENT_MONTH
	);
	const monthZl = monthSubs.reduce(
		(acc, s) => acc + (s.payoutAmountZl ?? 0) + (s.payoutBonusZl ?? 0),
		0
	);
	const pending = subs.filter((s) => s.status === 'pending').length;
	const approved = subs.filter((s) => s.status === 'approved').length;
	const scheduled = subs.filter((s) => s.status === 'scheduled').length;

	return (
		<div className="space-y-6">
			<div className="flex flex-wrap gap-2 rounded-md border bg-background p-3 text-sm">
				<span className="text-muted-foreground self-center mr-2">View as:</span>
				{contributors.map((c) => (
					<button
						key={c.id}
						onClick={() => setActiveId(c.id)}
						className={`rounded-md border px-3 py-1 transition-colors ${
							activeId === c.id
								? 'bg-foreground text-background border-foreground'
								: 'bg-background hover:bg-muted'
						}`}
					>
						{contributorDisplayName(c)}
					</button>
				))}
			</div>

			<div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
				<Card>
					<CardHeader className="pb-2">
						<CardTitle className="text-xs text-muted-foreground">May 2026 earnings</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">{monthZl.toFixed(2)} zł</div>
						<div className="text-xs text-muted-foreground">{monthSubs.length} published this month</div>
					</CardContent>
				</Card>
				<StatCard label="Pending" value={pending} tone="text-amber-700" />
				<StatCard label="Approved" value={approved} tone="text-emerald-700" />
				<StatCard label="Scheduled" value={scheduled} tone="text-sky-700" />
			</div>

			<Card>
				<CardHeader>
					<CardTitle>All submissions ({subs.length})</CardTitle>
				</CardHeader>
				<CardContent>
					<ul className="divide-y">
						{subs.slice(0, 30).map((s) => {
							const topCat = s.categories[0];
							const cat = topCat ? categoryBySlug(topCat.categorySlug) : undefined;
							return (
								<li key={s.id} className="flex items-center gap-4 py-3 text-sm">
									<span className="font-mono text-xs text-muted-foreground w-20 shrink-0">{s.id}</span>
									<span className="w-16 shrink-0 text-xs uppercase text-muted-foreground">
										{s.mediaType}
									</span>
									<span className="flex-1 min-w-0 truncate">
										{s.caption ?? <em className="text-muted-foreground">no caption</em>}
									</span>
									<span className="shrink-0 text-xs text-muted-foreground">{cat?.label ?? '—'}</span>
									<V0StatusBadge status={s.status} />
								</li>
							);
						})}
					</ul>
					{subs.length > 30 && (
						<p className="text-xs text-muted-foreground pt-3">
							Showing 30 of {subs.length}. v1 adds filtering and pagination.
						</p>
					)}
				</CardContent>
			</Card>
		</div>
	);
}

function StatCard({ label, value, tone }: { label: string; value: number; tone: string }) {
	return (
		<Card>
			<CardHeader className="pb-2">
				<CardTitle className="text-xs text-muted-foreground">{label}</CardTitle>
			</CardHeader>
			<CardContent>
				<div className={`text-2xl font-bold ${tone}`}>{value}</div>
			</CardContent>
		</Card>
	);
}
