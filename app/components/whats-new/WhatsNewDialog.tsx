'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { Sparkles } from 'lucide-react';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/app/components/ui/dialog';
import { ScrollArea } from '@/app/components/ui/scroll-area';
import { Button } from '@/app/components/ui/button';
import {
	RELEASE_NOTES,
	CATEGORY_CONFIG,
} from '@/lib/release-notes/release-notes-data';
import {
	shouldShowWhatsNew,
	dismissVersion,
} from '@/lib/release-notes/release-notes-state';
import {
	shouldShowToUser,
	DEFAULT_CONFIG,
	type WhatsNewConfig,
} from '@/lib/release-notes/release-notes-config';
import type { UserRole } from '@/lib/types/common';
import { CostApprovalDialog } from './CostApprovalDialog';

const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? '';

export function WhatsNewDialog() {
	const { data: session } = useSession();
	const [open, setOpen] = useState(false);
	const [config, setConfig] = useState<WhatsNewConfig | null>(null);
	const [showCostDialog, setShowCostDialog] = useState(false);

	const releaseNote = useMemo(
		() => RELEASE_NOTES.find((r) => r.version === APP_VERSION),
		[]
	);

	useEffect(() => {
		fetch('/api/settings/whats-new')
			.then((res) => (res.ok ? res.json() : null))
			.then((data) => setConfig(data ?? DEFAULT_CONFIG))
			.catch(() => setConfig(DEFAULT_CONFIG));
	}, []);

	useEffect(() => {
		if (!releaseNote) return;
		if (!config) return;
		if (!session) return;
		if (!shouldShowWhatsNew(APP_VERSION)) return;

		const email = session.user?.email || '';
		const role =
			(session.user as { role?: UserRole } | undefined)?.role || 'user';

		if (!shouldShowToUser(config, email, role)) return;

		const timer = setTimeout(() => setOpen(true), 500);
		return () => clearTimeout(timer);
	}, [releaseNote, config, session]);

	const handleDismiss = useCallback(() => {
		dismissVersion(APP_VERSION);
		setOpen(false);

		const role = (session?.user as { role?: UserRole } | undefined)?.role;
		if (role === 'admin' || role === 'developer') {
			setShowCostDialog(true);
		}
	}, [session]);

	const handleCostDialogClose = useCallback(() => {
		setShowCostDialog(false);
	}, []);

	if (!releaseNote) return null;

	return (
		<>
			<Dialog
				open={open}
				onOpenChange={(isOpen) => {
					if (!isOpen) handleDismiss();
				}}
			>
				<DialogContent className="sm:max-w-md">
					<DialogHeader className="items-center text-center">
						<div className="bg-primary/10 mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full">
							<Sparkles className="text-primary h-6 w-6" />
						</div>
						<DialogTitle>
							What&apos;s New in v{releaseNote.version}
						</DialogTitle>
						<DialogDescription>{releaseNote.title}</DialogDescription>
					</DialogHeader>

					<ScrollArea className="max-h-[50vh]">
						<div className="flex flex-col gap-3 pr-3">
							{releaseNote.highlights.map((item) => {
								const catConfig = CATEGORY_CONFIG[item.category];
								const Icon = catConfig.icon;
								return (
									<div key={item.title} className="rounded-lg border p-3">
										<div className="mb-1 flex items-center gap-2">
											<Icon className={`h-4 w-4 ${catConfig.color}`} />
											<span className="text-sm font-medium">
												{item.title}
											</span>
										</div>
										<p className="text-muted-foreground text-sm">
											{item.description}
										</p>
									</div>
								);
							})}
						</div>
					</ScrollArea>

					<DialogFooter className="sm:justify-center">
						<Button onClick={handleDismiss} className="w-full sm:w-auto">
							Got it
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{showCostDialog && releaseNote && (
				<CostApprovalDialog
					version={releaseNote.version}
					totalDevHours={releaseNote.totalDevHours}
					highlights={releaseNote.highlights}
					onClose={handleCostDialogClose}
				/>
			)}
		</>
	);
}
