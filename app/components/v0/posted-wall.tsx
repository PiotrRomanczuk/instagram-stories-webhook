'use client';

import { useState } from 'react';
import {
	V0_SUBMISSIONS,
	V0_COMPOSED_VIDEOS,
	contributorById,
	contributorDisplayName,
	categoryBySlug,
} from '@/lib/fixtures/v0';
import { Card, CardContent } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Instagram, Music2 } from 'lucide-react';

type Tab = 'instagram' | 'tiktok';

export function V0PostedWall() {
	const [tab, setTab] = useState<Tab>('instagram');
	const igPublished = V0_SUBMISSIONS.filter((s) => s.status === 'published').sort(
		(a, b) =>
			new Date(b.publishedAt ?? 0).getTime() - new Date(a.publishedAt ?? 0).getTime()
	);
	const ttPublished = V0_COMPOSED_VIDEOS.filter(
		(c) => c.tikTokPublishStatus === 'published' || c.status === 'published'
	);

	return (
		<div className="space-y-4">
			<div className="flex gap-2">
				<TabButton active={tab === 'instagram'} onClick={() => setTab('instagram')}>
					<Instagram className="h-4 w-4" /> Instagram · {igPublished.length}
				</TabButton>
				<TabButton active={tab === 'tiktok'} onClick={() => setTab('tiktok')}>
					<Music2 className="h-4 w-4" /> TikTok · {ttPublished.length}
				</TabButton>
			</div>

			{tab === 'instagram' ? (
				<ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
					{igPublished.slice(0, 24).map((s) => {
						const author = contributorById(s.contributorId);
						const cat = s.categories[0]
							? categoryBySlug(s.categories[0].categorySlug)
							: undefined;
						return (
							<li key={s.id}>
								<Card className="overflow-hidden">
									<div className="relative aspect-[9/16] bg-muted">
										<div className="absolute top-2 left-2">
											<Badge variant="secondary" className="text-[10px]">
												{s.mediaType}
											</Badge>
										</div>
									</div>
									<CardContent className="p-3 space-y-1 text-xs">
										<div className="font-medium truncate">
											by {author ? contributorDisplayName(author) : '—'}
										</div>
										<div className="text-muted-foreground truncate">
											{cat?.label ?? '—'} · {s.publishedAt?.slice(0, 10)}
										</div>
									</CardContent>
								</Card>
							</li>
						);
					})}
				</ul>
			) : (
				<ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
					{ttPublished.map((cv) => {
						const sourceContribIds = new Set(
							cv.sourceSubmissionIds
								.map((id) => V0_SUBMISSIONS.find((s) => s.id === id)?.contributorId)
								.filter((x): x is string => Boolean(x))
						);
						const credits = Array.from(sourceContribIds)
							.map((id) => contributorById(id))
							.filter((c): c is NonNullable<typeof c> => Boolean(c))
							.map(contributorDisplayName);
						return (
							<li key={cv.id}>
								<Card className="overflow-hidden">
									<div className="relative aspect-[9/16] bg-muted flex items-center justify-center">
										<Music2 className="h-10 w-10 text-muted-foreground/50" />
									</div>
									<CardContent className="p-3 space-y-1 text-xs">
										<div className="font-medium truncate">{cv.caption ?? cv.id}</div>
										<div className="text-muted-foreground truncate">
											{cv.durationSeconds}s · {cv.publishedAt?.slice(0, 10) ?? '—'}
										</div>
										<div className="text-muted-foreground">
											feat. {credits.length ? credits.join(', ') : '—'}
										</div>
									</CardContent>
								</Card>
							</li>
						);
					})}
				</ul>
			)}
		</div>
	);
}

function TabButton({
	active,
	onClick,
	children,
}: {
	active: boolean;
	onClick: () => void;
	children: React.ReactNode;
}) {
	return (
		<button
			onClick={onClick}
			className={`inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm transition-colors ${
				active
					? 'bg-foreground text-background border-foreground'
					: 'bg-background hover:bg-muted'
			}`}
		>
			{children}
		</button>
	);
}
