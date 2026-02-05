'use client';

import { useState, useEffect, useCallback } from 'react';
import { Key, RefreshCw, CheckCircle, AlertTriangle, XCircle, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Progress } from '@/app/components/ui/progress';
import { cn } from '@/lib/utils';

interface TokenData {
	expires_at?: number;
	ig_username?: string;
	ig_user_id?: string;
	provider_account_id?: string;
	is_expired?: boolean;
}

interface TokenStatusResponse {
	connected: boolean;
	token: TokenData | null;
}

export function TokenStatusCard() {
	const [connected, setConnected] = useState(false);
	const [tokenData, setTokenData] = useState<TokenData | null>(null);
	const [loading, setLoading] = useState(true);
	const [refreshing, setRefreshing] = useState(false);
	const [message, setMessage] = useState('');

	const fetchTokenStatus = useCallback(async () => {
		try {
			const res = await fetch('/api/auth/token-status');
			if (res.ok) {
				const data: TokenStatusResponse = await res.json();
				setConnected(data.connected);
				setTokenData(data.token);
			}
		} catch (error) {
			console.error('Failed to fetch token status:', error);
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		fetchTokenStatus();
	}, [fetchTokenStatus]);

	const handleRefresh = async () => {
		setRefreshing(true);
		setMessage('');
		try {
			const res = await fetch('/api/extend-token', { method: 'POST' });
			const data = await res.json();
			if (res.ok) {
				setMessage(`Token extended for ${data.expires_in_days} days`);
				fetchTokenStatus();
			} else {
				setMessage(data.error || 'Failed to extend token');
			}
		} catch {
			setMessage('Failed to extend token');
		} finally {
			setRefreshing(false);
		}
	};

	if (loading) {
		return (
			<Card>
				<CardContent className="flex items-center justify-center py-8">
					<Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
				</CardContent>
			</Card>
		);
	}

	if (!connected || !tokenData) {
		return (
			<Card>
				<CardHeader className="pb-3">
					<CardTitle className="flex items-center gap-2 text-base">
						<Key className="h-4 w-4" />
						Instagram Token
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="flex items-center gap-3 text-muted-foreground">
						<XCircle className="h-5 w-5" />
						<span className="text-sm">No token linked. Connect your Instagram account.</span>
					</div>
				</CardContent>
			</Card>
		);
	}

	// Handle case where account is connected but expires_at is unknown
	const hasExpiryInfo = typeof tokenData.expires_at === 'number';
	const now = Date.now();
	const expiresAt = tokenData.expires_at || 0;
	const msRemaining = hasExpiryInfo ? expiresAt - now : 0;
	const daysRemaining = hasExpiryInfo ? Math.floor(msRemaining / (1000 * 60 * 60 * 24)) : -1;
	const hoursRemaining = hasExpiryInfo
		? Math.floor((msRemaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
		: 0;

	const isExpired = hasExpiryInfo && msRemaining <= 0;
	const isExpiringSoon = hasExpiryInfo && daysRemaining <= 7 && !isExpired;

	// Progress: 60 days max, show remaining (only meaningful if we have expiry info)
	const maxDays = 60;
	const progressPercent = hasExpiryInfo && !isExpired ? Math.min((daysRemaining / maxDays) * 100, 100) : 0;

	let statusColor = 'text-green-600';
	let statusBg = 'bg-green-100 dark:bg-green-900/30';
	let StatusIcon = CheckCircle;

	if (isExpired) {
		statusColor = 'text-red-600';
		statusBg = 'bg-red-100 dark:bg-red-900/30';
		StatusIcon = XCircle;
	} else if (isExpiringSoon) {
		statusColor = 'text-amber-600';
		statusBg = 'bg-amber-100 dark:bg-amber-900/30';
		StatusIcon = AlertTriangle;
	}

	return (
		<Card data-testid="token-status-card">
			<CardHeader className="pb-3">
				<div className="flex items-center justify-between">
					<div>
						<CardTitle className="flex items-center gap-2 text-base">
							<Key className="h-4 w-4" />
							Instagram Token
						</CardTitle>
						{tokenData.ig_username && (
							<CardDescription>@{tokenData.ig_username}</CardDescription>
						)}
					</div>
					<Button
						variant="outline"
						size="sm"
						onClick={handleRefresh}
						disabled={refreshing}
						aria-label="Refresh token"
					>
						<RefreshCw className={cn('mr-2 h-4 w-4', refreshing && 'animate-spin')} />
						{refreshing ? 'Refreshing...' : 'Extend'}
					</Button>
				</div>
			</CardHeader>
			<CardContent className="space-y-4">
				{/* Status Badge */}
				<div className={cn('flex items-center gap-3 rounded-lg p-3', statusBg)}>
					<StatusIcon className={cn('h-5 w-5', statusColor)} />
					<div>
						<p className={cn('font-semibold', statusColor)}>
							{isExpired
								? 'Token Expired'
								: isExpiringSoon
									? 'Expiring Soon'
									: 'Token Active'}
						</p>
						<p className="text-sm text-muted-foreground">
							{isExpired
								? 'Please reconnect your Instagram account'
								: hasExpiryInfo
									? `${daysRemaining} days, ${hoursRemaining} hours remaining`
									: 'Connected (expiry unknown)'}
						</p>
					</div>
				</div>

				{/* Progress Bar - only show if we have expiry info */}
				{hasExpiryInfo && !isExpired && (
					<div className="space-y-2">
						<div className="flex justify-between text-xs text-muted-foreground">
							<span>Token Validity</span>
							<span>{daysRemaining} / 60 days</span>
						</div>
						<Progress
							value={progressPercent}
							className={cn(
								'h-2',
								isExpiringSoon ? '[&>div]:bg-amber-500' : '[&>div]:bg-green-500'
							)}
						/>
					</div>
				)}

				{/* Expiry Date */}
				{hasExpiryInfo && (
					<div className="text-xs text-muted-foreground">
						Expires: {new Date(expiresAt).toLocaleDateString(undefined, {
							weekday: 'long',
							year: 'numeric',
							month: 'long',
							day: 'numeric',
						})}
					</div>
				)}

				{/* Message */}
				{message && (
					<p className={cn(
						'text-sm font-medium',
						message.includes('extended') ? 'text-green-600' : 'text-red-600'
					)}>
						{message}
					</p>
				)}
			</CardContent>
		</Card>
	);
}
