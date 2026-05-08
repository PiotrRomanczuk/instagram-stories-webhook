/**
 * Step 2 — compose a vertical 1080x1920 MP4 from N archived stories.
 *
 * Picks the top N stories by ig_timestamp from story_archive (download_status
 * = 'completed'), runs composeVideoFromStories with audioTrack=null (keeps
 * each segment's IG-original audio — matches the TT-inbox flow), and prints
 * the resulting file path + size + duration. Does NOT touch composed_videos
 * or TikTok.
 *
 * Usage:  tsx scripts/test-step2-compose.ts [userId] [count]
 *
 * Pass/fail:
 *   - Exit 0 if the output MP4 exists and is non-empty.
 *   - Exit 1 if FFmpeg fails or the file is missing/empty.
 */
import 'dotenv/config';
import { config as loadEnv } from 'dotenv';
loadEnv({ path: '.env.local', override: true });
loadEnv({ path: '.env.development.local', override: true });

import { promises as fs } from 'fs';
import { randomUUID } from 'crypto';
import { supabaseAdmin } from '@/lib/config/supabase-admin';
import { composeVideoFromStories } from '@/lib/media/compose-video';
import { mapStoryArchiveRow } from '@/lib/types/story-archive';
import type { StoryArchiveRow } from '@/lib/types/story-archive';

const DEFAULT_USER = '02075c7e-537c-4d81-a0fd-09a557aef283';

async function main() {
	const userId = process.argv[2] ?? DEFAULT_USER;
	const count = Number(process.argv[3] ?? '7');

	console.log(`\n=== Step 2 · compose video from ${count} archived stories for ${userId} ===\n`);

	const { data: rows, error } = await supabaseAdmin
		.from('story_archive')
		.select('*')
		.eq('user_id', userId)
		.eq('download_status', 'completed')
		.order('ig_timestamp', { ascending: false })
		.limit(count);

	if (error) {
		console.error('DB error:', error.message);
		process.exit(1);
	}
	if (!rows || rows.length < 3) {
		console.error(`Need at least 3 completed stories, have ${rows?.length ?? 0}. Run step 1 first.`);
		process.exit(1);
	}

	const stories = rows.map((r) => mapStoryArchiveRow(r as StoryArchiveRow));
	console.log(`Using ${stories.length} stories:`);
	for (const s of stories) {
		console.log(`  ${s.mediaType.padEnd(5)}  ${s.igMediaId}  ${s.localPath ?? '<missing path>'}`);
	}

	const outputId = `test-${randomUUID()}`;
	const t0 = Date.now();
	const result = await composeVideoFromStories(stories, null, undefined, outputId);
	const elapsed = ((Date.now() - t0) / 1000).toFixed(1);

	const stat = await fs.stat(result.outputPath).catch(() => null);
	const ok = !!stat && stat.size > 0;

	console.log(`\noutput path:  ${result.outputPath}`);
	console.log(`size:         ${stat ? `${Math.round(stat.size / 1024 / 1024)}MB` : '<missing>'}`);
	console.log(`duration:     ${result.durationSeconds.toFixed(1)}s`);
	console.log(`segments:     ${result.segmentCount}`);
	console.log(`elapsed:      ${elapsed}s`);

	console.log(`\n${ok ? '✅ PASS' : '❌ FAIL'}`);
	if (ok) {
		console.log(`\nNext: tsx scripts/test-step3-publish.ts ${userId} "${result.outputPath}"`);
	}
	process.exit(ok ? 0 : 1);
}

main().catch((err) => {
	console.error('Fatal:', err);
	process.exit(1);
});
