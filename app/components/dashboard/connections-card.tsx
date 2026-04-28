'use client';

import { Instagram, Music2, CheckCircle2, AlertTriangle, XCircle, Plug } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Skeleton } from '@/app/components/ui/skeleton';
import { Link } from '@/i18n/routing';
import { cn } from '@/lib/utils';

interface Connection {
	connected: boolean;
	username?: string | null;
	openId?: string | null;
	expiresAt?: number | null;
}

interface ConnectionsCardProps {
	instagram: Connection | undefined;
	tiktok: Connection | undefined;
	isLoading?: boolean;
}

interface RowProps {
	icon: React.ReactNode;
	platform: string;
	handle: string | null;
	connected: boolean;
	expiresAt: number | null;
	connectHref: string;
	tone: string;
}

function statusFromExpiry(connected: boolean, expiresAt: number | null) {
	if (!connected) return { label: 'Not linked', Icon: XCircle, color: 'text-muted-foreground' };
	if (!expiresAt) return { label: 'Active', Icon: CheckCircle2, color: 'text-emerald-600' };
	const days = Math.floor((expiresAt - Date.now()) / (1000 * 60 * 60 * 24));
	if (days <= 0) return { label: 'Expired', Icon: XCircle, color: 'text-red-600' };
	if (days <= 7)
		return { label: `${days}d left`, Icon: AlertTriangle, color: 'text-amber-600' };
	return { label: `${days}d left`, Icon: CheckCircle2, color: 'text-emerald-600' };
}

function ConnectionRow({ icon, platform, handle, connected, expiresAt, connectHref, tone }: RowProps) {
	const status = statusFromExpiry(connected, expiresAt);
	const StatusIcon = status.Icon;

	return (
		<div className="flex items-center justify-between gap-3 rounded-lg border bg-card px-3 py-2.5">
			<div className="flex items-center gap-3 min-w-0">
				<div className={cn('rounded-lg p-2 shrink-0', tone)}>{icon}</div>
				<div className="min-w-0">
					<div className="text-sm font-semibold truncate">{platform}</div>
					<div className="text-xs text-muted-foreground truncate">
						{connected ? handle ?? 'Connected' : 'Not connected'}
					</div>
				</div>
			</div>
			<div className="flex items-center gap-2 shrink-0">
				<div className={cn('flex items-center gap-1 text-xs font-medium', status.color)}>
					<StatusIcon className="h-3.5 w-3.5" />
					<span className="hidden sm:inline">{status.label}</span>
				</div>
				{!connected && (
					<Button size="sm" variant="outline" asChild>
						<a href={connectHref}>Connect</a>
					</Button>
				)}
			</div>
		</div>
	);
}

export function ConnectionsCard({ instagram, tiktok, isLoading }: ConnectionsCardProps) {
	return (
		<Card>
			<CardHeader className="pb-3">
				<div className="flex items-center justify-between">
					<CardTitle className="flex items-center gap-2 text-base">
						<Plug className="h-4 w-4" />
						Connections
					</CardTitle>
					<Button asChild variant="ghost" size="sm" className="h-7 text-xs">
						<Link href="/settings/accounts">Manage</Link>
					</Button>
				</div>
			</CardHeader>
			<CardContent className="space-y-2">
				{isLoading ? (
					<>
						<Skeleton className="h-14 w-full" />
						<Skeleton className="h-14 w-full" />
					</>
				) : (
					<>
						<ConnectionRow
							platform="Instagram"
							icon={<Instagram className="h-4 w-4 text-pink-600" />}
							tone="bg-pink-100"
							connected={instagram?.connected ?? false}
							handle={instagram?.username ? `@${instagram.username}` : null}
							expiresAt={instagram?.expiresAt ?? null}
							connectHref="/api/auth/link-facebook"
						/>
						<ConnectionRow
							platform="TikTok"
							icon={<Music2 className="h-4 w-4 text-slate-900 dark:text-slate-100" />}
							tone="bg-slate-100 dark:bg-slate-800"
							connected={tiktok?.connected ?? false}
							handle={tiktok?.openId ? `id: ${tiktok.openId.slice(0, 10)}…` : null}
							expiresAt={tiktok?.expiresAt ?? null}
							connectHref="/api/auth/link-tiktok"
						/>
					</>
				)}
			</CardContent>
		</Card>
	);
}
