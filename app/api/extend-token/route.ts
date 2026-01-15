import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { getTokens, saveTokens } from '@/lib/db';

export async function POST(request: NextRequest) {
    const appId = process.env.NEXT_PUBLIC_FB_APP_ID;
    const appSecret = process.env.FB_APP_SECRET;

    if (!appId || !appSecret) {
        return NextResponse.json({ error: 'Missing app credentials' }, { status: 500 });
    }

    try {
        const tokens = await getTokens();
        if (!tokens?.access_token) {
            return NextResponse.json({ error: 'No token found to extend' }, { status: 400 });
        }

        // Exchange short-lived token for long-lived token
        const response = await axios.get('https://graph.facebook.com/v18.0/oauth/access_token', {
            params: {
                grant_type: 'fb_exchange_token',
                client_id: appId,
                client_secret: appSecret,
                fb_exchange_token: tokens.access_token
            }
        });

        const longLivedToken = response.data.access_token;
        const expiresIn = response.data.expires_in; // Seconds

        await saveTokens({
            access_token: longLivedToken,
            expires_at: expiresIn ? Date.now() + (expiresIn * 1000) : undefined
        });

        return NextResponse.json({
            success: true,
            message: 'Token extended successfully',
            expires_in_days: expiresIn ? Math.floor(expiresIn / 86400) : 'unknown'
        });
    } catch (error: any) {
        console.error('Token extension error:', error.response?.data || error.message);
        return NextResponse.json({
            error: 'Failed to extend token',
            details: error.response?.data || error.message
        }, { status: 500 });
    }
}
