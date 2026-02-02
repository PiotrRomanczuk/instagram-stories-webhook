'use client';

/**
 * Unified Content Hub Page
 * StoryFlow Content Queue Dashboard - Phase 2
 * Consolidates /memes, /schedule, and /admin/memes into one interface
 */

import { useSearchParams } from 'next/navigation';
import { ContentQueueLayout } from '../../components/content-queue';

export default function ContentPage() {
	const searchParams = useSearchParams();
	const tab = searchParams.get('tab') as 'review' | 'all' | null;

	return (
		<main className="min-h-screen bg-[#101622]">
			<ContentQueueLayout initialTab={tab === 'review' ? 'review' : 'all'} />
		</main>
	);
}
