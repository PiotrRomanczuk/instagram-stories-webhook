/**
 * Step 1 — download all active IG stories to local disk + DB.
 *
 * Calls fetchAndArchiveStories with limit=200 (matches what the compose
 * endpoint does on-demand). Then prints per-row status from story_archive
 * so we can see exactly which stories landed and which didn't.
 *
 * Usage:  tsx scripts/test-step1-archive.ts [userId] [limit]
 *
 * Pass/fail criteria:
 *   - Exit 0 if newlyArchived + alreadyArchived === totalFetched (no failures).
 *   - Exit 1 otherwise.
 */
import 'dotenv/config';
import { config as loadEnv } from 'dotenv';
loadEnv({ path: '.env.local', override: true });
loadEnv({ path: '.env.development.local', override: true });

import { fetchAndArchiveStories } from '@/lib/instagram/story-archive';
import { supabaseAdmin } from '@/lib/config/supabase-admin';

const DEFAULT_USER = '02075c7e-537c-4d81-a0fd-09a557aef283';

async function main() {
	const userId = process.argv[2] ?? DEFAULT_USER;
	const limit = Number(process.argv[3] ?? '200');

	console.log(`\n=== Step 1 · archive IG stories for ${userId} (limit ${limit}) ===\n`);

	const t0 = Date.now();
	const result = await fetchAndArchiveStories(userId, limit);
	const elapsed = ((Date.now() - t0) / 1000).toFixed(1);

	console.log(`fetched:          ${result.totalFetched}`);
	console.log(`newly archived:   ${result.newlyArchived}`);
	console.log(`already archived: ${result.alreadyArchived}`);
	console.log(`failed:           ${result.failed}`);
	console.log(`elapsed:          ${elapsed}s`);
	if (result.errors.length) {
		console.log(`errors:`);
		for (const e of result.errors.slice(0, 10)) console.log(`  - ${e}`);
	}

	// Sample latest 5 rows so we can sanity-check download_status + file paths.
	const { data: rows } = await supabaseAdmin
		.from('story_archive')
		.select('id, ig_media_id, media_type, download_status, file_size_bytes, local_path, ig_timestamp')
		.eq('user_id', userId)
		.order('ig_timestamp', { ascending: false })
		.limit(5);

	console.log(`\nLatest 5 rows in story_archive:`);
	for (const r of rows ?? []) {
		const size = r.file_size_bytes ? `${Math.round(r.file_size_bytes / 1024)}KB` : '—';
		console.log(`  ${r.download_status.padEnd(10)} ${r.media_type.padEnd(5)} ${size.padStart(7)}  ${r.ig_media_id}  ${r.local_path ?? ''}`);
	}

	const ok = result.failed === 0;
	console.log(`\n${ok ? '✅ PASS' : '❌ FAIL'}`);
	process.exit(ok ? 0 : 1);
}

main().catch((err) => {
	console.error('Fatal:', err);
	process.exit(1);
});
