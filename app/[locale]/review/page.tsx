import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { getUserRole } from '@/lib/auth-helpers';
import { ReviewManager } from '@/app/components/review/review-manager';

export default async function ReviewPage() {
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
		<main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
			<ReviewManager />
		</main>
	);
}
