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
import { fetchAndArchiveStories } from '@/lib/instagram/story-archive';
import { publishVideoToTikTok } from '@/lib/tiktok/publish';
import { updateTikTokPublishStatus } from '@/lib/database/composed-videos';
import { supabaseAdmin } from '@/lib/config/supabase-admin';
import { mapStoryArchiveRow } from '@/lib/types/story-archive';
import type { StoryArchive, StoryArchiveRow } from '@/lib/types/story-archive';
import { DEFAULT_COMPOSITION_CONFIG } from '@/lib/types/story-archive';
import type { UserRole } from '@/lib/types';

const MODULE = 'api:compositions:compose';

const ComposeRequestSchema = z
	.object({
		storyIds: z.array(z.string().uuid()).min(3).max(20).optional(),
		igMediaIds: z.array(z.string().min(1).max(64)).min(3).max(20).optional(),
		title: z.string().max(200).optional(),
		audioTrackId: z.string().uuid().optional(),
		audioTags: z.array(z.string()).optional(),
	})
	.refine((d) => Boolean(d.storyIds?.length || d.igMediaIds?.length), {
		message: 'storyIds or igMediaIds is required',
	});

async function loadByStoryIds(userId: string, storyIds: string[]): Promise<StoryArchive[]> {
	const { data, error } = await supabaseAdmin
		.from('story_archive')
		.select('*')
		.eq('user_id', userId)
		.in('id', storyIds)
		.eq('download_status', 'completed');
	if (error) throw new Error(error.message);
	return (data ?? []).map((r) => mapStoryArchiveRow(r as StoryArchiveRow));
}

async function loadByIgMediaIds(
	userId: string,
	igMediaIds: string[],
): Promise<StoryArchive[]> {
	const { data, error } = await supabaseAdmin
		.from('story_archive')
		.select('*')
		.eq('user_id', userId)
		.in('ig_media_id', igMediaIds)
		.eq('download_status', 'completed');
	if (error) throw new Error(error.message);
	return (data ?? []).map((r) => mapStoryArchiveRow(r as StoryArchiveRow));
}

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

	const { storyIds, igMediaIds, title, audioTrackId, audioTags } = parsed.data;
	const userId = session.user.id;

	let stories: StoryArchive[];
	let requestedCount: number;

	try {
		if (igMediaIds?.length) {
			requestedCount = igMediaIds.length;
			Logger.info(MODULE, `Compose by IG media ids — refreshing archive for ${userId}`);
			// Pass 200 (HARD_CAP) so any picked story is covered. Default 25 only
			// catches the most-recent stories by IG ordering, which can miss
			// engagement-ranked picks further down the active feed.
			await fetchAndArchiveStories(userId, 200);
			stories = await loadByIgMediaIds(userId, igMediaIds);
		} else {
			requestedCount = storyIds!.length;
			stories = await loadByStoryIds(userId, storyIds!);
		}
	} catch (err) {
		Logger.error(MODULE, `Story lookup failed: ${err instanceof Error ? err.message : err}`);
		return NextResponse.json({ error: 'Failed to load stories' }, { status: 500 });
	}

	if (stories.length !== requestedCount) {
		return NextResponse.json(
			{
				error:
					'One or more stories not found, not downloaded, or not owned by you. ' +
					'They may have expired (24h IG window) or failed to download.',
				found: stories.length,
				requested: requestedCount,
			},
			{ status: 400 },
		);
	}

	// Audio is optional — the TT-inbox flow keeps IG-original audio because the
	// human picks a native TikTok sound after upload. Only look one up if the
	// caller explicitly asked.
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
	} else if (audioTags?.length) {
		audioTrack = await getRandomAudioTrack(audioTags);
	}

	const composedVideo = await createComposedVideo({
		userId,
		title:
			title ??
			`Manual selection — ${new Date().toISOString().split('T')[0]} (${stories.length} stories)`,
		storyIds: stories.map((s) => s.id),
		audioTrackId: audioTrack?.id,
		compositionConfig: DEFAULT_COMPOSITION_CONFIG,
	});
	if (!composedVideo) {
		return NextResponse.json({ error: 'Failed to create composition record' }, { status: 500 });
	}

	(async () => {
		await markCompositionProcessing(composedVideo.id);
		try {
			const audioLabel = audioTrack ? `"${audioTrack.title}"` : 'IG-original audio';
			Logger.info(
				MODULE,
				`Manual compose ${composedVideo.id}: ${stories.length} stories + ${audioLabel}`,
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
			if (audioTrack) {
				await incrementUsageCount(audioTrack.id);
			}

			// Chain into TT inbox upload. Failures are recorded on the row so the
			// /tiktok-drafts page can surface them; we don't abort if it fails.
			try {
				await updateTikTokPublishStatus(composedVideo.id, 'uploading');
				const publishResult = await publishVideoToTikTok(result.outputPath, userId);
				if (publishResult.status === 'published') {
					await updateTikTokPublishStatus(
						composedVideo.id,
						'published',
						publishResult.publishId,
					);
					Logger.info(
						MODULE,
						`TT inbox upload succeeded for ${composedVideo.id}: publishId=${publishResult.publishId}`,
					);
				} else {
					await updateTikTokPublishStatus(
						composedVideo.id,
						'failed',
						publishResult.publishId,
						publishResult.error,
					);
					Logger.error(
						MODULE,
						`TT inbox upload failed for ${composedVideo.id}: ${publishResult.error}`,
					);
				}
			} catch (publishErr) {
				const msg = publishErr instanceof Error ? publishErr.message : 'TT publish failed';
				await updateTikTokPublishStatus(composedVideo.id, 'failed', undefined, msg);
				Logger.error(MODULE, `TT inbox upload threw for ${composedVideo.id}: ${msg}`, publishErr);
			}
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
			audioTrackTitle: audioTrack?.title ?? null,
			status: 'processing',
			message: 'Composing and uploading to TikTok inbox — check there in ~60s.',
		},
		{ status: 202 },
	);
}
