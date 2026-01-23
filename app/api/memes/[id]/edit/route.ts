import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getMemeSubmission } from '@/lib/memes-db';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { requireAuth, getUserId } from '@/lib/auth-helpers';
import { Logger } from '@/lib/logger';

const MODULE = 'api:memes:edit';

interface RouteParams {
    params: Promise<{ id: string }>;
}

/**
 * PATCH /api/memes/[id]/edit - User edit caption/title while pending
 * Body: { title?: string, caption?: string }
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
    try {
        const session = await getServerSession(authOptions);
        requireAuth(session);

        const { id } = await params;
        const userId = getUserId(session);

        const body = await request.json();
        const { title, caption } = body;

        const meme = await getMemeSubmission(id);

        if (!meme) {
            return NextResponse.json({ error: 'Meme not found' }, { status: 404 });
        }

        // Only owner can edit
        if (meme.user_id !== userId) {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 });
        }

        // Can only edit pending memes
        if (meme.status !== 'pending') {
            return NextResponse.json(
                { error: `Cannot edit: meme is ${meme.status}` },
                { status: 400 }
            );
        }

        const updates: { title?: string; caption?: string } = {};
        if (title !== undefined) updates.title = title;
        if (caption !== undefined) updates.caption = caption;

        if (Object.keys(updates).length === 0) {
            return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
        }

        const { data, error } = await supabaseAdmin
            .from('meme_submissions')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            Logger.error(MODULE, `Update error: ${error.message}`, error);
            return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
        }

        await Logger.info(MODULE, `✏️ Meme ${id} edited by owner`, { userId });

        return NextResponse.json({ meme: data });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to edit meme';
        Logger.error(MODULE, `PATCH error: ${message}`, error);

        if (message === 'Authentication required') {
            return NextResponse.json({ error: message }, { status: 401 });
        }

        return NextResponse.json({ error: message }, { status: 500 });
    }
}
