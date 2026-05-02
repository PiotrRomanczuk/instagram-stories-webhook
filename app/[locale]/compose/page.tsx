import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { getUserRole } from '@/lib/auth-helpers';
import { PageHeader } from '@/app/components/layout/page-header';
import { Badge } from '@/app/components/ui/badge';
import { Sparkles } from 'lucide-react';
import { ComposeClient } from '@/app/components/compose/compose-client';

// TODO(v1): replace fixture-driven candidate list with real query against published submissions
// joined to submission_categories + submission_keywords. Wire `Queue for TikTok drafts` to the
// worker FFmpeg pipeline (lib/jobs/compose-video.ts) producing a silent MP4 → existing TikTok
// publish path. Schema additions: composed_videos.audio_track_id (nullable), source_submissions[].
export default async function ComposePage() {
	const session = await getServerSession(authOptions);
	if (!session?.user?.id) redirect('/auth/signin');
	const role = getUserRole(session);
	if (role !== 'admin' && role !== 'developer') redirect('/');

	return (
		<main className="min-h-screen bg-gray-50">
			<div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
				<PageHeader
					title="Compose for TikTok"
					description="Stitch published Instagram stories into a vertical TikTok montage. Output is silent — add sound in the TikTok app before publishing."
					badge={
						<Badge variant="secondary" className="gap-1">
							<Sparkles className="h-3 w-3" />
							v0 prototype
						</Badge>
					}
				/>
				<ComposeClient />
			</div>
		</main>
	);
}
