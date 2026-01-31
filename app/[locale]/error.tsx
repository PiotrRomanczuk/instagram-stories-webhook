'use client';

import { useEffect } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';

export default function Error({
	error,
	reset,
}: {
	error: Error & { digest?: string };
	reset: () => void;
}) {
	useEffect(() => {
		// Log the error to an error reporting service
		console.error('Page error:', error);
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
					{process.env.NODE_ENV === 'development' && error.message && (
						<div className="rounded-lg bg-muted p-3">
							<p className="text-xs font-mono text-muted-foreground break-all">
								{error.message}
							</p>
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
				</CardContent>
			</Card>
		</main>
	);
}
