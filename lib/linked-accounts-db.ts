import { supabaseAdmin } from './supabase-admin';

/**
 * Linked Account Data - stores Facebook/Instagram tokens linked to a user
 */
export interface LinkedAccount {
    id?: string;
    user_id: string;           // NextAuth user ID (from Google login)
    provider: string;          // 'facebook'
    provider_account_id: string; // Facebook user ID
    access_token: string;
    refresh_token?: string;
    expires_at?: number;       // Unix timestamp in milliseconds
    ig_user_id?: string;       // Instagram Business Account ID
    created_at?: string;
    updated_at?: string;
}

/**
 * Get a user's linked Facebook account
 */
export async function getLinkedFacebookAccount(userId: string): Promise<LinkedAccount | null> {
    try {
        const { data, error } = await supabaseAdmin
            .from('linked_accounts')
            .select('*')
            .eq('user_id', userId)
            .eq('provider', 'facebook')
            .single();

        if (error) {
            if (error.code === 'PGRST116') return null; // Not found
            console.error('Supabase getLinkedFacebookAccount Error:', error);
            return null;
        }

        return data as LinkedAccount;
    } catch (error) {
        console.error('getLinkedFacebookAccount exception:', error);
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
            // Update existing
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
                console.error('Supabase updateLinkedFacebookAccount Error:', error);
                throw error;
            }
        } else {
            // Insert new
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
                console.error('Supabase insertLinkedFacebookAccount Error:', error);
                throw error;
            }
        }
    } catch (error) {
        console.error('saveLinkedFacebookAccount exception:', error);
        throw error;
    }
}

/**
 * Delete a user's linked Facebook account
 */
export async function deleteLinkedFacebookAccount(userId: string): Promise<void> {
    try {
        const { error } = await supabaseAdmin
            .from('linked_accounts')
            .delete()
            .eq('user_id', userId)
            .eq('provider', 'facebook');

        if (error) {
            console.error('Supabase deleteLinkedFacebookAccount Error:', error);
            throw error;
        }
    } catch (error) {
        console.error('deleteLinkedFacebookAccount exception:', error);
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
        console.warn(`Facebook token for user ${userId} has expired`);
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
