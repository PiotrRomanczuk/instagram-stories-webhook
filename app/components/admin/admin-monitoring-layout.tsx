'use client';

import useSWR from 'swr';
import { formatDistanceToNow } from 'date-fns';
import { Shield, LogIn, AlertCircle, CheckCircle, XCircle, Clock, User } from 'lucide-react';
import { Badge } from '@/app/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { LoadingSpinner } from '@/app/components/ui/loading-spinner';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

// ─── Auth Events Panel ────────────────────────────────────────────────────────

interface AuthEvent {
	id: string;
	created_at: string;
	email: string;
	provider: string;
	outcome: 'granted' | 'denied';
	deny_reason?: string;
	role?: string;
}

function AuthEventsPanel() {
	const { data, isLoading, error } = useSWR<{ items: AuthEvent[] }>(
		'/api/admin/auth-events?limit=20',
		fetcher,
		{ refreshInterval: 30_000 },
	);

	const items = data?.items ?? [];
	const deniedCount = items.filter((e) => e.outcome === 'denied').length;

	return (
		<Card>
			<CardHeader className="pb-3">
				<CardTitle className="flex items-center gap-2 text-base">
					<LogIn className="h-4 w-4" />
					Recent Sign-ins
					{deniedCount > 0 && (
						<Badge variant="destructive" className="ml-auto">
							{deniedCount} denied
						</Badge>
					)}
				</CardTitle>
			</CardHeader>
			<CardContent>
				{isLoading && <LoadingSpinner size={6} />}
				{error && <p className="text-sm text-red-500">Failed to load auth events</p>}
				{!isLoading && items.length === 0 && (
					<p className="text-sm text-muted-foreground">No recent sign-in events</p>
				)}
				<ul className="space-y-2">
					{items.map((event) => (
						<li key={event.id} className="flex items-start gap-2 text-sm">
							{event.outcome === 'granted' ? (
								<CheckCircle className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
							) : (
								<XCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
							)}
							<div className="flex-1 min-w-0">
								<p className="font-medium truncate">{event.email}</p>
								<p className="text-xs text-muted-foreground">
									{event.provider}
									{event.deny_reason && ` · ${event.deny_reason.replace(/_/g, ' ')}`}
									{event.role && ` · ${event.role}`}
									{' · '}
									{formatDistanceToNow(new Date(event.created_at), { addSuffix: true })}
								</p>
							</div>
						</li>
					))}
				</ul>
			</CardContent>
		</Card>
	);
}

// ─── Audit Log Panel ──────────────────────────────────────────────────────────

interface AuditEntry {
	id: string;
	created_at: string;
	actor_email: string;
	action: string;
	target_type?: string;
	target_email?: string;
	target_id?: string;
	old_value?: Record<string, unknown>;
	new_value?: Record<string, unknown>;
}

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
	'user.add':               { label: 'User Added',      color: 'bg-green-100 text-green-800' },
	'user.remove':            { label: 'User Removed',    color: 'bg-red-100 text-red-800' },
	'user.role_change':       { label: 'Role Changed',    color: 'bg-yellow-100 text-yellow-800' },
	'content.approve':        { label: 'Approved',        color: 'bg-green-100 text-green-800' },
	'content.reject':         { label: 'Rejected',        color: 'bg-red-100 text-red-800' },
	'content.delete':         { label: 'Deleted',         color: 'bg-red-100 text-red-800' },
	'content.force_publish':  { label: 'Force Published', color: 'bg-orange-100 text-orange-800' },
	'settings.publishing_toggle':    { label: 'Publishing Toggle', color: 'bg-blue-100 text-blue-800' },
	'settings.auto_process_toggle':  { label: 'Auto-process Toggle', color: 'bg-blue-100 text-blue-800' },
};

function AuditLogPanel() {
	const { data, isLoading, error } = useSWR<{ items: AuditEntry[] }>(
		'/api/admin/audit-log?limit=25',
		fetcher,
		{ refreshInterval: 30_000 },
	);

	const items = data?.items ?? [];

	return (
		<Card>
			<CardHeader className="pb-3">
				<CardTitle className="flex items-center gap-2 text-base">
					<Shield className="h-4 w-4" />
					Admin Audit Log
					<Badge variant="secondary" className="ml-auto">{items.length} recent</Badge>
				</CardTitle>
			</CardHeader>
			<CardContent>
				{isLoading && <LoadingSpinner size={6} />}
				{error && <p className="text-sm text-red-500">Failed to load audit log</p>}
				{!isLoading && items.length === 0 && (
					<p className="text-sm text-muted-foreground">No admin actions recorded yet</p>
				)}
				<ul className="space-y-2">
					{items.map((entry) => {
						const meta = ACTION_LABELS[entry.action] ?? {
							label: entry.action,
							color: 'bg-gray-100 text-gray-800',
						};
						const target = entry.target_email ?? entry.target_id ?? '';
						return (
							<li key={entry.id} className="flex items-start gap-2 text-sm">
								<User className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
								<div className="flex-1 min-w-0">
									<div className="flex items-center gap-2 flex-wrap">
										<span className="font-medium truncate">{entry.actor_email}</span>
										<span className={`text-xs px-1.5 py-0.5 rounded font-medium ${meta.color}`}>
											{meta.label}
										</span>
										{target && (
											<span className="text-xs text-muted-foreground truncate">{target}</span>
										)}
									</div>
									{entry.old_value && entry.new_value && (
										<p className="text-xs text-muted-foreground">
											{JSON.stringify(entry.old_value)} → {JSON.stringify(entry.new_value)}
										</p>
									)}
									<p className="text-xs text-muted-foreground flex items-center gap-1">
										<Clock className="h-3 w-3" />
										{formatDistanceToNow(new Date(entry.created_at), { addSuffix: true })}
									</p>
								</div>
							</li>
						);
					})}
				</ul>
			</CardContent>
		</Card>
	);
}

// ─── Health Status Panel ──────────────────────────────────────────────────────

interface HealthCheck {
	status: 'pass' | 'fail' | 'warn';
	message?: string;
	details?: Record<string, unknown>;
}

interface HealthData {
	status: 'ok' | 'degraded' | 'error';
	checks: Record<string, HealthCheck>;
	timestamp: string;
	version: string;
}

const CHECK_LABELS: Record<string, string> = {
	database: 'Database',
	env: 'Environment',
	instagram_tokens: 'Instagram Tokens',
	cron_health: 'Cron Jobs',
	queue_health: 'Queue',
	api_quota: 'API Quota',
};

function HealthPanel() {
	const { data, isLoading, error } = useSWR<HealthData>(
		'/api/health',
		fetcher,
		{ refreshInterval: 60_000 },
	);

	const statusColor = {
		ok: 'text-green-600',
		degraded: 'text-yellow-600',
		error: 'text-red-600',
	};

	return (
		<Card>
			<CardHeader className="pb-3">
				<CardTitle className="flex items-center gap-2 text-base">
					<AlertCircle className="h-4 w-4" />
					System Health
					{data && (
						<span className={`ml-auto text-sm font-bold ${statusColor[data.status]}`}>
							{data.status.toUpperCase()}
						</span>
					)}
				</CardTitle>
			</CardHeader>
			<CardContent>
				{isLoading && <LoadingSpinner size={6} />}
				{error && <p className="text-sm text-red-500">Failed to load health data</p>}
				{data && (
					<ul className="space-y-2">
						{Object.entries(data.checks).map(([key, check]) => (
							<li key={key} className="flex items-start gap-2 text-sm">
								{check.status === 'pass' && <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />}
								{check.status === 'warn' && <AlertCircle className="h-4 w-4 text-yellow-500 mt-0.5 shrink-0" />}
								{check.status === 'fail' && <XCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />}
								<div>
									<p className="font-medium">{CHECK_LABELS[key] ?? key}</p>
									{check.message && (
										<p className="text-xs text-muted-foreground">{check.message}</p>
									)}
								</div>
							</li>
						))}
					</ul>
				)}
				{data && (
					<p className="text-xs text-muted-foreground mt-3">
						v{data.version} · checked {formatDistanceToNow(new Date(data.timestamp), { addSuffix: true })}
					</p>
				)}
			</CardContent>
		</Card>
	);
}

// ─── Root Layout ──────────────────────────────────────────────────────────────

export function AdminMonitoringLayout() {
	return (
		<div className="space-y-6">
			<HealthPanel />
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
				<AuthEventsPanel />
				<AuditLogPanel />
			</div>
		</div>
	);
}
