import { UserRole } from '@/lib/types';
import { UserDashboard } from '../components/dashboard/user-dashboard';
import { PipelineDashboard } from '../components/dashboard/pipeline-dashboard';
import { LandingPage } from './landing/landing-page';

export default async function DashboardPage() {
	if (!process.env.NEXTAUTH_SECRET) {
		return <LandingPage />;
	}

	let session;
	try {
		const { getServerSession } = await import('next-auth/next');
		const { authOptions } = await import('@/lib/auth');
		session = await getServerSession(authOptions);
	} catch {
		return <LandingPage />;
	}

	if (!session?.user?.id) {
		return <LandingPage />;
	}

	const user = session.user;
	const role = (user as { role?: UserRole }).role;
	const isAdminOrDev = role === 'admin' || role === 'developer';

	const userName = user.name?.split(' ')[0] || user.email?.split('@')[0] || 'User';

	return (
		<main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
			{isAdminOrDev ? (
				<PipelineDashboard userName={userName} />
			) : (
				<UserDashboard userName={userName} />
			)}
		</main>
	);
}
