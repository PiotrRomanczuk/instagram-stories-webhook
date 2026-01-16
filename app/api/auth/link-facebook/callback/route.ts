import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { getInstagramBusinessAccountId } from "@/lib/instagram/account";
import { saveLinkedFacebookAccount } from "@/lib/linked-accounts-db";
import { authOptions } from "@/lib/auth";

/**
 * Handles the Facebook OAuth callback for account linking.
 */
export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions);
    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");

    // 1. Check for errors from Facebook
    if (error) {
        console.error("Facebook OAuth Error:", error, searchParams.get("error_description"));
        return NextResponse.redirect(new URL("/?error=fb_auth_failed", req.url));
    }

    // 2. Validate session
    if (!session?.user?.id) {
        console.error("No session found during Facebook linking callback");
        return NextResponse.redirect(new URL("/auth/signin", req.url));
    }

    // 3. Verify state for CSRF protection
    const cookieState = req.cookies.get("fb_link_state")?.value;
    if (!state || state !== cookieState) {
        console.error("State mismatch in Facebook linking callback");
        return NextResponse.redirect(new URL("/?error=state_mismatch", req.url));
    }

    if (!code) {
        return NextResponse.redirect(new URL("/?error=no_code", req.url));
    }

    try {
        const appId = process.env.AUTH_FACEBOOK_ID || process.env.NEXT_PUBLIC_FB_APP_ID;
        const appSecret = process.env.AUTH_FACEBOOK_SECRET || process.env.FB_APP_SECRET;
        const redirectUri = `${process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL}/api/auth/link-facebook/callback`;

        // 4. Exchange code for access token
        const tokenResponse = await fetch(
            `https://graph.facebook.com/v21.0/oauth/access_token?client_id=${appId}&redirect_uri=${redirectUri}&client_secret=${appSecret}&code=${code}`
        );
        const tokenData = await tokenResponse.json();

        if (tokenData.error) {
            throw new Error(`Token exchange failed: ${tokenData.error.message}`);
        }

        const shortLivedToken = tokenData.access_token;

        // 5. Exchange for long-lived token (60 days)
        const longLivedResponse = await fetch(
            `https://graph.facebook.com/v21.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${shortLivedToken}`
        );
        const longLivedData = await longLivedResponse.json();

        if (longLivedData.error) {
            throw new Error(`Long-lived token exchange failed: ${longLivedData.error.message}`);
        }

        const accessToken = longLivedData.access_token;
        const expiresAt = longLivedData.expires_in
            ? Date.now() + (longLivedData.expires_in * 1000)
            : undefined;

        // 6. Fetch Instagram Business Account ID
        const igUserId = await getInstagramBusinessAccountId(accessToken);

        // 7. Get Facebook User ID (provider_account_id)
        const meResponse = await fetch(`https://graph.facebook.com/me?access_token=${accessToken}`);
        const meData = await meResponse.json();
        const facebookUserId = meData.id;

        // 8. Save to linked_accounts table
        await saveLinkedFacebookAccount({
            user_id: session.user.id,
            provider: 'facebook',
            provider_account_id: facebookUserId,
            access_token: accessToken,
            expires_at: expiresAt,
            ig_user_id: igUserId || undefined
        });

        console.log(`✅ Successfully linked Facebook account for user ${session.user.id}`);

        // 9. Redirect back to dashboard with success
        const response = NextResponse.redirect(new URL("/?status=linked", req.url));
        response.cookies.delete("fb_link_state");
        return response;

    } catch (error: any) {
        console.error("Error linking Facebook account:", error);
        return NextResponse.redirect(new URL(`/?error=linking_failed&message=${encodeURIComponent(error.message)}`, req.url));
    }
}
