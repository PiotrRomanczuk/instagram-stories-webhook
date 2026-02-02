'use client';

import { useState, useEffect } from 'react';
import { Instagram, CheckCircle, XCircle, Loader2, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Alert, AlertDescription } from '@/app/components/ui/alert';

interface TokenStatus {
	connected: boolean;
	token?: {
		expires_at: number;
		ig_username: string | null;
		ig_user_id: string | null;
		provider_account_id: string;
		is_expired: boolean;
	};
}

export function InstagramConnectionStatus() {
	const [status, setStatus] = useState<TokenStatus | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [isConnecting, setIsConnecting] = useState(false);

	useEffect(() => {
		fetchStatus();
	}, []);

	const fetchStatus = async () => {
		try {
			const res = await fetch('/api/auth/token-status');
			const data = await res.json();
			setStatus(data);
		} catch (error) {
			console.error('Failed to fetch token status:', error);
		} finally {
			setIsLoading(false);
		}
	};

	const handleConnect = () => {
		setIsConnecting(true);
		window.location.href = '/api/auth/link-facebook';
	};

	const formatExpiry = (expiresAt: number) => {
		const date = new Date(expiresAt);
		const now = Date.now();
		const daysLeft = Math.floor((expiresAt - now) / (1000 * 60 * 60 * 24));

		if (daysLeft < 0) return 'Expired';
		if (daysLeft === 0) return 'Expires today';
		if (daysLeft === 1) return 'Expires tomorrow';
		return `Expires in ${daysLeft} days (${date.toLocaleDateString()})`;
	};

	if (isLoading) {
		return (
			<Card>
				<CardContent className="py-8">
					<div className="flex items-center justify-center gap-2 text-muted-foreground">
						<Loader2 className="h-5 w-5 animate-spin" />
						Checking Instagram connection...
					</div>
				</CardContent>
			</Card>
		);
	}

	const isConnected = status?.connected && status?.token?.ig_user_id;
	const isExpired = status?.token?.is_expired;

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<Instagram className="h-5 w-5" />
					Instagram Connection
				</CardTitle>
				<CardDescription>
					Link your Instagram Business account to publish stories
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-4">
				{isConnected ? (
					<>
						<Alert variant={isExpired ? 'destructive' : 'default'} className={!isExpired ? 'border-green-200 bg-green-50 dark:bg-green-950/20' : ''}>
							{isExpired ? (
								<XCircle className="h-4 w-4" />
							) : (
								<CheckCircle className="h-4 w-4 text-green-600" />
							)}
							<AlertDescription>
								<div className="space-y-1">
									<p className="font-semibold">
										{isExpired ? 'Connection Expired' : 'Connected'}
									</p>
									{status.token?.ig_username && (
										<p className="text-sm">
											Account: <span className="font-medium">@{status.token.ig_username}</span>
										</p>
									)}
									{status.token?.ig_user_id && (
										<p className="text-sm text-muted-foreground">
											ID: {status.token.ig_user_id}
										</p>
									)}
									{status.token?.expires_at && (
										<p className={`text-sm ${isExpired ? 'text-red-600' : 'text-muted-foreground'}`}>
											{formatExpiry(status.token.expires_at)}
										</p>
									)}
								</div>
							</AlertDescription>
						</Alert>

						<Button
							onClick={handleConnect}
							disabled={isConnecting}
							variant={isExpired ? 'default' : 'outline'}
							className="w-full"
						>
							{isConnecting ? (
								<Loader2 className="mr-2 h-4 w-4 animate-spin" />
							) : (
								<ExternalLink className="mr-2 h-4 w-4" />
							)}
							{isExpired ? 'Reconnect Instagram' : 'Update Connection'}
						</Button>
					</>
				) : (
					<>
						<Alert variant="destructive">
							<XCircle className="h-4 w-4" />
							<AlertDescription>
								<p className="font-semibold">Not Connected</p>
								<p className="text-sm">
									You need to link your Instagram Business account to publish stories.
								</p>
							</AlertDescription>
						</Alert>

						<Button
							onClick={handleConnect}
							disabled={isConnecting}
							className="w-full"
						>
							{isConnecting ? (
								<Loader2 className="mr-2 h-4 w-4 animate-spin" />
							) : (
								<Instagram className="mr-2 h-4 w-4" />
							)}
							Connect Instagram Account
						</Button>
					</>
				)}
			</CardContent>
		</Card>
	);
}
