/**
 * One-off probe: load the linked FB/IG account for a user, decrypt the
 * token, and fetch the last 24h of stories from the Graph API.
 *
 * Usage: tsx scripts/test-fetch-stories.ts <userId>
 */
import 'dotenv/config';
import { config as loadEnv } from 'dotenv';
loadEnv({ path: '.env.local', override: true });
loadEnv({ path: '.env.development.local', override: true });

import { getRecentStories } from '@/lib/instagram/media';

async function main() {
	const userId = process.argv[2] ?? '02075c7e-537c-4d81-a0fd-09a557aef283';
	const limit = Number(process.argv[3] ?? '200');

	const { stories, count } = await getRecentStories(userId, limit);
	console.log(`Found ${count} stories (limit ${limit}):`);
	for (const s of stories) {
		console.log(
			`  - ${s.timestamp}  ${s.media_type.padEnd(5)}  id=${s.id}  ${s.permalink ?? ''}`,
		);
	}
}

main().catch((err) => {
	console.error('Fatal:', err);
	process.exit(1);
});
