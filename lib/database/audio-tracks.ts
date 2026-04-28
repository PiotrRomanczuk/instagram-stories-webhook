import { supabaseAdmin } from '@/lib/config/supabase-admin';
import { Logger } from '@/lib/utils/logger';
import { AudioTrack, AudioTrackRow, mapAudioTrackRow } from '@/lib/types/story-archive';

const MODULE = 'db:audio-tracks';

interface AudioTrackInsert {
    title: string;
    artist?: string;
    source: 'pixabay' | 'manual';
    sourceId?: string;
    sourceUrl?: string;
    localPath: string;
    durationSeconds: number;
    fileSizeBytes?: number;
    genre?: string;
    tags?: string[];
}

/**
 * Insert a new audio track.
 */
export async function insertAudioTrack(input: AudioTrackInsert): Promise<AudioTrack | null> {
    try {
        const { data, error } = await supabaseAdmin
            .from('audio_tracks')
            .insert({
                title: input.title,
                artist: input.artist,
                source: input.source,
                source_id: input.sourceId,
                source_url: input.sourceUrl,
                local_path: input.localPath,
                duration_seconds: input.durationSeconds,
                file_size_bytes: input.fileSizeBytes,
                genre: input.genre,
                tags: input.tags ?? [],
            })
            .select()
            .single();

        if (error) {
            // Duplicate source_id — already cached
            if (error.code === '23505') {
                Logger.debug(MODULE, `Track ${input.sourceId} already exists`);
                return null;
            }
            Logger.error(MODULE, `Insert error: ${error.message}`, error);
            return null;
        }

        return mapAudioTrackRow(data as AudioTrackRow);
    } catch (err) {
        Logger.error(MODULE, 'insertAudioTrack exception', err);
        return null;
    }
}

/**
 * Check if a track from a given source is already cached.
 */
export async function isTrackCached(source: string, sourceId: string): Promise<boolean> {
    const { count, error } = await supabaseAdmin
        .from('audio_tracks')
        .select('id', { count: 'exact', head: true })
        .eq('source', source)
        .eq('source_id', sourceId);

    if (error) {
        Logger.error(MODULE, `isTrackCached error: ${error.message}`, error);
        return false;
    }

    return (count ?? 0) > 0;
}

/**
 * Get a random active audio track, weighted by usage count (prefer less-used).
 */
export async function getRandomAudioTrack(tags?: string[]): Promise<AudioTrack | null> {
    let query = supabaseAdmin
        .from('audio_tracks')
        .select('*')
        .eq('is_active', true)
        .order('usage_count', { ascending: true })
        .limit(10);

    if (tags && tags.length > 0) {
        query = query.overlaps('tags', tags);
    }

    const { data, error } = await query;

    if (error) {
        Logger.error(MODULE, `getRandomAudioTrack error: ${error.message}`, error);
        return null;
    }

    if (!data || data.length === 0) {
        Logger.warn(MODULE, 'No active audio tracks available');
        return null;
    }

    // Pick randomly from the least-used tracks
    const index = Math.floor(Math.random() * data.length);
    return mapAudioTrackRow(data[index] as AudioTrackRow);
}

/**
 * Increment the usage count for a track (called after composition).
 */
export async function incrementUsageCount(id: string): Promise<void> {
    const { error } = await supabaseAdmin.rpc('increment_audio_usage', { track_id: id });

    // Fallback if RPC doesn't exist: manual increment
    if (error) {
        const { data } = await supabaseAdmin
            .from('audio_tracks')
            .select('usage_count')
            .eq('id', id)
            .single();

        if (data) {
            await supabaseAdmin
                .from('audio_tracks')
                .update({ usage_count: (data.usage_count ?? 0) + 1 })
                .eq('id', id);
        }
    }
}

/**
 * Get all active audio tracks.
 */
export async function getActiveAudioTracks(): Promise<AudioTrack[]> {
    const { data, error } = await supabaseAdmin
        .from('audio_tracks')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

    if (error) {
        Logger.error(MODULE, `getActiveAudioTracks error: ${error.message}`, error);
        return [];
    }

    return (data || []).map((row) => mapAudioTrackRow(row as AudioTrackRow));
}

/**
 * Count active audio tracks.
 */
export async function countActiveAudioTracks(): Promise<number> {
    const { count, error } = await supabaseAdmin
        .from('audio_tracks')
        .select('id', { count: 'exact', head: true })
        .eq('is_active', true);

    if (error) {
        Logger.error(MODULE, `countActiveAudioTracks error: ${error.message}`, error);
        return 0;
    }

    return count ?? 0;
}
