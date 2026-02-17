import { supabaseAdmin } from '@/lib/config/supabase-admin';
import { Logger } from '@/lib/utils/logger';
import { LinkedAccount } from '@/lib/types';
import {
	encryptTokenForStorage,
	decryptTokenFromStorage,
} from '@/lib/utils/token-encryption';

const MODULE = 'db:accounts';

/**
 * Linked Account Data - stores Facebook/Instagram tokens linked to a user
 */

/**
 * Decrypts token fields on a linked account read from the database.
 */
function decryptAccountTokens(account: LinkedAccount): LinkedAccount {
	return {
		...account,
		access_token: decryptTokenFromStorage(account.access_token),
		refresh_token: account.refresh_token
			? decryptTokenFromStorage(account.refresh_token)
			: account.refresh_token,
	};
}

/**
 * Get a user's linked Facebook account
 */
export async function getLinkedFacebookAccount(
	userId: string,
): Promise<LinkedAccount | null> {
	try {
		Logger.debug(MODULE, `Fetching linked account for user ${userId}`);
		const { data, error } = await supabaseAdmin
			.from('linked_accounts')
			.select('id, user_id, provider, provider_account_id, access_token, refresh_token, expires_at, ig_user_id, ig_username, created_at, updated_at')
			.eq('user_id', userId)
			.eq('provider', 'facebook')
			.single();

		if (error) {
			if (error.code === 'PGRST116') {
				Logger.debug(MODULE, `No linked account found for user ${userId}`);
				return null;
			}
			Logger.error(
				MODULE,
				`Supabase getLinkedFacebookAccount Error: ${error.message}`,
				error,
			);
			return null;
		}

		return decryptAccountTokens(data as LinkedAccount);
	} catch (error) {
		Logger.error(
			MODULE,
			`getLinkedFacebookAccount exception for user ${userId}`,
			error,
		);
		return null;
	}
}

/**
 * Save or update a linked Facebook account for a user
 */
export async function saveLinkedFacebookAccount(
	account: LinkedAccount,
): Promise<void> {
	try {
		// Encrypt tokens before storage
		const encryptedAccessToken = encryptTokenForStorage(account.access_token);
		const encryptedRefreshToken = account.refresh_token
			? encryptTokenForStorage(account.refresh_token)
			: account.refresh_token;

		// Check if account already exists
		const existing = await getLinkedFacebookAccount(account.user_id);

		if (existing) {
			Logger.info(
				MODULE,
				`Updating Facebook account for user ${account.user_id}`,
			);
			const { error } = await supabaseAdmin
				.from('linked_accounts')
				.update({
					access_token: encryptedAccessToken,
					refresh_token: encryptedRefreshToken,
					expires_at: account.expires_at,
					ig_user_id: account.ig_user_id,
					ig_username: account.ig_username,
					updated_at: new Date().toISOString(),
				})
				.eq('id', existing.id);

			if (error) {
				Logger.error(
					MODULE,
					`Supabase updateLinkedFacebookAccount Error: ${error.message}`,
					error,
				);
				throw error;
			}
		} else {
			Logger.info(
				MODULE,
				`Saving new Facebook account for user ${account.user_id}`,
			);
			const { error } = await supabaseAdmin.from('linked_accounts').insert({
				user_id: account.user_id,
				provider: 'facebook',
				provider_account_id: account.provider_account_id,
				access_token: encryptedAccessToken,
				refresh_token: encryptedRefreshToken,
				expires_at: account.expires_at,
				ig_user_id: account.ig_user_id,
				ig_username: account.ig_username,
				created_at: new Date().toISOString(),
				updated_at: new Date().toISOString(),
			});

			if (error) {
				Logger.error(
					MODULE,
					`Supabase insertLinkedFacebookAccount Error: ${error.message}`,
					error,
				);
				throw error;
			}
		}
	} catch (error) {
		Logger.error(
			MODULE,
			`saveLinkedFacebookAccount exception for user ${account.user_id}`,
			error,
		);
		throw error;
	}
}

/**
 * Delete a user's linked Facebook account
 */
export async function deleteLinkedFacebookAccount(
	userId: string,
): Promise<void> {
	try {
		Logger.info(MODULE, `Unlinking Facebook account for user ${userId}`);
		const { error } = await supabaseAdmin
			.from('linked_accounts')
			.delete()
			.eq('user_id', userId)
			.eq('provider', 'facebook');

		if (error) {
			Logger.error(
				MODULE,
				`Supabase deleteLinkedFacebookAccount Error: ${error.message}`,
				error,
			);
			throw error;
		}
	} catch (error) {
		Logger.error(
			MODULE,
			`deleteLinkedFacebookAccount exception for user ${userId}`,
			error,
		);
		throw error;
	}
}

/**
 * Get Facebook access token for a user (for Instagram API calls)
 */
export async function getFacebookAccessToken(
	userId: string,
): Promise<string | null> {
	const account = await getLinkedFacebookAccount(userId);
	if (!account) return null;

	// Check if token is expired
	if (account.expires_at && account.expires_at < Date.now()) {
		Logger.warn(MODULE, `Facebook token for user ${userId} has expired`, {
			userId,
			expiresAt: account.expires_at,
		});
		return null;
	}

	return account.access_token;
}

/**
 * Get Instagram Business Account ID for a user
 */
export async function getInstagramUserId(
	userId: string,
): Promise<string | null> {
	const account = await getLinkedFacebookAccount(userId);
	return account?.ig_user_id || null;
}

/**
 * Get all linked Facebook/Instagram accounts with token status information.
 * Used for cron execution context logging.
 */
export async function getAllLinkedAccounts(): Promise<LinkedAccount[]> {
	try {
		Logger.debug(MODULE, 'Fetching all linked accounts');
		const { data, error } = await supabaseAdmin
			.from('linked_accounts')
			.select('id, user_id, provider, provider_account_id, access_token, refresh_token, expires_at, ig_user_id, ig_username, created_at, updated_at')
			.eq('provider', 'facebook');

		if (error) {
			Logger.error(
				MODULE,
				`Supabase getAllLinkedAccounts Error: ${error.message}`,
				error,
			);
			return [];
		}

		return (data || []).map((account) =>
			decryptAccountTokens(account as LinkedAccount),
		);
	} catch (error) {
		Logger.error(MODULE, 'getAllLinkedAccounts exception', error);
		return [];
	}
}

/**
 * Calculate days remaining until token expires.
 * Returns negative value if already expired.
 */
export function calculateDaysRemaining(expiresAt: number | undefined): number {
	if (!expiresAt) return -1;
	const now = Date.now();
	const diff = expiresAt - now;
	return Math.floor(diff / (24 * 60 * 60 * 1000));
}

/**
 * Check if a token is expired.
 */
export function isTokenExpired(expiresAt: number | undefined): boolean {
	if (!expiresAt) return true;
	return expiresAt < Date.now();
}

/**
 * Check if a token is expiring soon (within 7 days).
 */
export function isTokenExpiringSoon(expiresAt: number | undefined): boolean {
	if (!expiresAt) return false;
	const daysRemaining = calculateDaysRemaining(expiresAt);
	return daysRemaining >= 0 && daysRemaining <= 7;
}
