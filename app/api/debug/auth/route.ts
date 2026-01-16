import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { getLinkedFacebookAccount } from '@/lib/linked-accounts-db';
import { authOptions } from "@/lib/auth";
import axios from 'axios';

export async function GET(_request: NextRequest) {
    const session = await getServerSession(authOptions);

    if (!session) {
        return NextResponse.json({
            authenticated: false,
            message: 'Not signed in'
        }, { status: 401 });
    }

    try {
        const linkedAccount = await getLinkedFacebookAccount(session.user.id);

        const debugData: any = {
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
            } catch (fbErr: any) {
                debugData.facebook_live_error = fbErr.response?.data || fbErr.message;
            }
        }

        return NextResponse.json(debugData);
    } catch (error: any) {
        return NextResponse.json({
            authenticated: true,
            error: error.message
        }, { status: 500 });
    }
}
