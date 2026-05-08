import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { getUserRole } from '@/lib/auth-helpers';
import { InstagramStoriesClient } from './instagram-stories-client';

export const metadata = {
	title: 'Instagram Stories',
	description: 'Live stories currently active on the linked Instagram account',
};

export default async function InstagramStoriesPage() {
	const session = await getServerSession(authOptions);

	if (!session?.user?.id) {
		redirect('/auth/signin');
	}

	const role = getUserRole(session);
	if (role !== 'admin' && role !== 'developer') {
		redirect('/');
	}

	return <InstagramStoriesClient />;
}
