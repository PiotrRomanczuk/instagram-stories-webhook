import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { publishMedia } from '@/lib/instagram';
import { supabaseAdmin } from '@/lib/config/supabase-admin';
import { Logger } from '@/lib/utils/logger';
import { validateFetchUrl } from '@/lib/utils/url-validation';

const MODULE = 'webhook';

/**
 * Request body schema. Webhooks must provide a target email so the server can
 * resolve the publishing user — there is no session context to fall back to.
 */
const StoryWebhookSchema = z.object({
    url: z.string().url('url must be a valid URL'),
    type: z.enum(['IMAGE', 'VIDEO']).optional().default('IMAGE'),
    email: z.string().email('email must be a valid email').optional(),
    caption: z.string().max(2200).optional(),
});

function timingSafeEqual(a: string, b: string): boolean {
    if (a.length !== b.length) return false;
    let mismatch = 0;
    for (let i = 0; i < a.length; i++) {
        mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    return mismatch === 0;
}

/**
 * Webhook endpoint for direct publishing (e.g. from Shortcut or automation).
 *
 * Authentication: HMAC-style shared secret via the `x-webhook-secret` header.
 * Session-based auth is intentionally NOT supported — NextAuth's CSRF
 * protection only covers `/api/auth/*`, so allowing session auth here would
 * let any signed-in user be tricked into publishing via a forged request.
 */
export async function POST(request: NextRequest) {
    try {
        await Logger.info(MODULE, '📥 Webhook request received');

        // 1. Authenticate: require x-webhook-secret header matching server secret.
        const secret = process.env.WEBHOOK_SECRET;
        const authHeader = request.headers.get('x-webhook-secret');

        if (!secret) {
            await Logger.error(MODULE, '❌ WEBHOOK_SECRET is not configured; rejecting request');
            return NextResponse.json({ error: 'Webhook is not configured' }, { status: 503 });
        }

        if (!authHeader || !timingSafeEqual(authHeader, secret)) {
            await Logger.warn(MODULE, '🔒 Unauthorized webhook attempt', {
                hasHeader: !!authHeader,
            });
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // 2. Validate body against schema.
        let rawBody: unknown;
        try {
            rawBody = await request.json();
        } catch {
            await Logger.warn(MODULE, '❌ Webhook body is not valid JSON');
            return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
        }

        const parsed = StoryWebhookSchema.safeParse(rawBody);
        if (!parsed.success) {
            const issues = parsed.error.issues.map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`);
            await Logger.warn(MODULE, '❌ Webhook body failed validation', { issues });
            return NextResponse.json({ error: 'Invalid request body', issues }, { status: 400 });
        }

        const { url, type, email, caption } = parsed.data;

        // 3. Validate the URL itself (SSRF protection: block localhost, private IPs, metadata endpoints).
        try {
            validateFetchUrl(url);
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Invalid url';
            await Logger.warn(MODULE, `❌ Webhook url rejected: ${message}`);
            return NextResponse.json({ error: 'Invalid url' }, { status: 400 });
        }

        const mediaType = type;

        // 4. Resolve target user. Prefer the body's email; fall back to the
        //    first ADMIN_EMAIL for system automations that don't specify one.
        const targetEmail = email ?? process.env.ADMIN_EMAIL?.split(',')[0].trim();

        if (!targetEmail) {
            await Logger.error(MODULE, '❌ No target user email found for webhook');
            return NextResponse.json({ error: 'No user context found for webhook' }, { status: 400 });
        }

        await Logger.info(MODULE, `👤 Resolving user from email: ${targetEmail}`);

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

        const result = await publishMedia(url, mediaType, 'STORY', caption, targetUserId);

        await Logger.info(MODULE, `✅ Webhook publication successful for ${targetEmail}`, { igMediaId: result.id });

        return NextResponse.json({ success: true, user: targetEmail, result });
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        await Logger.error(MODULE, `❌ Webhook Error: ${errorMessage}`, error);
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}
