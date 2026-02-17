/**
 * Backfill missing video thumbnails
 * Run with: npx tsx scripts/backfill-video-thumbnails.ts
 */

import { supabaseAdmin } from '../lib/config/supabase-admin';
import { extractVideoThumbnail } from '../lib/media/video-processor';
import { Logger } from '../lib/utils/logger';

const MODULE = 'backfill-thumbnails';

async function main() {
	Logger.info(MODULE, '🔍 Finding videos without thumbnails...');

	const { data: videos, error } = await supabaseAdmin
		.from('content_items')
		.select('id, media_url, thumbnail_url, media_type')
		.eq('media_type', 'VIDEO')
		.is('thumbnail_url', null)
		.limit(20);

	if (error) {
		Logger.error(MODULE, 'Failed to fetch videos', error);
		return;
	}

	if (!videos || videos.length === 0) {
		Logger.info(MODULE, '✅ No videos need thumbnail generation');
		return;
	}

	Logger.info(MODULE, `📹 Found ${videos.length} videos without thumbnails`);

	let processed = 0;
	let failed = 0;

	for (const video of videos) {
		try {
			Logger.info(MODULE, `Processing ${video.id}...`);

			const thumbnailUrl = await extractVideoThumbnail(video.media_url, video.id);

			if (thumbnailUrl) {
				// Update the content item with the thumbnail URL
				const { error: updateError } = await supabaseAdmin
					.from('content_items')
					.update({ thumbnail_url: thumbnailUrl })
					.eq('id', video.id);

				if (updateError) {
					Logger.error(MODULE, `Failed to update ${video.id}`, updateError);
					failed++;
				} else {
					Logger.info(MODULE, `✅ ${video.id} - Thumbnail generated: ${thumbnailUrl}`);
					processed++;
				}
			} else {
				Logger.warn(MODULE, `❌ ${video.id} - Failed to generate thumbnail`);
				failed++;
			}
		} catch (error) {
			Logger.error(MODULE, `Error processing ${video.id}`, error);
			failed++;
		}
	}

	Logger.info(MODULE, `\n📊 Summary:`);
	Logger.info(MODULE, `  - Processed: ${processed}`);
	Logger.info(MODULE, `  - Failed: ${failed}`);
	Logger.info(MODULE, `  - Total: ${videos.length}`);
}

main();
