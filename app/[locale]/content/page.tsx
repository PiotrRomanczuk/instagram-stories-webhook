import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { getUserRole } from '@/lib/auth-helpers';
import { ContentPageClient } from './content-page-client';

interface ContentPageProps {
	searchParams: Promise<{ view?: string; tab?: string }>;
}

export default async function ContentPage({ searchParams }: ContentPageProps) {
	const session = await getServerSession(authOptions);

	if (!session?.user?.id) {
		redirect('/auth/signin');
	}

	const role = getUserRole(session);

	if (role !== 'admin' && role !== 'developer') {
		redirect('/');
	}

	const params = await searchParams;

	return (
		<ContentPageClient
			view={params.view}
			tab={params.tab as 'review' | 'all' | undefined}
		/>
	);
}
