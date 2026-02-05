import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { getUserRole } from '@/lib/auth-helpers';
import { UsersManagementLayout } from '@/app/components/users/users-management-layout';

export default async function UsersPage() {
	const session = await getServerSession(authOptions);

	if (!session?.user?.id) {
		redirect('/auth/signin');
	}

	const role = getUserRole(session);

	// Only admins and developers can access this page
	if (role !== 'admin' && role !== 'developer') {
		redirect('/');
	}

	return (
		<main className="min-h-screen bg-gray-50 dark:bg-gray-900">
			<div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
				<UsersManagementLayout />
			</div>
		</main>
	);
}
