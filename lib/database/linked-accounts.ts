import { supabaseAdmin } from '@/lib/config/supabase-admin';
import { Logger } from '@/lib/utils/logger';
import { LinkedAccount } from '@/lib/types';

const MODULE = 'db:accounts';

/**
 * Linked Account Data - stores Facebook/Instagram tokens linked to a user
 */

/**
 * Get a user's linked Facebook account
 */
export async function getLinkedFacebookAccount(userId: string): Promise<LinkedAccount | null> {
    try {
        Logger.debug(MODULE, `🔍 Fetching linked account for user ${userId}`);
        const { data, error } = await supabaseAdmin
            .from('linked_accounts')
            .select('*')
            .eq('user_id', userId)
            .eq('provider', 'facebook')
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                Logger.debug(MODULE, `ℹ️ No linked account found for user ${userId}`);
                return null;
            }
            Logger.error(MODULE, `❌ Supabase getLinkedFacebookAccount Error: ${error.message}`, error);
            return null;
        }

        return data as LinkedAccount;
    } catch (error) {
        Logger.error(MODULE, `❌ getLinkedFacebookAccount exception for user ${userId}`, error);
        return null;
    }
}

/**
 * Save or update a linked Facebook account for a user
 */
export async function saveLinkedFacebookAccount(account: LinkedAccount): Promise<void> {
    try {
        // Check if account already exists
        const existing = await getLinkedFacebookAccount(account.user_id);

        if (existing) {
            Logger.info(MODULE, `🔄 Updating Facebook account for user ${account.user_id}`);
            const { error } = await supabaseAdmin
                .from('linked_accounts')
                .update({
                    access_token: account.access_token,
                    refresh_token: account.refresh_token,
                    expires_at: account.expires_at,
                    ig_user_id: account.ig_user_id,
                    updated_at: new Date().toISOString()
                })
                .eq('id', existing.id);

            if (error) {
                Logger.error(MODULE, `❌ Supabase updateLinkedFacebookAccount Error: ${error.message}`, error);
                throw error;
            }
        } else {
            Logger.info(MODULE, `💾 Saving new Facebook account for user ${account.user_id}`);
            const { error } = await supabaseAdmin
                .from('linked_accounts')
                .insert({
                    user_id: account.user_id,
                    provider: 'facebook',
                    provider_account_id: account.provider_account_id,
                    access_token: account.access_token,
                    refresh_token: account.refresh_token,
                    expires_at: account.expires_at,
                    ig_user_id: account.ig_user_id,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                });

            if (error) {
                Logger.error(MODULE, `❌ Supabase insertLinkedFacebookAccount Error: ${error.message}`, error);
                throw error;
            }
        }
    } catch (error) {
        Logger.error(MODULE, `❌ saveLinkedFacebookAccount exception for user ${account.user_id}`, error);
        throw error;
    }
}

/**
 * Delete a user's linked Facebook account
 */
export async function deleteLinkedFacebookAccount(userId: string): Promise<void> {
    try {
        Logger.info(MODULE, `🗑️ Unlinking Facebook account for user ${userId}`);
        const { error } = await supabaseAdmin
            .from('linked_accounts')
            .delete()
            .eq('user_id', userId)
            .eq('provider', 'facebook');

        if (error) {
            Logger.error(MODULE, `❌ Supabase deleteLinkedFacebookAccount Error: ${error.message}`, error);
            throw error;
        }
    } catch (error) {
        Logger.error(MODULE, `❌ deleteLinkedFacebookAccount exception for user ${userId}`, error);
        throw error;
    }
}

/**
 * Get Facebook access token for a user (for Instagram API calls)
 */
export async function getFacebookAccessToken(userId: string): Promise<string | null> {
    const account = await getLinkedFacebookAccount(userId);
    if (!account) return null;

    // Check if token is expired
    if (account.expires_at && account.expires_at < Date.now()) {
        Logger.warn(MODULE, `⚠️ Facebook token for user ${userId} has expired`, { userId, expiresAt: account.expires_at });
        return null;
    }

    return account.access_token;
}

/**
 * Get Instagram Business Account ID for a user
 */
export async function getInstagramUserId(userId: string): Promise<string | null> {
    const account = await getLinkedFacebookAccount(userId);
    return account?.ig_user_id || null;
}
