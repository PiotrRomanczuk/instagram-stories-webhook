import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

/**
 * Initiates the Facebook OAuth flow for account linking.
 * This is separate from NextAuth sign-in - it's for linking Facebook/Instagram
 * to an existing Google-authenticated user.
 */
export async function GET(req: NextRequest) {
    try {
        console.log("🔗 Initiating Facebook Link Flow...");
        console.log("Cookies:", req.cookies.getAll().map(c => c.name).join(', '));

        const session = await getServerSession(authOptions);

        console.log("Session User:", session?.user?.email || "None");
        console.log("Session ID:", session?.user?.id || "None");

        if (!session?.user?.id) {
            console.log("⚠️ No session found in link-facebook initiation, redirecting to signin");
            // Add a return URL so they come back here? 
            // Actually, we want them to just sign in first.
            const signinUrl = new URL("/auth/signin", req.url);
            return NextResponse.redirect(signinUrl.toString());
        }

        const appId = process.env.AUTH_FACEBOOK_ID || process.env.NEXT_PUBLIC_FB_APP_ID;
        const redirectUri = `${process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL}/api/auth/link-facebook/callback`;

        // Scopes needed for Instagram Business API
        const scopes = [
            "instagram_basic",
            "instagram_content_publish",
            "pages_read_engagement",
            "pages_show_list",
            "public_profile",
        ].join(",");

        // Generate a state token for CSRF protection
        const state = Buffer.from(JSON.stringify({
            timestamp: Date.now(),
            userId: session.user.id,
            random: Math.random().toString(36).substring(7)
        })).toString('base64');

        const facebookAuthUrl = new URL("https://www.facebook.com/v21.0/dialog/oauth");
        facebookAuthUrl.searchParams.set("client_id", appId || "");
        facebookAuthUrl.searchParams.set("redirect_uri", redirectUri);
        facebookAuthUrl.searchParams.set("scope", scopes);
        facebookAuthUrl.searchParams.set("state", state);
        facebookAuthUrl.searchParams.set("response_type", "code");

        // Set state cookie for verification in callback
        const response = NextResponse.redirect(facebookAuthUrl.toString());
        response.cookies.set("fb_link_state", state, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 600, // 10 minutes
        });

        return response;
    } catch (error: any) {
        console.error("❌ Critical Error in link-facebook:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
