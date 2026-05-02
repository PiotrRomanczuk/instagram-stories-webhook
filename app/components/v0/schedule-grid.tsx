'use client';

import { useMemo } from 'react';
import { V0_SUBMISSIONS, V0_CADENCE, contributorById, contributorDisplayName } from '@/lib/fixtures/v0';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Pin, Zap, AlertTriangle } from 'lucide-react';

const TODAY = new Date('2026-05-02T08:00:00Z');

interface DayBucket {
	date: string;
	auto: { time: string; subId: string; contributor: string }[];
	pinned: { time: string; subId: string; contributor: string }[];
	approvedAvailable: number;
}

function buildBuckets(): DayBucket[] {
	const scheduled = V0_SUBMISSIONS.filter((s) => s.status === 'scheduled' && s.scheduledFor);
	const buckets: DayBucket[] = [];
	for (let d = 0; d < 14; d++) {
		const day = new Date(TODAY);
		day.setUTCDate(day.getUTCDate() + d);
		const dateKey = day.toISOString().slice(0, 10);
		const dayItems = scheduled.filter(
			(s) => s.scheduledFor!.slice(0, 10) === dateKey
		);
		const auto = dayItems
			.filter((s) => s.scheduleMode !== 'pinned')
			.slice(0, 8)
			.map((s) => ({
				time: s.scheduledFor!.slice(11, 16),
				subId: s.id,
				contributor: contributorDisplayName(contributorById(s.contributorId)!),
			}))
			.sort((a, b) => a.time.localeCompare(b.time));
		const pinned = dayItems
			.filter((s) => s.scheduleMode === 'pinned')
			.map((s) => ({
				time: s.scheduledFor!.slice(11, 16),
				subId: s.id,
				contributor: contributorDisplayName(contributorById(s.contributorId)!),
			}));
		buckets.push({
			date: dateKey,
			auto,
			pinned,
			approvedAvailable: V0_SUBMISSIONS.filter((s) => s.status === 'approved').length,
		});
	}
	return buckets;
}

export function V0ScheduleGrid() {
	const buckets = useMemo(() => buildBuckets(), []);
	const totalScheduled = buckets.reduce((acc, b) => acc + b.auto.length + b.pinned.length, 0);
	const targetTotal = V0_CADENCE.dailyTarget * 14;
	const fillRatio = totalScheduled / targetTotal;

	return (
		<div className="space-y-4">
			<Card>
				<CardContent className="flex flex-wrap gap-4 py-4 text-sm">
					<Stat label="Slots scheduled" value={`${totalScheduled} / ${targetTotal}`} />
					<Stat label="Fill ratio" value={`${(fillRatio * 100).toFixed(0)}%`} />
					<Stat label="Approved queue depth" value={`${buckets[0].approvedAvailable}`} />
					<Stat label="Throttle alarm" value="Green" tone="text-emerald-700" />
				</CardContent>
			</Card>

			<ul className="space-y-2">
				{buckets.map((b) => {
					const isToday = b.date === TODAY.toISOString().slice(0, 10);
					const total = b.auto.length + b.pinned.length;
					const underfilled = total < V0_CADENCE.dailyTarget * 0.6;
					return (
						<li key={b.date}>
							<Card className={isToday ? 'border-foreground' : ''}>
								<CardHeader className="pb-2">
									<CardTitle className="flex items-center gap-3 text-base">
										<span className="font-mono">{b.date}</span>
										{isToday && <Badge variant="default">Today</Badge>}
										<span className="text-xs text-muted-foreground ml-auto">
											{total} / {V0_CADENCE.dailyTarget} slots
										</span>
										{underfilled && total > 0 && (
											<Badge variant="outline" className="gap-1 border-amber-400 text-amber-800">
												<AlertTriangle className="h-3 w-3" /> underfilled
											</Badge>
										)}
									</CardTitle>
								</CardHeader>
								<CardContent className="text-xs">
									{b.pinned.length === 0 && b.auto.length === 0 ? (
										<p className="text-muted-foreground italic">
											Empty. Drag from approved queue or pin from /memes/v0 archive.
										</p>
									) : (
										<div className="flex flex-wrap gap-1.5">
											{b.pinned.map((p) => (
												<Slot key={p.subId} time={p.time} contributor={p.contributor} pinned />
											))}
											{b.auto.map((p) => (
												<Slot key={p.subId} time={p.time} contributor={p.contributor} />
											))}
										</div>
									)}
								</CardContent>
							</Card>
						</li>
					);
				})}
			</ul>
		</div>
	);
}

function Slot({ time, contributor, pinned }: { time: string; contributor: string; pinned?: boolean }) {
	const Icon = pinned ? Pin : Zap;
	return (
		<span
			className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 ${
				pinned ? 'bg-rose-50 border-rose-300 text-rose-900' : 'bg-sky-50 border-sky-300 text-sky-900'
			}`}
		>
			<Icon className="h-3 w-3" />
			{time}
			<span className="text-muted-foreground">·</span>
			<span className="text-[10px]">{contributor}</span>
		</span>
	);
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: string }) {
	return (
		<div>
			<div className="text-xs text-muted-foreground">{label}</div>
			<div className={`text-xl font-semibold ${tone ?? ''}`}>{value}</div>
		</div>
	);
}
