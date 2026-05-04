'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
	V0_SUBMISSIONS,
	contributorById,
	contributorDisplayName,
	categoryBySlug,
	type V0Submission,
} from '@/lib/fixtures/v0';
import { ReviewCardSwipeable } from '@/app/components/storyflow/review-card-swipeable';
import { Card, CardContent } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { Check, X, Image as ImageIcon, Video, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

export function V0SwipeReview() {
	const initialPending = useMemo(
		() => V0_SUBMISSIONS.filter((s) => s.status === 'pending').slice(0, 30),
		[]
	);
	const [stack, setStack] = useState<V0Submission[]>(initialPending);
	const [stats, setStats] = useState({ approved: 0, rejected: 0 });

	const top = stack[0];

	const onApprove = useCallback(() => {
		if (!top) return;
		toast.success('Approved', {
			description: `${top.id} → awaiting scheduling`,
		});
		setStack((s) => s.slice(1));
		setStats((s) => ({ ...s, approved: s.approved + 1 }));
	}, [top]);
	const onReject = useCallback(() => {
		if (!top) return;
		toast('Rejected', { description: `${top.id} (reason can be added in v1)` });
		setStack((s) => s.slice(1));
		setStats((s) => ({ ...s, rejected: s.rejected + 1 }));
	}, [top]);

	useEffect(() => {
		const handler = (e: KeyboardEvent) => {
			if (e.key === 'ArrowRight') onApprove();
			else if (e.key === 'ArrowLeft') onReject();
		};
		window.addEventListener('keydown', handler);
		return () => window.removeEventListener('keydown', handler);
	}, [onApprove, onReject]);

	if (!top) {
		return (
			<Card>
				<CardContent className="py-16 text-center space-y-2">
					<p className="text-lg font-semibold">Queue clear</p>
					<p className="text-sm text-muted-foreground">
						Approved {stats.approved} · Rejected {stats.rejected}
					</p>
				</CardContent>
			</Card>
		);
	}

	const author = contributorById(top.contributorId);

	return (
		<div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
			<div className="flex flex-col items-center justify-center">
				<div className="w-full max-w-sm">
					<ReviewCardSwipeable
						key={top.id}
						onSwipeRight={onApprove}
						onSwipeLeft={onReject}
					>
						<Card className="overflow-hidden">
							<div className="relative aspect-[9/16] bg-muted flex items-center justify-center">
								{top.mediaType === 'VIDEO' ? (
									<Video className="h-16 w-16 text-muted-foreground/50" />
								) : (
									<ImageIcon className="h-16 w-16 text-muted-foreground/50" />
								)}
								<Badge variant="secondary" className="absolute top-3 left-3">
									{top.mediaType}
								</Badge>
							</div>
							<CardContent className="p-4 space-y-2">
								<div className="text-sm font-medium">
									{author ? contributorDisplayName(author) : '—'}
								</div>
								{top.caption && <p className="text-sm text-muted-foreground">{top.caption}</p>}
								<div className="flex flex-wrap gap-1 pt-1">
									{top.categories.map((t, i) => {
										const c = categoryBySlug(t.categorySlug);
										return (
											<Badge key={i} variant="outline" className="gap-1 text-[10px]">
												{t.source === 'ai' && <Sparkles className="h-2.5 w-2.5" />}
												{c?.label}
											</Badge>
										);
									})}
								</div>
							</CardContent>
						</Card>
					</ReviewCardSwipeable>
				</div>
				<div className="flex gap-3 mt-4">
					<Button variant="destructive" onClick={onReject}>
						<X className="h-4 w-4" /> Reject (←)
					</Button>
					<Button onClick={onApprove}>
						<Check className="h-4 w-4" /> Approve (→)
					</Button>
				</div>
			</div>

			<aside className="space-y-3">
				<Card>
					<CardContent className="py-4 space-y-2 text-sm">
						<Row label="Queue remaining" value={`${stack.length}`} />
						<Row label="Approved this session" value={`${stats.approved}`} />
						<Row label="Rejected this session" value={`${stats.rejected}`} />
					</CardContent>
				</Card>
				<Card>
					<CardContent className="py-4 text-xs text-muted-foreground space-y-2">
						<p className="font-medium text-foreground">How v0 differs from v1</p>
						<ul className="list-disc pl-4 space-y-1">
							<li>Real swipe transitions submission row state and locks tags as <em>curator</em>-source.</li>
							<li>Rejection prompts for one-click reason (low quality / off-brand / duplicate / wrong format).</li>
							<li>Throttle banner appears here when Insights show &gt;30% engagement drop WoW.</li>
						</ul>
					</CardContent>
				</Card>
			</aside>
		</div>
	);
}

function Row({ label, value }: { label: string; value: string }) {
	return (
		<div className="flex justify-between border-b pb-1">
			<span className="text-muted-foreground">{label}</span>
			<span className="font-medium">{value}</span>
		</div>
	);
}
