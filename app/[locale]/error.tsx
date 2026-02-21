'use client';

import { useEffect, useState, useCallback } from 'react';
import { AlertTriangle, RefreshCw, Home, Copy, Check, ChevronDown, ChevronUp } from 'lucide-react';
import * as Sentry from '@sentry/nextjs';
import Link from 'next/link';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';

function getErrorDetails(error: Error & { digest?: string }): string {
	const lines = [
		`Error: ${error.message}`,
		error.digest ? `Digest: ${error.digest}` : '',
		`Time: ${new Date().toISOString()}`,
		`URL: ${typeof window !== 'undefined' ? window.location.href : 'unknown'}`,
		`UA: ${typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown'}`,
		error.stack ? `\nStack:\n${error.stack}` : '',
	];
	return lines.filter(Boolean).join('\n');
}

export default function Error({
	error,
	reset,
}: {
	error: Error & { digest?: string };
	reset: () => void;
}) {
	const [copied, setCopied] = useState(false);
	const [showDetails, setShowDetails] = useState(false);

	useEffect(() => {
		console.error('Page error:', error);
		Sentry.captureException(error);
	}, [error]);

	const handleCopy = useCallback(async () => {
		try {
			await navigator.clipboard.writeText(getErrorDetails(error));
			setCopied(true);
			setTimeout(() => setCopied(false), 2000);
		} catch {
			// Fallback: select text for manual copy
			setShowDetails(true);
		}
	}, [error]);

	return (
		<main className="min-h-screen flex items-center justify-center px-4 py-8">
			<Card className="max-w-md w-full">
				<CardHeader className="text-center">
					<div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
						<AlertTriangle className="h-8 w-8 text-destructive" />
					</div>
					<CardTitle className="text-2xl">Something went wrong</CardTitle>
					<CardDescription>
						An unexpected error occurred while loading this page.
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					{/* Always show error message */}
					{error.message && (
						<div className="rounded-lg bg-red-50 border border-red-100 p-3">
							<p className="text-xs font-mono text-red-700 break-all">
								{error.message}
							</p>
							{error.digest && (
								<p className="text-[10px] font-mono text-red-400 mt-1">
									Digest: {error.digest}
								</p>
							)}
						</div>
					)}

					{/* Expandable stack trace */}
					<button
						onClick={() => setShowDetails(!showDetails)}
						className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition w-full justify-center"
					>
						{showDetails ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
						{showDetails ? 'Hide' : 'Show'} details
					</button>

					{showDetails && (
						<div className="rounded-lg bg-muted p-3 max-h-48 overflow-auto">
							<pre className="text-[10px] font-mono text-muted-foreground whitespace-pre-wrap break-all select-all">
								{getErrorDetails(error)}
							</pre>
						</div>
					)}

					<div className="flex flex-col gap-2 sm:flex-row">
						<Button onClick={reset} className="flex-1">
							<RefreshCw className="mr-2 h-4 w-4" />
							Try Again
						</Button>
						<Button variant="outline" asChild className="flex-1">
							<Link href="/">
								<Home className="mr-2 h-4 w-4" />
								Go Home
							</Link>
						</Button>
					</div>

					{/* Copy error for debugging */}
					<Button
						variant="ghost"
						size="sm"
						onClick={handleCopy}
						className="w-full text-xs text-muted-foreground"
					>
						{copied ? (
							<><Check className="mr-1.5 h-3 w-3 text-green-500" /> Copied!</>
						) : (
							<><Copy className="mr-1.5 h-3 w-3" /> Copy error details</>
						)}
					</Button>
				</CardContent>
			</Card>
		</main>
	);
}
