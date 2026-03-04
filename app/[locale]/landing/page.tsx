import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { LandingPage } from './landing-page';

export const metadata = {
	title: 'ISM Stories Manager — Automate Your Instagram Stories',
	description:
		'Submit, review, schedule, and publish Instagram Stories with a team. Swipe-to-review queue, drag-and-drop calendar, real-time analytics.',
};

export default async function Landing() {
	const session = await getServerSession(authOptions);

	if (session?.user?.id) {
		redirect('/');
	}

	return <LandingPage />;
}
