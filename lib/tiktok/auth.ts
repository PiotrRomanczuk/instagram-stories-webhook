import { supabaseAdmin } from '@/lib/config/supabase-admin';
import { Logger } from '@/lib/utils/logger';
import { LinkedAccount } from '@/lib/types';
import {
    encryptTokenForStorage,
    decryptTokenFromStorage,
} from '@/lib/utils/token-encryption';
import { TikTokTokenRefreshResponse } from '@/lib/types/tiktok';

const MODULE = 'tiktok:auth';

interface SaveTikTokInput {
    userId: string;
    openId: string;
    accessToken: string;
    refreshToken: string;
    expiresAt: number;
    refreshExpiresAt?: number;
}

/**
 * Save or update a TikTok linked account.
 */
export async function saveTikTokAccount(input: SaveTikTokInput): Promise<void> {
    const encryptedAccess = encryptTokenForStorage(input.accessToken);
    const encryptedRefresh = encryptTokenForStorage(input.refreshToken);

    // Check if account already exists
    const existing = await getLinkedTikTokAccount(input.userId);

    if (existing) {
        Logger.info(MODULE, `Updating TikTok account for user ${input.userId}`);
        const { error } = await supabaseAdmin
            .from('linked_accounts')
            .update({
                access_token: encryptedAccess,
                refresh_token: encryptedRefresh,
                expires_at: input.expiresAt,
                refresh_expires_at: input.refreshExpiresAt ?? null,
                platform_user_id: input.openId,
                updated_at: new Date().toISOString(),
            })
            .eq('id', existing.id);

        if (error) {
            Logger.error(MODULE, `Update error: ${error.message}`, error);
            throw error;
        }
    } else {
        Logger.info(MODULE, `Saving new TikTok account for user ${input.userId}`);
        const { error } = await supabaseAdmin
            .from('linked_accounts')
            .insert({
                user_id: input.userId,
                provider: 'tiktok',
                provider_account_id: input.openId,
                access_token: encryptedAccess,
                refresh_token: encryptedRefresh,
                expires_at: input.expiresAt,
                refresh_expires_at: input.refreshExpiresAt ?? null,
                platform_user_id: input.openId,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            });

        if (error) {
            Logger.error(MODULE, `Insert error: ${error.message}`, error);
            throw error;
        }
    }
}

/**
 * Get a user's linked TikTok account (decrypted tokens).
 */
export async function getLinkedTikTokAccount(userId: string): Promise<LinkedAccount | null> {
    const { data, error } = await supabaseAdmin
        .from('linked_accounts')
        .select('*')
        .eq('user_id', userId)
        .eq('provider', 'tiktok')
        .single();

    if (error) {
        if (error.code === 'PGRST116') return null; // Not found
        Logger.error(MODULE, `getLinkedTikTokAccount error: ${error.message}`, error);
        return null;
    }

    const account = data as LinkedAccount;
    return {
        ...account,
        access_token: decryptTokenFromStorage(account.access_token),
        refresh_token: account.refresh_token
            ? decryptTokenFromStorage(account.refresh_token)
            : undefined,
    };
}

/**
 * Get TikTok access token for a user, refreshing if expired.
 */
export async function getTikTokAccessToken(userId: string): Promise<string | null> {
    const account = await getLinkedTikTokAccount(userId);
    if (!account) return null;

    // Check if token is expired
    if (account.expires_at && account.expires_at < Date.now()) {
        Logger.info(MODULE, `TikTok token expired for user ${userId}, refreshing`);

        if (!account.refresh_token) {
            Logger.error(MODULE, `No refresh token available for user ${userId}`);
            return null;
        }

        const refreshed = await refreshTikTokToken(userId, account.refresh_token);
        return refreshed ? refreshed.access_token : null;
    }

    return account.access_token;
}

/**
 * Refresh a TikTok access token using the refresh token.
 * TikTok access tokens expire in 24h, refresh tokens last 365 days.
 */
export async function refreshTikTokToken(
    userId: string,
    refreshToken: string,
): Promise<TikTokTokenRefreshResponse | null> {
    const clientKey = process.env.TIKTOK_CLIENT_KEY;
    const clientSecret = process.env.TIKTOK_CLIENT_SECRET;

    if (!clientKey || !clientSecret) {
        Logger.error(MODULE, 'TikTok client credentials not configured');
        return null;
    }

    try {
        const response = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                client_key: clientKey,
                client_secret: clientSecret,
                grant_type: 'refresh_token',
                refresh_token: refreshToken,
            }).toString(),
        });

        const data = (await response.json()) as TikTokTokenRefreshResponse;

        if (!data.access_token) {
            Logger.error(MODULE, `TikTok token refresh failed for user ${userId}`);
            return null;
        }

        // Update stored tokens
        await saveTikTokAccount({
            userId,
            openId: data.open_id,
            accessToken: data.access_token,
            refreshToken: data.refresh_token,
            expiresAt: Date.now() + data.expires_in * 1000,
            refreshExpiresAt: Date.now() + data.refresh_expires_in * 1000,
        });

        Logger.info(MODULE, `TikTok token refreshed for user ${userId}`);
        return data;
    } catch (err) {
        Logger.error(MODULE, `TikTok token refresh exception: ${err instanceof Error ? err.message : 'Unknown'}`, Logger.safeError(err));
        return null;
    }
}

/**
 * Get all users with linked TikTok accounts.
 */
export async function getAllTikTokAccounts(): Promise<LinkedAccount[]> {
    const { data, error } = await supabaseAdmin
        .from('linked_accounts')
        .select('*')
        .eq('provider', 'tiktok');

    if (error) {
        Logger.error(MODULE, `getAllTikTokAccounts error: ${error.message}`, error);
        return [];
    }

    return (data || []).map((account) => ({
        ...account,
        access_token: decryptTokenFromStorage(account.access_token),
        refresh_token: account.refresh_token
            ? decryptTokenFromStorage(account.refresh_token)
            : undefined,
    })) as LinkedAccount[];
}
