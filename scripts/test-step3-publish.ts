/**
 * Step 3 — upload a local MP4 to the connected TikTok account's inbox.
 *
 * Calls publishVideoToTikTok against /v2/post/publish/inbox/video/init/.
 * Prints the publish_id, then polls /post/publish/status/fetch/ until
 * PUBLISH_COMPLETE / FAILED / timeout. The user must finish the post
 * inside the TikTok app (this endpoint creates a draft, not a live post).
 *
 * Usage:  tsx scripts/test-step3-publish.ts [userId] <localMp4Path>
 *
 * Pass/fail:
 *   - Exit 0 if status is 'published' (= TT accepted the upload to inbox).
 *   - Exit 1 if init fails, upload fails, or polling returns 'failed'.
 */
import 'dotenv/config';
import { config as loadEnv } from 'dotenv';
loadEnv({ path: '.env.local', override: true });
loadEnv({ path: '.env.development.local', override: true });

import { promises as fs } from 'fs';
import { publishVideoToTikTok } from '@/lib/tiktok/publish';

const DEFAULT_USER = '02075c7e-537c-4d81-a0fd-09a557aef283';

async function main() {
	const args = process.argv.slice(2);
	const userId = args.length === 2 ? args[0] : DEFAULT_USER;
	const localPath = args.length === 2 ? args[1] : args[0];

	if (!localPath) {
		console.error('Missing path. Usage: tsx scripts/test-step3-publish.ts [userId] <localMp4Path>');
		process.exit(1);
	}

	console.log(`\n=== Step 3 · upload to TikTok inbox for ${userId} ===\n`);
	console.log(`local path:   ${localPath}`);

	const stat = await fs.stat(localPath).catch(() => null);
	if (!stat || stat.size === 0) {
		console.error(`❌ File missing or empty: ${localPath}`);
		process.exit(1);
	}
	console.log(`size:         ${Math.round(stat.size / 1024 / 1024)}MB`);

	const t0 = Date.now();
	try {
		const result = await publishVideoToTikTok(localPath, userId);
		const elapsed = ((Date.now() - t0) / 1000).toFixed(1);

		console.log(`\npublishId:    ${result.publishId}`);
		console.log(`status:       ${result.status}`);
		if (result.postId) console.log(`postId:       ${result.postId}`);
		if (result.error) console.log(`error:        ${result.error}`);
		console.log(`elapsed:      ${elapsed}s`);

		const ok = result.status === 'published';
		console.log(`\n${ok ? '✅ PASS — check the TikTok app inbox to finalize the draft' : '❌ FAIL'}`);
		process.exit(ok ? 0 : 1);
	} catch (err) {
		const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
		console.error(`\nThrew after ${elapsed}s:`, err instanceof Error ? err.message : err);
		console.log(`\n❌ FAIL`);
		process.exit(1);
	}
}

main().catch((err) => {
	console.error('Fatal:', err);
	process.exit(1);
});
