import { Logger } from '@/lib/utils/logger';
import { saveFile, fileExists } from '@/lib/storage/local';
import { insertAudioTrack, isTrackCached } from '@/lib/database/audio-tracks';
import { validateFetchUrl } from '@/lib/utils/url-validation';

const MODULE = 'audio:pixabay';
const PIXABAY_API_BASE = 'https://pixabay.com/api/music/';

export interface PixabayTrack {
    id: number;
    title: string;
    url: string;         // page URL
    audio_url: string;   // direct download URL
    duration: number;     // seconds
    user: string;         // artist/uploader
    tags: string;         // comma-separated
}

interface PixabayResponse {
    total: number;
    totalHits: number;
    hits: PixabayTrack[];
}

interface FetchOptions {
    genre?: string;
    mood?: string;
    minDuration?: number;
    maxDuration?: number;
    perPage?: number;
    page?: number;
}

/**
 * Fetches trending/popular tracks from Pixabay Music API.
 */
export async function fetchTracks(options: FetchOptions = {}): Promise<PixabayTrack[]> {
    const apiKey = process.env.PIXABAY_API_KEY;
    if (!apiKey) {
        throw new Error('PIXABAY_API_KEY not configured');
    }

    const params = new URLSearchParams({
        key: apiKey,
        per_page: String(options.perPage ?? 20),
        page: String(options.page ?? 1),
        order: 'popular',
    });

    if (options.genre) params.set('genre', options.genre);
    if (options.mood) params.set('mood', options.mood);
    if (options.minDuration) params.set('min_duration', String(options.minDuration));
    if (options.maxDuration) params.set('max_duration', String(options.maxDuration));

    const url = `${PIXABAY_API_BASE}?${params.toString()}`;
    const response = await fetch(url);

    if (!response.ok) {
        throw new Error(`Pixabay API error: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as PixabayResponse;
    Logger.info(MODULE, `Fetched ${data.hits.length} tracks from Pixabay (total: ${data.totalHits})`);

    return data.hits;
}

/**
 * Downloads a Pixabay track and caches it locally.
 * Returns null if already cached.
 */
export async function downloadAndCacheTrack(track: PixabayTrack): Promise<string | null> {
    const sourceId = String(track.id);

    // Check if already cached in DB
    const cached = await isTrackCached('pixabay', sourceId);
    if (cached) {
        Logger.debug(MODULE, `Track ${sourceId} already cached, skipping`);
        return null;
    }

    // Check if file already exists on disk
    const subpath = `audio/${sourceId}.mp3`;
    const exists = await fileExists(subpath);
    if (exists) {
        Logger.debug(MODULE, `Track file ${subpath} already exists on disk`);
    }

    // Download audio file
    const validatedUrl = validateFetchUrl(track.audio_url);
    const response = await fetch(validatedUrl);
    if (!response.ok) {
        throw new Error(`Failed to download track ${sourceId}: ${response.status}`);
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    const localPath = await saveFile(subpath, buffer);

    // Parse tags
    const tags = track.tags
        .split(',')
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean);

    // Insert into DB
    await insertAudioTrack({
        title: track.title,
        artist: track.user,
        source: 'pixabay',
        sourceId,
        sourceUrl: track.url,
        localPath,
        durationSeconds: track.duration,
        fileSizeBytes: buffer.length,
        tags,
    });

    Logger.info(MODULE, `Cached track: "${track.title}" by ${track.user} (${track.duration}s, ${Math.round(buffer.length / 1024)}KB)`);
    return localPath;
}

/**
 * Refreshes the audio library by fetching new popular tracks from Pixabay.
 * Deduplicates by source_id.
 */
export async function refreshAudioLibrary(): Promise<{ fetched: number; cached: number }> {
    let totalFetched = 0;
    let totalCached = 0;

    // Fetch tracks suitable for short-form video (15-60 seconds)
    const tracks = await fetchTracks({
        minDuration: 15,
        maxDuration: 90,
        perPage: 30,
    });

    totalFetched = tracks.length;

    for (const track of tracks) {
        try {
            const result = await downloadAndCacheTrack(track);
            if (result) totalCached++;
        } catch (err) {
            Logger.warn(MODULE, `Failed to cache track ${track.id}: ${err instanceof Error ? err.message : 'Unknown'}`, err);
        }
    }

    Logger.info(MODULE, `Audio library refresh: ${totalCached} new tracks cached out of ${totalFetched} fetched`);
    return { fetched: totalFetched, cached: totalCached };
}
