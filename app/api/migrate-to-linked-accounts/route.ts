import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/config/supabase";
import { getTokens } from "@/lib/database/base";
import { saveLinkedFacebookAccount } from "@/lib/database/linked-accounts";

/**
 * MIGRATION TOOL: Associates the existing global token with a user.
 * Authentication via Authorization header (not URL parameters).
 */
export async function POST(request: NextRequest) {
    try {
        const authHeader = request.headers.get("authorization");
        const expectedSecret = process.env.NEXTAUTH_SECRET;

        if (!expectedSecret || authHeader !== `Bearer ${expectedSecret}`) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const email: string = body.email || process.env.ADMIN_EMAIL?.split(",")[0].trim();

        if (!email) {
            return NextResponse.json({ error: "No target email provided." }, { status: 400 });
        }

        const globalToken = await getTokens();
        if (!globalToken || !globalToken.access_token) {
            return NextResponse.json({ error: "No global token found to migrate." }, { status: 404 });
        }

        const { data: user, error: userError } = await supabase
            .from("users")
            .select("id, email")
            .eq("email", email.toLowerCase())
            .single();

        if (userError || !user) {
            return NextResponse.json({
                error: `User with email "${email}" not found.`,
                tip: "Ensure the user has signed in with Google at least once."
            }, { status: 404 });
        }

        let providerAccountId = globalToken.user_id || "migrated_user";
        try {
            const meRes = await fetch(`https://graph.facebook.com/v21.0/me?access_token=${globalToken.access_token}`);
            const meData = await meRes.json();
            if (meData.id) providerAccountId = meData.id;
        } catch {
            // Could not fetch Facebook user ID
        }

        await saveLinkedFacebookAccount({
            user_id: user.id,
            provider: "facebook",
            provider_account_id: providerAccountId,
            access_token: globalToken.access_token,
            expires_at: globalToken.expires_at,
            ig_user_id: globalToken.user_id
        });

        return NextResponse.json({
            success: true,
            message: `Migrated global token to user: ${user.email}`,
            user_id: user.id,
            facebook_id: providerAccountId
        });
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}
