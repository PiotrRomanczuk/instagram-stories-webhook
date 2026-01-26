import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { publishMedia } from '@/lib/instagram';
import { supabaseAdmin } from '@/lib/config/supabase-admin';
import { Logger } from '@/lib/utils/logger';

const MODULE = 'webhook';

/**
 * Webhook endpoint for direct publishing (e.g. from Shortcut or automation)
 */
export async function POST(request: NextRequest) {
    try {
        await Logger.info(MODULE, '📥 Webhook request received');

        // Check for session-based auth (for dashboard testing) or header-based auth (for external webhooks)
        const session = await getServerSession(authOptions);
        const authHeader = request.headers.get('x-webhook-secret');
        const secret = process.env.WEBHOOK_SECRET;

        const isSessionAuth = !!session?.user?.id;
        const isHeaderAuth = secret && authHeader === secret;

        if (!isSessionAuth && !isHeaderAuth) {
            await Logger.warn(MODULE, '🔒 Unauthorized webhook attempt', {
                hasSession: isSessionAuth,
                hasHeader: !!authHeader,
                headerMatch: isHeaderAuth
            });
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await Logger.info(MODULE, `🔐 Auth established via: ${isSessionAuth ? 'session' : 'header secret'}`);

        const body = await request.json();
        const { url, type, email } = body; // Optional email to specify user

        if (!url) {
            await Logger.error(MODULE, '❌ Missing "url" in webhook body');
            return NextResponse.json({ error: 'Missing "url"' }, { status: 400 });
        }

        const mediaType = type === 'VIDEO' ? 'VIDEO' : 'IMAGE';

        // Resolve user
        let targetEmail = email;

        // SECURITY CHECK: IDOR Prevention
        // If authenticated via session (not secret header), ensure user is not impersonating
        if (isSessionAuth && !isHeaderAuth) {
            // We import isAdmin dynamically or check role manually if helper not available, 
            // but we see auth-helpers exists. Let's assume we can import it or just check role directly from session if type allows.
            // safely check role from session object if we don't want to add import at top yet, 
            // BUT simpler to just enforce: specific email request requires ADMIN or SECRET.
            // If just session, default to session user.

            const sessionEmail = session?.user?.email;
            const userRole = (session?.user as { role?: string })?.role;
            const isUserAdmin = userRole === 'admin' || userRole === 'developer';

            if (!isUserAdmin) {
                if (targetEmail && targetEmail !== sessionEmail) {
                    await Logger.warn(MODULE, `🚨 IDOR Attempt: User ${sessionEmail} tried to post as ${targetEmail}`);
                    return NextResponse.json({ error: 'Forbidden: You can only post for your own account' }, { status: 403 });
                }
                // Force target to be their own email
                targetEmail = sessionEmail;
            }
        }

        // Fallback for system automations (Header Auth) or Admin usage
        if (!targetEmail) {
            targetEmail = process.env.ADMIN_EMAIL?.split(',')[0].trim();
        }

        if (!targetEmail) {
            await Logger.error(MODULE, '❌ No target user email found for webhook');
            return NextResponse.json({ error: 'No user context found for webhook' }, { status: 400 });
        }

        await Logger.info(MODULE, `👤 Resolving user from email: ${targetEmail}`);

        // Find user ID from email in Supabase (NextAuth schema)
        const { data: userData, error: userError } = await supabaseAdmin
            .schema('next_auth')
            .from('users')
            .select('id')
            .eq('email', targetEmail.toLowerCase())
            .single();

        if (userError || !userData) {
            await Logger.error(MODULE, `❌ Could not find user with email ${targetEmail}`, { error: userError?.message });
            return NextResponse.json({ error: `User ${targetEmail} not found in database` }, { status: 404 });
        }

        const targetUserId = userData.id;
        await Logger.info(MODULE, `🚀 Triggering publish for user ${targetUserId}`, { email: targetEmail, url, mediaType });

        // Trigger publishing using the resolved user's tokens
        const result = await publishMedia(url, mediaType, 'STORY', undefined, targetUserId);

        await Logger.info(MODULE, `✅ Webhook publication successful for ${targetEmail}`, { igMediaId: result.id });

        return NextResponse.json({ success: true, user: targetEmail, result });
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        await Logger.error(MODULE, `❌ Webhook Error: ${errorMessage}`, error);
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}
