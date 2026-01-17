import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { supabase } from '@/lib/supabase';
import { saveLinkedFacebookAccount, LinkedAccount } from '@/lib/linked-accounts-db';

/**
 * 🔄 Automated Token Refresh (All Users)
 * This endpoint exchanges the current tokens for all users for new long-lived tokens.
 * Should be called periodically via cron job.
 */
export async function GET(request: NextRequest) {
    try {
        // 🔒 Security Check
        const authHeader = request.headers.get('authorization');
        const secret = process.env.CRON_SECRET;

        if (secret && authHeader !== `Bearer ${secret}`) {
            console.error('🔒 Unauthorized token refresh attempt');
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const appId = process.env.AUTH_FACEBOOK_ID || process.env.NEXT_PUBLIC_FB_APP_ID;
        const appSecret = process.env.AUTH_FACEBOOK_SECRET || process.env.FB_APP_SECRET;

        if (!appId || !appSecret) {
            console.error('🚨 Missing Meta App credentials for token extension');
            return NextResponse.json({ error: 'Missing app credentials' }, { status: 500 });
        }

        // 1. Fetch all linked accounts from Supabase
        const { data: accounts, error: fetchError } = await supabase
            .from('linked_accounts')
            .select('*')
            .eq('provider', 'facebook');

        if (fetchError) {
            console.error('❌ Failed to fetch linked accounts:', fetchError.message);
            return NextResponse.json({ error: 'Database fetch failed' }, { status: 500 });
        }

        if (!accounts || accounts.length === 0) {
            return NextResponse.json({ message: 'No linked accounts found to refresh', refreshed: 0 });
        }

        console.log(`🔄 Attempting to refresh tokens for ${accounts.length} account(s)...`);

        const results = [];

        for (const account of accounts) {
            try {
                // Exchange for long-lived token
                const response = await axios.get('https://graph.facebook.com/v21.0/oauth/access_token', {
                    params: {
                        grant_type: 'fb_exchange_token',
                        client_id: appId,
                        client_secret: appSecret,
                        fb_exchange_token: account.access_token
                    }
                });

                const newAccessToken = response.data.access_token;
                const expiresIn = response.data.expires_in; // Seconds

                await saveLinkedFacebookAccount({
                    ...(account as unknown as LinkedAccount),
                    access_token: newAccessToken,
                    expires_at: expiresIn ? Date.now() + (expiresIn * 1000) : undefined,
                    updated_at: new Date().toISOString()
                });

                results.push({ user_id: account.user_id, success: true });
            } catch (err: unknown) {
                const errorMessage = axios.isAxiosError(err) ? (err.response?.data || err.message) : (err instanceof Error ? err.message : String(err));
                console.error(`❌ Failed to refresh token for user ${account.user_id}:`, errorMessage);
                results.push({ user_id: account.user_id, success: false, error: errorMessage });
            }
        }

        const successCount = results.filter(r => r.success).length;

        return NextResponse.json({
            success: true,
            message: `Refreshed ${successCount} out of ${accounts.length} tokens`,
            results
        });

    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('❌ Refresh-token API error:', errorMessage);
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}
