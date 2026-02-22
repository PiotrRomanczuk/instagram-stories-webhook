'use client';

import { useState, useEffect, useCallback } from 'react';
import { DollarSign, Clock } from 'lucide-react';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/app/components/ui/dialog';
import { Button } from '@/app/components/ui/button';
import { ScrollArea } from '@/app/components/ui/scroll-area';
import {
	CATEGORY_CONFIG,
	type ReleaseNoteItem,
} from '@/lib/release-notes/release-notes-data';

interface CostApprovalDialogProps {
	version: string;
	totalDevHours: number;
	highlights: ReleaseNoteItem[];
	onClose: () => void;
}

type CostResponse = 'accepted' | 'declined';

export function CostApprovalDialog({
	version,
	totalDevHours,
	highlights,
	onClose,
}: CostApprovalDialogProps) {
	const [open, setOpen] = useState(false);
	const [isLoading, setIsLoading] = useState(false);

	useEffect(() => {
		let cancelled = false;

		async function checkExistingResponse() {
			try {
				const res = await fetch(
					`/api/release-notes/cost-response?version=${encodeURIComponent(version)}`
				);
				if (!res.ok) {
					if (!cancelled) onClose();
					return;
				}
				const data = await res.json();
				if (data.response !== null) {
					if (!cancelled) onClose();
					return;
				}
			} catch {
				if (!cancelled) onClose();
				return;
			}

			if (cancelled) return;

			const timer = setTimeout(() => {
				if (!cancelled) setOpen(true);
			}, 300);
			return () => clearTimeout(timer);
		}

		checkExistingResponse();

		return () => {
			cancelled = true;
		};
		// onClose is a callback from parent, version is a string prop — both stable per render
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [version]);

	const handleResponse = useCallback(
		async (response: CostResponse) => {
			setIsLoading(true);
			try {
				await fetch('/api/release-notes/cost-response', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ version, response }),
				});
			} catch {
				// Silently fail — the dialog will close regardless
			}
			onClose();
		},
		[version, onClose]
	);

	return (
		<Dialog
			open={open}
			onOpenChange={(isOpen) => {
				if (!isOpen) onClose();
			}}
		>
			<DialogContent className="sm:max-w-md">
				<DialogHeader className="items-center text-center">
					<div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/10">
						<DollarSign className="h-6 w-6 text-amber-500" />
					</div>
					<DialogTitle>Development Cost &mdash; v{version}</DialogTitle>
					<DialogDescription>
						Review the development hours for this release
					</DialogDescription>
				</DialogHeader>

				<div className="flex items-center justify-center gap-2 rounded-lg border bg-muted/50 py-3">
					<Clock className="h-5 w-5 text-muted-foreground" />
					<span className="text-2xl font-bold">{totalDevHours}h</span>
					<span className="text-sm text-muted-foreground">total</span>
				</div>

				<ScrollArea className="max-h-[40vh]">
					<div className="flex flex-col gap-2 pr-3">
						{highlights.map((item) => {
							const config = CATEGORY_CONFIG[item.category];
							const Icon = config.icon;
							return (
								<div
									key={item.title}
									className="flex items-center justify-between rounded-lg border p-3"
								>
									<div className="flex items-center gap-2">
										<Icon className={`h-4 w-4 ${config.color}`} />
										<span className="text-sm font-medium">
											{item.title}
										</span>
									</div>
									<span className="text-sm font-mono text-muted-foreground">
										{item.devHours}h
									</span>
								</div>
							);
						})}
					</div>
				</ScrollArea>

				<DialogFooter className="flex-row gap-2 sm:justify-center">
					<Button
						variant="outline"
						onClick={() => handleResponse('declined')}
						disabled={isLoading}
						className="flex-1 sm:flex-none"
					>
						Decline
					</Button>
					<Button
						onClick={() => handleResponse('accepted')}
						disabled={isLoading}
						className="flex-1 sm:flex-none"
					>
						Approve
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
