import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { z } from 'zod';
import { Logger } from '@/lib/utils/logger';
import { getRandomAudioTrack, incrementUsageCount } from '@/lib/database/audio-tracks';
import {
	createComposedVideo,
	markCompositionProcessing,
	markCompositionCompleted,
	markCompositionFailed,
} from '@/lib/database/composed-videos';
import { composeVideoFromStories } from '@/lib/media/compose-video';
import { supabaseAdmin } from '@/lib/config/supabase-admin';
import { mapStoryArchiveRow } from '@/lib/types/story-archive';
import type { StoryArchiveRow } from '@/lib/types/story-archive';
import { DEFAULT_COMPOSITION_CONFIG } from '@/lib/types/story-archive';
import type { UserRole } from '@/lib/types';

const MODULE = 'api:compositions:compose';

const ComposeRequestSchema = z.object({
	storyIds: z.array(z.string().uuid()).min(3).max(20),
	title: z.string().max(200).optional(),
	audioTrackId: z.string().uuid().optional(),
	audioTags: z.array(z.string()).optional(),
});

export async function POST(req: NextRequest) {
	const session = await getServerSession(authOptions);
	if (!session?.user?.id) {
		return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
	}
	const role = (session.user as { role?: UserRole }).role;
	if (role !== 'admin' && role !== 'developer') {
		return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
	}

	const body = await req.json().catch(() => null);
	const parsed = ComposeRequestSchema.safeParse(body);
	if (!parsed.success) {
		return NextResponse.json(
			{ error: 'Invalid request', issues: parsed.error.flatten() },
			{ status: 400 },
		);
	}

	const { storyIds, title, audioTrackId, audioTags } = parsed.data;
	const userId = session.user.id;

	const { data: rows, error: storyErr } = await supabaseAdmin
		.from('story_archive')
		.select('*')
		.eq('user_id', userId)
		.in('id', storyIds)
		.eq('download_status', 'completed');

	if (storyErr) {
		Logger.error(MODULE, `Story lookup error: ${storyErr.message}`);
		return NextResponse.json({ error: 'Failed to load stories' }, { status: 500 });
	}

	const stories = (rows ?? []).map((r) => mapStoryArchiveRow(r as StoryArchiveRow));
	if (stories.length !== storyIds.length) {
		return NextResponse.json(
			{
				error: 'One or more stories not found, not downloaded, or not owned by you',
				found: stories.length,
				requested: storyIds.length,
			},
			{ status: 400 },
		);
	}

	let audioTrack = null;
	if (audioTrackId) {
		const { data: track } = await supabaseAdmin
			.from('audio_tracks')
			.select('*')
			.eq('id', audioTrackId)
			.eq('is_active', true)
			.maybeSingle();
		if (track) {
			audioTrack = {
				id: track.id,
				title: track.title,
				artist: track.artist,
				source: track.source,
				localPath: track.local_path,
				durationSeconds: track.duration_seconds,
				fileSizeBytes: track.file_size_bytes,
				tags: track.tags ?? [],
				isActive: track.is_active,
				usageCount: track.usage_count,
				createdAt: track.created_at,
			};
		}
	}
	if (!audioTrack) {
		audioTrack = await getRandomAudioTrack(audioTags);
	}
	if (!audioTrack) {
		return NextResponse.json(
			{ error: 'No active audio tracks available. Add one in /audio first.' },
			{ status: 409 },
		);
	}

	const composedVideo = await createComposedVideo({
		userId,
		title:
			title ??
			`Manual selection — ${new Date().toISOString().split('T')[0]} (${stories.length} stories)`,
		storyIds: stories.map((s) => s.id),
		audioTrackId: audioTrack.id,
		compositionConfig: DEFAULT_COMPOSITION_CONFIG,
	});
	if (!composedVideo) {
		return NextResponse.json({ error: 'Failed to create composition record' }, { status: 500 });
	}

	(async () => {
		await markCompositionProcessing(composedVideo.id);
		try {
			Logger.info(
				MODULE,
				`Manual compose ${composedVideo.id}: ${stories.length} stories + "${audioTrack.title}"`,
			);
			const result = await composeVideoFromStories(
				stories,
				audioTrack,
				undefined,
				composedVideo.id,
			);
			await markCompositionCompleted(
				composedVideo.id,
				result.outputPath,
				result.durationSeconds,
				result.fileSizeBytes,
			);
			await incrementUsageCount(audioTrack.id);
		} catch (err) {
			const msg = err instanceof Error ? err.message : 'Composition failed';
			await markCompositionFailed(composedVideo.id, msg);
			Logger.error(MODULE, `Manual compose failed for ${composedVideo.id}: ${msg}`, err);
		}
	})();

	return NextResponse.json(
		{
			composedVideoId: composedVideo.id,
			storyCount: stories.length,
			audioTrackTitle: audioTrack.title,
			status: 'processing',
		},
		{ status: 202 },
	);
}
