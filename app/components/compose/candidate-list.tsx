'use client';

import { Plus, Image as ImageIcon, Video } from 'lucide-react';
import {
	type V0Submission,
	contributorById,
	contributorDisplayName,
	categoryBySlug,
} from '@/lib/fixtures/v0';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';

interface Props {
	candidates: V0Submission[];
	selectedSet: Set<string>;
	onAdd: (sub: V0Submission) => void;
}

export function CandidateList({ candidates, selectedSet, onAdd }: Props) {
	if (candidates.length === 0) {
		return (
			<p className="text-sm text-muted-foreground py-12 text-center">
				No published submissions match these filters.
			</p>
		);
	}
	return (
		<ul className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[70vh] overflow-y-auto pr-1">
			{candidates.map((sub) => {
				const author = contributorById(sub.contributorId);
				const isSelected = selectedSet.has(sub.id);
				const topCategory = sub.categories[0];
				const cat = topCategory ? categoryBySlug(topCategory.categorySlug) : undefined;
				return (
					<li
						key={sub.id}
						className="rounded-md border bg-background overflow-hidden text-sm"
					>
						<div className="relative aspect-[9/16] bg-muted">
							<div className="absolute top-2 left-2 flex gap-1">
								<Badge variant="secondary" className="gap-1 text-[10px]">
									{sub.mediaType === 'VIDEO' ? (
										<Video className="h-3 w-3" />
									) : (
										<ImageIcon className="h-3 w-3" />
									)}
									{sub.mediaType}
								</Badge>
								{cat && (
									<Badge variant="outline" className="text-[10px]">
										{cat.label}
									</Badge>
								)}
							</div>
						</div>
						<div className="p-2 space-y-2">
							<div className="text-xs text-muted-foreground truncate">
								{author ? contributorDisplayName(author) : '—'} · {sub.id}
							</div>
							<Button
								variant={isSelected ? 'secondary' : 'outline'}
								size="sm"
								className="w-full"
								onClick={() => onAdd(sub)}
								disabled={isSelected}
							>
								<Plus className="h-3 w-3" />
								{isSelected ? 'Added' : 'Add'}
							</Button>
						</div>
					</li>
				);
			})}
		</ul>
	);
}
