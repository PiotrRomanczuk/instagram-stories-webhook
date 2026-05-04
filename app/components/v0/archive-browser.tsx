'use client';

import { useMemo, useState } from 'react';
import {
	V0_SUBMISSIONS,
	V0_CATEGORIES,
	categoryBySlug,
	contributorById,
	contributorDisplayName,
	categoriesByKind,
} from '@/lib/fixtures/v0';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Input } from '@/app/components/ui/input';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { Pin, Search, Filter, Image as ImageIcon, Video } from 'lucide-react';
import { toast } from 'sonner';

const HOLIDAYS = categoriesByKind('holiday');

export function V0ArchiveBrowser() {
	const [categoryFilter, setCategoryFilter] = useState<string>('all');
	const [kindFilter, setKindFilter] = useState<string>('all');
	const [keyword, setKeyword] = useState('');

	const archive = useMemo(() => {
		return V0_SUBMISSIONS.filter((s) => s.status !== 'rejected' && s.status !== 'withdrawn').filter(
			(s) => {
				if (kindFilter !== 'all') {
					const matches = s.categories.some((t) => {
						const cat = categoryBySlug(t.categorySlug);
						return cat?.kind === kindFilter;
					});
					if (!matches) return false;
				}
				if (categoryFilter !== 'all') {
					const matches = s.categories.some((t) => t.categorySlug === categoryFilter);
					if (!matches) return false;
				}
				if (keyword.trim()) {
					const k = keyword.trim().toLowerCase();
					const matches =
						s.keywords.some((w) => w.includes(k)) ||
						(s.caption ?? '').toLowerCase().includes(k);
					if (!matches) return false;
				}
				return true;
			}
		);
	}, [categoryFilter, kindFilter, keyword]);

	const onPin = (subId: string, holiday: string) => {
		toast.success('Pinned to schedule', {
			description: `${subId} → next ${holiday} slot. Demo only — creates a scheduled_posts row with schedule_mode='pinned' in v1.`,
		});
	};

	return (
		<div className="space-y-6">
			<Card>
				<CardHeader className="pb-3">
					<CardTitle className="flex items-center gap-2 text-base">
						<Filter className="h-4 w-4" /> Filters
					</CardTitle>
				</CardHeader>
				<CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-3">
					<select
						className="h-9 rounded-md border bg-background px-3 text-sm"
						value={kindFilter}
						onChange={(e) => {
							setKindFilter(e.target.value);
							setCategoryFilter('all');
						}}
					>
						<option value="all">All kinds</option>
						<option value="holiday">Holidays</option>
						<option value="theme">Themes</option>
						<option value="event">Events</option>
						<option value="content_type">Content types</option>
					</select>
					<select
						className="h-9 rounded-md border bg-background px-3 text-sm"
						value={categoryFilter}
						onChange={(e) => setCategoryFilter(e.target.value)}
					>
						<option value="all">All categories</option>
						{V0_CATEGORIES.filter((c) => kindFilter === 'all' || c.kind === kindFilter).map((c) => (
							<option key={c.slug} value={c.slug}>
								{c.label}
							</option>
						))}
					</select>
					<div className="relative">
						<Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
						<Input
							className="pl-8"
							value={keyword}
							onChange={(e) => setKeyword(e.target.value)}
							placeholder="Keyword or caption…"
						/>
					</div>
				</CardContent>
			</Card>

			<div className="text-sm text-muted-foreground">
				{archive.length} item{archive.length === 1 ? '' : 's'} match.
			</div>

			<ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
				{archive.slice(0, 32).map((s) => {
					const author = contributorById(s.contributorId);
					return (
						<li key={s.id}>
							<Card className="overflow-hidden">
								<div className="relative aspect-[9/16] bg-muted flex items-center justify-center">
									{s.mediaType === 'VIDEO' ? (
										<Video className="h-10 w-10 text-muted-foreground/50" />
									) : (
										<ImageIcon className="h-10 w-10 text-muted-foreground/50" />
									)}
									<Badge variant="secondary" className="absolute top-2 left-2 text-[10px]">
										{s.status}
									</Badge>
								</div>
								<CardContent className="p-3 space-y-2 text-xs">
									<div className="font-medium truncate">
										{author ? contributorDisplayName(author) : '—'}
									</div>
									<div className="flex flex-wrap gap-1">
										{s.categories.slice(0, 3).map((t, i) => {
											const c = categoryBySlug(t.categorySlug);
											return (
												<Badge key={i} variant="outline" className="text-[10px]">
													{c?.label}
												</Badge>
											);
										})}
									</div>
									<div className="border-t pt-2">
										<div className="text-muted-foreground mb-1">Pin to upcoming:</div>
										<div className="flex flex-wrap gap-1">
											{HOLIDAYS.slice(0, 3).map((h) => (
												<Button
													key={h.slug}
													variant="outline"
													size="xs"
													className="text-[10px]"
													onClick={() => onPin(s.id, h.label)}
												>
													<Pin className="h-2.5 w-2.5" />
													{h.label}
												</Button>
											))}
										</div>
									</div>
								</CardContent>
							</Card>
						</li>
					);
				})}
			</ul>

			{archive.length > 32 && (
				<p className="text-xs text-muted-foreground text-center">
					Showing 32 of {archive.length}. v1 adds infinite scroll + bulk-pin.
				</p>
			)}
		</div>
	);
}
