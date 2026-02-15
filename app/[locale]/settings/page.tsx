import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getUserRole } from '@/lib/auth-helpers';
import { Shield, Globe, Key, Database } from 'lucide-react';
import { PageHeader } from '@/app/components/layout/page-header';
import { Badge } from '@/app/components/ui/badge';
import { Card, CardContent } from '@/app/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/app/components/ui/alert';
import { SettingsFormNew } from '@/app/components/settings/settings-form-new';

export default async function SettingsPage() {
	const session = await getServerSession(authOptions);

	if (!session?.user?.id) {
		redirect('/auth/signin');
	}

	const role = getUserRole(session);

	// Only developers can access this page
	if (role !== 'developer') {
		redirect('/');
	}

	return (
		<main className="min-h-screen bg-gray-50 mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
			<div className="space-y-6">
				<PageHeader
					title="Application Settings"
					description="Configure your application credentials and API keys. These settings are stored locally and used to connect to external services."
					backLink="/"
					backLinkText="Back to Dashboard"
					badge={
						<Badge variant="secondary" className="gap-1">
							<Shield className="h-3 w-3" />
							Local Config
						</Badge>
					}
				/>

				{/* Security Notice */}
				<Alert className="border-amber-200 bg-amber-50">
					<Shield className="h-4 w-4 text-amber-600" />
					<AlertTitle className="text-amber-800">
						Security Notice
					</AlertTitle>
					<AlertDescription className="text-amber-700">
						These credentials are stored in a local JSON file on this device.
						They are <strong>not</strong> uploaded to any server. Keep this
						device secure and do not share access.
					</AlertDescription>
				</Alert>

				{/* Configuration Cards Legend */}
				<div className="grid grid-cols-2 gap-4 md:grid-cols-4">
					<Card>
						<CardContent className="flex items-center gap-3 p-4">
							<div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100">
								<Globe className="h-4 w-4 text-blue-600" />
							</div>
							<span className="text-sm font-medium">App Settings</span>
						</CardContent>
					</Card>
					<Card>
						<CardContent className="flex items-center gap-3 p-4">
							<div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-100">
								<Key className="h-4 w-4 text-red-600" />
							</div>
							<span className="text-sm font-medium">Google Auth</span>
						</CardContent>
					</Card>
					<Card>
						<CardContent className="flex items-center gap-3 p-4">
							<div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100">
								<Key className="h-4 w-4 text-indigo-600" />
							</div>
							<span className="text-sm font-medium">Meta/Facebook</span>
						</CardContent>
					</Card>
					<Card>
						<CardContent className="flex items-center gap-3 p-4">
							<div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100">
								<Database className="h-4 w-4 text-emerald-600" />
							</div>
							<span className="text-sm font-medium">Supabase</span>
						</CardContent>
					</Card>
				</div>

				{/* Settings Form */}
				<SettingsFormNew />
			</div>
		</main>
	);
}
