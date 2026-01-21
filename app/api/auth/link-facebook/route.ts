import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { Logger } from "@/lib/utils/logger";

const MODULE = 'auth';

/**
 * Initiates the Facebook OAuth flow for account linking.
 * This is separate from NextAuth sign-in - it's for linking Facebook/Instagram
 * to an existing Google-authenticated user.
 */
export async function GET(req: NextRequest) {
    try {
        await Logger.info(MODULE, "🔗 Initiating Facebook Link Flow...");

        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            await Logger.warn(MODULE, "⚠️ No session found in link-facebook initiation, redirecting to signin");
            const signinUrl = new URL("/auth/signin", req.url);
            return NextResponse.redirect(signinUrl.toString());
        }

        const userId = session.user.id;
        await Logger.info(MODULE, `👤 Link flow requested by user: ${session.user.email}`, { userId });

        const appId = process.env.AUTH_FACEBOOK_ID || process.env.NEXT_PUBLIC_FB_APP_ID;
        const redirectUri = `${process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL}/api/auth/link-facebook/callback`;

        // Scopes needed for Instagram Business API
        const scopes = [
            "instagram_basic",
            "instagram_content_publish",
            "instagram_manage_insights",
            "instagram_manage_messages",
            "instagram_manage_comments",
            "instagram_manage_contents",
            "pages_read_engagement",
            "pages_show_list",
            "public_profile",
        ].join(",");

        // Generate a state token for CSRF protection
        const state = Buffer.from(JSON.stringify({
            timestamp: Date.now(),
            userId: userId,
            nonce: crypto.randomUUID()
        })).toString('base64');


        const facebookAuthUrl = new URL("https://www.facebook.com/v21.0/dialog/oauth");
        facebookAuthUrl.searchParams.set("client_id", appId || "");
        facebookAuthUrl.searchParams.set("redirect_uri", redirectUri);
        facebookAuthUrl.searchParams.set("scope", scopes);
        facebookAuthUrl.searchParams.set("state", state);
        facebookAuthUrl.searchParams.set("response_type", "code");

        await Logger.debug(MODULE, `🔀 Redirecting user ${userId} to Facebook OAuth...`, { redirectUri });

        // Set state cookie for verification in callback
        const response = NextResponse.redirect(facebookAuthUrl.toString());
        response.cookies.set("fb_link_state", state, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 600, // 10 minutes
        });

        return response;
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        await Logger.error(MODULE, `❌ Critical Error in link-facebook initiation: ${errorMessage}`, error);
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}
