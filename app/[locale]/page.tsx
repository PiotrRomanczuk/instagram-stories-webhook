import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { UserRole } from '@/lib/types';
import { UserDashboard } from '../components/dashboard/user-dashboard';
import { AdminDashboard } from '../components/dashboard/admin-dashboard';

export default async function DashboardPage() {
	const session = await getServerSession(authOptions);

	if (!session?.user?.id) {
		redirect('/auth/signin');
	}

	const user = session.user;
	const role = (user as { role?: UserRole }).role;
	const isAdmin = role === 'admin';
	const isDeveloper = role === 'developer';
	const isAdminOrDev = isAdmin || isDeveloper;

	const userName = user.name?.split(' ')[0] || user.email?.split('@')[0] || 'User';

	return (
		<main className="min-h-screen bg-gray-50 dark:bg-[#101622] mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
			{isAdminOrDev ? (
				<AdminDashboard userName={userName} isDeveloper={isDeveloper} />
			) : (
				<UserDashboard userName={userName} />
			)}
		</main>
	);
}
