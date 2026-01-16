import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { publishMedia } from '@/lib/instagram';
import { supabaseAdmin } from '@/lib/supabase-admin';

/**
 * Webhook endpoint for direct publishing (e.g. from Shortcut or automation)
 */
export async function POST(request: NextRequest) {
    try {
        // Check for session-based auth (for dashboard testing) or header-based auth (for external webhooks)
        const session = await getServerSession(authOptions);
        const authHeader = request.headers.get('x-webhook-secret');
        const secret = process.env.WEBHOOK_SECRET;

        const isSessionAuth = !!session?.user?.id;
        const isHeaderAuth = secret && authHeader === secret;

        if (!isSessionAuth && !isHeaderAuth) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { url, type, email } = body; // Optional email to specify user

        if (!url) {
            return NextResponse.json({ error: 'Missing "url"' }, { status: 400 });
        }

        const mediaType = type === 'VIDEO' ? 'VIDEO' : 'IMAGE';

        // Resolve user
        let targetUserId: string | null = null;

        const targetEmail = email || (process.env.ADMIN_EMAIL?.split(',')[0].trim());

        if (!targetEmail) {
            return NextResponse.json({ error: 'No user context found for webhook' }, { status: 400 });
        }

        console.log(`🔗 Webhook triggered for user email: ${targetEmail}`);

        // Find user ID from email in Supabase (NextAuth schema)
        // We use supabaseAdmin here because 'next_auth' schema might not be exposed to the public/anon client
        const { data: userData, error: userError } = await supabaseAdmin
            .schema('next_auth')
            .from('users')
            .select('id')
            .eq('email', targetEmail.toLowerCase())
            .single();

        if (userError || !userData) {
            console.error(`❌ Could not find user with email ${targetEmail}:`, userError?.message);
            return NextResponse.json({ error: `User ${targetEmail} not found in database` }, { status: 404 });
        }

        targetUserId = userData.id;

        // Trigger publishing using the resolved user's tokens
        const result = await publishMedia(url, mediaType, 'STORY', undefined, targetUserId || undefined);

        return NextResponse.json({ success: true, user: targetEmail, result });
    } catch (error: any) {
        const errorMessage = error.message || 'Unknown error';
        console.error('Webhook Error:', errorMessage);
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}
