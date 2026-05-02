'use client';

import { ArrowDown, ArrowUp, Trash2 } from 'lucide-react';
import type { V0Submission } from '@/lib/fixtures/v0';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import type { SelectedClip } from './compose-client';

interface Props {
	clips: SelectedClip[];
	resolveSubmission: (id: string) => V0Submission;
	resolveContributor: (s: V0Submission) => string;
	onRemove: (id: string) => void;
	onMove: (id: string, dir: -1 | 1) => void;
	onTrim: (id: string, start: number, end: number) => void;
}

export function CompositionPanel({
	clips,
	resolveSubmission,
	resolveContributor,
	onRemove,
	onMove,
	onTrim,
}: Props) {
	if (clips.length === 0) {
		return (
			<p className="text-sm text-muted-foreground py-8 text-center">
				Add clips from the candidates list. Order matters — top is first.
			</p>
		);
	}
	return (
		<ol className="space-y-2">
			{clips.map((clip, idx) => {
				const sub = resolveSubmission(clip.submissionId);
				const author = resolveContributor(sub);
				const duration = clip.endSeconds - clip.startSeconds;
				return (
					<li
						key={clip.submissionId}
						className="rounded-md border bg-background p-2 space-y-2"
					>
						<div className="flex items-center gap-2">
							<Badge variant="outline" className="shrink-0 font-mono">
								{idx + 1}
							</Badge>
							<div className="flex-1 min-w-0">
								<div className="text-sm font-medium truncate">{sub.id}</div>
								<div className="text-xs text-muted-foreground truncate">
									{author} · {sub.mediaType}
								</div>
							</div>
							<Button
								variant="ghost"
								size="icon-sm"
								onClick={() => onMove(clip.submissionId, -1)}
								disabled={idx === 0}
								aria-label="Move up"
							>
								<ArrowUp className="h-3 w-3" />
							</Button>
							<Button
								variant="ghost"
								size="icon-sm"
								onClick={() => onMove(clip.submissionId, 1)}
								disabled={idx === clips.length - 1}
								aria-label="Move down"
							>
								<ArrowDown className="h-3 w-3" />
							</Button>
							<Button
								variant="ghost"
								size="icon-sm"
								onClick={() => onRemove(clip.submissionId)}
								aria-label="Remove"
							>
								<Trash2 className="h-3 w-3" />
							</Button>
						</div>
						<div className="flex items-center gap-2 text-xs">
							<span className="text-muted-foreground w-12">trim</span>
							<input
								type="range"
								min={0}
								max={20}
								step={0.5}
								value={clip.endSeconds}
								onChange={(e) =>
									onTrim(
										clip.submissionId,
										clip.startSeconds,
										parseFloat(e.target.value)
									)
								}
								className="flex-1"
							/>
							<span className="font-mono w-12 text-right">
								{duration.toFixed(1)}s
							</span>
						</div>
					</li>
				);
			})}
		</ol>
	);
}
