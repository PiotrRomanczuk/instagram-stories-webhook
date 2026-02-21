import { Suspense } from 'react';
import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { getUserRole } from '@/lib/auth-helpers';
import { ScheduleCalendarLayout } from '@/app/components/calendar';

export default async function SchedulePage() {
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
		<main className="min-h-screen bg-gray-50">
			<Suspense>
				<ScheduleCalendarLayout />
			</Suspense>
		</main>
	);
}
