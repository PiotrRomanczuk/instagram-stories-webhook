/**
 * Verify a TikTok draft / publish is in the expected state by hitting
 * /v2/post/publish/status/fetch/ directly.
 *
 * Usage:
 *   tsx scripts/test-tiktok-status.ts <publishId> [userId]
 *   tsx scripts/test-tiktok-status.ts --latest [userId]   # uses the most
 *                                                          # recent composed_videos row
 *
 * Possible status values:
 *   PROCESSING_UPLOAD    TT is still ingesting the chunks
 *   SEND_TO_USER_INBOX   Draft is in the user's TT inbox (terminal success
 *                        for upload-mode — user finalizes inside the app)
 *   PUBLISH_COMPLETE     Direct-post finished and is live on profile
 *   FAILED               Upload or processing failed
 *
 * TikTok retains publish_id status for ~24h. Older drafts return an
 * "expired" or "not found" error.
 */
import 'dotenv/config';
import { config as loadEnv } from 'dotenv';
loadEnv({ path: '.env.local', override: true });
loadEnv({ path: '.env.development.local', override: true });

import { getTikTokAccessToken } from '@/lib/tiktok/auth';
import { supabaseAdmin } from '@/lib/config/supabase-admin';

const DEFAULT_USER = '02075c7e-537c-4d81-a0fd-09a557aef283';
const TIKTOK_API_BASE = 'https://open.tiktokapis.com/v2';

async function resolveLatestPublishId(userId: string): Promise<string | null> {
	const { data } = await supabaseAdmin
		.from('composed_videos')
		.select('id, tiktok_publish_id, tiktok_publish_status, created_at, title')
		.eq('user_id', userId)
		.not('tiktok_publish_id', 'is', null)
		.order('created_at', { ascending: false })
		.limit(1);
	if (!data?.length) return null;
	console.log(`Latest composed video:`);
	console.log(`  id:           ${data[0].id}`);
	console.log(`  title:        ${data[0].title}`);
	console.log(`  publishId:    ${data[0].tiktok_publish_id}`);
	console.log(`  db status:    ${data[0].tiktok_publish_status}`);
	console.log(`  created_at:   ${data[0].created_at}\n`);
	return data[0].tiktok_publish_id;
}

async function main() {
	const args = process.argv.slice(2);
	const useLatest = args.includes('--latest');
	const filtered = args.filter((a) => a !== '--latest');
	const userId = useLatest ? (filtered[0] ?? DEFAULT_USER) : (filtered[1] ?? DEFAULT_USER);
	let publishId = useLatest ? null : filtered[0];

	console.log(`\n=== Verify TikTok draft status for ${userId} ===\n`);

	if (!publishId) {
		publishId = await resolveLatestPublishId(userId);
		if (!publishId) {
			console.error('❌ No composed_videos rows with tiktok_publish_id for this user.');
			process.exit(1);
		}
	}

	const accessToken = await getTikTokAccessToken(userId);
	if (!accessToken) {
		console.error('❌ No valid TikTok access token. Re-link the account.');
		process.exit(1);
	}

	const t0 = Date.now();
	const response = await fetch(`${TIKTOK_API_BASE}/post/publish/status/fetch/`, {
		method: 'POST',
		headers: {
			'Authorization': `Bearer ${accessToken}`,
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({ publish_id: publishId }),
	});

	const elapsed = ((Date.now() - t0) / 1000).toFixed(2);
	const body = await response.json().catch(() => null);

	console.log(`HTTP ${response.status} (${elapsed}s)`);
	console.log(JSON.stringify(body, null, 2));

	const status = body?.data?.status as string | undefined;
	const successStatuses = new Set(['SEND_TO_USER_INBOX', 'PUBLISH_COMPLETE']);
	const ok = status !== undefined && successStatuses.has(status);

	console.log(
		`\n${ok ? '✅ PASS' : status === 'FAILED' ? '❌ FAIL' : '⏳ NOT YET'} — status: ${status ?? '<missing>'}`,
	);
	if (status === 'SEND_TO_USER_INBOX') {
		console.log('   Open the TikTok app on the connected account → Inbox → finalize the draft.');
	}
	process.exit(ok ? 0 : 1);
}

main().catch((err) => {
	console.error('Fatal:', err);
	process.exit(1);
});
