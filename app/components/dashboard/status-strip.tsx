'use client';

import { Instagram, AlertTriangle, Plug, CheckCircle2 } from 'lucide-react';
import { Link } from '@/i18n/routing';
import { Button } from '@/app/components/ui/button';
import { cn } from '@/lib/utils';

interface ConnectionState {
	connected: boolean;
	username?: string | null;
	openId?: string | null;
	expiresAt?: number | null;
}

interface StatusStripProps {
	instagram: ConnectionState | undefined;
	tiktok: ConnectionState | undefined;
	isLoading?: boolean;
}

const TIKTOK_ICON = (
	<svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor" aria-hidden>
		<path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5.8 20.1a6.34 6.34 0 0 0 10.86-4.43V8.86a8.2 8.2 0 0 0 4.93 1.59V7a4.83 4.83 0 0 1-2-.31z" />
	</svg>
);

function tokenAgeColor(expiresAt: number | null | undefined): {
	tone: string;
	label: string;
} {
	if (!expiresAt) return { tone: 'text-muted-foreground', label: '' };
	const days = Math.floor((expiresAt - Date.now()) / 86_400_000);
	if (days <= 3) return { tone: 'text-red-600', label: `${days}d` };
	if (days <= 14) return { tone: 'text-amber-600', label: `${days}d` };
	return { tone: 'text-emerald-600', label: `${days}d` };
}

export function StatusStrip({ instagram, tiktok, isLoading }: StatusStripProps) {
	if (isLoading) {
		return (
			<div className="flex h-6 animate-pulse items-center gap-2 text-xs">
				<div className="h-3 w-32 rounded bg-muted" />
				<div className="h-3 w-32 rounded bg-muted" />
			</div>
		);
	}

	const igState = instagram?.connected
		? { ok: true, username: instagram.username, age: tokenAgeColor(instagram.expiresAt) }
		: { ok: false };

	const ttState = tiktok?.connected
		? { ok: true, username: tiktok.openId, age: tokenAgeColor(tiktok.expiresAt) }
		: { ok: false };

	const allOk = igState.ok && ttState.ok;

	return (
		<div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-muted-foreground">
			<span className="flex items-center gap-1.5">
				<Instagram
					className={cn(
						'h-3.5 w-3.5',
						igState.ok ? 'text-emerald-600' : 'text-red-600',
					)}
				/>
				{igState.ok ? (
					<>
						<span className="font-medium text-foreground">
							{igState.username ?? 'IG'}
						</span>
						{igState.age?.label && (
							<span className={cn('text-[10px]', igState.age.tone)}>
								{igState.age.label}
							</span>
						)}
					</>
				) : (
					<span className="font-medium text-red-600">IG not connected</span>
				)}
			</span>
			<span aria-hidden className="text-muted-foreground/40">
				·
			</span>
			<span className={cn('flex items-center gap-1.5', !ttState.ok && 'text-red-600')}>
				<span
					className={cn(
						'inline-flex',
						ttState.ok ? 'text-emerald-600' : 'text-red-600',
					)}
				>
					{TIKTOK_ICON}
				</span>
				{ttState.ok ? (
					<>
						<span className="font-medium text-foreground">
							{ttState.username ?? 'TT'}
						</span>
						{ttState.age?.label && (
							<span className={cn('text-[10px]', ttState.age.tone)}>
								{ttState.age.label}
							</span>
						)}
					</>
				) : (
					<span className="font-medium">TT not connected</span>
				)}
			</span>
			{allOk ? (
				<span className="flex items-center gap-1 text-[11px] text-emerald-600">
					<CheckCircle2 className="h-3 w-3" /> Pipeline ready
				</span>
			) : (
				<Button asChild size="sm" variant="outline" className="h-6 px-2 text-[11px]">
					<Link href="/linked-accounts" className="flex items-center gap-1">
						<Plug className="h-3 w-3" /> Set up
					</Link>
				</Button>
			)}
			{instagram?.expiresAt && tokenAgeColor(instagram.expiresAt).tone === 'text-red-600' && (
				<span className="flex items-center gap-1 text-[11px] text-red-600">
					<AlertTriangle className="h-3 w-3" /> IG token expiring
				</span>
			)}
		</div>
	);
}
