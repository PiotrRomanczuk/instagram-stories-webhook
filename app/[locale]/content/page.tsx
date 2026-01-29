'use client';

/**
 * Unified Content Hub Page
 * Consolidates /memes, /schedule, and /admin/memes into one interface
 */

import { ContentHub } from '../../components/content/content-hub';
import { useSearchParams } from 'next/navigation';
import { getServerSession } from 'next-auth/next';

export default function ContentPage() {
	const searchParams = useSearchParams();
	const tab = (searchParams.get('tab') || 'all') as 'all' | 'review' | 'queue' | 'published';

	return (
		<main className="min-h-screen bg-gray-50">
			<ContentHub initialTab={tab} />
		</main>
	);
}
