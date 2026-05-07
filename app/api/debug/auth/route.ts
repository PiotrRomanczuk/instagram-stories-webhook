import { NextResponse } from 'next/server';
import { getLinkedFacebookAccount } from '@/lib/database/linked-accounts';
import { getSession } from '@/lib/auth-helpers';
import { guardDebugRoute } from '@/lib/debug-route-guard';
import axios from 'axios';

export async function GET() {
    const guard = await guardDebugRoute();
    if (guard) return guard;

    const session = await getSession();
    // guardDebugRoute already verified the session, but TypeScript needs help
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
                access_token_present: !!linkedAccount.access_token,
            };

            // Try to fetch real-time info from Facebook
            try {
                const meRes = await axios.get(`https://graph.facebook.com/v24.0/me`, {
                    params: {
                        fields: 'id,name,email,picture',
                        access_token: linkedAccount.access_token
                    }
                });
                debugData.facebook_live = meRes.data;

                // Check permissions
                const permRes = await axios.get(`https://graph.facebook.com/v24.0/me/permissions`, {
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
                    const { app_id, type, application, expires_at, is_valid, scopes, user_id } = debugRes.data.data;
                    debugData.token_debug = { app_id, type, application, expires_at, is_valid, scopes, user_id };
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
