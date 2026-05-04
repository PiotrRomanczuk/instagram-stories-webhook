import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { getUserRole } from '@/lib/auth-helpers';
import { PageHeader } from '@/app/components/layout/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Inbox, Lock, Sparkles } from 'lucide-react';

// TODO(v1.2): replace with real DM ingestion UI once Meta App Review approves instagram_manage_messages.
export default async function AdminDmInboxPage() {
	const session = await getServerSession(authOptions);
	if (!session?.user?.id) redirect('/auth/signin');
	const role = getUserRole(session);
	if (role !== 'admin' && role !== 'developer') redirect('/');

	return (
		<main className="min-h-screen bg-gray-50">
			<div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
				<PageHeader
					title="DM inbox"
					description="Triage inbound Instagram DMs — filter heart-only reactions and emoji spam, surface substantive content."
					badge={
						<Badge variant="secondary" className="gap-1">
							<Sparkles className="h-3 w-3" />
							v1.2
						</Badge>
					}
					backLink="/v0"
					backLinkText="Walkthrough hub"
				/>

				<Card className="border-dashed">
					<CardHeader>
						<div className="flex items-center gap-2">
							<Lock className="h-5 w-5 text-muted-foreground" />
							<CardTitle>Available in v1.2</CardTitle>
						</div>
						<CardDescription>
							Reading Instagram DMs requires{' '}
							<code className="text-xs">instagram_manage_messages</code> permission, which is granted by Meta App Review only.
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4 text-sm text-muted-foreground">
						<div className="flex items-start gap-3 rounded-md border bg-background p-4">
							<Inbox className="h-5 w-5 shrink-0 text-foreground" />
							<div className="space-y-1">
								<p className="font-medium text-foreground">What this surface will do</p>
								<ul className="list-disc pl-4 space-y-1">
									<li>
										Stream new DMs received after subscription via webhook (rolling 7-day backfill at most — historical DMs are not retrievable from the API).
									</li>
									<li>
										Auto-filter heart-only reactions, emoji-only replies, and known spam patterns into a hidden tray.
									</li>
									<li>
										Surface substantive messages (with media attachments, story replies, or text &gt;3 words) in a triage queue you can review like email.
									</li>
									<li>
										One-click &ldquo;use as submission&rdquo; — attach the DM media to a contributor-less submission and run it through the standard review pipeline.
									</li>
								</ul>
							</div>
						</div>

						<div className="rounded-md border bg-background p-4 space-y-2">
							<p className="font-medium text-foreground">Why this is gated</p>
							<p>
								Meta App Review takes 1&ndash;6 weeks and requires a documented business use-case, a recorded UX walkthrough, and a published privacy policy that discloses DM processing. We submit the application during v1 build so approval lands by the time v1.2 starts.
							</p>
						</div>

						<div className="rounded-md border bg-background p-4 space-y-2">
							<p className="font-medium text-foreground">Status</p>
							<ul className="list-disc pl-4 space-y-1">
								<li>Meta App Review: <Badge variant="outline">Not submitted</Badge></li>
								<li>Privacy policy: <Badge variant="outline">Drafting</Badge></li>
								<li>Webhook subscription: <Badge variant="outline">Not configured</Badge></li>
							</ul>
						</div>
					</CardContent>
				</Card>
			</div>
		</main>
	);
}
