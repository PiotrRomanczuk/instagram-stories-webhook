import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { getLinkedFacebookAccount } from '@/lib/database/linked-accounts';
import { authOptions } from "@/lib/auth";
import axios from 'axios';

export async function GET() {
    const session = await getServerSession(authOptions);

    if (!session) {
        return NextResponse.json({
            authenticated: false,
            message: 'Not signed in'
        }, { status: 401 });
    }

    try {
        const linkedAccount = await getLinkedFacebookAccount(session.user.id);

        const debugData: Record<string, unknown> = {
            authenticated: true,
            user: {
                id: session.user.id,
                email: session.user.email,
                name: session.user.name,
            },
            facebook_linked: !!linkedAccount,
        };

        if (linkedAccount) {
            debugData.facebook = {
                provider_account_id: linkedAccount.provider_account_id,
                ig_user_id: linkedAccount.ig_user_id,
                expires_at: linkedAccount.expires_at,
                // Mask token for safety
                access_token: linkedAccount.access_token ? `${linkedAccount.access_token.substring(0, 10)}...` : null,
            };

            // Try to fetch real-time info from Facebook
            try {
                const meRes = await axios.get(`https://graph.facebook.com/v21.0/me`, {
                    params: {
                        fields: 'id,name,email,picture',
                        access_token: linkedAccount.access_token
                    }
                });
                debugData.facebook_live = meRes.data;

                // Check permissions
                const permRes = await axios.get(`https://graph.facebook.com/v21.0/me/permissions`, {
                    params: { access_token: linkedAccount.access_token }
                });
                debugData.permissions = permRes.data.data;

                // Check Token Debug info
                const appId = process.env.AUTH_FACEBOOK_ID || process.env.NEXT_PUBLIC_FB_APP_ID;
                const appSecret = process.env.AUTH_FACEBOOK_SECRET || process.env.FB_APP_SECRET;

                if (appId && appSecret) {
                    const debugRes = await axios.get(`https://graph.facebook.com/debug_token`, {
                        params: {
                            input_token: linkedAccount.access_token,
                            access_token: `${appId}|${appSecret}`
                        }
                    });
                    debugData.token_debug = debugRes.data.data;
                }
            } catch (fbErr: unknown) {
                const fbErrorData = axios.isAxiosError(fbErr) ? (fbErr.response?.data || fbErr.message) : (fbErr instanceof Error ? fbErr.message : String(fbErr));
                debugData.facebook_live_error = fbErrorData;
            }
        }

        return NextResponse.json(debugData);
    } catch (error: unknown) {
        return NextResponse.json({
            authenticated: true,
            error: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}
