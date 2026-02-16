/**
 * Background Video Processing Job
 *
 * Processes videos that need conversion to Instagram Stories specs
 * Runs periodically via cron to handle queued videos
 */

import { supabaseAdmin } from '@/lib/config/supabase-admin';
import { getCurrentEnvironment } from '@/lib/content-db/environment';
import { processVideoForStory } from '@/lib/media/video-processor';
import { Logger } from '@/lib/utils/logger';
import { ContentItemRow, mapContentItemRow } from '@/lib/types/posts';

const MODULE = 'video-processing-job';
const MAX_PROCESSING_RETRIES = 3;

const CONTENT_ITEM_COLUMNS = 'id, user_id, user_email, media_url, media_type, storage_path, dimensions, thumbnail_url, video_duration, video_codec, video_framerate, needs_processing, title, caption, user_tags, hashtags, source, submission_status, publishing_status, rejection_reason, reviewed_at, reviewed_by, scheduled_time, processing_started_at, published_at, ig_media_id, error, content_hash, idempotency_key, retry_count, archived_at, environment, version, created_at, updated_at';

export interface VideoProcessingResult {
	totalQueued: number;
	processed: number;
	failed: number;
	skipped: number;
	errors: Array<{ id: string; error: string }>;
}

/**
 * Get videos that need processing (with retry_count < max retries)
 */
async function getVideosNeedingProcessing(): Promise<ContentItemRow[]> {
	try {
		const { data, error } = await supabaseAdmin
			.from('content_items')
			.select(CONTENT_ITEM_COLUMNS)
			.eq('environment', getCurrentEnvironment())
			.eq('media_type', 'VIDEO')
			.eq('needs_processing', true)
			.lt('retry_count', MAX_PROCESSING_RETRIES)
			.order('created_at', { ascending: true })
			.limit(10); // Process up to 10 videos per run

		if (error) {
			Logger.error(MODULE, 'Failed to fetch videos needing processing', error);
			return [];
		}

		return data || [];
	} catch (error) {
		Logger.error(MODULE, 'Error in getVideosNeedingProcessing', error);
		return [];
	}
}

/**
 * Process a single video
 */
async function processVideo(videoRow: ContentItemRow): Promise<boolean> {
	const videoItem = mapContentItemRow(videoRow);
	Logger.info(MODULE, `Processing video ${videoItem.id}`, {
		url: videoItem.mediaUrl,
		duration: videoItem.videoDuration,
	});

	try {
		// Download video
		const response = await fetch(videoItem.mediaUrl);
		if (!response.ok) {
			throw new Error(`Failed to download video: ${response.statusText}`);
		}

		const arrayBuffer = await response.arrayBuffer();
		const buffer = Buffer.from(arrayBuffer);

		// Process video
		Logger.info(MODULE, `Processing video file for ${videoItem.id}`);
		const result = await processVideoForStory(buffer);

		if (!result.wasProcessed && result.processingApplied.length === 0) {
			// Video was already compliant, just mark as processed
			Logger.info(MODULE, `Video ${videoItem.id} was already compliant`);
			await supabaseAdmin
				.from('content_items')
				.update({
					needs_processing: false,
					retry_count: 0,
					error: null,
					updated_at: new Date().toISOString(),
				})
				.eq('id', videoItem.id);

			return true;
		}

		// Upload processed video
		const processedBuffer = result.buffer;
		const fileExt = 'mp4';
		const fileName = `processed/${videoItem.id}-${Date.now()}.${fileExt}`;

		Logger.info(MODULE, `Uploading processed video for ${videoItem.id}`, {
			size: processedBuffer.length,
			path: fileName,
		});

		const { error: uploadError } = await supabaseAdmin.storage
			.from('stories')
			.upload(fileName, processedBuffer, {
				contentType: 'video/mp4',
				cacheControl: '3600',
				upsert: false,
			});

		if (uploadError) {
			throw new Error(`Failed to upload processed video: ${uploadError.message}`);
		}

		// Get public URL
		const {
			data: { publicUrl },
		} = supabaseAdmin.storage.from('stories').getPublicUrl(fileName);

		// Update content item with processed video
		const { error: updateError } = await supabaseAdmin
			.from('content_items')
			.update({
				media_url: publicUrl,
				storage_path: fileName,
				video_duration: result.duration,
				video_codec: 'h264', // Always H.264 after processing
				video_framerate: 30, // Always 30fps after processing
				needs_processing: false,
				retry_count: 0,
				error: null,
				updated_at: new Date().toISOString(),
			})
			.eq('id', videoItem.id);

		if (updateError) {
			throw new Error(`Failed to update content item: ${updateError.message}`);
		}

		Logger.info(MODULE, `Successfully processed video ${videoItem.id}`, {
			processedUrl: publicUrl,
			processingApplied: result.processingApplied,
		});

		// Delete original video if it was stored in Supabase
		if (videoItem.storagePath && videoItem.storagePath !== fileName) {
			await supabaseAdmin.storage
				.from('stories')
				.remove([videoItem.storagePath])
				.catch((err: unknown) => {
					Logger.warn(MODULE, `Failed to delete original video ${videoItem.storagePath}`, err);
				});
		}

		return true;
	} catch (error) {
		const currentRetries = videoItem.retryCount || 0;
		const newRetryCount = currentRetries + 1;
		const errorMessage = error instanceof Error ? error.message : 'Video processing failed';

		Logger.error(MODULE, `Failed to process video ${videoItem.id} (attempt ${newRetryCount}/${MAX_PROCESSING_RETRIES})`, error);

		if (newRetryCount >= MAX_PROCESSING_RETRIES) {
			// Max retries reached, stop retrying
			Logger.error(MODULE, `Video ${videoItem.id} failed after ${MAX_PROCESSING_RETRIES} attempts, giving up`);
			await supabaseAdmin
				.from('content_items')
				.update({
					needs_processing: false,
					retry_count: newRetryCount,
					error: `${errorMessage} (after ${newRetryCount} attempts)`,
					updated_at: new Date().toISOString(),
				})
				.eq('id', videoItem.id);
		} else {
			// Keep needs_processing true so it will be retried
			Logger.info(MODULE, `Video ${videoItem.id} will be retried (attempt ${newRetryCount}/${MAX_PROCESSING_RETRIES})`);
			await supabaseAdmin
				.from('content_items')
				.update({
					retry_count: newRetryCount,
					error: `${errorMessage} (attempt ${newRetryCount}/${MAX_PROCESSING_RETRIES})`,
					updated_at: new Date().toISOString(),
				})
				.eq('id', videoItem.id);
		}

		return false;
	}
}

/**
 * Main processing function
 * Processes all videos in the queue
 */
export async function processVideosQueue(): Promise<VideoProcessingResult> {
	Logger.info(MODULE, 'Starting video processing job');

	const videosToProcess = await getVideosNeedingProcessing();

	if (videosToProcess.length === 0) {
		Logger.info(MODULE, 'No videos to process');
		return {
			totalQueued: 0,
			processed: 0,
			failed: 0,
			skipped: 0,
			errors: [],
		};
	}

	Logger.info(MODULE, `Found ${videosToProcess.length} videos to process`);

	const results: VideoProcessingResult = {
		totalQueued: videosToProcess.length,
		processed: 0,
		failed: 0,
		skipped: 0,
		errors: [],
	};

	// Process videos sequentially (to avoid overwhelming the system)
	for (const video of videosToProcess) {
		try {
			const success = await processVideo(video);
			if (success) {
				results.processed++;
			} else {
				results.failed++;
				results.errors.push({
					id: video.id,
					error: 'Processing failed',
				});
			}
		} catch (error) {
			results.failed++;
			results.errors.push({
				id: video.id,
				error: error instanceof Error ? error.message : 'Unknown error',
			});
			Logger.error(MODULE, `Error processing video ${video.id}`, error);
		}
	}

	Logger.info(MODULE, 'Video processing job complete', results);

	return results;
}

/**
 * Cleanup old processed videos (older than 30 days)
 * Saves storage space
 */
export async function cleanupOldProcessedVideos(): Promise<number> {
	Logger.info(MODULE, 'Starting cleanup of old processed videos');

	try {
		const thirtyDaysAgo = new Date();
		thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

		// Get videos older than 30 days that are already published
		const { data, error } = await supabaseAdmin
			.from('content_items')
			.select('storage_path')
			.eq('media_type', 'VIDEO')
			.eq('publishing_status', 'published')
			.lt('published_at', thirtyDaysAgo.toISOString())
			.not('storage_path', 'is', null)
			.like('storage_path', 'processed/%');

		if (error) {
			Logger.error(MODULE, 'Failed to fetch old videos', error);
			return 0;
		}

		if (!data || data.length === 0) {
			Logger.info(MODULE, 'No old videos to cleanup');
			return 0;
		}

		const filesToDelete = data
			.map((row: { storage_path: string | null }) => row.storage_path)
			.filter((filePath): filePath is string => !!filePath);

		if (filesToDelete.length === 0) {
			return 0;
		}

		// Delete files from storage
		const { error: deleteError } = await supabaseAdmin.storage
			.from('stories')
			.remove(filesToDelete);

		if (deleteError) {
			Logger.error(MODULE, 'Failed to delete old videos', deleteError);
			return 0;
		}

		Logger.info(MODULE, `Cleaned up ${filesToDelete.length} old processed videos`);
		return filesToDelete.length;
	} catch (error) {
		Logger.error(MODULE, 'Error in cleanupOldProcessedVideos', error);
		return 0;
	}
}
