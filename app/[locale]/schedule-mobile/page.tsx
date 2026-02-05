import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { getUserRole } from '@/lib/auth-helpers';
import { TimelinePage } from '@/app/components/schedule-mobile/timeline-page';

/**
 * Schedule Mobile Page - Timeline View
 *
 * Auth Requirements:
 * - User must be authenticated
 * - User must have admin or developer role
 *
 * Features:
 * - View scheduled posts in timeline format
 * - Search and filter posts
 * - Mobile-optimized interface
 * - Pull-to-refresh
 */
export default async function ScheduleMobilePage() {
	const session = await getServerSession(authOptions);

	// Check authentication
	if (!session?.user?.id) {
		redirect('/auth/signin');
	}

	// Check role authorization
	const role = getUserRole(session);
	if (role !== 'admin' && role !== 'developer') {
		redirect('/');
	}

	return <TimelinePage />;
}
