'use client';

import { useState } from 'react';
import useSWR from 'swr';
import {
    AlertTriangle,
    CheckCircle2,
    Instagram,
    Loader2,
    Music2,
    Plug,
    Plus,
    RefreshCcw,
    Trash2,
    XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/app/components/layout/page-header';
import { Button } from '@/app/components/ui/button';
import { Skeleton } from '@/app/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface LinkedAccountRow {
    provider: 'facebook' | 'tiktok';
    ig_username?: string | null;
    provider_account_id?: string | null;
    expires_at?: number | null;
    refresh_expires_at?: number | null;
    created_at: string;
    updated_at: string;
}

interface ApiResponse {
    accounts: LinkedAccountRow[];
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface ProviderMeta {
    provider: 'facebook' | 'tiktok';
    label: string;
    description: string;
    icon: typeof Instagram;
    iconBg: string;
    connectHref: string;
}

const PROVIDERS: ProviderMeta[] = [
    {
        provider: 'facebook',
        label: 'Instagram',
        description: 'Pull stories, fetch engagement metrics, and read media insights.',
        icon: Instagram,
        iconBg: 'bg-gradient-to-br from-purple-500 to-pink-500',
        connectHref: '/api/auth/link-facebook',
    },
    {
        provider: 'tiktok',
        label: 'TikTok',
        description: 'Upload composed videos to your TikTok drafts/inbox.',
        icon: Music2,
        iconBg: 'bg-gradient-to-br from-slate-900 to-slate-700',
        connectHref: '/api/auth/link-tiktok',
    },
];

function fmtExpiry(account: LinkedAccountRow): {
    label: string;
    icon: typeof CheckCircle2;
    color: string;
} {
    const ts = account.refresh_expires_at ?? account.expires_at ?? null;
    if (!ts) return { label: 'Active', icon: CheckCircle2, color: 'text-emerald-600' };
    const days = Math.floor((ts - Date.now()) / (1000 * 60 * 60 * 24));
    if (days <= 0) return { label: 'Expired', icon: XCircle, color: 'text-red-600' };
    if (days <= 7) return { label: `${days}d left`, icon: AlertTriangle, color: 'text-amber-600' };
    return { label: `${days}d left`, icon: CheckCircle2, color: 'text-emerald-600' };
}

export function LinkedAccountsClient() {
    const { data, error, isLoading, mutate } = useSWR<ApiResponse>('/api/linked-accounts', fetcher, {
        revalidateOnFocus: true,
    });
    const [busyProvider, setBusyProvider] = useState<string | null>(null);

    const accountsByProvider = new Map<string, LinkedAccountRow>();
    for (const acc of data?.accounts ?? []) accountsByProvider.set(acc.provider, acc);

    async function handleDisconnect(provider: 'facebook' | 'tiktok', label: string) {
        if (!confirm(`Disconnect ${label}? You'll need to reconnect to use this provider.`)) return;
        setBusyProvider(provider);
        try {
            const res = await fetch(`/api/linked-accounts?provider=${provider}`, { method: 'DELETE' });
            const body = await res.json().catch(() => ({}));
            if (res.ok) {
                toast.success(`${label} disconnected`);
                mutate();
            } else {
                toast.error(body.error ?? 'Disconnect failed');
            }
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Disconnect failed');
        } finally {
            setBusyProvider(null);
        }
    }

    return (
        <main className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
            <div className="space-y-5">
                <PageHeader
                    title="Linked Accounts"
                    description="Connect or disconnect the social accounts the pipeline uses to read Instagram stories and upload to TikTok."
                    actions={
                        <Button size="sm" variant="outline" onClick={() => mutate()} disabled={isLoading}>
                            {isLoading ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <RefreshCcw className="h-4 w-4" />
                            )}
                            <span>Refresh</span>
                        </Button>
                    }
                />

                {error && (
                    <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
                        Failed to load linked accounts.
                    </div>
                )}

                <div className="space-y-3">
                    {PROVIDERS.map((meta) => {
                        const Icon = meta.icon;
                        const account = accountsByProvider.get(meta.provider);
                        const connected = Boolean(account);
                        const busy = busyProvider === meta.provider;

                        if (isLoading && !data) {
                            return (
                                <div key={meta.provider} className="rounded-xl border bg-card p-4">
                                    <Skeleton className="h-12 w-full" />
                                </div>
                            );
                        }

                        const handle =
                            meta.provider === 'facebook'
                                ? account?.ig_username ?? null
                                : account?.provider_account_id ?? null;
                        const status = connected && account ? fmtExpiry(account) : null;
                        const StatusIcon = status?.icon ?? Plug;

                        return (
                            <div
                                key={meta.provider}
                                className="rounded-xl border bg-card p-4 sm:p-5"
                            >
                                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div
                                            className={cn(
                                                'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white shadow-sm',
                                                meta.iconBg,
                                            )}
                                        >
                                            <Icon className="h-5 w-5" />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2">
                                                <h3 className="font-semibold">{meta.label}</h3>
                                                {connected && status && (
                                                    <span
                                                        className={cn(
                                                            'inline-flex items-center gap-1 text-xs font-medium',
                                                            status.color,
                                                        )}
                                                    >
                                                        <StatusIcon className="h-3 w-3" />
                                                        {status.label}
                                                    </span>
                                                )}
                                                {!connected && (
                                                    <span className="text-xs font-medium text-muted-foreground">
                                                        Not linked
                                                    </span>
                                                )}
                                            </div>
                                            <p className="mt-0.5 text-xs text-muted-foreground">
                                                {meta.description}
                                            </p>
                                            {connected && handle && (
                                                <p className="mt-1 truncate font-mono text-[11px] text-muted-foreground">
                                                    {handle}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        {connected ? (
                                            <>
                                                <Button asChild variant="outline" size="sm">
                                                    <a href={meta.connectHref}>
                                                        <RefreshCcw className="h-3.5 w-3.5" />
                                                        <span>Reconnect</span>
                                                    </a>
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="text-red-600 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950/30"
                                                    onClick={() => handleDisconnect(meta.provider, meta.label)}
                                                    disabled={busy}
                                                >
                                                    {busy ? (
                                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                    ) : (
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    )}
                                                    <span>Disconnect</span>
                                                </Button>
                                            </>
                                        ) : (
                                            <Button asChild size="sm">
                                                <a href={meta.connectHref}>
                                                    <Plus className="h-3.5 w-3.5" />
                                                    <span>Connect</span>
                                                </a>
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className="rounded-lg border bg-muted/30 p-4 text-xs text-muted-foreground">
                    <p className="font-semibold text-foreground mb-1">When to reconnect</p>
                    <ul className="list-disc pl-4 space-y-1">
                        <li>After updating OAuth scopes (e.g. adding TikTok&apos;s <code>video.upload</code>).</li>
                        <li>If the access or refresh token expires.</li>
                        <li>If you switch the connected social account.</li>
                    </ul>
                </div>
            </div>
        </main>
    );
}
