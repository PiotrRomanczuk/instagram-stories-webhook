import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { getUserRole } from '@/lib/auth-helpers';
import { Link } from '@/i18n/routing';
import { Settings, Terminal, Clock } from 'lucide-react';
import { PageHeader } from '@/app/components/layout/page-header';
import { Badge } from '@/app/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { DebugPublisherNew } from '@/app/components/developer/debug-publisher-new';

export default async function DeveloperPage() {
	const session = await getServerSession(authOptions);

	if (!session?.user?.id) {
		redirect('/auth/signin');
	}

	const role = getUserRole(session);

	// Only developers can access this page
	if (role !== 'developer') {
		redirect('/');
	}

	const appUrl =
		process.env.NEXTAUTH_URL ||
		process.env.NEXT_PUBLIC_APP_URL ||
		'http://localhost:3000';
	const webhookUrl = `${appUrl}/api/webhook/story`;

	return (
		<main className="min-h-screen bg-gray-50 dark:bg-[#101622] mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
			<div className="space-y-6">
				<PageHeader
					title="Developer Tools"
					description="Test webhooks, verify API integrations, and debug connection issues."
					badge={
						<Badge variant="secondary" className="gap-1">
							<Terminal className="h-3 w-3" />
							Dev Mode
						</Badge>
					}
				/>

				<DebugPublisherNew />

				<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
					{/* Webhook URL Card */}
					<Card>
						<CardHeader>
							<CardTitle>API Configuration</CardTitle>
							<CardDescription>
								Webhook endpoint for Instagram story events
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="space-y-2">
								<p className="text-sm font-medium">Webhook URL</p>
								<code className="block p-3 bg-muted rounded-md text-sm break-all">
									{webhookUrl}
								</code>
							</div>
							<p className="text-xs text-muted-foreground">
								Configure this URL in your Meta App Dashboard to receive story events.
							</p>
						</CardContent>
					</Card>

					{/* Cron Debug Link */}
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<Clock className="h-5 w-5" />
								Cron Job Debugger
							</CardTitle>
							<CardDescription>
								Monitor scheduled tasks and debug processing issues
							</CardDescription>
						</CardHeader>
						<CardContent>
							<Button asChild className="w-full">
								<Link href="/developer/cron-debug">
									Open Cron Debugger
								</Link>
							</Button>
						</CardContent>
					</Card>
				</div>

				{/* Settings Link */}
				<Card className="bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800">
					<CardContent className="pt-6">
						<div className="flex items-center justify-between">
							<div className="flex items-center gap-4">
								<div className="h-12 w-12 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
									<Settings className="h-6 w-6 text-white" />
								</div>
								<div>
									<h3 className="font-semibold text-amber-900 dark:text-amber-100">
										Application Settings
									</h3>
									<p className="text-sm text-amber-700 dark:text-amber-300">
										Configure API keys, credentials, and security tokens
									</p>
								</div>
							</div>
							<Button asChild variant="outline">
								<Link href="/settings">Open Settings</Link>
							</Button>
						</div>
					</CardContent>
				</Card>
			</div>
		</main>
	);
}
