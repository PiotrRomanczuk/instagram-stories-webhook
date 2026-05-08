import { MediaType } from './common';

// ============== STORY ARCHIVE TYPES ==============

export type DownloadStatus = 'pending' | 'downloading' | 'completed' | 'failed';

export interface StoryArchive {
    id: string;
    userId: string;
    igMediaId: string;
    igUserId: string;
    mediaType: MediaType;
    mediaUrlOriginal: string;
    localPath?: string;
    thumbnailPath?: string;
    caption?: string;
    permalink?: string;
    igTimestamp: string;
    dimensions?: { width: number; height: number };
    videoDuration?: number;
    fileSizeBytes?: number;

    // Engagement
    impressions?: number;
    reach?: number;
    replies?: number;
    /** @deprecated Retired in Graph API v22+. Kept for legacy data. */
    tapsForward?: number;
    /** @deprecated Retired in Graph API v22+. Kept for legacy data. */
    tapsBack?: number;
    /** @deprecated Retired in Graph API v22+. Kept for legacy data. */
    exits?: number;
    totalInteractions?: number;
    shares?: number;
    engagementScore?: number;
    insightsFetchedAt?: string;

    // Download lifecycle
    downloadStatus: DownloadStatus;
    downloadError?: string;

    createdAt: string;
    updatedAt: string;
}

export interface StoryArchiveRow {
    id: string;
    user_id: string;
    ig_media_id: string;
    ig_user_id: string;
    media_type: string;
    media_url_original: string;
    local_path?: string;
    thumbnail_path?: string;
    caption?: string;
    permalink?: string;
    ig_timestamp: string;
    dimensions?: string; // JSON
    video_duration?: number;
    file_size_bytes?: number;
    impressions?: number;
    reach?: number;
    replies?: number;
    taps_forward?: number;
    taps_back?: number;
    exits?: number;
    total_interactions?: number;
    shares?: number;
    engagement_score?: number;
    insights_fetched_at?: string;
    download_status: string;
    download_error?: string;
    created_at: string;
    updated_at: string;
}

export interface StoryArchiveInsert {
    userId: string;
    igMediaId: string;
    igUserId: string;
    mediaType: MediaType;
    mediaUrlOriginal: string;
    localPath?: string;
    thumbnailPath?: string;
    caption?: string;
    permalink?: string;
    igTimestamp: string;
    dimensions?: { width: number; height: number };
    videoDuration?: number;
    fileSizeBytes?: number;
}

export interface EngagementMetrics {
    /** v22+ `views` is mapped onto this field. */
    impressions?: number;
    reach?: number;
    replies?: number;
    shares?: number;
    profileVisits?: number;
    follows?: number;
    totalInteractions?: number;
    /** @deprecated Retired in Graph API v22+. Kept for legacy data. */
    tapsForward?: number;
    /** @deprecated Retired in Graph API v22+. Kept for legacy data. */
    tapsBack?: number;
    /** @deprecated Retired in Graph API v22+. Kept for legacy data. */
    exits?: number;
}

export function mapStoryArchiveRow(row: StoryArchiveRow): StoryArchive {
    return {
        id: row.id,
        userId: row.user_id,
        igMediaId: row.ig_media_id,
        igUserId: row.ig_user_id,
        mediaType: row.media_type as MediaType,
        mediaUrlOriginal: row.media_url_original,
        localPath: row.local_path,
        thumbnailPath: row.thumbnail_path,
        caption: row.caption,
        permalink: row.permalink,
        igTimestamp: row.ig_timestamp,
        dimensions: row.dimensions ? JSON.parse(row.dimensions) : undefined,
        videoDuration: row.video_duration,
        fileSizeBytes: row.file_size_bytes,
        impressions: row.impressions,
        reach: row.reach,
        replies: row.replies,
        tapsForward: row.taps_forward,
        tapsBack: row.taps_back,
        exits: row.exits,
        totalInteractions: row.total_interactions,
        shares: row.shares,
        engagementScore: row.engagement_score,
        insightsFetchedAt: row.insights_fetched_at,
        downloadStatus: row.download_status as DownloadStatus,
        downloadError: row.download_error,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}

// ============== AUDIO TRACK TYPES ==============

export type AudioSource = 'pixabay' | 'manual';

export interface AudioTrack {
    id: string;
    title: string;
    artist?: string;
    source: AudioSource;
    sourceId?: string;
    sourceUrl?: string;
    localPath: string;
    durationSeconds: number;
    fileSizeBytes?: number;
    genre?: string;
    tags: string[];
    isActive: boolean;
    usageCount: number;
    createdAt: string;
}

export interface AudioTrackRow {
    id: string;
    title: string;
    artist?: string;
    source: string;
    source_id?: string;
    source_url?: string;
    local_path: string;
    duration_seconds: number;
    file_size_bytes?: number;
    genre?: string;
    tags: string[];
    is_active: boolean;
    usage_count: number;
    created_at: string;
}

export function mapAudioTrackRow(row: AudioTrackRow): AudioTrack {
    return {
        id: row.id,
        title: row.title,
        artist: row.artist,
        source: row.source as AudioSource,
        sourceId: row.source_id,
        sourceUrl: row.source_url,
        localPath: row.local_path,
        durationSeconds: row.duration_seconds,
        fileSizeBytes: row.file_size_bytes,
        genre: row.genre,
        tags: row.tags ?? [],
        isActive: row.is_active,
        usageCount: row.usage_count,
        createdAt: row.created_at,
    };
}

// ============== COMPOSED VIDEO TYPES ==============

export type CompositionStatus = 'pending' | 'processing' | 'completed' | 'failed';
export type TikTokPublishStatus = 'pending' | 'uploading' | 'published' | 'failed';

export interface ComposedVideo {
    id: string;
    userId: string;
    title?: string;
    localPath?: string;
    thumbnailPath?: string;
    durationSeconds?: number;
    fileSizeBytes?: number;
    storyIds: string[];
    audioTrackId?: string;
    compositionStatus: CompositionStatus;
    compositionError?: string;
    compositionConfig?: CompositionConfig;
    processingStartedAt?: string;
    processingCompletedAt?: string;
    tiktokPublishStatus?: TikTokPublishStatus;
    tiktokPublishId?: string;
    tiktokPublishError?: string;
    tiktokPublishedAt?: string;
    createdAt: string;
    updatedAt: string;
}

export interface ComposedVideoRow {
    id: string;
    user_id: string;
    title?: string;
    local_path?: string;
    thumbnail_path?: string;
    duration_seconds?: number;
    file_size_bytes?: number;
    story_ids: string[];
    audio_track_id?: string;
    composition_status: string;
    composition_error?: string;
    composition_config?: string; // JSON
    processing_started_at?: string;
    processing_completed_at?: string;
    tiktok_publish_status?: string;
    tiktok_publish_id?: string;
    tiktok_publish_error?: string;
    tiktok_published_at?: string;
    created_at: string;
    updated_at: string;
}

export interface CompositionConfig {
    width: number;
    height: number;
    imageDurationSec: number;
    transitionType: 'fade' | 'none';
    transitionDurationMs: number;
    maxDurationSec: number;
}

export const DEFAULT_COMPOSITION_CONFIG: CompositionConfig = {
    width: 1080,
    height: 1920,
    imageDurationSec: 5,
    transitionType: 'fade',
    transitionDurationMs: 500,
    maxDurationSec: 60,
};

export function mapComposedVideoRow(row: ComposedVideoRow): ComposedVideo {
    return {
        id: row.id,
        userId: row.user_id,
        title: row.title,
        localPath: row.local_path,
        thumbnailPath: row.thumbnail_path,
        durationSeconds: row.duration_seconds,
        fileSizeBytes: row.file_size_bytes,
        storyIds: row.story_ids ?? [],
        audioTrackId: row.audio_track_id,
        compositionStatus: row.composition_status as CompositionStatus,
        compositionError: row.composition_error,
        compositionConfig: row.composition_config
            ? JSON.parse(row.composition_config)
            : undefined,
        processingStartedAt: row.processing_started_at,
        processingCompletedAt: row.processing_completed_at,
        tiktokPublishStatus: row.tiktok_publish_status as TikTokPublishStatus | undefined,
        tiktokPublishId: row.tiktok_publish_id,
        tiktokPublishError: row.tiktok_publish_error,
        tiktokPublishedAt: row.tiktok_published_at,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}
