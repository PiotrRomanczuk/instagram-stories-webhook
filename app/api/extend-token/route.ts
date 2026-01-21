import { NextResponse } from 'next/server';
import axios from 'axios';
import { getServerSession } from "next-auth/next";
import { getLinkedFacebookAccount, saveLinkedFacebookAccount } from '@/lib/database/linked-accounts';
import { authOptions } from "@/lib/auth";

export async function POST() {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const linkedAccount = await getLinkedFacebookAccount(session.user.id);

        if (!linkedAccount || !linkedAccount.access_token) {
            return NextResponse.json({ error: 'Facebook not linked' }, { status: 400 });
        }

        const appId = process.env.AUTH_FACEBOOK_ID || process.env.NEXT_PUBLIC_FB_APP_ID;
        const appSecret = process.env.AUTH_FACEBOOK_SECRET || process.env.FB_APP_SECRET;

        if (!appId || !appSecret) {
            console.error('🚨 Missing Meta App credentials for token extension');
            return NextResponse.json({ error: 'Missing app credentials' }, { status: 500 });
        }

        console.log(`🔄 Extending token for user ${session.user.id}...`);

        // Exchange for long-lived token
        const response = await axios.get('https://graph.facebook.com/v21.0/oauth/access_token', {
            params: {
                grant_type: 'fb_exchange_token',
                client_id: appId,
                client_secret: appSecret,
                fb_exchange_token: linkedAccount.access_token
            }
        });

        const newAccessToken = response.data.access_token;
        const expiresIn = response.data.expires_in; // Seconds

        await saveLinkedFacebookAccount({
            ...linkedAccount,
            access_token: newAccessToken,
            expires_at: expiresIn ? Date.now() + (expiresIn * 1000) : undefined,
            updated_at: new Date().toISOString()
        });

        console.log(`✅ Token extended successfully for user ${session.user.id}`);

        return NextResponse.json({
            success: true,
            expires_in_days: expiresIn ? Math.floor(expiresIn / 86400) : 'unknown'
        });

    } catch (error: unknown) {
        const errorData = axios.isAxiosError(error) ? (error.response?.data || error.message) : (error instanceof Error ? error.message : String(error));
        console.error('❌ Token extension failed:', errorData);
        return NextResponse.json({
            error: 'Failed to extend token',
            details: errorData
        }, { status: 500 });
    }
}
