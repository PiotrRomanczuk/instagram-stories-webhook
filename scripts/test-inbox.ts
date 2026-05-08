/**
 * Diagnostic probe for the Instagram Messaging API integration.
 *
 * Loads the linked FB/IG account for a user, prints the actual scopes
 * granted on the stored token, then hits the conversations endpoint
 * with verbose error output so we can see exactly what Meta returns.
 *
 * Usage: tsx scripts/test-inbox.ts [userId]
 */
import 'dotenv/config';
import { config as loadEnv } from 'dotenv';
loadEnv({ path: '.env.local', override: true });
loadEnv({ path: '.env.development.local', override: true });

import axios from 'axios';
import {
	getFacebookAccessToken,
	getInstagramUserId,
	getLinkedFacebookAccount,
} from '@/lib/database/linked-accounts';

const GRAPH = 'https://graph.facebook.com/v24.0';

async function main() {
	const userId = process.argv[2] ?? '02075c7e-537c-4d81-a0fd-09a557aef283';

	console.log(`\n=== Probe for user ${userId} ===\n`);

	const account = await getLinkedFacebookAccount(userId);
	if (!account) {
		console.error('❌ No linked_accounts row for this user.');
		process.exit(1);
	}

	console.log('Linked account:');
	console.log('  provider_account_id:', account.provider_account_id);
	console.log('  ig_user_id:         ', account.ig_user_id);
	console.log('  ig_username:        ', account.ig_username);
	console.log('  expires_at:         ', account.expires_at);

	const token = await getFacebookAccessToken(userId);
	const igUserId = await getInstagramUserId(userId);

	if (!token || !igUserId) {
		console.error('❌ Missing token or IG user ID.');
		process.exit(1);
	}

	// 1. debug_token — what scopes does the stored token ACTUALLY have?
	const appId = process.env.AUTH_FACEBOOK_ID || process.env.NEXT_PUBLIC_FB_APP_ID;
	const appSecret = process.env.AUTH_FACEBOOK_SECRET || process.env.FB_APP_SECRET;

	if (appId && appSecret) {
		console.log('\n--- /debug_token (token scopes) ---');
		try {
			const dt = await axios.get(`${GRAPH}/debug_token`, {
				params: {
					input_token: token,
					access_token: `${appId}|${appSecret}`,
				},
			});
			const data = dt.data.data;
			console.log('  is_valid:    ', data.is_valid);
			console.log('  type:        ', data.type);
			console.log('  user_id:     ', data.user_id);
			console.log('  app_id:      ', data.app_id);
			console.log('  expires_at:  ', data.expires_at, data.expires_at ? `(${new Date(data.expires_at * 1000).toISOString()})` : '');
			console.log('  scopes:      ', data.scopes);
			console.log('  has instagram_manage_messages?', data.scopes?.includes('instagram_manage_messages'));
			if (data.granular_scopes) {
				console.log('  granular_scopes:');
				for (const g of data.granular_scopes) {
					console.log(`    ${g.scope}: target_ids=${JSON.stringify(g.target_ids)}`);
				}
			}
		} catch (e) {
			console.error('debug_token failed:', axios.isAxiosError(e) ? e.response?.data : e);
		}
	}

	// 2. /me/accounts — what Pages does the user manage?
	console.log('\n--- /me/accounts (Pages) ---');
	try {
		const pages = await axios.get(`${GRAPH}/me/accounts`, {
			params: {
				access_token: token,
				fields: 'id,name,access_token,instagram_business_account{id,username}',
			},
		});
		console.log('  pages:', JSON.stringify(pages.data.data, null, 2));
	} catch (e) {
		console.error('/me/accounts failed:', axios.isAxiosError(e) ? e.response?.data : e);
	}

	// 3. /{ig-user-id}/conversations — using the user token (current code path)
	console.log(`\n--- /${igUserId}/conversations (user token, platform=instagram) ---`);
	try {
		const r = await axios.get(`${GRAPH}/${igUserId}/conversations`, {
			params: {
				access_token: token,
				platform: 'instagram',
				fields: 'id,updated_time,participants',
				limit: '25',
			},
		});
		console.log('  raw:', JSON.stringify(r.data, null, 2));
	} catch (e) {
		console.error('  ERROR:', axios.isAxiosError(e) ? JSON.stringify(e.response?.data, null, 2) : e);
	}

	// 4. Also try without platform=instagram (some setups need this)
	console.log(`\n--- /${igUserId}/conversations (no platform param) ---`);
	try {
		const r = await axios.get(`${GRAPH}/${igUserId}/conversations`, {
			params: {
				access_token: token,
				fields: 'id,updated_time,participants',
				limit: '25',
			},
		});
		console.log('  raw:', JSON.stringify(r.data, null, 2));
	} catch (e) {
		console.error('  ERROR:', axios.isAxiosError(e) ? JSON.stringify(e.response?.data, null, 2) : e);
	}
}

main().catch((err) => {
	console.error('Fatal:', err);
	process.exit(1);
});
