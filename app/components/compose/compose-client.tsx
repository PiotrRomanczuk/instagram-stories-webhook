'use client';

import { useMemo, useState } from 'react';
import {
	V0_SUBMISSIONS,
	V0_CATEGORIES,
	contributorById,
	contributorDisplayName,
	type V0Submission,
} from '@/lib/fixtures/v0';
import { CandidateList } from './candidate-list';
import { CompositionPanel } from './composition-panel';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Checkbox } from '@/app/components/ui/checkbox';
import { Input } from '@/app/components/ui/input';
import { Badge } from '@/app/components/ui/badge';
import { Filter, AlertTriangle, Send } from 'lucide-react';
import { toast } from 'sonner';

export interface SelectedClip {
	submissionId: string;
	startSeconds: number;
	endSeconds: number;
}

const MAX_DURATION_SECONDS = 60;

export function ComposeClient() {
	const [categoryFilter, setCategoryFilter] = useState<string>('all');
	const [keyword, setKeyword] = useState('');
	const [selected, setSelected] = useState<SelectedClip[]>([]);
	const [silentAck, setSilentAck] = useState(false);

	const candidates = useMemo(() => {
		const published = V0_SUBMISSIONS.filter((s) => s.status === 'published');
		return published.filter((s) => {
			const catMatch =
				categoryFilter === 'all' ||
				s.categories.some((c) => c.categorySlug === categoryFilter);
			const kwMatch =
				!keyword.trim() ||
				s.keywords.some((k) => k.includes(keyword.trim().toLowerCase())) ||
				(s.caption ?? '').toLowerCase().includes(keyword.trim().toLowerCase());
			return catMatch && kwMatch;
		});
	}, [categoryFilter, keyword]);

	const selectedSet = new Set(selected.map((c) => c.submissionId));

	const totalDuration = selected.reduce(
		(acc, c) => acc + (c.endSeconds - c.startSeconds),
		0
	);

	const overBudget = totalDuration > MAX_DURATION_SECONDS;

	const addClip = (sub: V0Submission) => {
		if (selectedSet.has(sub.id)) return;
		const defaultEnd = sub.mediaType === 'VIDEO' ? 8 : 4;
		setSelected((s) => [
			...s,
			{ submissionId: sub.id, startSeconds: 0, endSeconds: defaultEnd },
		]);
	};

	const removeClip = (id: string) =>
		setSelected((s) => s.filter((c) => c.submissionId !== id));

	const move = (id: string, dir: -1 | 1) => {
		setSelected((s) => {
			const idx = s.findIndex((c) => c.submissionId === id);
			const target = idx + dir;
			if (idx < 0 || target < 0 || target >= s.length) return s;
			const copy = [...s];
			[copy[idx], copy[target]] = [copy[target], copy[idx]];
			return copy;
		});
	};

	const trim = (id: string, start: number, end: number) =>
		setSelected((s) =>
			s.map((c) =>
				c.submissionId === id
					? { ...c, startSeconds: start, endSeconds: end }
					: c
			)
		);

	const onQueue = () => {
		toast.success('Queued silent MP4 for TikTok drafts', {
			description: `${selected.length} clips · ${totalDuration.toFixed(1)}s · open the TikTok app to add audio before publishing. Demo only.`,
		});
		setSelected([]);
		setSilentAck(false);
	};

	return (
		<div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-6">
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Filter className="h-4 w-4" />
						Candidates
						<Badge variant="secondary">{candidates.length}</Badge>
					</CardTitle>
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
						<select
							className="h-9 rounded-md border bg-background px-3 text-sm"
							value={categoryFilter}
							onChange={(e) => setCategoryFilter(e.target.value)}
						>
							<option value="all">All categories</option>
							{V0_CATEGORIES.map((c) => (
								<option key={c.slug} value={c.slug}>
									{c.kind} · {c.label}
								</option>
							))}
						</select>
						<Input
							placeholder="Keyword or caption text…"
							value={keyword}
							onChange={(e) => setKeyword(e.target.value)}
						/>
					</div>
				</CardHeader>
				<CardContent>
					<CandidateList
						candidates={candidates}
						selectedSet={selectedSet}
						onAdd={addClip}
					/>
				</CardContent>
			</Card>

			<div className="space-y-4 lg:sticky lg:top-4 self-start">
				<Card>
					<CardHeader>
						<CardTitle>Composition</CardTitle>
						<p className="text-xs text-muted-foreground">
							{selected.length} clip{selected.length === 1 ? '' : 's'} ·{' '}
							<span className={overBudget ? 'text-destructive font-medium' : ''}>
								{totalDuration.toFixed(1)}s / {MAX_DURATION_SECONDS}s
							</span>
						</p>
					</CardHeader>
					<CardContent>
						<CompositionPanel
							clips={selected}
							resolveSubmission={(id) =>
								V0_SUBMISSIONS.find((s) => s.id === id)!
							}
							resolveContributor={(s) =>
								contributorDisplayName(contributorById(s.contributorId)!)
							}
							onRemove={removeClip}
							onMove={move}
							onTrim={trim}
						/>
					</CardContent>
				</Card>

				<Card className="border-amber-300/70 bg-amber-50/40 dark:bg-amber-900/10">
					<CardHeader className="pb-2">
						<CardTitle className="flex items-center gap-2 text-base">
							<AlertTriangle className="h-4 w-4 text-amber-600" />
							Silent draft warning
						</CardTitle>
					</CardHeader>
					<CardContent className="space-y-3 text-sm">
						<p className="text-muted-foreground">
							This will produce a silent MP4 and upload it to your TikTok app
							drafts. <strong>Open TikTok and add audio</strong> from the in-app
							library before publishing — TikTok&apos;s algorithm boosts native
							sounds.
						</p>
						<label className="flex items-start gap-3">
							<Checkbox
								checked={silentAck}
								onCheckedChange={(v) => setSilentAck(v === true)}
							/>
							<span>I will add sound in TikTok before publishing.</span>
						</label>
						<Button
							className="w-full"
							onClick={onQueue}
							disabled={
								!silentAck || selected.length === 0 || overBudget
							}
						>
							<Send className="h-4 w-4" />
							Queue for TikTok drafts
						</Button>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
