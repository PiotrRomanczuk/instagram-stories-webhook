import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { getTokens, saveTokens } from '@/lib/db';

/**
 * 🔄 Automated Token Refresh
 * This endpoint exchanges the current token for a new long-lived token (60 days).
 * Should be called periodically (e.g., once a week) via cron job.
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

        const appId = process.env.NEXT_PUBLIC_FB_APP_ID || process.env.AUTH_FACEBOOK_ID;
        const appSecret = process.env.FB_APP_SECRET || process.env.AUTH_FACEBOOK_SECRET;

        if (!appId || !appSecret) {
            console.error('🚨 Missing Meta App credentials for token extension');
            return NextResponse.json({ error: 'Missing app credentials' }, { status: 500 });
        }

        const tokens = await getTokens();
        if (!tokens?.access_token) {
            console.warn('⚠️ No token found in database to extend');
            return NextResponse.json({ error: 'No token found' }, { status: 404 });
        }

        console.log('🔄 Attempting to extend Meta access token...');

        // Exchange for long-lived token
        const response = await axios.get('https://graph.facebook.com/v18.0/oauth/access_token', {
            params: {
                grant_type: 'fb_exchange_token',
                client_id: appId,
                client_secret: appSecret,
                fb_exchange_token: tokens.access_token
            }
        });

        const newAccessToken = response.data.access_token;
        const expiresIn = response.data.expires_in; // Seconds

        await saveTokens({
            ...tokens,
            access_token: newAccessToken,
            expires_at: expiresIn ? Date.now() + (expiresIn * 1000) : undefined
        });

        console.log(`✅ Token extended successfully. Expires in approx ${expiresIn ? Math.floor(expiresIn / 86400) : '??'} days.`);

        return NextResponse.json({
            success: true,
            message: 'Token extended successfully',
            expires_in_days: expiresIn ? Math.floor(expiresIn / 86400) : 'unknown'
        });

    } catch (error: unknown) {
        const errorData = axios.isAxiosError(error) ? (error.response?.data || error.message) : String(error);
        console.error('❌ Token extension failed:', errorData);
        return NextResponse.json({
            error: 'Failed to extend token',
            details: errorData
        }, { status: 500 });
    }
}
